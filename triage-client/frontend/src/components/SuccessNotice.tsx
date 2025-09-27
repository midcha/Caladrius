"use client";

import ui from "./ui.module.css";
import s from "./SuccessNotice.module.css";

export default function SuccessNotice() {
  return (
    <div className={s.box}>
      <p className={ui.kicker}>Complete</p>
      <h3 className={ui.title}>
        Thanks for answering. Your triage has been recorded.
      </h3>
      <p className={ui.sub}>You may be called by a clinician shortly.</p>
    </div>
  );
}
