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
    ).bind_tools(tools, tool_choice="required")
    
    # Build the diagnostic context
    symptoms_str = ", ".join(symptoms) if symptoms else "No symptoms provided"
    medical_context = f"Medical Records: {medical_records or 'No medical history provided'}"
    questions_context = f"Previous Questions Asked: {len(questions_asked)}"
    
    # Analyze existing medical records for targeted questioning
    has_substantial_history = medical_records and medical_records.lower() not in ["no medical history provided", "no significant medical history", ""]
    
    # Extract key elements from medical history if available
    history_indicators = {
        "conditions": ["diabetes", "hypertension", "heart", "asthma", "copd", "arthritis", "depression", "anxiety", "cancer", "kidney", "liver"],
        "medications": ["medication", "taking", "prescribed", "pills", "injection", "insulin", "blood pressure", "pain medication"],
        "allergies": ["allergic", "allergy", "reaction", "sensitive", "intolerant"],
        "past_episodes": ["history of", "previous", "similar", "before", "recurring", "chronic"]
    }
    
    medical_context_flags = {}
    if has_substantial_history:
        history_lower = medical_records.lower()
        for category, keywords in history_indicators.items():
            medical_context_flags[category] = any(keyword in history_lower for keyword in keywords)
    
    # Analyze what areas have been covered based on previous questions
    covered_areas = []
    timing_questions = ["when", "started", "how long", "duration", "time"]
    severity_questions = ["severe", "pain scale", "rate", "intensity", "bad"]
    quality_questions = ["feel like", "describe", "type of", "kind of", "sensation"]
    trigger_questions = ["better", "worse", "trigger", "cause", "aggravate", "relieve"]
    associated_questions = ["other symptoms", "anything else", "along with", "together"]
    context_questions = ["doing when", "started when", "recent", "changes", "circumstances"]
    history_correlation_questions = ["relate", "connection", "similar", "medication", "condition", "before"]
    
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
    if any(word in all_questions_text for word in history_correlation_questions):
        covered_areas.append("history_correlation")
    
    # Balanced priority areas focusing equally on symptoms and medical history
    if has_substantial_history:
        # When medical history is available, balance symptom assessment with history correlation
        priority_areas = ["severity", "history_correlation", "history_correlation", "quality", "triggers", "associated_symptoms", "timing", "context"]
    else:
        # When minimal history, focus on symptom assessment with basic history gathering
        priority_areas = ["severity", "quality", "triggers", "associated_symptoms", "timing", "context", "basic_history"]
    
    missing_areas = []
    for area in priority_areas:
        if area not in covered_areas:
            missing_areas.append(area)
    
    # Generate medical history-informed guidance
    history_guidance = ""
    if has_substantial_history:
        history_guidance = f"MEDICAL HISTORY ANALYSIS:\n"
        for category, present in medical_context_flags.items():
            if present:
                history_guidance += f"• {category.title()} documented - use for targeted questions\n"
        history_guidance += "\n"
    
    coverage_guidance = f"Areas covered: {', '.join(covered_areas) if covered_areas else 'None'}\n"
    coverage_guidance += f"PRIORITY AREAS TO EXPLORE: {', '.join(missing_areas) if missing_areas else 'All key areas covered'}\n"
    if has_substantial_history:
        coverage_guidance += "STRATEGY: Balance symptom assessment with medical history analysis for comprehensive triage.\n"
    else:
        coverage_guidance += "STRATEGY: Focus on symptom assessment while gathering essential medical context.\n"
    coverage_guidance += history_guidance
        
    max_questions = 5
    min_questions_threshold = 3
        
    # Balanced completion criteria requiring both symptom and history assessment
    has_minimum_info = len(questions_asked) >= min_questions_threshold
    has_symptom_assessment = "severity" in covered_areas or "quality" in covered_areas
    has_history_assessment = "history_correlation" in covered_areas or not has_substantial_history
    has_balanced_coverage = has_symptom_assessment and has_history_assessment
    
    should_continue_questioning = (
        len(questions_asked) < max_questions and 
        (not has_minimum_info or not has_balanced_coverage)
    )
    
    messages = [
        SystemMessage(content=(
            "You are a HOSPITAL TRIAGE NURSE gathering information for emergency prioritization. The patient is ALREADY IN THE HOSPITAL seeking care. Ask ONE clear question at a time.\n\n"
            "TRIAGE CONTEXT: This patient has presented to the emergency department and needs immediate assessment for care priority.\n\n"
            f"PRESENTING SYMPTOMS: {symptoms_str}\n"
            f"MEDICAL HISTORY: {medical_context}\n"
            f"{questions_context}\n"
            f"{coverage_guidance}\n\n"
            "🩺 BALANCED TRIAGE ASSESSMENT PRIORITY:\n"
            "• SYMPTOM ANALYSIS: Thoroughly assess current symptoms (severity, quality, timing, triggers)\n"
            "• HISTORY CORRELATION: Connect current symptoms to documented medical history when available\n"
            "• EQUAL FOCUS: Give equal weight to current presentation and relevant medical background\n"
            "• COMPREHENSIVE VIEW: Integrate both new symptoms and existing conditions for complete triage\n\n"
            "Essential triage assessment areas (balanced approach):\n"
            "• SEVERITY & ACUITY: How severe? Getting worse? Life-threatening signs? (HIGHEST PRIORITY)\n"
            "• MEDICAL HISTORY CORRELATION: How do current symptoms relate to known conditions/medications?\n"
            "• TIMING: When started? Sudden or gradual onset? Duration?\n"
            "• QUALITY: Character of symptoms (sharp, dull, cramping, etc.)\n"
            "• TRIGGERS: What makes it better/worse? Activity-related?\n"
            "• ASSOCIATED SYMPTOMS: Other concerning signs (fever, SOB, chest pain, etc.)\n\n"
            f"Assessment Progress: {len(questions_asked)}/{max_questions} questions asked\n\n"
            "TRIAGE COMMUNICATION GUIDELINES:\n"
            "• Keep questions SHORT and URGENT (max 8-10 words)\n"
            "• Use clear medical terminology when appropriate\n"
            "• One focused question at a time\n"
            "• Professional but compassionate tone\n"
            "• Frame questions using patient's known medical context\n"
            "• Focus on severity and time-sensitive factors\n\n"
            "Actions (MANDATORY):\n"
            "• You MUST either ask a question or call a tool; never produce a final diagnosis directly from this node.\n"
            "• Need more info for triage: use ask_user_for_input tool\n"
            "• Have enough info (2+ questions asked AND most critical areas covered): use signal_diagnosis_complete tool\n"
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
                # Enhanced completion logic considering balanced coverage
                has_enough_for_diagnosis = (
                    not should_continue_questioning or 
                    (has_substantial_history and has_minimum_info and has_balanced_coverage)
                )
                
                if has_enough_for_diagnosis:
                    return signal_diagnosis_complete.invoke({})
                    
                # Generate targeted follow-up question based on medical history
                follow_up = "Any other important details for triage?"
                try:
                    if has_substantial_history and missing_areas:
                        area = missing_areas[0]
                        
                        # Generate history-informed questions based on documented conditions
                        def generate_history_correlation_question(med_records, symptom_list):
                            """Generate a question that connects current symptoms to medical history."""
                            history_lower = med_records.lower()
                            symptoms_str = ", ".join(symptom_list).lower()
                            
                            # Detect common condition patterns and generate relevant questions
                            if any(word in history_lower for word in ["diabetes", "diabetic"]):
                                if any(word in symptoms_str for word in ["nausea", "vomit", "dizzy", "confusion"]):
                                    return "Is your blood sugar normal today?"
                                return "How are your blood sugar levels lately?"
                            elif any(word in history_lower for word in ["hypertension", "blood pressure", "bp"]):
                                if any(word in symptoms_str for word in ["headache", "dizzy", "chest"]):
                                    return "Have you checked your blood pressure recently?"
                                return "Are you taking your BP medication as usual?"
                            elif any(word in history_lower for word in ["heart", "cardiac", "coronary"]):
                                if any(word in symptoms_str for word in ["chest", "pain", "short", "breath"]):
                                    return "Does this feel like your previous heart episodes?"
                                return "How does this compare to your usual heart symptoms?"
                            elif any(word in history_lower for word in ["asthma", "copd", "respiratory"]):
                                if any(word in symptoms_str for word in ["breath", "cough", "wheez"]):
                                    return "Did you use your rescue inhaler?"
                                return "Is this similar to your usual breathing issues?"
                            elif any(word in history_lower for word in ["medication", "taking", "prescribed"]):
                                return "Any changes to your medications recently?"
                            else:
                                return "Does this relate to any of your known conditions?"
                        
                        history_informed_prompts = {
                            "history_correlation": generate_history_correlation_question(medical_records, symptoms),
                            "severity": "How severe is this compared to your usual symptoms?",
                            "quality": "Does this feel different from your previous episodes?",
                            "triggers": "Is this similar to what typically triggers your condition?",
                            "associated_symptoms": "Any symptoms different from your usual pattern?",
                            "timing": "When did this start compared to your medication schedule?",
                            "context": "What were you doing when this started?"
                        }
                        
                        follow_up = history_informed_prompts.get(area, follow_up)
                        
                    elif missing_areas:
                        # Standard questions when no substantial history
                        area = missing_areas[0]
                        standard_prompts = {
                            "severity": "How severe is this symptom right now?",
                            "quality": "Describe the exact character of this symptom?",
                            "triggers": "What makes it better or worse?",
                            "associated_symptoms": "Any other concerning symptoms?",
                            "context": "What were you doing when this started?",
                            "timing": "When exactly did this start?",
                            "basic_history": "Any relevant medical conditions or medications?"
                        }
                        follow_up = standard_prompts.get(area, follow_up)
                except Exception:
                    pass
                return ask_user_for_input.invoke({
                    "query": follow_up,
                    "question_type": "open_ended",
                })
    
    # No tool calls should not happen with tool_choice="required", but guard anyway
    # Use enhanced completion criteria
    has_enough_for_diagnosis = (
        not should_continue_questioning or 
        (has_substantial_history and has_minimum_info and has_balanced_coverage)
    )
    
    if has_enough_for_diagnosis:
        return signal_diagnosis_complete.invoke({})
        
    # Fallback: ask a targeted question based on available medical history
    if has_substantial_history and missing_areas:
        area = missing_areas[0]
        if area == "history_correlation":
            fallback_question = "How does this relate to your known medical conditions?"
        elif area == "severity":
            fallback_question = "How severe is this compared to your usual symptoms?"
        else:
            fallback_question = "Is there anything else I should know?"
    else:
        fallback_question = "Any other important symptoms or details?"
        
    return ask_user_for_input.invoke({
        "query": fallback_question,
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
    
    # Analyze medical history comprehensiveness
    has_comprehensive_history = medical_records and len(medical_records) > 50 and medical_records.lower() not in [
        "no medical history provided", "no significant medical history", "unremarkable", "none"
    ]
    
    # Build diagnostic prompt with heavy medical history emphasis
    messages = [
        SystemMessage(content=(
            "You are an EMERGENCY DEPARTMENT PHYSICIAN providing a TRIAGE-FOCUSED differential diagnosis. "
            "This patient is ALREADY IN THE HOSPITAL and requires immediate priority assessment. "
            "Based on the patient's symptoms, medical history, and triage interview, "
            "provide your TOP 5 MOST LIKELY diagnoses with MEDICAL HISTORY as PRIMARY DIAGNOSTIC DRIVER.\n\n"
            "BALANCED DIAGNOSTIC APPROACH:\n"
            f"• Medical History Available: {'COMPREHENSIVE' if has_comprehensive_history else 'LIMITED'}\n"
            "• SYMPTOM ANALYSIS: Thoroughly evaluate current presentation, severity, and acuity\n"
            "• HISTORY INTEGRATION: Consider how symptoms relate to documented conditions\n"
            "• EQUAL WEIGHTING: Balance current clinical picture with medical background\n\n"
            "RESPOND ONLY WITH A VALID JSON OBJECT in this exact format:\n"
            "{\n"
            "  \"differential_diagnosis\": [\n"
            "    {\n"
            "      \"rank\": 1,\n"
            "      \"diagnosis\": \"Condition Name\",\n"
            "      \"probability_percent\": 45,\n"
            "      \"reasoning\": \"START with medical history analysis, then clinical reasoning\",\n"
            "      \"key_features\": [\"symptom1\", \"history_connection1\", \"finding2\"],\n"
            "      \"next_steps\": [\"history_guided_test1\", \"targeted_intervention2\"],\n"
            "      \"medical_history_relevance\": \"DETAILED explanation of how patient's documented history supports this diagnosis\",\n"
            "      \"history_confidence_score\": 85\n"
            "    }\n"
            "  ],\n"
            "  \"clinical_summary\": \"Balanced assessment integrating current symptoms with medical history\",\n"
            "  \"urgency_level\": 1,\n"
            "  \"urgency_level_text\": \"Emergency|High|Moderate|Low|Routine\",\n"
            "  \"symptom_analysis_impact\": \"Analysis of how current symptoms drive the diagnostic assessment\",\n"
            "  \"medical_history_impact\": \"Analysis of how documented history informs the diagnostic assessment\",\n"
            "  \"balanced_insights\": \"Key insights derived from integrating symptoms with medical background\",\n"
            "  \"disclaimer\": \"This is a triage assessment tool utilizing comprehensive medical history analysis.\"\n"
            "}\n\n"
            "🚨 BALANCED DIAGNOSTIC PRIORITIES:\n"
            f"- WEIGHT FACTOR: {'50%' if has_comprehensive_history else '30%'} medical history, {'50%' if has_comprehensive_history else '70%'} current symptoms\n"
            "- Prioritize conditions that are:\n"
            "  1. COMPLICATIONS of existing conditions (highest priority)\n"
            "  2. EXACERBATIONS of chronic diseases\n"
            "  3. MEDICATION-RELATED adverse effects or interactions\n"
            "  4. PROGRESSION of documented conditions\n"
            "  5. NEW conditions in context of existing comorbidities\n\n"
            "DIAGNOSTIC REASONING FRAMEWORK:\n"
            "1. SYMPTOM ANALYSIS (CO-PRIMARY): Evaluate current presentation, severity, and clinical features\n"
            "2. MEDICAL HISTORY INTEGRATION (CO-PRIMARY): Review documented conditions, medications, allergies\n"
            "3. PATTERN CORRELATION: Compare current presentation to patient's historical patterns\n"
            "4. RISK STRATIFICATION: Consider both acute symptoms and patient's comorbidity profile\n"
            "5. COMPREHENSIVE ASSESSMENT: Balance current clinical picture with overall health context\n\n"
            "⚡ MANDATORY: Every diagnosis MUST balance symptom analysis with medical history correlation, providing confidence scoring for both."
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
        "medical_records": "28-year-old female with history of migraines, currently taking sumatriptan PRN and propranolol 40mg daily for migraine prevention. Previous episodes typically triggered by stress and lack of sleep, characterized by unilateral throbbing headache with nausea and light sensitivity. Last severe episode was 3 months ago.",
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
