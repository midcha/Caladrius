export type Vitals = {
  temperature: string;
  systolic: string;
  diastolic: string;
  heartRate: string;
  respirations: string;
  spo2: string;
};

export type BackendQuestion = {
  id: string;
  text: string;
  yesNo: boolean; // true => yes/no, false => open-ended
};

export type TriagePhase =
  | "vitals"
  | "passport"
  | "symptoms"
  | "processing"
  | "prompt"
  | "success";
