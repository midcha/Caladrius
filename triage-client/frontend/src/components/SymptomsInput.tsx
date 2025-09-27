"use client";

import { useState } from "react";
import { useTriage } from "./TriageProvider";
import ui from "./ui.module.css";
import s from "./SymptomsInput.module.css";
import Spinner from "./Spinner";

export default function SymptomsInput() {
  const { submitSymptoms, busy } = useTriage();
  const [text, setText] = useState("");

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    submitSymptoms(text.trim());
  };

  return (
    <form onSubmit={handle} className={s.card}>
      <p className={ui.kicker}>Step 3</p>
      <h2 className={ui.title}>Describe current symptoms</h2>
      <textarea
        className={`${ui.input} ${ui.textarea}`}
        placeholder="e.g., sudden chest pain, shortness of breath..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className={`${ui.btn} ${ui.primary}`}
        disabled={busy || !text.trim()}
        type="submit"
      >
        {busy ? (
          <>
            Sending&nbsp;<Spinner />
          </>
        ) : (
          "Send to backend"
        )}
      </button>
    </form>
  );
}
