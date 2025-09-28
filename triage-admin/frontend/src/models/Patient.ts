import mongoose, { Schema, Model, Document } from "mongoose";

interface IDifferentialDiagnosis {
  rank: number;
  diagnosis: string;
  probability_percent: number;
  reasoning: string;
  key_features: string[];
  next_steps: string[];
}

export interface IPatient extends Document {
  name: string;
  age?: number;
  thread_id: string;
  symptoms: string;
  differential_diagnosis: IDifferentialDiagnosis[];
  clinical_summary: string;
  urgency_level: number; // 1-5
  urgency_level_text: "Emergency" | "High" | "Moderate" | "Low" | "Routine";
  disclaimer: string;
  // Optional field to persist manual drag-drop ordering in the UI
  priority_order?: number;
}

const DifferentialDiagnosisSchema = new Schema<IDifferentialDiagnosis>({
  rank: { type: Number, required: true },
  diagnosis: { type: String, required: true },
  probability_percent: { type: Number, required: true },
  reasoning: { type: String, required: true },
  key_features: { type: [String], required: true },
  next_steps: { type: [String], required: true },
});

const PatientSchema = new Schema<IPatient>({
  name: { type: String, required: true },
  thread_id: {type: String},
  symptoms: { type: String, required: true },
  differential_diagnosis: { type: [DifferentialDiagnosisSchema], required: true },
  clinical_summary: { type: String, required: true },
  urgency_level: { type: Number, required: true },
  urgency_level_text: {
    type: String,
    required: true,
    enum: ["Emergency", "High", "Moderate", "Low", "Routine"],
  },
  disclaimer: { type: String, required: true },
  priority_order: { type: Number, required: false },
});

export const Patient: Model<IPatient> =
  (mongoose.models.Patient as Model<IPatient>) ||
  mongoose.model<IPatient>("Patient", PatientSchema);
