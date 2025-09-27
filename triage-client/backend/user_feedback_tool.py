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
    Ask patients medical questions in different formats to gather comprehensive information.
    
    This tool supports both structured (multiple choice) and open-ended questioning
    to gather detailed medical information from patients.
    
    Args:
        query: A clear, patient-friendly question using everyday language
        options: Dictionary of answer choices for multiple choice questions.
                Example: {"A few hours ago": "", "Yesterday": "", "Several days ago": ""}
                Set to None for open-ended questions.
    question_type: Type of question - "multiple_choice", "open_ended", or "select_multiple"
        
    QUESTION TYPE GUIDELINES:
    
    MULTIPLE CHOICE - Use when:
    - Asking about timing, severity scales, frequency
    - Need specific categorical answers
    - Patient needs guidance on possible responses
    - Examples: pain scales, time periods, yes/no questions
    
    OPEN-ENDED - Use when:  
    - Asking for descriptions of sensations or symptoms
    - Gathering detailed context or history
    - Need patient's own words and perspective
    - Examples: "Describe the pain", "What makes it worse?", "Tell me about your day when this started"
    
    LANGUAGE GUIDELINES:
    - Always use simple, everyday words (avoid medical jargon)
    - Be specific but conversational
    - Show empathy and understanding
        
    Returns:
        Command to update state with conversation messages and continue diagnosis
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