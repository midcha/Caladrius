from langgraph.types import interrupt, Command
from typing import Optional, Dict, Any, List, Union
from langchain_core.tools import tool
from langchain_core.messages import AIMessage, HumanMessage
import json

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
def query_medical_history(
    medical_records: Union[str, Dict[str, Any]],
    field_path: str,
    specific_criteria: Optional[str] = None
) -> str:
    """
    Query specific fields from the medical history JSON to get relevant patient information.
    
    Args:
        medical_records: JSON string or dictionary containing the patient's medical history
        field_path: Dot notation path to the field (e.g., "medicalHistory.allergies", "medicalHistory.prescriptions.0.medication")
        specific_criteria: Optional filter criteria for lists (e.g., "name=Albuterol" for medications)
        
    FIELD PATH EXAMPLES:
    - "medicalHistory.allergies" - Get all allergies
    - "medicalHistory.prescriptions" - Get all current prescriptions 
    - "medicalHistory.familyHistory" - Get family medical history
    - "medicalHistory.labs" - Get recent lab results
    - "medicalHistory.imaging" - Get imaging studies
    - "medicalHistory.personalHistory.occupation" - Get occupation
    - "medicalHistory.personalHistory.substanceUsage" - Get substance use history
    - "bloodType" - Get blood type
    - "sex" - Get patient sex
    - "ethnicity" - Get ethnicity
    
    CRITERIA EXAMPLES:
    - "severity=Severe" - For allergies with severe reactions
    - "testName=CBC" - For specific lab test
    - "type=CT" - For specific imaging type
    - "relation=Father" - For family history from father
    
    Returns:
        Formatted string with the requested medical information, or error message if not found
    """
    
    try:
        # Parse the medical records JSON
        if not medical_records:
            return "No medical records available."
        
        # Check for empty string only if it's a string
        if isinstance(medical_records, str) and medical_records.strip() == "":
            return "No medical records available."
        
        # Handle both string JSON and already parsed dict/object
        if isinstance(medical_records, str):
            try:
                medical_data = json.loads(medical_records)
            except json.JSONDecodeError as e:
                # Check if this is a plain text medical record (not JSON)
                if medical_records.strip().startswith(("{", "[")):
                    # Looks like JSON but malformed
                    debug_preview = medical_records[:200] if len(medical_records) > 200 else medical_records
                    return f"JSON parsing failed: {str(e)}. Preview of records: {debug_preview}"
                else:
                    # This is plain text medical records, not structured JSON
                    return f"Medical records are in text format, not structured JSON. Cannot query specific field '{field_path}'. Text summary: {medical_records[:300]}{'...' if len(medical_records) > 300 else ''}"
        elif isinstance(medical_records, dict):
            medical_data = medical_records
        else:
            return f"Unsupported medical records format: {type(medical_records)}"
        
        # Navigate to the requested field using dot notation
        current_data = medical_data
        path_parts = field_path.split('.')
        
        for part in path_parts:
            if part.isdigit():
                # Handle array index
                idx = int(part)
                if isinstance(current_data, list) and 0 <= idx < len(current_data):
                    current_data = current_data[idx]
                else:
                    return f"Index {idx} not found in array at path {field_path}"
            else:
                # Handle object key
                if isinstance(current_data, dict) and part in current_data:
                    current_data = current_data[part]
                else:
                    return f"Field '{part}' not found at path {field_path}"
        
        # Apply specific criteria filter if provided
        if specific_criteria and isinstance(current_data, list):
            current_data = _filter_by_criteria(current_data, specific_criteria)
        
        # Format the result for medical context
        return _format_medical_data(current_data, field_path)
        
    except json.JSONDecodeError:
        return "Error: Invalid medical records JSON format."
    except Exception as e:
        return f"Error querying medical history: {str(e)}"


def _filter_by_criteria(data_list: List[Dict], criteria: str) -> List[Dict]:
    """Filter a list of items based on criteria like 'name=Albuterol' or 'severity=Severe'"""
    
    if '=' not in criteria:
        return data_list
        
    key, value = criteria.split('=', 1)
    key = key.strip()
    value = value.strip()
    
    filtered = []
    for item in data_list:
        if isinstance(item, dict):
            # Handle nested medication arrays in prescriptions
            if key == "name" and "medication" in item:
                for med in item.get("medication", []):
                    if isinstance(med, dict) and med.get("name", "").lower() == value.lower():
                        filtered.append(item)
                        break
            # Direct field match
            elif key in item and str(item[key]).lower() == value.lower():
                filtered.append(item)
    
    return filtered


