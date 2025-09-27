"""
Test client for the Medical Diagnosis API
Run this after starting the FastAPI server to test the endpoints.
"""

import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

def pretty_print(data: Dict[Any, Any]):
    """Pretty print JSON data."""
    print(json.dumps(data, indent=2))

def test_api():
    """Test the medical diagnosis API."""
    
    # Test health endpoint
    print("=== Testing Health Endpoint ===")
    response = requests.get(f"{BASE_URL}/health")
    pretty_print(response.json())
    
    # Test root endpoint
    print("\n=== Testing Root Endpoint ===")
    response = requests.get(f"{BASE_URL}/")
    pretty_print(response.json())
    
    # Test example endpoint
    print("\n=== Getting Example Request ===")
    response = requests.get(f"{BASE_URL}/example")
    example = response.json()
    pretty_print(example)
    
    # Start a diagnosis session
    print("\n=== Starting Diagnosis Session ===")
    start_request = {
        "thread_id": "test-patient-001",
        "symptoms": [
            "severe headache",
            "neck stiffness", 
            "fever",
            "sensitivity to light"
        ],
        "medical_records": "22-year-old female, no significant medical history, college student"
    }
    
    response = requests.post(f"{BASE_URL}/start", json=start_request)
    result = response.json()
    pretty_print(result)
    
    # Interactive session simulation
    thread_id = start_request["thread_id"]
    
    # Check if we got a question
    if result.get("type") == "question":
        print(f"\n Triage Assistance asks: {result['query']}")
        if result.get("options"):
            print(f"Options: {result['options']}")
        
        # Simulate patient response
        patient_response = "It started suddenly about 6 hours ago"
        print(f"Patient responds: {patient_response}")
        
        # Resume the session
        print("\n=== Resuming Session ===")
        resume_request = {
            "thread_id": thread_id,
            "response": patient_response
        }
        
        response = requests.post(f"{BASE_URL}/resume", json=resume_request)
        result = response.json()
        pretty_print(result)
        
        # Continue the conversation if there are more questions
        while result.get("type") == "question":
            print(f"\n Triage assistant asks: {result['query']}")
            if result.get("options"):
                print(f"Options: {result['options']}")
            
            # Simulate more responses
            if "severe" in result['query'].lower():
                patient_response = "Very severe, 9/10"
            elif "nausea" in result['query'].lower():
                patient_response = "Yes, I feel very nauseous"
            elif "rash" in result['query'].lower():
                patient_response = "No rash"
            else:
                patient_response = "No"
            
            print(f" Patient responds: {patient_response}")
            
            resume_request = {
                "thread_id": thread_id,
                "response": patient_response
            }
            
            response = requests.post(f"{BASE_URL}/resume", json=resume_request)
            result = response.json()
            pretty_print(result)
    
    # Check session status
    print(f"\n=== Session Status ===")
    response = requests.get(f"{BASE_URL}/session/{thread_id}/status")
    pretty_print(response.json())
    
    # Print final diagnosis if available
    if result.get("type") == "diagnosis":
        print(f"\n FINAL DIAGNOSIS:")
        diagnosis = result.get("diagnosis", {})
        
        if "differential_diagnosis" in diagnosis:
            print("\nTop 5 Probable Diagnoses:")
            for dx in diagnosis["differential_diagnosis"]:
                print(f"{dx['rank']}. {dx['diagnosis']} ({dx['probability_percent']}%)")
                print(f"   Reasoning: {dx['reasoning']}")
        else:
            print(diagnosis)

if __name__ == "__main__":
    try:
        test_api()
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the API. Make sure the server is running:")
        print("   uvicorn medical_api:app --reload --port 8000")
    except Exception as e:
        print(f"❌ Error testing API: {e}")