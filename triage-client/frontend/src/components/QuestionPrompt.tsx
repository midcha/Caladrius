"use client";

import { useEffect, useState } from "react";
import { useTriage } from "./TriageProvider";
import ui from "./ui.module.css";
import s from "./QuestionPrompt.module.css";
import Spinner from "./Spinner";

export default function QuestionPrompt() {
  const { currentQuestion, answerQuestion, busy } = useTriage();
  const [value, setValue] = useState("");
  const SKIP_TOKEN = "__skip__";

  // Clear free-response when a new question arrives
  useEffect(() => {
    setValue("");
  }, [currentQuestion?.query]);
  
  if (!currentQuestion) return null;

  const hasOptions = currentQuestion.options && Object.keys(currentQuestion.options).length > 0;

  return (
    <div className={s.wrap}>
      <p className={ui.kicker}>Diagnostic Question</p>
      <p className={s.q}>{currentQuestion.query}</p>

      {hasOptions ? (
        // Multiple choice question with optional free response and skip
        <div className={ui.stack}>
          <p className={ui.sub}>Please select one of the following options:</p>
          <div className={s.options}>
            {Object.entries(currentQuestion.options!).map(([key, description]) => {
              const displayKey = String(key).replace(/[:\s]+$/, "");
              const displayDesc = String(description).replace(/[:\s]+$/, "");
              return (
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
                  <strong>{displayKey}</strong>{displayDesc ? ` ${displayDesc}` : ""}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 12 }}>
            <p className={ui.sub} style={{ marginBottom: 8 }}>Or answer in your own words:</p>
            <textarea
              className={`${ui.input} ${ui.textarea}`}
              placeholder="Type your answer (optional)"
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
                  "Submit Free Response"
                )}
              </button>
              <button
                className={`${ui.btn} ${ui.ghost}`}
                disabled={busy}
                onClick={() => answerQuestion(SKIP_TOKEN)}
                style={{ marginLeft: 8 }}
              >
                Skip Question
              </button>
            </div>
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
            <button
              className={`${ui.btn} ${ui.ghost}`}
              disabled={busy}
              onClick={() => answerQuestion(SKIP_TOKEN)}
              style={{ marginLeft: 8 }}
            >
              Skip Question
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
