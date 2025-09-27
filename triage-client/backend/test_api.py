"""
Enhanced Test Client for the Medical Diagnosis API
Properly handles the new option-based questioning system.
Run this after starting the FastAPI server to test the endpoints.
"""

import requests
import json
import time
from typing import Dict, Any, Optional

BASE_URL = "http://localhost:8000"

def pretty_print(data: Dict[Any, Any]):
    """Pretty print JSON data with nice formatting."""
    print(json.dumps(data, indent=2, ensure_ascii=False))

def print_separator(title: str, char: str = "="):
    """Print a nice separator with title."""
    print(f"\n{char * 60}")
    print(f" {title}")
    print(char * 60)

def smart_response_selector(query: str, options: Optional[Dict[str, str]] = None) -> str:
    """
    Intelligently select responses based on the question and available options.
    This simulates realistic patient responses to medical questions.
    """
    if not options:
        # Fallback responses for questions without options
        query_lower = query.lower()
        if "when" in query_lower and ("start" in query_lower or "begin" in query_lower):
            return "A few hours ago"
        elif "pain" in query_lower and "scale" in query_lower:
            return "7 out of 10"
        elif "nausea" in query_lower or "vomit" in query_lower:
            return "Yes, I feel nauseous"
        elif "fever" in query_lower or "temperature" in query_lower:
            return "Yes, I feel feverish"
        elif "travel" in query_lower:
            return "No recent travel"
        elif "medication" in query_lower or "medicine" in query_lower:
            return "Just over-the-counter pain relievers"
        else:
            return "No, not really"
    
    # Smart selection from available options
    query_lower = query.lower()
    options_keys = list(options.keys())
    
    # Medical condition specific logic
    if "headache" in query_lower:
        if "when" in query_lower or "start" in query_lower:
            # Prefer recent onset for severe headache
            for option in ["A few hours ago", "Earlier today", "Just now"]:
                if option in options_keys:
                    return option
        elif "severe" in query_lower or "pain" in query_lower:
            for option in ["Very severe", "Severe", "8-10", "9/10"]:
                if option in options_keys:
                    return option
    
    elif "fever" in query_lower:
        for option in ["Yes", "High fever", "102-104°F"]:
            if option in options_keys:
                return option
    
    elif "nausea" in query_lower or "vomit" in query_lower:
        for option in ["Yes", "Very nauseous", "Multiple times"]:
            if option in options_keys:
                return option
    
    elif "neck" in query_lower and "stiff" in query_lower:
        for option in ["Very stiff", "Yes", "Hard to move"]:
            if option in options_keys:
                return option
    
    elif "light" in query_lower and ("sensitive" in query_lower or "hurt" in query_lower):
        for option in ["Yes", "Very sensitive", "Bright lights hurt"]:
            if option in options_keys:
                return option
    
    # Default to first reasonable option
    return options_keys[0] if options_keys else "I'm not sure"

def display_question_and_options(query: str, options: Optional[Dict[str, str]] = None):
    """Display the question and options in a user-friendly format."""
    print(f"\nMedical Assistant asks:")
    print(f"   \"{query}\"")
    
    if options:
        print(f"\nAvailable options:")
        for i, (option, description) in enumerate(options.items(), 1):
            if description:
                print(f"   {i}. {option} - {description}")
            else:
                print(f"   {i}. {option}")
    else:
        print("   (Open-ended question - please provide your own answer)")

