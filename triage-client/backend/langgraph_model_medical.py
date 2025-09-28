import os
from typing import Optional, TypedDict, Annotated

import dotenv
from langgraph.graph import StateGraph, END, add_messages
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.tools import tool
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI

# tool imports are consolidated below

# For debugging and visualization
import json
from datetime import datetime

dotenv.load_dotenv()


class State(TypedDict, total=False):
    symptoms: list[str]
    medical_records: Optional[str]
    questions_asked: list[str]
    responses: list[str]
    diagnosis: Optional[str]
    messages: Annotated[list[BaseMessage], add_messages]


def log_step(step_name: str, state: State, extra_info: str = ""):
    """Helper function to log what's happening at each step."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"\n [{timestamp}] {step_name}")
    print(f"   Symptoms: {state.get('symptoms', [])}")
    print(f"   Medical Records: {'Yes' if state.get('medical_records') else 'No'}")
    print(f"   Questions Asked: {len(state.get('questions_asked', []))}")
    print(f"   Has Diagnosis: {'Yes' if state.get('diagnosis') else 'No'}")
    
    if extra_info:
        print(f"   Info: {extra_info}")
    print("-" * 60)


# Register available tools for medical diagnosis
from tools import ask_user_for_input, signal_diagnosis_complete
tools = [ask_user_for_input, signal_diagnosis_complete]
# Note: We handle tool execution manually below to support interrupt-based flows.


def agent_node(state: State):
    """Medical diagnostic agent that analyzes symptoms and asks clarifying questions."""
    log_step("AGENT_NODE", state, "Analyzing symptoms and generating diagnostic questions")
    
    # Get existing conversation messages (includes user interactions)
    existing_messages = state.get('messages', [])
    symptoms = state.get('symptoms', [])
    medical_records = state.get('medical_records', '')
    questions_asked = state.get('questions_asked', [])
    responses = state.get('responses', [])
    
    # Initialize ChatOpenAI with tools bound
    model = ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        temperature=0,
        reasoning={"effort": "low"},
    ).bind_tools(tools)
    
    # Build the diagnostic context
    symptoms_str = ", ".join(symptoms) if symptoms else "No symptoms provided"
    medical_context = f"Medical Records: {medical_records or 'No medical history provided'}"
    questions_context = f"Previous Questions Asked: {len(questions_asked)}"
    
    # Analyze what areas have been covered based on previous questions
    covered_areas = []
    timing_questions = ["when", "started", "how long", "duration", "time"]
    severity_questions = ["severe", "pain scale", "rate", "intensity", "bad"]
    quality_questions = ["feel like", "describe", "type of", "kind of", "sensation"]
    trigger_questions = ["better", "worse", "trigger", "cause", "aggravate", "relieve"]
    associated_questions = ["other symptoms", "anything else", "along with", "together"]
    context_questions = ["doing when", "started when", "recent", "changes", "circumstances"]
    history_questions = ["before", "family", "medication", "medical history", "past"]
    
    all_questions_text = " ".join(questions_asked).lower()
    
    if any(word in all_questions_text for word in timing_questions):
        covered_areas.append("timing")
    if any(word in all_questions_text for word in severity_questions):
        covered_areas.append("severity") 
    if any(word in all_questions_text for word in quality_questions):
        covered_areas.append("quality")
    if any(word in all_questions_text for word in trigger_questions):
        covered_areas.append("triggers")
    if any(word in all_questions_text for word in associated_questions):
        covered_areas.append("associated_symptoms")
    if any(word in all_questions_text for word in context_questions):
        covered_areas.append("context")
    if any(word in all_questions_text for word in history_questions):
        covered_areas.append("history")
    
    missing_areas = []
    all_areas = ["quality", "triggers", "associated_symptoms", "context", "history"]
    for area in all_areas:
        if area not in covered_areas:
            missing_areas.append(area)
    
    coverage_guidance = f"Areas covered: {', '.join(covered_areas) if covered_areas else 'None'}\n"
    coverage_guidance += f"MISSING CRITICAL AREAS: {', '.join(missing_areas) if missing_areas else 'All covered'}\n"
    coverage_guidance += "NEXT QUESTION PRIORITY: Ask about one of the missing areas above."
    
    # Determine if we should ask more questions or proceed to diagnosis
    max_questions = 2  # Allow for more thorough information gathering
    should_continue_questioning = len(questions_asked) < max_questions
    
    messages = [
        SystemMessage(content=(
            "You are a medical assistant gathering information for diagnosis. Ask ONE clear question at a time.\n\n"
            f"Patient symptoms: {symptoms_str}\n"
            f"{medical_context}\n"
            f"{questions_context}\n"
            f"{coverage_guidance}\n\n"
            "Essential areas to cover:\n"
            "• Timing: When started? Duration? Pattern?\n"
            "• Quality: How does it feel?\n"
            "• Triggers: What makes it better/worse?\n"
            "• Other symptoms: Anything else happening?\n"
            "• Context: What were you doing when it started?\n"
            "• Medical history: Had this before? Medications?\n\n"
            f"Progress: {len(questions_asked)}/{max_questions} questions asked\n\n"
            "Guidelines:\n"
            "• Keep questions SHORT (max 8-10 words)\n"
            "• Use simple, everyday language\n"
            "• One focused question at a time\n"
            "• Be direct but caring\n"
            "• Ask at least 2 questions before diagnosis\n"
            "• Focus on missing areas from the list above\n\n"
            "Actions:\n"
            "• Need more info: use ask_user_for_input tool\n"
            "• Have enough info (2+ questions asked AND most areas covered): use signal_diagnosis_complete tool\n"
        )),
        HumanMessage(content=f"Patient presents with: {symptoms_str}")
    ]
    
    # Add previous Q&A pairs to context
    if questions_asked and responses:
        qa_context = "\n".join([f"Q: {q}\nA: {a}" for q, a in zip(questions_asked, responses)])
        messages.append(HumanMessage(content=f"Previous conversation:\n{qa_context}"))
    
    # Add any other conversation messages
    messages.extend(existing_messages)

    # Call the model
    response = model.invoke(messages)
    
    # Check if model chose to use tools
    if response.tool_calls:
        for tool_call in response.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call.get("args", {}) or {}

            if tool_name == "ask_user_for_input" and should_continue_questioning:
                # Store the question being asked
                question = tool_args.get("query", "Please provide more information")
                updated_questions = questions_asked + [question]
                
                # Use the interrupt-capable tool to gather user input
                params = {
                    "query": question,
                    "options": tool_args.get("options"),
                    "question_type": tool_args.get("question_type", "multiple_choice")
                }
                
                # Update state and return the interrupt
                return ask_user_for_input.invoke(params)
            
            elif tool_name == "signal_diagnosis_complete":
                # Signal that we're ready for diagnosis with completion interrupt
                return signal_diagnosis_complete.invoke({})
    
    # No tool calls - check if we should complete or continue questioning
    if not should_continue_questioning:
        # Force completion signal if we've reached our question limit or have sufficient info
        return signal_diagnosis_complete.invoke({})
    else:
        # This shouldn't happen, but fallback to asking a generic question
        return ask_user_for_input.invoke({
            "query": "Is there anything else I should know?",
            "question_type": "open_ended"
        })


def final_output_node(state: State):
    """Generate final medical diagnosis with top 5 possible causes."""
    log_step("FINAL_OUTPUT_NODE", state, "Generating differential diagnosis")
    
    # Initialize ChatOpenAI
    model = ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.3")),  # Lower temp for medical accuracy
        reasoning={"effort": "medium"},
    )
    
    # Extract medical context from state
    symptoms = state.get('symptoms', [])
    medical_records = state.get('medical_records', '')
    questions_asked = state.get('questions_asked', [])
    responses = state.get('responses', [])
    
    # Build comprehensive medical context
    symptoms_str = ", ".join(symptoms) if symptoms else "No symptoms provided"
    medical_context = medical_records or "No medical history provided"
    
    # Create Q&A summary
    qa_summary = ""
    if questions_asked and responses:
        qa_pairs = []
        for q, a in zip(questions_asked, responses):
            qa_pairs.append(f"Q: {q}\nA: {a}")
        qa_summary = "\n\n".join(qa_pairs)
    
    # Build diagnostic prompt
    messages = [
        SystemMessage(content=(
            "You are an experienced physician providing a differential diagnosis. "
            "Based on the patient's symptoms, medical history, and answers to clarifying questions, "
            "provide your TOP 5 MOST LIKELY diagnoses.\n\n"
            "RESPOND ONLY WITH A VALID JSON OBJECT in this exact format:\n"
            "{\n"
            "  \"differential_diagnosis\": [\n"
            "    {\n"
            "      \"rank\": 1,\n"
            "      \"diagnosis\": \"Condition Name\",\n"
            "      \"probability_percent\": 45,\n"
            "      \"reasoning\": \"Brief clinical reasoning\",\n"
            "      \"key_features\": [\"symptom1\", \"finding2\"],\n"
            "      \"next_steps\": [\"test1\", \"treatment2\"]\n"
            "    }\n"
            "  ],\n"
            "  \"clinical_summary\": \"Overall assessment and recommendations\",\n"
            "  \"urgency_level\": 1,\n"
            "  \"urgency_level_text\": \"Emergency|High|Moderate|Low|Routine\",\n"
            "  \"disclaimer\": \"This is for educational/research purposes only. Not a substitute for professional medical advice. Patient should consult healthcare provider for proper evaluation.\"\n"
            "}\n\n"
            "IMPORTANT: Set 'urgency_level' as an INTEGER triage priority from 1 to 5 where 1=Emergency/Immediate, 2=High/Urgent, 3=Moderate, 4=Low, 5=Routine/Non-urgent.\n"
            "Include 'urgency_level_text' as a human-readable label matching the numeric level.\n\n"
            "Consider:\n"
            "- Most common conditions first (common things are common)\n"
            "- Age, gender, and risk factors\n"
            "- Red flags requiring immediate attention\n"
            "- Pattern recognition from symptom clusters\n"
            "- Temporal relationships and triggers\n"
            "- Atypical presentations and rare conditions that fit the clinical picture"
        )),
        HumanMessage(content=f"""
