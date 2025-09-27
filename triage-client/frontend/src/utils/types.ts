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

// Unified patient data structure
export type PatientData = {
  vitals?: Vitals;
  passportData?: unknown;
  symptoms: string[];
  medicalRecords?: string;
};

export type TriagePhase =
  | "vitals"     // Step 1: Collecting vitals
  | "passport"   // Step 2: Medical history/passport
  | "symptoms"   // Step 3: Symptoms input
  | "processing" // Sending data to backend and processing
  | "prompt"     // Waiting for user response to diagnostic question
  | "diagnosis"  // Final diagnosis received
  | "error";     // Error occurred