def run_interactive_diagnosis(thread_id: str, max_questions: int = 6):
    """
    Run an interactive diagnosis session with smart response selection.
    """
    question_count = 0
    
    print_separator("INTERACTIVE DIAGNOSIS SESSION")
    
    # Start the diagnosis
    start_request = {
        "thread_id": thread_id,
        "symptoms": [
            "severe headache",
            "neck stiffness", 
            "fever",
            "sensitivity to light"
        ],
        "medical_records": "22-year-old female, no significant medical history, college student, no known allergies"
    }
    
    print("Patient Information:")
    print(f"   Symptoms: {', '.join(start_request['symptoms'])}")
    print(f"   Background: {start_request['medical_records']}")
    
    try:
        response = requests.post(f"{BASE_URL}/start", json=start_request)
        result = response.json()
        
        if response.status_code != 200:
            print(f"Error starting diagnosis: {result}")
            return
        
        # Interactive questioning loop
        while result.get("type") == "question" and question_count < max_questions:
            question_count += 1
            query = result.get("query", "")
            options = result.get("options")
            
            display_question_and_options(query, options)
            
            # Smart response selection
            patient_response = smart_response_selector(query, options)
            print(f"\nPatient responds: \"{patient_response}\"")
            
            # Add a small delay to make it feel more natural
            time.sleep(0.5)
            
            # Resume the session
            resume_request = {
                "thread_id": thread_id,
                "response": patient_response
            }
            
            response = requests.post(f"{BASE_URL}/resume", json=resume_request)
            result = response.json()
            
            if response.status_code != 200:
                print(f"Error during diagnosis: {result}")
                break
        
        # Display final result
        if result.get("type") == "diagnosis":
            print_separator("FINAL DIAGNOSIS", "=")
            diagnosis = result.get("diagnosis", {})
            
            if isinstance(diagnosis, dict) and "differential_diagnosis" in diagnosis:
                print("Top 5 Most Likely Diagnoses:\n")
                
                for dx in diagnosis["differential_diagnosis"]:
                    print(f"{dx['rank']}. {dx['diagnosis']} ({dx['probability_percent']}%)")
                    print(f"   Reasoning: {dx['reasoning']}")
                    print(f"   Key Features: {', '.join(dx.get('key_features', []))}")
                    print(f"   Next Steps: {', '.join(dx.get('next_steps', []))}")
                    print()
                
                print(f"Clinical Summary: {diagnosis.get('clinical_summary', 'N/A')}")
                urg = diagnosis.get('urgency_level', 'N/A')
                urg_text = diagnosis.get('urgency_level_text')
                if isinstance(urg, int):
                    if urg_text:
                        print(f"Urgency Level: {urg} ({urg_text})")
                    else:
                        print(f"Urgency Level: {urg}")
                else:
                    print(f"Urgency Level: {str(urg)}")
                
            else:
                print("Raw diagnosis output:")
                print(diagnosis)
                
        elif result.get("type") == "error":
            print(f"Diagnosis error: {result.get('error', 'Unknown error')}")
        else:
            print(f"Unexpected result type: {result.get('type', 'unknown')}")
            print("Raw result:")
            pretty_print(result)
            
    except requests.exceptions.RequestException as e:
        print(f"Network error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

def test_basic_endpoints():
    """Test the basic API endpoints."""
    print_separator("TESTING BASIC ENDPOINTS")
    
    endpoints = [
        ("Health Check", "GET", "/health"),
        ("Root Info", "GET", "/"),
        ("API Examples", "GET", "/example")
    ]
    
    for name, method, endpoint in endpoints:
        try:
            print(f"\nTesting {name} ({method} {endpoint})")
            response = requests.get(f"{BASE_URL}{endpoint}")
            
            if response.status_code == 200:
                print(f"   Success ({response.status_code})")
                if endpoint == "/example":
                    # Show example in a cleaner format
                    example = response.json()
                    if "expected_question_format" in example:
                        print("   Expected question format:")
                        qf = example["expected_question_format"]
                        print(f"      Question: {qf.get('query', 'N/A')}")
                        if qf.get('options'):
                            print(f"      Options: {len(qf['options'])} choices available")
                else:
                    pretty_print(response.json())
            else:
                print(f"   Failed ({response.status_code})")
                print(f"   Error: {response.text}")
        except Exception as e:
            print(f"   Error: {e}")

def test_api():
    """Main test function with comprehensive testing."""
    print_separator("MEDICAL DIAGNOSIS API TEST SUITE", "=")
    
    # Test basic endpoints
    test_basic_endpoints()
    
    # Run interactive diagnosis
    thread_id = f"test-patient-{int(time.time())}"
    run_interactive_diagnosis(thread_id)
    
    # Test session status
    print_separator("SESSION STATUS CHECK")
    try:
        response = requests.get(f"{BASE_URL}/session/{thread_id}/status")
        if response.status_code == 200:
            print("Session status retrieved successfully:")
            pretty_print(response.json())
        else:
            print(f"Failed to get session status: {response.status_code}")
    except Exception as e:
        print(f"Error checking session status: {e}")
    
    print_separator("TEST SUITE COMPLETED", "=")

if __name__ == "__main__":
    try:
        test_api()
    except requests.exceptions.ConnectionError:
        print("Could not connect to the API. Make sure the server is running:")
        print("   python start_server.py")
        print("   or")
        print("   uvicorn medical_api:app --reload --port 8000")
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    except Exception as e:
        print(f"Unexpected error during testing: {e}")