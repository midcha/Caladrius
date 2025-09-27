"use client";

import { useState } from "react";
import { useTriage } from "./TriageProvider";
import ui from "./ui.module.css";
import s from "./PassportUploader.module.css";
import Spinner from "./Spinner";

export default function PassportUploader() {
  const { submitPassport, busy } = useTriage();
  const [text, setText] = useState(
    '{\n  "allergies": ["penicillin"],\n  "medications": [],\n  "conditions": []\n}'
  );

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const json = JSON.parse(text);
      await submitPassport(json);
    } catch {
      alert("Invalid JSON");
    }
  };

  return (
    <form onSubmit={handle} className={s.card}>
      <p className={ui.kicker}>Step 2</p>
      <h2 className={ui.title}>Attach medical passport (JSON)</h2>
      <p className={ui.sub}>
        Placeholder for phone plug-in middleware. Paste or drop JSON.
      </p>
      <textarea
        className={`${ui.input} ${ui.textarea}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <button className={`${ui.btn} ${ui.primary}`} disabled={busy} type="submit">
          {busy ? (
            <>
              Uploading&nbsp;<Spinner />
            </>
          ) : (
            "Upload & Continue"
          )}
        </button>
        <button
          className={`${ui.btn} ${ui.ghost}`}
          type="button"
          onClick={() => setText("{}")}
        >
          Clear
        </button>
      </div>
    </form>
  );
}
