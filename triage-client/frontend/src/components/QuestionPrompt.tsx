"use client";

import { useState } from "react";
import { useTriage } from "./TriageProvider";
import ui from "./ui.module.css";
import s from "./QuestionPrompt.module.css";

export default function QuestionPrompt() {
  const { currentQuestion, answerPrompt, busy } = useTriage();
  const [value, setValue] = useState("");
  if (!currentQuestion) return null;

  return (
    <div className={s.wrap}>
      <p className={ui.kicker}>Action needed</p>
      <p className={s.q}>{currentQuestion.text}</p>

      {currentQuestion.yesNo ? (
        <div className={s.row}>
          <button
            className={`${ui.btn} ${ui.primary}`}
            disabled={busy}
            onClick={() => answerPrompt(true)}
          >
            Yes
          </button>
          <button
            className={`${ui.btn} ${ui.danger}`}
            disabled={busy}
            onClick={() => answerPrompt(false)}
          >
            No
          </button>
          <button
            className={`${ui.btn} ${ui.ghost}`}
            disabled={busy}
            onClick={() => answerPrompt(null)}
          >
            I don't know / refuse
          </button>
        </div>
      ) : (
        <div className={ui.stack}>
          <textarea
            className={`${ui.input} ${ui.textarea}`}
            placeholder="Type your answer"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className={s.row}>
            <button
              className={`${ui.btn} ${ui.primary}`}
              disabled={busy || !value.trim()}
              onClick={() => answerPrompt(value.trim())}
            >
              Submit answer
            </button>
            <button
              className={`${ui.btn} ${ui.ghost}`}
              disabled={busy}
              onClick={() => answerPrompt(null)}
            >
              I don't know / refuse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