def _format_medical_data(data: Any, field_path: str) -> str:
    """Format medical data into a readable string for the AI assistant"""
    
    if data is None:
        return f"No data found for {field_path}"
    
    if isinstance(data, str):
        return data
    
    if isinstance(data, (int, float, bool)):
        return str(data)
    
    if isinstance(data, list):
        if not data:
            return f"No entries found for {field_path}"
        
        # Format different types of medical lists
        if "allergies" in field_path:
            return _format_allergies(data)
        elif "prescriptions" in field_path:
            return _format_prescriptions(data)
        elif "labs" in field_path:
            return _format_labs(data)
        elif "imaging" in field_path:
            return _format_imaging(data)
        elif "familyHistory" in field_path:
            return _format_family_history(data)
        elif "encounters" in field_path:
            return _format_encounters(data)
        else:
            # Generic list formatting
            return "; ".join([str(item) for item in data])
    
    if isinstance(data, dict):
        # Format specific object types
        if "personalHistory" in field_path:
            return _format_personal_history(data)
        else:
            # Generic dict formatting
            return "; ".join([f"{k}: {v}" for k, v in data.items()])
    
    return str(data)


def _format_allergies(allergies: List[Dict]) -> str:
    """Format allergy information"""
    formatted = []
    for allergy in allergies:
        name = allergy.get("name", "Unknown")
        reaction = allergy.get("reaction", "Unknown reaction")
        severity = allergy.get("severity", "Unknown severity")
        formatted.append(f"{name} ({severity}): {reaction}")
    return "; ".join(formatted)


def _format_prescriptions(prescriptions: List[Dict]) -> str:
    """Format prescription information"""
    formatted = []
    for rx in prescriptions:
        medications = rx.get("medication", [])
        for med in medications:
            name = med.get("name", "Unknown")
            strength = med.get("strength", "")
            form = med.get("dosageForm", "")
            instructions = rx.get("instructions", "")
            med_info = f"{name}"
            if strength:
                med_info += f" {strength}"
            if form:
                med_info += f" ({form})"
            if instructions:
                med_info += f" - {instructions}"
            formatted.append(med_info)
    return "; ".join(formatted)


def _format_labs(labs: List[Dict]) -> str:
    """Format lab results"""
    formatted = []
    for lab in labs:
        test_name = lab.get("testName", "Unknown test")
        result = lab.get("result", "No result")
        date = lab.get("testDate", "Unknown date")
        if date:
            # Extract just the date part
            date = date.split("T")[0]
        formatted.append(f"{test_name} ({date}): {result}")
    return "; ".join(formatted)


def _format_imaging(imaging: List[Dict]) -> str:
    """Format imaging studies"""
    formatted = []
    for study in imaging:
        study_type = study.get("type", "Unknown")
        body_region = study.get("bodyRegion", "Unknown region")
        date = study.get("studyDate", "Unknown date")
        if date:
            date = date.split("T")[0]
        impression = study.get("report", {}).get("impression", "No impression available")
        formatted.append(f"{study_type} {body_region} ({date}): {impression}")
    return "; ".join(formatted)


def _format_family_history(family_history: List[Dict]) -> str:
    """Format family history"""
    formatted = []
    for history in family_history:
        condition = history.get("condition", "Unknown condition")
        relation = history.get("relation", "Unknown relation")
        age = history.get("diagnosisAge", "Unknown age")
        formatted.append(f"{condition} in {relation} (age {age})")
    return "; ".join(formatted)


def _format_encounters(encounters: List[Dict]) -> str:
    """Format medical encounters"""
    formatted = []
    for encounter in encounters:
        encounter_type = encounter.get("type", "Unknown")
        date = encounter.get("startDate", "Unknown date")
        if date:
            date = date.split("T")[0]
        reason = encounter.get("reason", "No reason specified")
        formatted.append(f"{encounter_type} ({date}): {reason}")
    return "; ".join(formatted)


def _format_personal_history(personal_history: Dict) -> str:
    """Format personal history information"""
    formatted = []
    for key, value in personal_history.items():
        if isinstance(value, list):
            value = ", ".join(str(item) for item in value)
        formatted.append(f"{key}: {value}")
    return "; ".join(formatted)


