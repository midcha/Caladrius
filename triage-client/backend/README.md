# Caladrius Triage Backend

An AI-powered medical triage system built with LangGraph and FastAPI, featuring interactive diagnostic questioning and MongoDB integration for patient data management.

## Features

- **Interactive Diagnosis**: AI asks targeted medical questions to narrow down diagnoses
- **LangGraph Integration**: State-based workflow with interrupts for user interaction
- **MongoDB Integration**: Patient data persistence for triage admin dashboard
- **Structured Output**: JSON-formatted differential diagnosis with triage priority levels
- **CORS Support**: Ready for frontend integration
- **Confirmation Flow**: Two-step process with diagnosis confirmation before completion

## Quick Start

### 1. Install Dependencies

```bash
pip install fastapi uvicorn pydantic langchain-openai langgraph python-dotenv
```

### 2. Set Environment Variables

Create a `.env` file:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional - AI Model Configuration
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.3

# Optional - MongoDB for patient data persistence
TRIAGE_MONGO_URI=mongodb://localhost:27017/caladrius
# Alternative naming (MONGO_URI also supported)
MONGO_URI=mongodb://localhost:27017/caladrius
```

### 3. Start the Server

```bash
# Option 1: Using the startup script
python start_server.py

# Option 2: Direct uvicorn command
uvicorn medical_api:app --reload --port 8000

# Option 3: Using python module
python -m uvicorn medical_api:app --reload --port 8000
```

### 4. Test the API

```bash
python test_api.py
```

## API Endpoints

### `GET /`
Root endpoint with API information and available endpoints.

**Response:**
```json
{
  "message": "Medical Diagnosis API", 
  "status": "running", 
  "endpoints": ["/start", "/resume", "/confirm", "/health", "/docs"],
  "description": "AI-powered medical diagnosis with interactive questioning"
}
```

### `POST /start`
Start a new medical diagnosis session.

**Request Body:**
```json
{
  "thread_id": "patient-001",
  "symptoms": ["chest pain", "shortness of breath", "fatigue"],
  "medical_records": "45-year-old male, hypertension, family history of heart disease"
}
```

**Response (Question):**
```json
{
  "type": "question",
  "query": "When did this pain start?",
  "options": {
    "A few hours ago": "",
    "Yesterday": "",
    "Several days ago": ""
  },
  "question_type": "multiple_choice",
  "status": "waiting_for_response"
}
```

### `POST /resume`
Continue a diagnosis session by answering a question.

**Request Body:**
```json
{
  "thread_id": "patient-001",
  "response": "A few hours ago",
  "question": "When did this pain start?" // optional
}
```

**Response (Confirmation Request):**
```json
{
  "type": "confirm",
  "action": "confirm_diagnosis_complete",
  "message": "I have enough information to provide your diagnosis. Ready to proceed? (y/N)",
  "status": "awaiting_confirmation"
}
```

### `POST /confirm`
Confirm proceeding to final diagnosis or provide patient name.

**Request Body:**
```json
{
  "thread_id": "patient-001",
  "confirm": true,
  "full_name": "John Doe" // optional - for database storage
}
```

**Response (Final Diagnosis):**
```json
{
  "type": "diagnosis",
  "diagnosis": {
    "differential_diagnosis": [
      {
        "rank": 1,
        "diagnosis": "Myocardial Infarction",
        "probability_percent": 65,
        "reasoning": "Sudden onset chest pain in high-risk patient",
        "key_features": ["chest pain", "risk factors"],
        "next_steps": ["ECG", "cardiac enzymes"]
      }
    ],
    "clinical_summary": "High suspicion for acute coronary syndrome",
    "urgency_level": 1,
    "urgency_level_text": "Emergency",
    "disclaimer": "This is for educational purposes only. Consult healthcare professionals."
  },
  "status": "completed"
}
```

### `GET /session/{thread_id}/status`
Get the current status of a diagnosis session.

### `GET /health`
Health check endpoint - returns `{"status": "healthy"}`.

### `GET /example`
Get example request formats for API testing.

## Usage Examples

### Python Client Example

```python
import requests

BASE_URL = "http://localhost:8000"

# Start diagnosis
response = requests.post(f"{BASE_URL}/start", json={
    "thread_id": "patient-123",
    "symptoms": ["headache", "fever", "neck stiffness"],
    "medical_records": "22-year-old female, no medical history"
})

result = response.json()

# Interactive questioning loop
while result.get("type") == "question":
    print(f"\nDoctor: {result['query']}")
    
    if result.get("options"):
        print("Options:")
        for key, desc in result["options"].items():
            print(f"  {key}: {desc}")
    
    answer = input("Your response: ")
    
    response = requests.post(f"{BASE_URL}/resume", json={
        "thread_id": "patient-123",
        "response": answer
    })
    result = response.json()

