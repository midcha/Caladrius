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
    <form onSubmit={handle} className={s.card}>
      <p className={ui.kicker}>Step 2</p>
      <h2 className={ui.title}>Medical History (Optional)</h2>
      <p className={ui.sub}>
        Add medical history in JSON format including allergies, medications, and conditions.
      </p>
      <textarea
        className={`${ui.input} ${ui.textarea}`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          validateJson(e.target.value);
        }}
        rows={8}
      />
      {jsonError && (
        <div style={{ color: '#ff6b6b', fontSize: '14px', marginTop: '4px' }}>
          {jsonError}
        </div>
      )}
      {jsonError && (
        <div style={{ color: '#ff6b6b', fontSize: '14px', marginTop: '8px' }}>
          Please fix the JSON format to continue.
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: '12px' }}>
        <button
          className={`${ui.btn} ${ui.ghost}`}
          type="button"
          onClick={() => {
            setText("{}");
            setJsonError(null);
          }}
        >
          Clear
        </button>
        <button
          className={`${ui.btn} ${ui.ghost}`}
          type="button"
          onClick={() => {
            updatePassport(null);
            setText("{}");
            setJsonError(null);
          }}
        >
          Skip This Step
        </button>
      </div>
    </form>
  );
}
