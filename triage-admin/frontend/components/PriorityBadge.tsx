import React from "react";

type Priority = 1 | 2 | 3 | 4 | 5;

const TRIAGE_MAP: Record<
  Priority,
  { label: string; classes: string; description?: string }
> = {
  1: {
    label: "IMMEDIATE HELP REQUIRED",
    classes: "bg-red-100 text-red-700",
    description: "Emergency / Life-saving intervention needed",
  },
  2: {
    label: "VERY HIGH",
    classes: "bg-orange-100 text-orange-700",
    description: "High / Very high risk of rapid deterioration",
  },
  3: {
    label: "URGENT",
    classes: "bg-yellow-100 text-yellow-700",
    description: "Moderate-high (likely needs multiple resources)",
  },
  4: {
    label: "LESS-URGENT",
    classes: "bg-green-100 text-green-700",
    description: "Moderate (one resource expected)",
  },
  5: {
    label: "NON-URGENT",
    classes: "bg-blue-100 text-blue-700",
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

  return (
    <span
      role="status"
      aria-label={info.label}
      title={info.description || info.label}
      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${info.classes}`}
    >
      {compact ? `L${lvl}` : info.label}
    </span>
  );
}
