from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from langgraph.types import Command
from langgraph_model_medical import build_app
import json
import os
from pathlib import Path
import dotenv

dotenv.load_dotenv()

from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

app = FastAPI(
    title="Medical Diagnosis API",
    description="AI-powered medical diagnosis system with interactive questioning",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

graph = build_app()

# Sentinel token used by frontend to indicate the user skipped a question
SKIP_TOKEN = "__skip__"


# --- MongoDB helpers ---
_mongo_client: Optional[MongoClient] = None

def _get_mongo_client() -> Optional[MongoClient]:
    global _mongo_client
    if _mongo_client is not None:
        return _mongo_client
    uri = os.getenv("TRIAGE_MONGO_URI") or os.getenv("MONGO_URI")
    if not uri:
        print("[triage-client] No TRIAGE_MONGO_URI/MONGO_URI configured; skipping DB writes.")
        return None
    try:
        print("[triage-client] Found Mongo URI in environment.")
        _mongo_client = MongoClient(uri, server_api=ServerApi("1"))
        return _mongo_client
    except Exception:
        print("[triage-client] Failed to initialize MongoClient; DB writes disabled.")
        return None

def _map_urgency_to_level(urgency_value) -> int:
    if isinstance(urgency_value, (int, float)):
        lvl = int(urgency_value)
        if 1 <= lvl <= 5:
            return lvl
    if isinstance(urgency_value, str):
        w = urgency_value.strip().lower()
        if w in {"emergency", "critical", "immediate", "life-threatening"}:
            return 1
        if w in {"high", "urgent", "very high"}:
            return 2
        if w in {"moderate", "medium"}:
            return 3
        if w in {"low", "minor"}:
            return 4
        if w in {"routine", "non-urgent", "nonurgent"}:
            return 5
    return 3

def _push_patient_record(thread_id: str, state_values: dict, diagnosis_payload: dict):
    client = _get_mongo_client()
    if not client:
        return  # silently skip if no DB configured
    db_name = os.getenv("TRIAGE_DB_NAME", "test")
    coll_name = os.getenv("TRIAGE_COLLECTION", "patients")

    try:
        db = client[db_name]
        coll = db[coll_name]
        print(f"[triage-client] Using MongoDB {db_name}.{coll_name}")
        symptoms = state_values.get("symptoms", []) or []
        symptoms_str = ", ".join(symptoms) if isinstance(symptoms, list) else str(symptoms)

        urgency_numeric = _map_urgency_to_level(
            (diagnosis_payload or {}).get("urgency_level") or (diagnosis_payload or {}).get("urgency")
        )

        doc = {
            "name": thread_id,  # using thread_id as a placeholder name
            "symptoms": symptoms_str,
            "level": int(urgency_numeric),
            "priority": int(urgency_numeric),
        }
        res = coll.insert_one(doc)
        print(f"[triage-client] Inserted patient doc into {db_name}.{coll_name} _id={res.inserted_id}")
    except Exception:
        # avoid raising; API response should not fail due to DB insert
        import traceback
        print("[triage-client] Error inserting patient doc:")
        traceback.print_exc()


@app.get("/")
def read_root():
    return {
        "message": "Medical Diagnosis API", 
        "status": "running", 
        "endpoints": ["/start", "/resume", "/confirm", "/health", "/docs"],
        "description": "AI-powered medical diagnosis with interactive questioning"
    }


class StartRequest(BaseModel):
    thread_id: str
    symptoms: List[str]
    medical_records: Optional[str] = None

class ResumeRequest(BaseModel):
    thread_id: str
    response: str
    question: Optional[str] = None

class ConfirmRequest(BaseModel):
    thread_id: str
    confirm: bool


def serialize_result(result: dict):
    """Convert graph result to API-friendly format."""
    if isinstance(result, dict) and "__interrupt__" in result:
        payload = result["__interrupt__"][0].value or {}
        question_type = payload.get("question_type", "multiple_choice")

        # New confirmation interrupt
        if payload.get("action") == "confirm_diagnosis_complete":
            return {
                "type": "confirm",
                "action": payload.get("action"),
                "message": payload.get("message", "Proceed to diagnosis? (y/N)"),
                "status": "awaiting_confirmation",
            }

        # Regular question interrupt
        return {
            "type": "question",
            "query": payload.get("query"),
            "options": payload.get("options"),
            "question_type": question_type,
            "status": "waiting_for_response"
        }
    
    if isinstance(result, dict) and "diagnosis" in result:
        diagnosis_content = result["diagnosis"]
        
        # Try to parse as JSON for structured response
        try:
            diagnosis_json = json.loads(diagnosis_content)
            return {
                "type": "diagnosis",
                "diagnosis": diagnosis_json,
                "status": "completed"
            }
        except json.JSONDecodeError:
            # Fallback to text format
            return {
                "type": "diagnosis",
                "diagnosis": {"raw_text": diagnosis_content},
                "status": "completed"
            }
    
    return {
        "type": "error",
        "error": "Unexpected result from medical diagnosis system",
        "status": "error"
    }


@app.post("/start")
def start_diagnosis(req: StartRequest):
    """
    Start a new medical diagnosis session.
    
    - **thread_id**: Unique identifier for this diagnosis session
    - **symptoms**: List of patient symptoms
    - **medical_records**: Optional medical history and patient information
    """
    config = {"configurable": {"thread_id": req.thread_id}}
    
    initial_state = {
        "symptoms": req.symptoms,
        "medical_records": req.medical_records or "",
        "questions_asked": [],
        "responses": []
    }
    
    try:
        result = graph.invoke(initial_state, config=config)
        payload = serialize_result(result)
        # If immediate final diagnosis (unlikely), push to DB synchronously
        if payload.get("type") == "diagnosis":
            try:
                diagnosis_payload = payload.get("diagnosis") if isinstance(payload.get("diagnosis"), dict) else {}
                state = graph.get_state(config)
                _push_patient_record(req.thread_id, state.values or {}, diagnosis_payload)
            except Exception:
                pass
        return payload
    except Exception as e:
        return {
            "type": "error",
            "error": f"Failed to start diagnosis: {str(e)}",
            "status": "error"
        }


@app.post("/resume")
def resume_diagnosis(req: ResumeRequest):
    """
    Resume a diagnosis session by providing an answer to the current question.
    
    - **thread_id**: The session identifier
    - **response**: Patient's response to the diagnostic question
    """
    config = {"configurable": {"thread_id": req.thread_id}}
    
    try:
        # Get current state to update responses and questions
        current_state = graph.get_state(config)
        current_responses = current_state.values.get('responses', [])
        current_questions = current_state.values.get('questions_asked', [])

        # Convert skip token to a friendly recorded response
        recorded_response = "No Response" if (req.response or "").strip() == SKIP_TOKEN else req.response

        updated_responses = current_responses + [recorded_response]
        updated_questions = current_questions + ([req.question] if req.question else [])

        # Resume with the response and update state (include questions if provided)
        update_payload = {"responses": updated_responses}
        if req.question:
            update_payload["questions_asked"] = updated_questions

        result = graph.invoke(
            Command(resume=recorded_response, update=update_payload),
            config=config,
        )
        payload = serialize_result(result)
        # On final diagnosis, push to MongoDB synchronously
        if payload.get("type") == "diagnosis":
            try:
                diagnosis_payload = payload.get("diagnosis") if isinstance(payload.get("diagnosis"), dict) else {}
                # Get the latest state to capture final symptoms list
                latest_state = graph.get_state(config)
                _push_patient_record(req.thread_id, latest_state.values or {}, diagnosis_payload)
            except Exception:
                pass
        return payload
    except Exception as e:
        return {
            "type": "error",
            "error": f"Failed to resume diagnosis: {str(e)}",
            "status": "error"
        }


@app.post("/confirm")
def confirm_diagnosis(req: ConfirmRequest):
    """
    Confirm or cancel proceeding to the final diagnosis after a confirmation interrupt.

    - **thread_id**: The session identifier
    - **confirm**: true to proceed, false to return to questioning
    """
    config = {"configurable": {"thread_id": req.thread_id}}

    try:
        resume_token = "yes" if req.confirm else "no"
        result = graph.invoke(Command(resume=resume_token), config=config)
        payload = serialize_result(result)

        # On final diagnosis, push to MongoDB synchronously
        if payload.get("type") == "diagnosis":
            try:
                diagnosis_payload = payload.get("diagnosis") if isinstance(payload.get("diagnosis"), dict) else {}
                latest_state = graph.get_state(config)
                _push_patient_record(req.thread_id, latest_state.values or {}, diagnosis_payload)
            except Exception:
                pass

        return payload
    except Exception as e:
        return {
            "type": "error",
            "error": f"Failed to confirm diagnosis: {str(e)}",
            "status": "error"
        }


@app.get("/session/{thread_id}/status")
def get_session_status(thread_id: str):
    """
    Get the current status of a diagnosis session.
    """
    config = {"configurable": {"thread_id": thread_id}}
    
    try:
        state = graph.get_state(config)
        if not state.values:
            return {
                "status": "not_found",
                "message": "No session found with this thread_id"
            }
        
        return {
            "status": "active",
            "symptoms": state.values.get('symptoms', []),
            "questions_asked": len(state.values.get('questions_asked', [])),
            "has_diagnosis": bool(state.values.get('diagnosis')),
            "medical_records_provided": bool(state.values.get('medical_records'))
        }
    except Exception as e:
        return {
            "status": "error",
            "error": f"Failed to get session status: {str(e)}"
        }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Medical Diagnosis API",
        "graph_status": "ready"
    }


@app.get("/example")
def get_example_request():
    """
    Get an example request format for testing the API.
    """
    return {
        "start_request_example": {
            "thread_id": "patient-001",
            "symptoms": [
                "chest pain",
                "shortness of breath",
                "fatigue",
                "dizziness"
            ],
            "medical_records": "45-year-old male, high blood pressure, family history of heart disease, smoker for 20 years"
        },
        "resume_request_example": {
            "thread_id": "patient-001",
            "response": "A few hours ago"
        },
        "expected_question_format": {
            "query": "When did your chest pain start?",
            "options": {
                "Just now": "Within the last hour",
                "A few hours ago": "2-6 hours ago", 
                "Earlier today": "More than 6 hours ago but today",
                "Yesterday": "Yesterday or the day before",
                "Several days ago": "More than 2 days ago"
            }
        },
        "patient_friendly_examples": {
            "simple_language": "Use 'chest pain' instead of 'thoracic discomfort'",
            "clear_options": "Provide specific time ranges like '2-6 hours ago'",
            "everyday_words": "Say 'high blood pressure' instead of 'hypertension'"
        }
    }

# Run with:
#   uvicorn medical_api:app --reload --port 8000
#   or
#   python -m uvicorn medical_api:app --reload --port 8000