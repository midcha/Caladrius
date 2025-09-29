# Caladrius - AI-Powered Medical Triage System

[![Devpost](https://img.shields.io/badge/Devpost-View%20Project-blue)](https://devpost.com/software/caladrius)

Caladrius is a comprehensive AI-powered medical triage system that streamlines emergency department operations through intelligent patient assessment, priority-based queuing, and seamless medical record integration.

## Video Demo

**Watch Caladrius in Action**

[![Caladrius Demo Video](https://img.youtube.com/vi/1fI_w06EoZQ/maxresdefault.jpg)](https://youtu.be/1fI_w06EoZQ)

*Click the image above to watch our full system demonstration, showcasing the mobile app, triage client, and admin dashboard working together.*

**Demo Highlights:**
- Patient data collection via mobile app
- AI-powered diagnostic questioning
- Real-time triage priority assignment
- Hospital staff dashboard management
- Complete end-to-end workflow

## Project Structure

This monorepo contains multiple applications and services:

### Mobile Application
- **Path**: [`mobile-app`](mobile-app)
- **Type**: React Native Expo app
- **Purpose**: Patient data collection and medical passport management
- **Key Files**:
  - [`mobile-app/app/(tabs)/index.tsx`](mobile-app/app/(tabs)/index.tsx) - Main patient interface
  - [`mobile-app/app/(tabs)/home.tsx`](mobile-app/app/(tabs)/home.tsx) - Home screen with restricted user flow
  - [`mobile-app/src/fs.ts`](mobile-app/src/fs.ts) - File system utilities
  - [`mobile-app/src/passportStore.ts`](mobile-app/src/passportStore.ts) - Medical passport data management

### Triage Client System
- **Frontend Path**: [`triage-client/frontend`](triage-client/frontend)
- **Backend Path**: [`triage-client/backend`](triage-client/backend)
- **Type**: Next.js frontend + FastAPI backend
- **Purpose**: Core triage assessment and AI diagnosis engine

#### Frontend (Next.js)
- **Entry Point**: [`triage-client/frontend/src/app/page.tsx`](triage-client/frontend/src/app/page.tsx)
- **Key Components**:
  - [`triage-client/frontend/src/components/TriageProvider.tsx`](triage-client/frontend/src/components/TriageProvider.tsx) - Main triage state management
  - [`triage-client/frontend/src/components/TriageFlow.tsx`](triage-client/frontend/src/components/TriageFlow.tsx) - Step-by-step triage workflow
  - [`triage-client/frontend/src/components/VitalsForm.tsx`](triage-client/frontend/src/components/VitalsForm.tsx) - Vital signs collection
  - [`triage-client/frontend/src/components/SymptomsInput.tsx`](triage-client/frontend/src/components/SymptomsInput.tsx) - Symptom input interface
  - [`triage-client/frontend/src/components/QuestionPrompt.tsx`](triage-client/frontend/src/components/QuestionPrompt.tsx) - AI diagnostic questioning
- **API Integration**: [`triage-client/frontend/src/utils/api.ts`](triage-client/frontend/src/utils/api.ts)
- **Type Definitions**: [`triage-client/frontend/src/utils/types.ts`](triage-client/frontend/src/utils/types.ts)

#### Backend (FastAPI + LangGraph)
- **Main API Server**: [`triage-client/backend/medical_api.py`](triage-client/backend/medical_api.py)
- **AI Diagnosis Engine**: [`triage-client/backend/langgraph_model_medical.py`](triage-client/backend/langgraph_model_medical.py)
- **Interactive Tools**: [`triage-client/backend/tools.py`](triage-client/backend/tools.py)
- **Server Startup**: [`triage-client/backend/start_server.py`](triage-client/backend/start_server.py)
- **API Testing**: [`triage-client/backend/test_api.py`](triage-client/backend/test_api.py)
- **Documentation**: [`triage-client/backend/README.md`](triage-client/backend/README.md)

### Admin Dashboard
- **Frontend Path**: [`triage-admin/frontend`](triage-admin/frontend)
- **Type**: Next.js application
- **Purpose**: Hospital staff interface for patient prioritization and management
- **Key Files**:
  - [`triage-admin/frontend/src/app/page.tsx`](triage-admin/frontend/src/app/page.tsx) - Main dashboard
  - [`triage-admin/frontend/components/PriorityQueue.tsx`](triage-admin/frontend/components/PriorityQueue.tsx) - Patient priority queue
  - [`triage-admin/frontend/components/PriorityBadge.tsx`](triage-admin/frontend/components/PriorityBadge.tsx) - Triage priority indicators
  - [`triage-admin/frontend/components/PatientDetailsPanel.tsx`](triage-admin/frontend/components/PatientDetailsPanel.tsx) - Detailed patient information
  - [`triage-admin/frontend/src/app/api/patients/route.ts`](triage-admin/frontend/src/app/api/patients/route.ts) - Patient data API

### Patient-Doctor Interface
- **Path**: [`patient-doctor/frontend`](patient-doctor/frontend)
- **Type**: Next.js application  
- **Purpose**: Doctor-patient communication interface
- **Status**: Base Next.js setup (development in progress)

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- OpenAI API Key
- MongoDB URI (for admin dashboard)
- AWS credentials (for file storage)

### 1. Mobile App Setup
```bash
cd mobile-app
npm install
npx expo start
```

### 2. Triage Backend Setup
```bash
cd triage-client/backend
pip install fastapi uvicorn pydantic langchain-openai langgraph python-dotenv pymongo

# Create .env file
echo "OPENAI_API_KEY=your_key_here" > .env
echo "OPENAI_MODEL=gpt-4o-mini" >> .env
echo "MONGODB_URI=your_mongodb_uri" >> .env

# Start server
python start_server.py
```

### 3. Triage Frontend Setup  

**Live Url**: The triage client frontend is deployed at [https://caladrius-ai.vercel.app/](https://caladrius-ai.vercel.app/)  
*Note: The functionality requires the backend to be running locally on `localhost:8000`*

### 4. Admin Dashboard Setup
```bash
cd triage-admin/frontend
npm install

# Create .env.local
echo "MONGODB_URI=your_mongodb_uri" > .env.local

npm run dev
```

## Key Features

### AI-Powered Diagnosis
- **LangGraph Integration**: [`langgraph_model_medical.py`](triage-client/backend/langgraph_model_medical.py) - Advanced AI diagnostic reasoning
- **Interactive Questioning**: Dynamic follow-up questions based on medical history
- **Structured Output**: JSON-formatted differential diagnoses with confidence scores

### Medical Passport System
- **Digital Records**: [`PassportComplete.tsx`](triage-client/frontend/src/components/PassportComplete.tsx) - Medical history display
- **File Management**: [`s3.ts`](triage-client/frontend/lib/s3.ts) - Cloud storage integration
- **Data Validation**: [`validators.ts`](triage-client/frontend/src/utils/validators.ts) - Input validation

### Priority-Based Triage
- **5-Level System**: Emergency (1) to Routine (5) classification
- **Real-time Updates**: Live priority queue management
- **Clinical Decision Support**: Evidence-based recommendations

### Privacy & Security
- **HIPAA Considerations**: Encrypted data transmission
- **Local Processing**: Sensitive data processed locally when possible
- **Audit Trails**: Complete interaction logging

## API Endpoints

### Triage Backend (`localhost:8000`)
- `POST /start` - Initialize diagnosis session
- `POST /resume` - Continue diagnostic conversation  
- `POST /confirm` - Confirm final diagnosis
- `GET /health` - Health check
- `GET /example` - API usage examples

Full API documentation: [`triage-client/backend/README.md`](triage-client/backend/README.md)

## UI Components & Styling

### Design System
- **Global Styles**: [`globals.css`](triage-client/frontend/src/app/globals.css) - Medical-themed color palette
- **Component Modules**: Modular CSS for each component
- **Glassmorphism**: Modern medical interface aesthetic

### Key UI Components
- **Loading Animations**: [`LoadingAnimation.tsx`](triage-client/frontend/src/components/LoadingAnimation.tsx)
- **Medical Data Display**: [`MedicalDataDisplay.tsx`](triage-client/frontend/src/components/MedicalDataDisplay.tsx)
- **Step Transitions**: [`StepTransition.tsx`](triage-client/frontend/src/components/StepTransition.tsx)

## Data Models & Types

### Core Types
- **Patient Data**: [`types.ts`](triage-client/frontend/src/utils/types.ts) - Comprehensive patient information structure
- **Medical Schema**: [`schema.ts`](triage-client/frontend/public/schema.ts) - Structured medical data definitions
- **Sample Data**: [`sampleData.ts`](triage-client/frontend/src/utils/sampleData.ts) - Test data for development

## Development Tools

### Testing
- **API Tests**: [`test_api.py`](triage-client/backend/test_api.py) - Backend API testing
- **Sample Data**: Pre-configured test patients and scenarios

### Configuration
- **ESLint**: Consistent code formatting across all projects
- **TypeScript**: Type safety for frontend applications
- **Environment**: `.env` configuration for all services

## Awards & Recognition

**2nd Place Winner - Best Use of AI for Social Good** at HackGT 12 (2025)

## License & Disclaimer

**Important**: This system is for educational and research purposes only. It is not intended to replace professional medical advice, diagnosis, or treatment. Always consult qualified healthcare providers for medical concerns.

## Contributing

This project was developed during HackGT 2025. For questions or contributions, please refer to the [Devpost submission](https://devpost.com/software/caladrius).

---

*Built with care for better healthcare outcomes*
