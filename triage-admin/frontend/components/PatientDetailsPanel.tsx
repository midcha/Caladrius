import React, { useState } from "react";
import PriorityBadge from "./PriorityBadge";
import styles from "./ui.module.css";

type Patient = {
  _id: string;
  name: string;
  symptoms: string;
  urgency_level: number;
  urgency_level_text: string;
  differential_diagnosis?: {
    rank: number;
    diagnosis: string;
    probability_percent: number;
    reasoning?: string;
    key_features?: string[];
    next_steps?: string[];
  }[];
  clinical_summary?: string;
  disclaimer?: string;
  age?: number;
  notes?: string;
};

type Props = {
  patient: Patient | null;
  onClose: () => void;
};

export default function PatientDetailsPanel({ patient, onClose }: Props) {
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});

  function colorForProb(p: number){
    if (p >= 75) return {bg:'#10b981', from:'#34d399'}; // green
    if (p >= 50) return {bg:'#3b82f6', from:'#60a5fa'}; // blue
    if (p >= 25) return {bg:'#f59e0b', from:'#fbbf24'}; // amber
    return {bg:'#ef4444', from:'#f87171'}; // red
  }

  function parseSymptoms(input?: string | string[]): string[] {
    if (!input) return [];
    if (Array.isArray(input)) return input.map(s => String(s).trim()).filter(Boolean);
    // Split common delimiters and trim
    return input
      .split(/[,;\n]+/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  return (
    <div className={`${styles.detailsPanel} ${patient ? styles.detailsPanelOpen : ""}`}
         style={{ position: "static", height: "auto" }}>
      <div className={styles.detailsHeader}>
        <h2 className="text-lg font-semibold">Patient Details</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
      </div>

      {patient && (
        <div className={styles.detailsBody}>
          <div>
            <p className="font-bold text-gray-800 flex items-center gap-2">
              <span>{patient.name}</span>
              {typeof patient.age === 'number' && (
                <span className={styles.chip} title="Age">Age {patient.age}</span>
              )}
            </p>
            <span className="mt-2 inline-block">
              <PriorityBadge level={patient.urgency_level} />
            </span>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700">Symptoms</h3>
            {parseSymptoms(patient.symptoms).length > 0 ? (
              <div className={styles.chipGroup}>
                {parseSymptoms(patient.symptoms).map((sym, i) => (
                  <span key={`${sym}-${i}`} className={styles.chip}>{sym}</span>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">{patient.symptoms}</p>
            )}
          </div>

          {patient.differential_diagnosis && (
            <div>
              <h3 className="font-semibold text-gray-700">Differential Diagnosis</h3>
              <div className={styles.dxList}>
                {patient.differential_diagnosis.map((d) => {
                  const pct = Math.max(0, Math.min(100, d.probability_percent || 0));
                  const colors = colorForProb(pct);
                  const isOpen = !!openMap[d.rank];
                  return (
                    <div key={d.rank} className={styles.dxItem}>
                      <button
                        type="button"
                        className={`${styles.dxHead} ${styles.dxHeadButton}`}
                        aria-expanded={isOpen}
                        onClick={() => setOpenMap((m) => ({ ...m, [d.rank]: !m[d.rank] }))}
                        title="Show details"
                      >
                        <div className={styles.dxTitle}>{d.rank}. {d.diagnosis}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span className={styles.probBadge} style={{ background: `linear-gradient(180deg, ${colors.from}, ${colors.bg})`}}>
                            {pct}%
                          </span>
                          <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden>▾</span>
                        </div>
                      </button>
                      <div className={styles.probTrack}>
                        <div className={styles.probFill} style={{ width: `${pct}%`, background: colors.bg }} />
                      </div>

                      {isOpen && (
                        <div className={styles.dxBody}>
                          {Array.isArray(d.next_steps) && d.next_steps.length > 0 && (
                            <div>
                              <h4 className={styles.subTitle}>Next steps</h4>
                              <div className={styles.chipGroup}>
                                {d.next_steps.map((s, i) => (
                                  <span key={`ns-${d.rank}-${i}`} className={styles.chip}>{s}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {Array.isArray(d.key_features) && d.key_features.length > 0 && (
                            <div>
                              <h4 className={styles.subTitle}>Evidence</h4>
                              <div className={styles.chipGroup}>
                                {d.key_features.map((f, i) => (
                                  <span key={`kf-${d.rank}-${i}`} className={styles.chip}>{f}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {d.reasoning && (
                            <div>
                              <h4 className={styles.subTitle}>Reasoning</h4>
                              <p className={styles.subText}>{d.reasoning}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {patient.clinical_summary && (
            <div>
              <h3 className="font-semibold text-gray-700">Clinical Summary</h3>
              <p className="text-gray-600">{patient.clinical_summary}</p>
            </div>
          )}

          {patient.disclaimer && (
            <div>
              <h3 className="font-semibold text-gray-700">Disclaimer</h3>
              <p className="text-gray-500 text-sm">{patient.disclaimer}</p>
            </div>
          )}

          {patient.notes && (
            <div>
              <h3 className="font-semibold text-gray-700">Notes</h3>
              <p className="text-gray-600">{patient.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
