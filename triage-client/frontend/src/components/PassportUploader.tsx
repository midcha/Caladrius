"use client";

import { useState, useEffect } from "react";
import { useTriage } from "./TriageProvider";
import ui from "./ui.module.css";
import s from "./PassportUploader.module.css";

export default function PassportUploader() {
  const { updatePassport, patientData } = useTriage();
  const [text, setText] = useState(
    '{\n  "allergies": ["penicillin"],\n  "medications": [],\n  "conditions": []\n}'
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Load existing passport data on mount
  useEffect(() => {
    if (patientData.passportData) {
      setText(JSON.stringify(patientData.passportData, null, 2));
    }
  }, [patientData.passportData]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const json = JSON.parse(text);
      updatePassport(json);
      setJsonError(null);
    } catch (error) {
      setJsonError("Invalid JSON format");
    }
  };

  const validateJson = (jsonText: string) => {
    try {
      JSON.parse(jsonText);
      setJsonError(null);
    } catch {
      setJsonError("Invalid JSON format");
    }
  };

  return (
    <form onSubmit={handle} className={`${s.card} ${s.slideIn}`}>
      <div className={s.header}>
        <p className={ui.kicker}>Step 2 of 3</p>
        <h2 className={ui.title}>Medical History</h2>
        <p className={ui.sub}>
          Upload your medical passport or enter your medical information. This helps us provide more accurate assessments.
        </p>
      </div>
      
      <div className={s.textareaWrapper}>
        <textarea
          className={`${ui.input} ${s.textarea} ${jsonError ? s.error : ''}`}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            validateJson(e.target.value);
          }}
          rows={10}
          placeholder="Enter your medical information in JSON format..."
        />
        <div className={s.jsonStatus}>
          {jsonError ? (
            <span className={s.jsonError}>⚠️ {jsonError}</span>
          ) : (
            <span className={s.jsonValid}>✓ Valid JSON format</span>
          )}
        </div>
      </div>
    </form>
  );
}
