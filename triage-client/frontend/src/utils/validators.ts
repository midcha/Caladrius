import type { Vitals } from "./types";

export type VitalsErrors = Partial<Record<keyof Vitals, string>>;

const isNum = (s: string) => s.trim() !== "" && !Number.isNaN(Number(s));

export function validateVitals(v: Vitals): { ok: boolean; errors: VitalsErrors } {
  const e: VitalsErrors = {};

  if (!isNum(v.temperature)) e.temperature = "Required (number)";
  else {
    const t = Number(v.temperature);
    if (t < 90 || t > 110) e.temperature = "Unusual value (90–110 expected)";
  }

  if (!isNum(v.systolic)) e.systolic = "Required (integer)";
  else {
    const s = Number(v.systolic);
    if (!Number.isInteger(s) || s < 70 || s > 250) e.systolic = "Out of range (70–250)";
  }

  if (!isNum(v.diastolic)) e.diastolic = "Required (integer)";
  else {
    const d = Number(v.diastolic);
    if (!Number.isInteger(d) || d < 40 || d > 160) e.diastolic = "Out of range (40–160)";
  }

  if (isNum(v.systolic) && isNum(v.diastolic)) {
    if (Number(v.systolic) <= Number(v.diastolic)) {
      e.systolic = e.systolic || "Must be > Diastolic";
      e.diastolic = e.diastolic || "Must be < Systolic";
    }
  }

  if (!isNum(v.heartRate)) e.heartRate = "Required (integer)";
  else {
    const hr = Number(v.heartRate);
    if (!Number.isInteger(hr) || hr < 30 || hr > 220) e.heartRate = "Out of range (30–220)";
  }

  if (!isNum(v.respirations)) e.respirations = "Required (integer)";
  else {
    const rr = Number(v.respirations);
    if (!Number.isInteger(rr) || rr < 5 || rr > 60) e.respirations = "Out of range (5–60)";
  }

  if (!isNum(v.spo2)) e.spo2 = "Required (integer)";
  else {
    const s = Number(v.spo2);
    if (!Number.isInteger(s) || s < 50 || s > 100) e.spo2 = "Out of range (50–100)";
  }

  return { ok: Object.keys(e).length === 0, errors: e };
}