def test_medical_history_tool():
    """Quick test for the medical history query tool"""
    print("Testing Medical History Query Tool...")
    print("=" * 50)
    
    # Test with different input formats
    def test_debug_medical_records(records, description):
        print(f"\n=== {description} ===")
        print(f"Type: {type(records)}")
        print(f"Preview: {str(records)[:100]}...")
        
        result = query_medical_history.invoke({
            "medical_records": records,
            "field_path": "sex",
            "specific_criteria": None
        })
        print(f"Query Result: {result}")
        return result
    
    # Sample medical records JSON (simplified version of your example)
    test_medical_records = json.dumps({
        "firstName": "Jordan",
        "lastName": "Lee",
        "sex": "M",
        "ethnicity": "Asian",
        "dob": "2005-03-14",
        "bloodType": "A+",
        "medicalHistory": {
            "prescriptions": [
                {
                    "medication": [
                        {"name": "Albuterol", "dosageForm": "inhaler", "strength": "90 mcg/actuation"}
                    ],
                    "instructions": "2 puffs inhaled q4-6h PRN wheeze/SOB; spacer recommended",
                    "startDate": "2024-04-03",
                    "endDate": "2026-04-02"
                },
                {
                    "medication": [
                        {"name": "Azithromycin", "dosageForm": "tablet", "strength": "250 mg"}
                    ],
                    "instructions": "Z-Pak: 500 mg day 1, then 250 mg daily days 2–5",
                    "startDate": "2025-01-18",
                    "endDate": "2025-01-22"
                }
            ],
            "allergies": [
                {
                    "name": "Peanuts",
                    "reaction": "Anaphylaxis (throat swelling, hives)",
                    "severity": "Severe",
                    "treatment": "Epinephrine autoinjector; ER if symptoms persist"
                },
                {
                    "name": "Latex",
                    "reaction": "Contact rash",
                    "severity": "Mild",
                    "treatment": "Topical hydrocortisone PRN"
                }
            ],
            "labs": [
                {
                    "testName": "CBC",
                    "result": "WBC 7.9, Hgb 15.1, Plt 232",
                    "testDate": "2024-04-02T22:35:00Z"
                },
                {
                    "testName": "HbA1c",
                    "result": "5.1%",
                    "testDate": "2025-09-05T08:55:00Z"
                }
            ],
            "familyHistory": [
                {"condition": "Type 2 Diabetes", "relation": "Father", "diagnosisAge": "52"},
                {"condition": "Hypertension", "relation": "Mother", "diagnosisAge": "48"}
            ]
        }
    })
    
    # Test different input formats first
    test_medical_dict = {
        "firstName": "Jordan",
        "sex": "M",
        "bloodType": "A+"
    }
    
    print("\n" + "="*30 + " DEBUG TESTS " + "="*30)
    test_debug_medical_records(test_medical_records, "JSON String Format")
    test_debug_medical_records(test_medical_dict, "Dictionary Format") 
    test_debug_medical_records("plain text medical history", "Plain Text Format")
    test_debug_medical_records('{"invalid": json}', "Invalid JSON Format")
    
    # Test cases
    test_cases = [
        ("Basic demographics - sex", "sex", None),
        ("Basic demographics - blood type", "bloodType", None),
        ("All allergies", "medicalHistory.allergies", None),
        ("Severe allergies only", "medicalHistory.allergies", "severity=Severe"),
        ("All prescriptions", "medicalHistory.prescriptions", None),
        ("Specific medication", "medicalHistory.prescriptions", "name=Albuterol"),
        ("All lab results", "medicalHistory.labs", None),
        ("Specific lab test", "medicalHistory.labs", "testName=CBC"),
        ("Family history", "medicalHistory.familyHistory", None),
        ("Father's history", "medicalHistory.familyHistory", "relation=Father"),
        ("Invalid path test", "medicalHistory.nonexistent", None)
    ]
    
    for description, field_path, criteria in test_cases:
        print(f"\nTest: {description}")
        print(f"Query: {field_path}" + (f" (criteria: {criteria})" if criteria else ""))
        
        try:
            result = query_medical_history.invoke({
                "medical_records": test_medical_records,
                "field_path": field_path,
                "specific_criteria": criteria
            })
            print(f"Result: {result}")
        except Exception as e:
            print(f"Error: {e}")
        
        print("-" * 30)
    
    print("\nTest completed!")


if __name__ == "__main__":
    test_medical_history_tool()