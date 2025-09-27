from langgraph.types import interrupt, Command
from typing import Optional, Dict
from langchain_core.tools import tool
from langchain_core.messages import AIMessage, HumanMessage

@tool
def ask_user_for_input(
    query: str,
    options: Optional[Dict[str, str]] = None,
) -> Command:
    """
    Ask patients simple, clear questions with easy-to-understand answer choices.
    
    This tool helps gather medical information by asking one question at a time with 
    multiple choice options that patients can easily understand and respond to.
    
    Args:
        query: A simple, patient-friendly question (e.g., "When did your headache start?")
        options: Dictionary of answer choices that are clear and easy to understand.
                Example: {"A few hours ago": "", "Yesterday": "", "Several days ago": "", "More than a week ago": ""}
        
    IMPORTANT GUIDELINES:
    - Always use simple, everyday language that any patient can understand
    - Avoid medical jargon and technical terms
    - Provide 2-6 clear answer options whenever possible  
    - Make options specific but easy to choose from
    - Include ranges, time periods, or severity scales when helpful
        
    Returns:
        Command to update state with conversation messages and continue diagnosis
    """
        
    # Create interrupt payload
    interrupt_payload = {"query": query}
    if options:
        interrupt_payload["options"] = options
        
    # Get user input through interrupt
    user_input = interrupt(interrupt_payload)
    
    # Create faux messages representing this interaction
    # This preserves the conversation flow for better AI understanding
    ai_question = AIMessage(content=f"I need to clarify something: {query}")
    if options:
        # If options is a dict of label->description
        if isinstance(options, dict):

            ai_question.content += f" Please choose from: {', '.join(f'{op}: {description}' for op, description in options.items())}"
        else:
            # Fallback for list[str]
            ai_question.content += f" Please choose from: {', '.join(options)}"

    user_response = HumanMessage(content=user_input)
    
    # Return a Command that adds the conversation messages to state
    return Command(update={"messages": [ai_question, user_response]}, goto="agent")