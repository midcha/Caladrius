type Patient = {
  firstName: string;
  lastName: string;
  sex: string;
  ethnicity: string;
  dob: string;
  bloodType: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  medicalHistory: MedicalHistory;
};

type MedicalHistory = {
  prescriptions: Prescription[];
  imaging: Imaging[];
  labs?: LabResult[];
  allergies: Allergy[];
  familyHistory: FamilyInfo[];
  personalHistory: PersonalInfo[];
  insurance: Insurance[];
  surgeries: string;
  visits: Visit[];
  notes: string[];
};

type Visit = {
  date: string;
  reason: string;
  notes: string;
};

type Allergy = {
  name: string;
  reaction: string;
  severity: string;
  treatment: string;
  notes: string;
};

type FamilyInfo = {
  condition: string;
  category: string;
  relation: string;
  diagnosisAge: string;
};

type PersonalInfo = {
  occupation: string;
  livingSituation: string;
  substanceUsage: string;
  physicalActivity: string;
  stressors: string[];
};

type Surgery = {
  procedure: string;
  date: string;
  notes: string;
};

type Hospitalization = {
  reason: string;
  admissionDate: string;
  releaseDate: string;
  notes: string;
};

type ChronicConditions = {
  name: string;
  diagnosisDate: string;
  status: string;
  treatment: Prescription[];
  notes: string;
};

type Prescription = {
  medication: Medication[];
  instructions: String;
  startDate: string;
  endDate: string;
};

type Imaging = {
  type: "MRI" | "CT" | "XRay" | "Ultrasound" | "PET" | "Other";
  bodyRegion: string;
  studyDate: string;
  performingFacility?: string;
  notes?: string;
  report?: ImagingReport;
  files?: ImagingFile[];
};

type ImagingReport = {
  reportText: string;
  impression: string;
  createdAt: string;
};

type ImagingFile = {
  url: string;
  fileType: "DICOM" | "JPEG" | "PDF" | "Other";
  uploadedAt: string;
};

type LabResult = {
  testName: string;
  result: string;
  referenceRange: string;
  testDate: string;
};

type Medication = {
  name: string;
  dosageForm: string;
  strength: string;
};

type Insurance = {
  providerName: string;
  policyNumber: string;
  groupNumber?: string;
  coverageStart: string;
  coverageEnd?: string;
};
