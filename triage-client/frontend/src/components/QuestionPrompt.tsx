"use client";

import { useState } from "react";
import { useTriage } from "./TriageProvider";
import ui from "./ui.module.css";
import s from "./QuestionPrompt.module.css";
import Spinner from "./Spinner";

export default function QuestionPrompt() {
  const { currentQuestion, answerQuestion, busy } = useTriage();
  const [value, setValue] = useState("");
  
  if (!currentQuestion) return null;

  const hasOptions = currentQuestion.options && Object.keys(currentQuestion.options).length > 0;

  return (
    <div className={s.wrap}>
      <p className={ui.kicker}>Diagnostic Question</p>
      <p className={s.q}>{currentQuestion.query}</p>

      {hasOptions ? (
        // Multiple choice question
        <div className={ui.stack}>
          <p className={ui.sub}>Please select one of the following options:</p>
          <div className={s.options}>
            {Object.entries(currentQuestion.options!).map(([key, description]) => (
              <button
                key={key}
                className={`${ui.btn} ${ui.primary}`}
                disabled={busy}
                onClick={() => answerQuestion(key)}
                style={{ 
                  display: 'block', 
                  width: '100%', 
                  marginBottom: '8px',
                  textAlign: 'left',
                  padding: '12px 16px'
                }}
              >
                <strong>{key}:</strong> {description}
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Open-ended question
        <div className={ui.stack}>
          <textarea
            className={`${ui.input} ${ui.textarea}`}
            placeholder="Type your answer"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
          />
          <div className={s.row}>
            <button
              className={`${ui.btn} ${ui.primary}`}
              disabled={busy || !value.trim()}
              onClick={() => answerQuestion(value.trim())}
            >
              {busy ? (
                <>
                  Submitting&nbsp;<Spinner />
                </>
              ) : (
                "Submit Answer"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
