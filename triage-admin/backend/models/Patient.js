const mongoose = require("mongoose");

const differentialDiagnosisSchema = new mongoose.Schema({
  rank: { type: Number, required: true },
  diagnosis: { type: String, required: true },
  probability_percent: { type: Number, required: true },
  reasoning: { type: String, required: true },
  key_features: { type: [String], required: true },
  next_steps: { type: [String], required: true },
});

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number },
  symptoms: { type: String, required: true },
  differential_diagnosis: { type: [differentialDiagnosisSchema], required: true },
  clinical_summary: { type: String, required: true },
  urgency_level: { type: Number, required: true }, // 1-5
  urgency_level_text: { 
    type: String, 
    required: true,
    enum: ["Emergency", "High", "Moderate", "Low", "Routine"],
  },
  disclaimer: { type: String, required: true },
});

const Patient = mongoose.model("Patient", patientSchema);
module.exports = Patient;
