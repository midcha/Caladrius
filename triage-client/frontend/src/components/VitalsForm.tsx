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
  const { submitVitals, busy } = useTriage();
  const [v, setV] = useState<Vitals>(emptyVitals);
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
      setV((prev) => ({ ...prev, [k]: e.target.value }));
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
    submitVitals(v);
  };

  useEffect(() => {}, []);

  return (
    <form onSubmit={handle} className={s.card} noValidate>
      <p className={ui.kicker}>Step 1</p>
      <h2 className={ui.title}>Record vital signs</h2>
      <p className={ui.sub}>Enter initial triage measurements (numbers only).</p>

      <div className={s.grid}>
        <Field
          label="Temperature"
          placeholder="98.6"
          value={v.temperature}
          onChange={onChange("temperature")}
          onBlur={onBlur("temperature")}
          error={touched.temperature ? errors.temperature : undefined}
        />

        <Field
          label="Systolic"
          placeholder="120"
          value={v.systolic}
          onChange={onChange("systolic")}
          onBlur={onBlur("systolic")}
          error={touched.systolic ? errors.systolic : undefined}
        />

        <Field
          label="Diastolic"
          placeholder="80"
          value={v.diastolic}
          onChange={onChange("diastolic")}
          onBlur={onBlur("diastolic")}
          error={touched.diastolic ? errors.diastolic : undefined}
        />

        <Field
          label="Heart rate"
          placeholder="72"
          value={v.heartRate}
          onChange={onChange("heartRate")}
          onBlur={onBlur("heartRate")}
          error={touched.heartRate ? errors.heartRate : undefined}
        />

        <Field
          label="Respirations"
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

      <div className={s.actions}>
        <button
          className={`${ui.btn} ${ui.primary}`}
          disabled={busy || !ok}
          type="submit"
          aria-disabled={busy || !ok}
          aria-busy={busy}
        >
          {busy ? (
            <>
              Saving&nbsp;<Spinner />
            </>
          ) : (
            "Save & Continue"
          )}
        </button>
        {!ok && (
          <span className={s.hint} aria-live="polite">
            Please fix the highlighted fields.
          </span>
        )}
      </div>
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
    <label className={ui.stack}>
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
