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
    max_questions = 10  # Allow for more thorough information gathering
    should_continue_questioning = len(questions_asked) < max_questions
    
    messages = [
        SystemMessage(content=(
            "You are a thorough medical assistant helping to understand a patient's symptoms. Your role is to:\n"
            "1. Gather comprehensive information about the patient's condition\n"
            "2. Ask ONE thoughtful, strategic question at a time\n"
            "3. Continue questioning until you have enough information for accurate diagnosis\n\n"
            "CURRENT SITUATION:\n"
            f"What the patient is experiencing: {symptoms_str}\n"
            f"{medical_context}\n"
            f"{questions_context}\n\n"
            f"COVERAGE ANALYSIS:\n"
            f"{coverage_guidance}\n\n"
            "MANDATORY QUESTION AREAS - You MUST ask about ALL of these systematically:\n"
            "\n"
            "1. TIMING (if not covered): When did symptoms start? How long do they last? Any pattern?\n"
            "2. SEVERITY (if not covered): Rate 1-10? Interfering with activities? Getting worse/better?\n"
            "3. QUALITY (ALWAYS ask): What does it feel like? Sharp/dull/throbbing/burning/pressure?\n"
            "4. LOCATION (ALWAYS ask): Exactly where? Does it spread anywhere?\n"
            "5. TRIGGERS (CRITICAL): What makes it better or worse? Food, position, activity, rest?\n"
            "6. ASSOCIATED SYMPTOMS (CRITICAL): Any other symptoms happening at the same time?\n"
            "7. CONTEXT (CRITICAL): What were you doing when it started? Any recent changes?\n"
            "8. MEDICAL HISTORY (CRITICAL): Ever had this before? Family history? Current medications?\n"
            "9. FUNCTIONAL IMPACT: How is this affecting your daily life, sleep, work?\n"
            "\n"
            "QUESTIONING SEQUENCE: After basic timing/severity, IMMEDIATELY move to quality, triggers, associated symptoms, and context.\n"
            "DO NOT get stuck on just timing and severity questions - branch out to explore other diagnostic areas.\n\n"
            "QUESTION TYPES - Mix these for comprehensive assessment:\n"
            "\n"
            "EXAMPLE QUESTIONS BY CATEGORY:\n"
            "\n"
            "QUALITY/DESCRIPTION (open_ended):\n"
            "- 'Can you describe exactly what this pain feels like?'\n"
            "- 'What words would you use to describe the sensation?'\n"
            "\n"
            "TRIGGERS/PATTERNS (open_ended):\n"
            "- 'What makes this better or worse?'\n"
            "- 'Have you noticed anything that seems to trigger it?'\n"
            "- 'Does changing position, eating, or resting affect it?'\n"
            "\n"
            "ASSOCIATED SYMPTOMS (open_ended):\n"
            "- 'Are you experiencing any other symptoms along with this?'\n"
            "- 'Have you noticed anything else unusual happening in your body?'\n"
            "\n"
            "CONTEXT/CIRCUMSTANCES (open_ended):\n"
            "- 'What were you doing when this first started?'\n"
            "- 'Has anything changed in your life recently - diet, stress, medications, activities?'\n"
            "- 'Tell me about the day this began.'\n"
            "\n"
            "MEDICAL HISTORY (multiple_choice + open_ended):\n"
            "- 'Have you ever experienced anything like this before?' (Yes/No/Not sure)\n"
            "- 'What medications are you currently taking?' (open_ended)\n"
            "- 'Does anyone in your family have similar health issues?' (open_ended)\n"
            "\n"
            "MANDATORY: After 2 basic questions (timing/severity), you MUST ask about triggers, associated symptoms, or context.\n\n"
            "LANGUAGE GUIDELINES:\n"
            "- Use simple, everyday words instead of medical terms\n"
            "- Be conversational and empathetic\n"
            "- For multiple choice: include 'other' or 'not sure' options\n"
            "- For open questions: encourage detailed, personal descriptions\n\n"
            f"PROGRESS CHECK:\n"
            f"- Questions asked so far: {len(questions_asked)}/{max_questions}\n"
            f"- REQUIRED MINIMUM: You MUST ask at least 5 questions before responding 'READY_FOR_DIAGNOSIS'.\n"
            f"- IDENTIFY which critical areas are still missing from the conversation\n"
            f"- REQUIRED COVERAGE: You must have asked about timing, severity, quality, location, and at least 2 of: triggers, associated symptoms, context, medical history, functional impact.\n"
            f"- Do not respond 'READY_FOR_DIAGNOSIS' before both conditions are met, even if you think you have enough information.\n\n"
            f"AREA COVERAGE CHECK - Look at previous Q&A and identify what's missing:\n"
            f"□ Basic timing and severity (usually covered first)\n"
            f"□ Quality/description of symptoms (what does it feel like?)\n"
            f"□ Triggers and modifying factors (what makes it better/worse?)\n"
            f"□ Associated symptoms (other symptoms happening together?)\n"
            f"□ Context and circumstances (what was happening when it started?)\n"
            f"□ Medical history and medications (past episodes, current meds?)\n"
            f"□ Functional impact (how affecting daily life?)\n\n"
            f"INFORMATION COMPLETENESS CHECKLIST:\n"
            f"CRITICAL (must have for diagnosis):\n"
            f"  ✓ TIMING: When did symptoms start? How long have they lasted?\n"
            f"  ✓ SEVERITY: How intense/severe are the symptoms? Impact on daily life?\n"
            f"  ✓ CHARACTER: What do the symptoms feel like? (quality, description)\n"
            f"  ✓ LOCATION: Where exactly are the symptoms? Do they spread?\n"
            f"\n"
            f"IMPORTANT (should have for accurate diagnosis):\n"
            f"  ✓ TRIGGERS: What makes symptoms better or worse?\n"
            f"  ✓ ASSOCIATED: Any other symptoms happening at the same time?\n"
            f"  ✓ CONTEXT: What was happening when symptoms started? Recent changes?\n"
            f"  ✓ HISTORY: Similar episodes before? Family history? Current medications?\n"
            f"\n"
            f"DECISION FRAMEWORK:\n"
            f"- If you need more specific information about symptoms: use ask_user_for_input tool\n"
            f"- If you have gathered comprehensive diagnostic information: respond 'READY_FOR_DIAGNOSIS'\n"
            f"- Aim to ask 4-8 thoughtful questions covering different diagnostic areas\n"
            f"- Don't ask too many similar questions - diversify your inquiry\n\n"
            f"QUESTIONING GUIDELINES:\n"
            f"1. Start with basic timing and severity if not clear\n"
            f"2. Then explore quality, triggers, associated symptoms, context\n"
            f"3. Include medical history and functional impact\n"
            f"4. Use both open-ended and multiple choice questions\n"
            f"5. Stop when you have enough information for differential diagnosis\n\n"
            f"NEXT ACTION:\n"
            f"- Review the missing areas above and the previous conversation\n"
            f"- If important diagnostic information is still missing OR minimum question count not reached: use ask_user_for_input\n"
            f"- Only respond 'READY_FOR_DIAGNOSIS' when:\n"
            f"  1. Minimum number of questions (5) has been asked\n"
            f"  2. Sufficient coverage of critical diagnostic areas has been achieved\n"
            "- Focus on asking thoughtful questions, not rushing to diagnosis"
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
                    "question_type": tool_args.get("question_type", "multiple_choice")
                }
                
                # Update state and return the interrupt
                return ask_user_for_input.invoke(params)
    
    # No tool calls - proceed to diagnosis only if we have enough information
    return Command(goto="final_output")


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