PATIENT PRESENTATION:
Symptoms: {symptoms_str}
Medical History: {medical_context}

CLINICAL INTERVIEW:
{qa_summary if qa_summary else "No additional questions were asked."}

Please provide your differential diagnosis with the top 5 most likely conditions.
        """)
    ]

    # Call the model for diagnosis
    response = model.invoke(messages)

    # Extract text content: some providers return structured content blocks
    raw_content = getattr(response, "content", None)
    diagnosis_text: Optional[str] = None

    if isinstance(raw_content, list):
        # Look for a block with a 'text' field
        for block in raw_content:
            if isinstance(block, dict):
                text_val = block.get("text")
                if isinstance(text_val, str):
                    diagnosis_text = text_val
                    break
    elif isinstance(raw_content, dict):
        # Single block dict with text
        text_val = raw_content.get("text")
        if isinstance(text_val, str):
            diagnosis_text = text_val
    elif isinstance(raw_content, (str, bytes, bytearray)):
        diagnosis_text = raw_content.decode() if isinstance(raw_content, (bytes, bytearray)) else raw_content

    if not diagnosis_text:
        # Fallback to stringifying whatever we got, or default message
        diagnosis_text = str(raw_content) if raw_content is not None else "Unable to generate diagnosis."

    # Normalize urgency to numeric if model didn't strictly follow schema
    try:
        payload = json.loads(diagnosis_text)

        def map_urgency_to_level(urgency_value) -> int:
            # Already numeric and in range
            if isinstance(urgency_value, (int, float)):
                lvl = int(urgency_value)
                if 1 <= lvl <= 5:
                    return lvl
            # Map strings to numeric
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
            # Default
            return 3

        # Ensure 'urgency_level' numeric and 'urgency_level_text' coherent
        if isinstance(payload, dict):
            numeric = None
            if "urgency_level" in payload:
                numeric = map_urgency_to_level(payload.get("urgency_level"))
            elif "urgency" in payload:
                numeric = map_urgency_to_level(payload.get("urgency"))
            elif "urgency_level_text" in payload:
                numeric = map_urgency_to_level(payload.get("urgency_level_text"))
            else:
                numeric = 3

            payload["urgency_level"] = int(numeric)

            # Keep/update a consistent text label
            text_map = {
                1: "Emergency",
                2: "High",
                3: "Moderate",
                4: "Low",
                5: "Routine",
            }
            payload["urgency_level_text"] = text_map.get(int(numeric), "Moderate")

            # Re-serialize
            diagnosis_text = json.dumps(payload)
    except Exception:
        # If parsing fails, return raw text
        pass

    return {"diagnosis": diagnosis_text}


def build_app():
    builder = StateGraph(State)
    builder.add_node("agent", agent_node)
    builder.add_node("final_output", final_output_node)

    builder.set_entry_point("agent")
    builder.add_edge("final_output", END)

    return builder.compile(checkpointer=MemorySaver())


def main():
    app = build_app()
    thread_id = "medical-diagnosis-1"
    config = {"configurable": {"thread_id": thread_id}}
    
    
    # Example medical case - you can modify these for different scenarios
    initial_state = {
        "symptoms": [
            "headache",
            "mild nausea"
        ],
        "medical_records": "28-year-old female, no significant medical history",
        "questions_asked": [],
        "responses": []
    }
    
    print("Medical Diagnosis System Starting...")
    print(f"Patient symptoms: {', '.join(initial_state['symptoms'])}")
    print(f"Medical history: {initial_state['medical_records']}")
    
    result = app.invoke(initial_state, config=config)

    # Medical diagnostic interview loop
    while isinstance(result, dict) and "__interrupt__" in result:
        payload = result["__interrupt__"][0].value
        # Two interrupt modes:
        # 1) Question flow from ask_user_for_input
        # 2) Confirmation from signal_diagnosis_complete

        if payload.get("action") == "confirm_diagnosis_complete":
            # Simple yes/no style confirmation in CLI; default to 'n' on empty
            prompt = payload.get("message", "Proceed to diagnosis? (y/N)")
            user_value = input(f"\n{prompt} ").strip() or "n"

            # Resume without altering Q/A lists
            result = app.invoke(Command(resume=user_value), config=config)
            continue

        # Default: question flow
        query = payload.get("query", "Please provide more information")
        options = payload.get("options")
        question_type = payload.get("question_type", "multiple_choice")

        print(f"\nTriage Assistant asks: {query}")

        if question_type == "open_ended":
            print("   (Please describe in your own words)")
            user_value = input(f"\n Patient response: ").strip()
            if not user_value:
                user_value = "No additional information provided"
        else:
            # Multiple choice question
            if options:
                try:
                    # If options is a dict of label->description
                    if isinstance(options, dict):
                        print("   Available options:")
                        for i, (k, v) in enumerate(options.items(), 1):
                            if v:
                                print(f"     {i}. {k}: {v}")
                            else:
                                print(f"     {i}. {k}")
                    else:
                        # Fallback for list[str]
                        print("   Available options:")
                        for i, option in enumerate(options, 1):
                            print(f"     {i}. {option}")
                except Exception:
                    print("   Medical options provided.")

            user_value = input(f"\n Patient response (choose number or describe): ").strip()

            # Handle numeric selection for multiple choice
            if user_value.isdigit() and options:
                try:
                    idx = int(user_value) - 1
                    if isinstance(options, dict):
                        user_value = list(options.keys())[idx]
                    else:
                        user_value = options[idx]
                except (IndexError, ValueError):
                    pass  # Keep original input if invalid selection

            if not user_value and options:
                # Default to first option if provided
                try:
                    if isinstance(options, dict):
                        user_value = next(iter(options.keys()))
                    else:
                        user_value = options[0]
                except Exception:
                    user_value = "Unknown"
            elif not user_value:
                user_value = "No additional information provided"

        print(f"   Response recorded: {user_value}")

        # Update the responses and questions_asked in state and resume
        current_state = app.get_state(config)
        current_responses = current_state.values.get('responses', [])
        current_questions = current_state.values.get('questions_asked', [])

        updated_responses = current_responses + [user_value]
        updated_questions = current_questions + [query]

        result = app.invoke(
            Command(
                resume=user_value,
                update={
                    "responses": updated_responses,
                    "questions_asked": updated_questions,
                },
            ),
            config=config,
        )

    # Print the final diagnosis
    if isinstance(result, dict) and "diagnosis" in result:
        print("\n" + "="*60)
        print("🏥 DIFFERENTIAL DIAGNOSIS (JSON)")
        print("="*60)

        diagnosis_payload = result["diagnosis"]
        
        # If the model returned a list/dict directly, pretty-print it
        if isinstance(diagnosis_payload, (list, dict)):
            print(json.dumps(diagnosis_payload, indent=2, ensure_ascii=False))
        else:
            try:
                # Ensure we have a string for json.loads
                if not isinstance(diagnosis_payload, (str, bytes, bytearray)):
                    diagnosis_payload = str(diagnosis_payload)
                # Try to parse as JSON for pretty printing
                diagnosis_json = json.loads(diagnosis_payload)
                print(json.dumps(diagnosis_json, indent=2, ensure_ascii=False))
            except (json.JSONDecodeError, TypeError):
                # Fallback to raw text if not valid JSON
                print("Raw output (not valid JSON):")
                print(diagnosis_payload)
    else:
        print("Unexpected result:", result)


if __name__ == "__main__":
    main()
