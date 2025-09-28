"use client";

import { useTriage } from "./TriageProvider";
import VitalsForm from "./VitalsForm";
import PassportUploader from "./PassportUploader";
import SymptomsInput from "./SymptomsInput";
import QuestionPrompt from "./QuestionPrompt";
import SuccessNotice from "./SuccessNotice";
import ui from "./ui.module.css";

export default function TriageFlow() {
  const { phase } = useTriage();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {phase === "vitals" && <VitalsForm />}
      {phase.startsWith("passport") && <PassportUploader />}
      {phase === "symptoms" && <SymptomsInput />}
      {phase === "processing" && (
        <div className={ui.panel}>
          <p className={ui.kicker}>Working</p>
          <p className={ui.sub}>
            Backend processing… you&apos;ll be asked questions here if needed.
          </p>
        </div>
      )}
      {phase === "prompt" && <QuestionPrompt />}
      {phase === "success" && <SuccessNotice />}
    </div>
  );
}
