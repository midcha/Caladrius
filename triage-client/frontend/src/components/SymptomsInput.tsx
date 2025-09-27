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

  const commonSymptoms = [
    "Chest pain", "Shortness of breath", "Fever", "Headache", "Dizziness", 
    "Nausea", "Fatigue", "Cough", "Abdominal pain", "Back pain"
  ];

  const addSuggestion = (symptom: string) => {
    const currentSymptoms = text.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (!currentSymptoms.includes(symptom)) {
      const newText = text.trim() ? `${text.trim()}, ${symptom}` : symptom;
      setText(newText);
    }
  };

  return (
    <div className={`${s.card} ${s.slideIn}`}>
      <div className={s.header}>
        <p className={ui.kicker}>Step 3 of 3</p>
        <h2 className={ui.title}>Tell us about your symptoms</h2>
        <p className={ui.sub}>
          Describe what you're experiencing. Be as specific as possible - this helps us provide better care recommendations.
        </p>
      </div>
      
      {/* Quick symptom suggestions */}
      <div className={s.suggestions}>
        <p className={s.suggestionsLabel}>Common symptoms (click to add):</p>
        <div className={s.suggestionTags}>
          {commonSymptoms.map((symptom, index) => (
            <button
              key={symptom}
              type="button"
              className={`${s.suggestionTag} ${s.fadeIn}`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => addSuggestion(symptom)}
            >
              {symptom}
            </button>
          ))}
        </div>
      </div>
      
      <form onSubmit={handleSaveSymptoms}>
        <div className={s.textareaWrapper}>
          <textarea
            className={`${ui.input} ${s.textarea}`}
            placeholder="Describe your symptoms in detail... (e.g., sharp chest pain on the left side, started 2 hours ago)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
          />
          <div className={s.charCount}>
            {text.length > 0 && `${text.length} characters`}
          </div>
        </div>
        
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
        <div className={s.savedSymptoms}>
          <p className={s.savedLabel}>📋 Current symptoms:</p>
          <div className={s.symptomsList}>
            {patientData.symptoms.map((symptom, index) => (
              <span key={index} className={`${s.symptomChip} ${s.slideIn}`} style={{ animationDelay: `${index * 0.1}s` }}>
                {symptom}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
