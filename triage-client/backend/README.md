# Medical Diagnosis API

An AI-powered medical diagnosis system with interactive questioning built using LangGraph and FastAPI.

## Features

- **Interactive Diagnosis**: AI asks targeted medical questions to narrow down diagnoses
- **JSON Output**: Structured differential diagnosis with probabilities and reasoning
- **RESTful API**: Easy integration with web and mobile applications
- **Session Management**: Persistent conversation threads
- **Enhanced Questioning**: Focuses on obscure diagnostic questions to differentiate conditions

## Quick Start

### 1. Install Dependencies

```bash
pip install fastapi uvicorn pydantic langchain-openai langgraph python-dotenv
```

### 2. Set Environment Variables

Create a `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.3
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

### `POST /start`
Start a new medical diagnosis session.

**Request Body:**
```json
{
  "thread_id": "patient-001",
  "symptoms": [
    "chest pain",
    "shortness of breath",
    "fatigue"
  ],
  "medical_records": "45-year-old male, hypertension, family history of heart disease"
}
```

**Response:**
```json
{
  "type": "question",
  "query": "Can you describe when the chest pain started?",
  "options": {
    "Sudden": "Pain came on suddenly",
    "Gradual": "Pain developed gradually over time"
  },
  "status": "waiting_for_response"
}
```

### `POST /resume`
Continue a diagnosis session by answering a question.

**Request Body:**
```json
{
  "thread_id": "patient-001",
  "response": "The pain started suddenly about 2 hours ago"
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
    "disclaimer": "This is for educational purposes only..."
  },
  "status": "completed"
}
```

### `GET /session/{thread_id}/status`
Get the current status of a diagnosis session.

### `GET /health`
Health check endpoint.

### `GET /example`
Get example request formats for testing.

## Usage Examples

### Python Client Example

```python
import requests

# Start diagnosis
response = requests.post("http://localhost:8000/start", json={
    "thread_id": "patient-123",
    "symptoms": ["headache", "fever", "neck stiffness"],
    "medical_records": "22-year-old female, no medical history"
})

result = response.json()

# Continue conversation
while result.get("type") == "question":
    print(f"Doctor: {result['query']}")
    answer = input("Patient: ")
    
    response = requests.post("http://localhost:8000/resume", json={
        "thread_id": "patient-123",
        "response": answer
    })
    result = response.json()

# Print final diagnosis
if result.get("type") == "diagnosis":
    print("Final Diagnosis:", result["diagnosis"])
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
HackGT2025/
├── langgraph_model_medical.py  # Core diagnosis logic
├── user_feedback_tool.py       # User interaction tools
├── medical_api.py              # FastAPI server
├── test_api.py                 # API test client
├── start_server.py             # Server startup script
├── README.md                   # This file
└── .env                        # Environment variables
```

## Customization

### Modify Symptoms and Medical Records

Edit the `initial_state` in `medical_api.py` or send different data in API requests.

### Adjust Question Limits

Change `max_questions` in `langgraph_model_medical.py` to control how many questions are asked.

### Modify AI Behavior

Update the system prompts in `langgraph_model_medical.py` to change how the AI asks questions or generates diagnoses.

## Important Notes

⚠️ **Disclaimer**: This system is for educational and research purposes only. It is not intended to replace professional medical advice, diagnosis, or treatment. Always consult qualified healthcare providers for medical concerns.

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