# Handle confirmation step
if result.get("type") == "confirm":
    print(f"\n{result['message']}")
    confirm_input = input("Proceed? (y/N): ")
    confirm_bool = confirm_input.lower().startswith('y')
    
    response = requests.post(f"{BASE_URL}/confirm", json={
        "thread_id": "patient-123",
        "confirm": confirm_bool,
        "full_name": "Jane Smith"  # optional
    })
    result = response.json()

# Print final diagnosis
if result.get("type") == "diagnosis":
    diagnosis = result["diagnosis"]
    print(f"\nFinal Diagnosis:")
    print(f"Clinical Summary: {diagnosis.get('clinical_summary')}")
    print(f"Urgency Level: {diagnosis.get('urgency_level')} - {diagnosis.get('urgency_level_text')}")
    
    for dd in diagnosis.get('differential_diagnosis', []):
        print(f"\n{dd.get('rank')}. {dd.get('diagnosis')} ({dd.get('probability_percent')}%)")
        print(f"   Reasoning: {dd.get('reasoning')}")
```

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

async function diagnose() {
  // Start diagnosis
  let response = await axios.post('http://localhost:8000/start', {
    thread_id: 'patient-456',
    symptoms: ['chest pain', 'shortness of breath'],
    medical_records: '55-year-old male, diabetes, smoker'
  });

  // Interactive loop would go here
  console.log(response.data);
}

diagnose();
```

## File Structure

```
triage-client/backend/
├── medical_api.py                  # FastAPI server with CORS and MongoDB integration
├── langgraph_model_medical.py      # LangGraph workflow with state management
├── tools.py                        # Interactive tools (ask_user_for_input, signal_diagnosis_complete)
├── start_server.py                 # Server startup script
├── test_api.py                     # API test client
├── README.md                       # This documentation
├── .env                           # Environment variables
└── __pycache__/                   # Python cache files
```

## Core Components

### medical_api.py
- FastAPI application with CORS middleware
- MongoDB integration for patient data persistence
- Request/response models and serialization
- Urgency level mapping (1-5 scale)
- Error handling and data validation

### langgraph_model_medical.py  
- LangGraph state-based workflow
- AI agent with medical reasoning
- State management for conversation flow
- Integration with OpenAI GPT models

### tools.py
- `ask_user_for_input()` - Interactive questioning tool
- `signal_diagnosis_complete()` - Confirmation flow tool
- Support for multiple question types (multiple_choice, open_ended, select_multiple)

## Configuration

### MongoDB Integration

The system automatically stores completed diagnoses in MongoDB if configured:
- Database: `caladrius`
- Collection: `patients`
- Fields: patient name, symptoms, differential diagnosis, urgency level, timestamp

If no MongoDB URI is provided, the system continues to work without database storage.

### Question Flow Customization

Modify the AI behavior in `langgraph_model_medical.py`:
- **System Prompts**: Update medical reasoning instructions
- **Question Limits**: Adjust maximum questions per session
- **Urgency Mapping**: Customize triage priority levels (1-5 scale)

### Frontend Integration

The API includes CORS support for frontend integration:
- All origins allowed (configure for production)
- Supports the `/confirm` endpoint for two-step diagnosis flow
- Compatible with React/Next.js frontends

### Skip Token Support

Frontend can send `"__skip__"` as a response to skip optional questions.

## Triage Priority Levels

The system uses a 5-level triage urgency scale:

| Level | Text | Description |
|-------|------|-------------|
| 1 | Emergency | Life-threatening conditions requiring immediate attention |
| 2 | Urgent | Serious conditions requiring prompt medical care |
| 3 | Moderate | Standard medical conditions |
| 4 | Minor | Non-urgent conditions |
| 5 | Routine | Routine care or follow-up |

## Important Notes

⚠️ **Medical Disclaimer**: This system is for educational and research purposes only. It is not intended to replace professional medical advice, diagnosis, or treatment. Always consult qualified healthcare providers for medical concerns.

**Database Privacy**: If using MongoDB, ensure proper security measures for patient data in production environments.

## Troubleshooting

### Common Issues

1. **Import Error**: Make sure all dependencies are installed
2. **OpenAI API Error**: Check your API key and ensure you have credits
3. **Port Already in Use**: Use `--port` flag to specify a different port
4. **JSON Parse Error**: The AI might return non-JSON text; check the model output

### Debug Mode

Run with debug logging:
```bash
uvicorn medical_api:app --reload --port 8000 --log-level debug
```