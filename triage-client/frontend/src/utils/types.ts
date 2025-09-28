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
  | "passport-start"
  | "passport-waiting"
  | "passport-complete"
  | "symptoms"
  | "processing"
  | "prompt"
  | "success";

// Uploaded Data

export interface CaladriusPassportV2 {
  version: number;
  passportId: string;
  issuedAt: string; // date-time
  source: string;
  patient: Patient;
  identifiers?: Identifiers;
  prescriptions?: Prescription[];
  imaging?: ImagingStudy[];
  labs?: LabResult[];
  encounters?: Encounter[];
  attachments: AttachmentRef[];
  notes?: Note[];
}

export interface Patient {
  mrn?: string | null;
  firstName: string;
  lastName: string;
  dob: string; // date
  sex: "M" | "F" | "X" | "Unknown";
  ethnicity?: string | null;
  bloodType?: string | null;
  contact?: PatientContact;
}

export interface PatientContact {
  phone?: string | null;
  email?: string | null;
}

export interface Identifiers {
  national?: string | null;
  insuranceMemberId?: string | null;
}

export interface AttachmentRef {
  id: string;
  mime: string;
  role?: string | null;
}

export interface Note {
  author: string;
  at: string;
  text: string;
}

export interface MedicationItem {
  name: string;
  dosageForm?: string | null;
  strength?: string | null;
}

export interface Prescription {
  id: string;
  medication: MedicationItem[]; // minItems: 1
  instructions?: string | null;
  startDate: string; // date
  endDate?: string | null; // date
  attachmentIds?: string[];
}

export interface ImagingReport {
  reportText: string;
  impression: string;
  createdAt: string; // date-time
}

export interface ImagingStudy {
  id: string;
  encounterId?: string | null;
  type: string;
  bodyRegion?: string | null;
  studyDate: string; // date-time
  performingFacility?: string | null;
  notes?: string | null;
  report?: ImagingReport;
  attachmentIds?: string[];
}

export interface LabResult {
  id: string;
  encounterId?: string | null;
  testName: string;
  result?: string | null;
  referenceRange?: string | null;
  testDate: string; // date-time
  attachmentIds?: string[];
}

export interface Procedure {
  name: string;
  approach?: string | null;
  anesthesia?: string | null;
  outcome?: string | null;
}

export interface Encounter {
  id: string;
  type:
    | "Emergency"
    | "UrgentCare"
    | "Inpatient"
    | "Outpatient"
    | "Telehealth"
    | "Procedure"
    | "Surgery"
    | "Immunization"
    | "Other";
  startDate: string; // date-time
  endDate?: string | null; // date-time
  reason: string;
  location: string;
  notes?: string | null;
  procedure?: Procedure | null;
  attachmentIds?: string[];
  labIds?: string[];
  imagingIds?: string[];
  prescriptionIds?: string[];
}
