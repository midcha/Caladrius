"use client";

import { useState, useEffect } from "react";
import { useTriage } from "./TriageProvider";
import ui from "./ui.module.css";
import s from "./SymptomsInput.module.css";
import Spinner from "./Spinner";

export default function SymptomsInput() {
  const { updateSymptoms, startDiagnosis, patientData, busy } = useTriage();
  const [text, setText] = useState("");

  // Load existing symptoms on mount
  useEffect(() => {
    if (patientData.symptoms.length > 0) {
      setText(patientData.symptoms.join(', '));
    }
  }, [patientData.symptoms]);

  const handleSaveSymptoms = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      // Split by commas and clean up
      const symptoms = text.split(',').map(s => s.trim()).filter(s => s.length > 0);
      updateSymptoms(symptoms);
    }
  };

  const handleStartDiagnosis = async () => {
    // Parse symptoms from text and start diagnosis in one action
    if (text.trim()) {
      const symptoms = text.split(',').map(s => s.trim()).filter(s => s.length > 0);
      updateSymptoms(symptoms); // Save to context for UI state
      await startDiagnosis(symptoms); // Start with parsed symptoms directly
    } else if (patientData.symptoms.length > 0) {
      // Use existing symptoms
      await startDiagnosis();
    }
  };

  const hasSymptoms = text.trim().length > 0;
  const hasRequiredData = hasSymptoms || patientData.symptoms.length > 0;

  return (
    <div className={s.card}>
      <p className={ui.kicker}>Step 3</p>
      <h2 className={ui.title}>Describe current symptoms</h2>
      <p className={ui.sub}>
        List your symptoms separated by commas (e.g., chest pain, shortness of breath, fatigue)
      </p>
      
      <form onSubmit={handleSaveSymptoms}>
        <textarea
          className={`${ui.input} ${ui.textarea}`}
          placeholder="e.g., sudden chest pain, shortness of breath, dizziness..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />
        
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            className={`${ui.btn} ${ui.primary}`}
            disabled={busy || !hasRequiredData}
            type="button"
            onClick={handleStartDiagnosis}
          >
            {busy ? (
              <>
                Starting Diagnosis&nbsp;<Spinner />
              </>
            ) : (
              "Start Medical Assessment"
            )}
          </button>
        </div>
      </form>
      
      {patientData.symptoms.length > 0 && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
          <p><strong>Saved symptoms:</strong></p>
          <ul>
            {patientData.symptoms.map((symptom, index) => (
              <li key={index}>{symptom}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
