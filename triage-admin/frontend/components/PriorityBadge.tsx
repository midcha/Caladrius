import React from "react";
import styles from "./ui.module.css";

type Priority = 1 | 2 | 3 | 4 | 5;

const TRIAGE_MAP: Record<
  Priority,
  { label: string; badgeClass: string; description?: string }
> = {
  1: {
    label: "IMMEDIATE HELP REQUIRED",
    badgeClass: `${styles.badge} ${styles.badgeL1}`,
    description: "Emergency / Life-saving intervention needed",
  },
  2: {
    label: "VERY HIGH",
    badgeClass: `${styles.badge} ${styles.badgeL2}`,
    description: "High / Very high risk of rapid deterioration",
  },
  3: {
    label: "URGENT",
    badgeClass: `${styles.badge} ${styles.badgeL3}`,
    description: "Moderate-high (likely needs multiple resources)",
  },
  4: {
    label: "LESS-URGENT",
    badgeClass: `${styles.badge} ${styles.badgeL4}`,
    description: "Moderate (one resource expected)",
  },
  5: {
    label: "NON-URGENT",
    badgeClass: `${styles.badge} ${styles.badgeL5}`,
    description: "Routine / Low (history & exam only)",
  },
};

export default function PriorityBadge({
  level,
  compact = false,
}: {
  level: number; // urgency_level from schema
  compact?: boolean;
}) {
  const lvl = Math.min(Math.max(Math.round(level), 1), 5) as Priority;
  const info = TRIAGE_MAP[lvl];

  const className = compact
    ? `${styles.badgeCompact} ${info.badgeClass}`
    : `${styles.badgePill} ${info.badgeClass}`;

  return (
    <span
      role="status"
      aria-label={info.label}
      title={info.description || info.label}
      className={className}
    >
      {compact ? `L${lvl}` : info.label}
    </span>
  );
}
