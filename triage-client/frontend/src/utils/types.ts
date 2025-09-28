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

export type BackendConfirm = {
  type: 'confirm';
  action: string; // "confirm_diagnosis_complete"
  message: string;
  status: 'awaiting_confirmation';
};

export type ApiError = {
  type: 'error';
  error: string;
  status: 'error';
};

export type ApiResponse = BackendQuestion | BackendConfirm | DiagnosisResult | ApiError;

// Unified patient data structure
export type PassportBundle = {
  json: unknown;
  images: Record<string, string>;
  attachments: PassportAttachment[];
};

export type PassportAttachment = {
  id?: string;
  filename: string;
  mime?: string;
  size?: number;
  capturedAt?: string;
  context?: {
    ogFileName?: string;
    description?: string;
    source?: string;
    tags?: string[];
  };
};

export type PassportStage = "start" | "waiting" | "complete";

export type PatientData = {
  vitals?: Vitals;
  passportData?: unknown;
  passportBundle?: PassportBundle;
  passportAttachments?: PassportAttachment[];
  symptoms: string[];
  medicalRecords?: string;
};

export type TriagePhase =
  | "vitals"     // Step 1: Collecting vitals
  | "passport"   // Step 2: Medical history/passport
  | "passportConfirm" // Step 2b: Confirm extracted passport details
  | "passportReview" // Step 2c: Review medical records from passport
  | "symptoms"   // Step 3: Symptoms input
  | "processing" // Sending data to backend and processing
  | "prompt"     // Waiting for user response to diagnostic question
  | "confirm"    // Waiting for user confirmation to proceed to final diagnosis
  | "diagnosis"  // Final diagnosis received
  | "completed"  // Flow complete; backend continues asynchronously
  | "error";     // Error occurred
