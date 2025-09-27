"use client";

import { useState } from "react";
import { useTriage } from "./TriageProvider";
import type { Vitals } from "../utils/types";
import ui from "./ui.module.css";
import s from "./VitalsForm.module.css";
import Spinner from "./Spinner";

export default function VitalsForm() {
  const { submitVitals, busy } = useTriage();
  const [v, setV] = useState<Vitals>({
    temperature: "",
    systolic: "",
    diastolic: "",
    heartRate: "",
    respirations: "",
    spo2: "",
  });

  const onChange =
    (k: keyof Vitals) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setV({ ...v, [k]: e.target.value });

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    submitVitals(v);
  };

  return (
    <form onSubmit={handle} className={s.card}>
      <p className={ui.kicker}>Step 1</p>
      <h2 className={ui.title}>Record vital signs</h2>
      <p className={ui.sub}>Enter initial triage measurements.</p>

      <div className={s.grid}>
        <label className={ui.stack}>
          <span className={ui.label}>Temperature</span>
          <input
            className={ui.input}
            placeholder="98.6"
            value={v.temperature}
            onChange={onChange("temperature")}
          />
        </label>

        <label className={ui.stack}>
          <span className={ui.label}>Systolic</span>
          <input
            className={ui.input}
            placeholder="120"
            value={v.systolic}
            onChange={onChange("systolic")}
          />
        </label>

        <label className={ui.stack}>
          <span className={ui.label}>Diastolic</span>
          <input
            className={ui.input}
            placeholder="80"
            value={v.diastolic}
            onChange={onChange("diastolic")}
          />
        </label>

        <label className={ui.stack}>
          <span className={ui.label}>Heart rate</span>
          <input
            className={ui.input}
            placeholder="72"
            value={v.heartRate}
            onChange={onChange("heartRate")}
          />
        </label>

        <label className={ui.stack}>
          <span className={ui.label}>Respirations</span>
          <input
            className={ui.input}
            placeholder="16"
            value={v.respirations}
            onChange={onChange("respirations")}
          />
        </label>

        <label className={ui.stack}>
          <span className={ui.label}>SpO₂ %</span>
          <input
            className={ui.input}
            placeholder="98"
            value={v.spo2}
            onChange={onChange("spo2")}
          />
        </label>
      </div>

      <div className={s.actions}>
        <button className={`${ui.btn} ${ui.primary}`} disabled={busy} type="submit">
          {busy ? (
            <>
              Saving&nbsp;<Spinner />
            </>
          ) : (
            "Save & Continue"
          )}
        </button>
      </div>
    </form>
  );
}
