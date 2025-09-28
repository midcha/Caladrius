from langgraph.types import interrupt, Command
from typing import Optional, Dict
from langchain_core.tools import tool
from langchain_core.messages import AIMessage, HumanMessage

@tool
def ask_user_for_input(
    query: str,
    options: Optional[Dict[str, str]] = None,
    question_type: str = "multiple_choice",
) -> Command:
    """
    Ask patients short, direct medical questions to gather information.
    
    Args:
        query: A clear, patient-friendly question using everyday language
        options: Dictionary of answer choices for multiple choice questions.
                Example: {"A few hours ago": "", "Yesterday": "", "Several days ago": ""}
                Set to None for open-ended questions.
    question_type: Type of question - "multiple_choice", "open_ended", or "select_multiple"
        
    QUESTION STYLE:
    - Keep questions SHORT and direct (max 10-12 words)
    - Use simple, everyday language
    - One question per call
    - Be empathetic but concise
    
    EXAMPLES:
    Multiple choice: "When did this pain start?"
    Open-ended: "How would you describe the pain?"
    
    Returns:
        Command to update state and continue diagnosis
    """
        
    # Create interrupt payload
    interrupt_payload = {"query": query, "question_type": question_type}
    if options and question_type in ("multiple_choice", "select_multiple"):
        interrupt_payload["options"] = options
        
    # Get user input through interrupt
    user_input = interrupt(interrupt_payload)

    # If the UI returns multiple selections as a list for select_multiple,
    # normalize it to a comma-separated string for consistent downstream handling.
    if question_type == "select_multiple":
        try:
            if isinstance(user_input, list):
                user_input = ", ".join(str(x) for x in user_input)
        except Exception:
            pass
    
    # Create faux messages representing this interaction
    # This preserves the conversation flow for better AI understanding
    if question_type == "open_ended":
        ai_question = AIMessage(content=f"Can you help me understand: {query}")
    else:
        ai_question = AIMessage(content=f"I need to clarify something: {query}")
        if options:
            # If options is a dict of label->description
            if isinstance(options, dict):
                if question_type == "select_multiple":
                    ai_question.content += f" You may choose one or more of: {', '.join(f'{op}: {description}' for op, description in options.items())}"
                else:
                    ai_question.content += f" Please choose from: {', '.join(f'{op}: {description}' for op, description in options.items())}"
            else:
                # Fallback for list[str]
                if question_type == "select_multiple":
                    ai_question.content += f" You may choose one or more of: {', '.join(options)}"
                else:
                    ai_question.content += f" Please choose from: {', '.join(options)}"

    user_response = HumanMessage(content=user_input)
    
    # Return a Command that adds the conversation messages to state
    return Command(update={"messages": [ai_question, user_response]}, goto="agent")


@tool
def signal_diagnosis_complete(
    confirmation_message: str = "I have enough information to provide your diagnosis. Ready to proceed? (y/N)",
) -> Command:
    """
    Signal that the agent has gathered sufficient information and is ready
    to produce the final diagnosis. This tool triggers an interrupt so the UI
    (or CLI) can confirm before continuing. Once resumed, it routes to the
    final output node.

    Behavior:
    - Interrupts with an action payload so clients can render a confirmation UI
    - If the resumed value looks like a negative/cancel, it returns to the agent
    - Otherwise, it proceeds to the "final_output" node
    """

    # Ask UI/user to confirm proceeding to diagnosis
    ack = interrupt({
        "action": "confirm_diagnosis_complete",
        "message": confirmation_message,
    })

    # Normalize the acknowledgment for simple yes/no handling
    try:
        ack_norm = str(ack).strip().lower()
    except Exception:
        ack_norm = ""

    # Proceed only on explicit yes/y; otherwise go back to agent
    if ack_norm in {"y", "yes"}:
        ai_msg = AIMessage(content="Thanks. Generating your differential diagnosis now.")
        return Command(update={"messages": [ai_msg]}, goto="final_output")
    else:
        ai_msg = AIMessage(content="Okay. I’ll ask a few more clarifying questions.")
        return Command(update={"messages": [ai_msg]}, goto="agent")