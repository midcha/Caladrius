"use client";

import { useTriage } from "./TriageProvider";
import ui from "./ui.module.css";

export function ConfirmPanel() {
  const { busy, confirmProceed, confirmMessage } = useTriage();

  return (
    <div className={ui.panel}>
      <p className={ui.kicker}>Ready to Diagnose</p>
  <h3>{'We have enough information to provide your assessment.'}</h3>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          className={`${ui.btn} ${ui.primary}`}
          disabled={busy}
          onClick={() => confirmProceed(true)}
        >
          {busy ? "Working..." : "Yes, continue"}
        </button>
      </div>
    </div>
  );
}
