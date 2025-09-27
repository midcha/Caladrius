import os
from typing import Optional, TypedDict, Annotated

import dotenv
from langgraph.graph import StateGraph, END, add_messages
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.tools import tool
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI

from user_feedback_tool import ask_user_for_input

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
tools = [ask_user_for_input]
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
        temperature=0
    ).bind_tools(tools)
    
    # Build the diagnostic context
    symptoms_str = ", ".join(symptoms) if symptoms else "No symptoms provided"
    medical_context = f"Medical Records: {medical_records or 'No medical history provided'}"
    questions_context = f"Previous Questions Asked: {len(questions_asked)}"
    
    # Determine if we should ask more questions or proceed to diagnosis
    max_questions = 5  # Limit to prevent infinite questioning
    should_continue_questioning = len(questions_asked) < max_questions
    
    messages = [
        SystemMessage(content=(
            "You are a friendly medical assistant helping to understand a patient's symptoms. Your role is to:\n"
            "1. Look at what the patient is feeling and their health history\n"
            "2. Ask ONE simple, clear question to learn more\n"
            "3. Keep asking until you have enough information to help\n\n"
            "CURRENT SITUATION:\n"
            f"What the patient is experiencing: {symptoms_str}\n"
            f"{medical_context}\n"
            f"{questions_context}\n\n"
            "HOW TO ASK QUESTIONS:\n"
            "- Use simple, everyday language that anyone can understand\n"
            "- ALWAYS provide multiple choice options whenever possible\n"
            "- Make options clear and easy to choose from\n"
            "- Avoid medical jargon - use words patients know\n"
            "- Ask about: when it started, how bad it is, what makes it better/worse\n"
            "- Ask about related symptoms, medications, family health history\n"
            "- Consider unusual questions that might reveal important clues\n"
            "- Examples: recent travel, work environment, stress, diet changes, sleep patterns\n\n"
            "QUESTION GUIDELINES:\n"
            "- Always offer 2-6 clear answer choices\n"
            "- Use simple words instead of medical terms\n"
            "- Make questions specific but easy to understand\n"
            "- Include ranges like 'mild/moderate/severe' or time periods\n"
            "- Offer 'other' or 'none of these' as an option when appropriate\n\n"
            f"PROGRESS CHECK:\n"
            f"- Questions asked so far: {len(questions_asked)}/{max_questions}\n"
            f"- If you need more information AND haven't reached question limit: use ask_user_for_input\n"
            f"- If you have enough information OR reached question limit: respond 'READY_FOR_DIAGNOSIS'\n\n"
            "IMPORTANT: Always provide answer options in your questions. Make them simple and clear. "
            "Use everyday language, not medical terms. Be helpful and caring in your tone."
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
    if response.tool_calls and should_continue_questioning:
        for tool_call in response.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call.get("args", {}) or {}

            if tool_name == "ask_user_for_input":
                # Store the question being asked
                question = tool_args.get("query", "Please provide more information")
                updated_questions = questions_asked + [question]
                
                # Use the interrupt-capable tool to gather user input
                params = {
                    "query": question,
                    "options": tool_args.get("options"),
                }
                
                # Update state and return the interrupt
                return ask_user_for_input.invoke(params)
    
    # No more questions needed or limit reached, proceed to diagnosis
    return Command(goto="final_output")


def final_output_node(state: State):
    """Generate final medical diagnosis with top 5 possible causes."""
    log_step("FINAL_OUTPUT_NODE", state, "Generating differential diagnosis")
    
    # Initialize ChatOpenAI
    model = ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.3"))  # Lower temp for medical accuracy
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
            "  \"urgency_level\": \"low|moderate|high|emergency\",\n"
            "  \"disclaimer\": \"This is for educational/research purposes only. Not a substitute for professional medical advice. Patient should consult healthcare provider for proper evaluation.\"\n"
            "}\n\n"
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
    
    diagnosis_content = response.content if response.content else "Unable to generate diagnosis."
    
    return {"diagnosis": diagnosis_content}


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
    
    app.get_graph().draw_mermaid()  # Visualize the graph
    
    # Example medical case - you can modify these for different scenarios
    initial_state = {
        "symptoms": [
            "chest pain",
            "shortness of breath", 
            "fatigue",
            "dizziness"
        ],
        "medical_records": "45-year-old male, hypertension, family history of heart disease, smoker for 20 years",
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
        query = payload.get("query", "Please provide more information")
        options = payload.get("options")
        
        print(f"\n Triage Assistant asks: {query}")
        if options:
            try:
                # If options is a dict of label->description
                if isinstance(options, dict):
                    print("   Available options:")
                    for k, v in options.items():
                        if v:
                            print(f"     - {k}: {v}")
                        else:
                            print(f"     - {k}")
                else:
                    # Fallback for list[str]
                    print(f"   Available options: {', '.join(options)}")
            except Exception:
                print("   Medical options provided.")
        
        user_value = input(f"\n Patient response: ").strip()
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
        
        # Update the responses in state and resume
        current_state = app.get_state(config)
        current_responses = current_state.values.get('responses', [])
        updated_responses = current_responses + [user_value]
        
        result = app.invoke(Command(resume=user_value, update={"responses": updated_responses}), config=config)

    # Print the final diagnosis
    if isinstance(result, dict) and "diagnosis" in result:
        print("\n" + "="*60)
        print("🏥 DIFFERENTIAL DIAGNOSIS (JSON)")
        print("="*60)
        
        try:
            # Try to parse as JSON for pretty printing
            diagnosis_json = json.loads(result["diagnosis"])
            print(json.dumps(diagnosis_json, indent=2, ensure_ascii=False))
        except json.JSONDecodeError:
            # Fallback to raw text if not valid JSON
            print("Raw output (not valid JSON):")
            print(result["diagnosis"])
    else:
        print("Unexpected result:", result)


if __name__ == "__main__":
    main()
