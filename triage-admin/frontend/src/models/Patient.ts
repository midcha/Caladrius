import mongoose, { Schema, Model, Document } from "mongoose";

export interface IPatient extends Document {
  name: string;
  symptoms: string;
  level: number; // 1-5
  priority: number; // numeric order
  priority_order?: number; // optional manual order override
}

const PatientSchema = new Schema<IPatient>({
  name: { type: String, required: true },
  symptoms: { type: String, required: true },
  level: { type: Number, required: true },
  priority: { type: Number, required: true },
  priority_order: { type: Number, required: false },
});

export const Patient: Model<IPatient> =
  (mongoose.models.Patient as Model<IPatient>) ||
  mongoose.model<IPatient>("Patient", PatientSchema);
