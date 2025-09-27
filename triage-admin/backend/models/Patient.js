const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  symptoms: { type: String, required: true },
  level: { type: Number, required: true }, // 1-5, corresponds to ED Triage Levels
  priority: { type: Number, required: true }, // numeric sort order
});

const Patient = mongoose.model("Patient", patientSchema);
module.exports = Patient;
