"use client";

import { useEffect, useState } from "react";
import { useTriage } from "./TriageProvider";
import ui from "./ui.module.css";
import s from "./QuestionPrompt.module.css";
import Spinner from "./Spinner";

export default function QuestionPrompt() {
  const { currentQuestion, answerQuestion, busy } = useTriage();
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const SKIP_TOKEN = "__skip__";

  // Clear free-response and selections when a new question arrives
  useEffect(() => {
    setValue("");
    setSelected([]);
  }, [currentQuestion?.query]);
  
  if (!currentQuestion) return null;

  const hasOptions = currentQuestion.options && Object.keys(currentQuestion.options).length > 0;
  const qType = currentQuestion.question_type || 'multiple_choice';

  const toggleOption = (key: string) => {
    setSelected(prev => {
      const exists = prev.includes(key);
      if (exists) return prev.filter(k => k !== key);
      return [...prev, key];
    });
  };

  const submitSelected = () => {
    if (!selected.length) return;
    const joined = selected.join(', ');
    answerQuestion(joined);
  };

  return (
    <div className={`${s.wrap} ${s.slideIn}`}>
      <div className={s.twoColumnLayout}>
        {/* Left Column - Question */}
        <div className={s.questionColumn}>
          <div className={s.header}>
            {/* Caladrius Character */}
            <div className={s.caladriusIntro}>
              <div className={s.caladriusAvatar}>
                <img src="/caladrius.png" alt="Caladrius" className={s.caladriusImage} />
              </div>
              <div className={s.caladriusText}>
                <p className={ui.kicker}>Medical Assessment</p>
                <h3 className={s.caladriusName}>Caladrius asks:</h3>
              </div>
            </div>
            
            <div className={s.questionBox}>
              <p className={s.q}>{currentQuestion.query}</p>
            </div>
          </div>
        </div>
        
        {/* Right Column - Response Area */}
        <div className={s.responseColumn}>

          {hasOptions && qType === 'select_multiple' ? (
            // Select-multiple with optional free response and skip
            <div className={ui.stack}>
          <p className={ui.sub}>You may select one or more options:</p>
          <div className={s.options}>
            {Object.entries(currentQuestion.options!).map(([key, description], index) => {
              const displayKey = String(key).replace(/[:\s]+$/, "");
              const displayDesc = String(description).replace(/[:\s]+$/, "");
              const checked = selected.includes(key);
              return (
                <label 
                  key={key} 
                  className={`${s.optionLabel} ${checked ? s.checked : ''} ${s.fadeIn}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={checked}
                    onChange={() => toggleOption(key)}
                    className={s.checkbox}
                  />
                  <div className={s.checkmark}></div>
                  <span className={s.optionText}>
                    <strong>{displayKey}</strong>
                    {displayDesc && <span className={s.optionDesc}> {displayDesc}</span>}
                  </span>
                </label>
              );
            })}
          </div>

          <div className={s.row}>
            <button
              className={`${ui.btn} ${ui.primary}`}
              disabled={busy || selected.length === 0}
              onClick={submitSelected}
            >
              {busy ? (
                <>
                  Submitting&nbsp;<Spinner />
                </>
              ) : (
                "Submit Selected"
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
            </div>
          </div>
        </div>
      ) : hasOptions ? (
        // Multiple choice question with optional free response and skip
        <div className={ui.stack}>
          <p className={ui.sub}>Please select one of the following options:</p>
          <div className={s.options}>
            {Object.entries(currentQuestion.options!).map(([key, description], index) => {
              const displayKey = String(key).replace(/[:\s]+$/, "");
              const displayDesc = String(description).replace(/[:\s]+$/, "");
              return (
                <button
                  key={key}
                  className={`${s.optionButton} ${s.fadeIn}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  disabled={busy}
                  onClick={() => answerQuestion(key)}
                >
                  <div className={s.optionContent}>
                    <strong className={s.optionKey}>{displayKey}</strong>
                    {displayDesc && <span className={s.optionDesc}>{displayDesc}</span>}
                  </div>
                  <div className={s.optionArrow}>→</div>
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
      </div>
    </div>
  );
}
