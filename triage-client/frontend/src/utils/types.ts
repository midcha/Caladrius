export type Vitals = {
  temperature: string;
  systolic: string;
  diastolic: string;
  heartRate: string;
  respirations: string;
  spo2: string;
};

// Updated to match backend's question format
export type BackendQuestion = {
  query: string;
  options?: Record<string, string>;
  question_type?: 'multiple_choice' | 'open_ended' | 'select_multiple';
  type: 'question';
  status: 'waiting_for_response';
};

export type DiagnosisResult = {
  type: 'diagnosis';
  diagnosis: any;
  status: 'completed';
};

export type ApiError = {
  type: 'error';
  error: string;
  status: 'error';
};

export type ApiResponse = BackendQuestion | DiagnosisResult | ApiError;

// Import medical record types
import type { Patient, MedicalHistory } from '../../public/schema';

// Unified patient data structure
export type PatientData = {
  vitals?: Vitals;
  passportData?: unknown;
  symptoms: string[];
  medicalRecords?: string | Patient | MedicalHistory; // Support both legacy string and new JSON formats
};

export type TriagePhase =
  | "vitals"     // Step 1: Collecting vitals
  | "passport"   // Step 2: Medical history/passport
  | "symptoms"   // Step 3: Symptoms input
  | "processing" // Sending data to backend and processing
  | "prompt"     // Waiting for user response to diagnostic question
  | "diagnosis"  // Final diagnosis received
  | "error";     // Error occurred
