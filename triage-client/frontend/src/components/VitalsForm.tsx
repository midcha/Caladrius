"use client";

import { useEffect, useMemo, useState } from "react";
import { useTriage } from "./TriageProvider";
import type { Vitals } from "../utils/types";
import { validateVitals } from "../utils/validators";
import ui from "./ui.module.css";
import s from "./VitalsForm.module.css";
import Spinner from "./Spinner";

const emptyVitals: Vitals = {
  temperature: "",
  systolic: "",
  diastolic: "",
  heartRate: "",
  respirations: "",
  spo2: "",
};

export default function VitalsForm() {
  const { updateVitals, patientData, busy } = useTriage();
  const [v, setV] = useState<Vitals>(patientData.vitals || emptyVitals);
  const [touched, setTouched] = useState<Record<keyof Vitals, boolean>>({
    temperature: false,
    systolic: false,
    diastolic: false,
    heartRate: false,
    respirations: false,
    spo2: false,
  });

  const { ok, errors } = useMemo(() => validateVitals(v), [v]);

  const onChange =
    (k: keyof Vitals) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVitals = { ...v, [k]: e.target.value };
      setV(newVitals);
      // Auto-save valid vitals to context
      if (validateVitals(newVitals).ok) {
        updateVitals(newVitals);
      }
    };

  const onBlur =
    (k: keyof Vitals) =>
    () =>
      setTouched((t) => ({ ...t, [k]: true }));

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateVitals(v);
    if (!check.ok) {
      setTouched({
        temperature: true,
        systolic: true,
        diastolic: true,
        heartRate: true,
        respirations: true,
        spo2: true,
      });
      return;
    }
    updateVitals(v);
  };

  useEffect(() => {}, []);

  return (
    <form onSubmit={handle} className={`${s.card} ${s.slideIn}`} noValidate>
      <div className={s.header}>
        <p className={ui.kicker}>Step 1 of 3</p>
        <h2 className={ui.title}>Record vital signs</h2>
        <p className={ui.sub}>Enter your current measurements to help us assess your condition.</p>
      </div>

      {/* Progress indicator */}
      <div className={s.progress}>
        <div className={s.progressBar}>
          <div className={s.progressFill} style={{ width: `${(Object.values(v).filter(val => val.trim() !== '').length / 6) * 100}%` }} />
        </div>
        <span className={s.progressText}>
          {Object.values(v).filter(val => val.trim() !== '').length} of 6 measurements completed
        </span>
      </div>

      <div className={s.grid}>
        <Field
          label="Temperature (°F)"
          placeholder="98.6"
          value={v.temperature}
          onChange={onChange("temperature")}
          onBlur={onBlur("temperature")}
          error={touched.temperature ? errors.temperature : undefined}
        />

        <Field
          label="Systolic BP (mmHg)"
          placeholder="120"
          value={v.systolic}
          onChange={onChange("systolic")}
          onBlur={onBlur("systolic")}
          error={touched.systolic ? errors.systolic : undefined}
        />

        <Field
          label="Diastolic BP (mmHg)"
          placeholder="80"
          value={v.diastolic}
          onChange={onChange("diastolic")}
          onBlur={onBlur("diastolic")}
          error={touched.diastolic ? errors.diastolic : undefined}
        />

        <Field
          label="Heart Rate (BPM)"
          placeholder="72"
          value={v.heartRate}
          onChange={onChange("heartRate")}
          onBlur={onBlur("heartRate")}
          error={touched.heartRate ? errors.heartRate : undefined}
        />

        <Field
          label="Respirations (/min)"
          placeholder="16"
          value={v.respirations}
          onChange={onChange("respirations")}
          onBlur={onBlur("respirations")}
          error={touched.respirations ? errors.respirations : undefined}
        />

        <Field
          label="SpO₂ %"
          placeholder="98"
          value={v.spo2}
          onChange={onChange("spo2")}
          onBlur={onBlur("spo2")}
          error={touched.spo2 ? errors.spo2 : undefined}
        />
      </div>

      {!ok && (
        <div className={s.actions}>
          <span className={s.hint} aria-live="polite">
            Please fill the empty fields to continue.
          </span>
        </div>
      )}
    </form>
  );
}

function Field(props: {
  label: string;
  placeholder?: string;
  value: string;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}) {
  const { label, placeholder, value, error, onChange, onBlur } = props;
  const ariaId = `${label.replace(/\s+/g, "-").toLowerCase()}-err`;

  return (
    <label className={`${ui.stack} ${s.fieldWrapper}`}>
      <span className={ui.label}>{label}</span>
      <input
        className={`${ui.input} ${error ? s.bad : ""}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        inputMode="decimal"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? ariaId : undefined}
      />
      {error ? (
        <span id={ariaId} className={s.error}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
