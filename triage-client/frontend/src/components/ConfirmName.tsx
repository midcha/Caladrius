"use client";

import { useMemo } from "react";
import { useTriage } from "./TriageProvider";
import ui from "./ui.module.css";
import { extractPatientName } from "@/utils/passport";

export default function ConfirmName() {
  const { patientData } = useTriage();

  const passportSource = useMemo(
    () => patientData.passportBundle?.json ?? patientData.passportData,
    [patientData.passportBundle, patientData.passportData]
  );

  const extractedName = useMemo(
    () => extractPatientName(passportSource ?? undefined),
    [passportSource]
  );

  const hasName = Boolean(extractedName?.fullName);
  const fullName = extractedName?.fullName ?? "Name not found";

  return (
    <div className={ui.panel} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p className={ui.kicker}>Identity Check</p>
      <h2 className={ui.title} style={{ marginBottom: 8 }}>
        Confirm your name
      </h2>
      <p className={ui.sub}>
        Before we show any medical records, make sure the name we detected from your
        passport is correct. We keep everything encrypted until you confirm it&apos;s you.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <NameDetail label="Full name" value={fullName} emphasized />
        <NameDetail label="First name" value={extractedName?.firstName ?? "—"} />
        <NameDetail label="Last name" value={extractedName?.lastName ?? "—"} />
      </div>

      {!hasName && (
        <div
          style={{
            borderRadius: 12,
            padding: "12px 16px",
            background: "rgba(248, 113, 113, 0.1)",
            border: "1px solid rgba(248, 113, 113, 0.3)",
            color: "#b91c1c",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          We couldn&apos;t automatically find your name. You can still continue, but double-check
          the document or try re-uploading if something looks off.
        </div>
      )}

      <ul
        style={{
          margin: 0,
          padding: "0 0 0 18px",
          color: "#0f172a",
          fontSize: "0.95rem",
          lineHeight: 1.6,
        }}
      >
        <li>Your records stay locked until you confirm.</li>
        <li>If the name is wrong, go back and re-upload your passport.</li>
      </ul>

      <p style={{ fontSize: "0.9rem", margin: 0, color: "#1e293b" }}>
        When it looks right, click <strong>Yes, show my records</strong> below to continue.
      </p>
    </div>
  );
}

function NameDetail({
	label,
	value,
	emphasized = false,
}: {
	label: string;
	value: string;
	emphasized?: boolean;
}) {
	return (
		<div
			style={{
				borderRadius: 12,
				background: emphasized ? "linear-gradient(135deg, #e0f2fe 0%, #f8fafc 100%)" : "#f8fafc",
				border: emphasized ? "1px solid rgba(14, 165, 233, 0.45)" : "1px solid rgba(148, 163, 184, 0.35)",
				padding: "12px 16px",
				display: "flex",
				flexDirection: "column",
				gap: 6,
				minHeight: 72,
			}}
		>
			<span className={ui.label}>{label}</span>
			<span
				style={{
					fontSize: emphasized ? 20 : 16,
					fontWeight: emphasized ? 700 : 500,
					color: emphasized ? "#0f172a" : "#1f2937",
					wordBreak: "break-word",
				}}
			>
				{value}
			</span>
		</div>
	);
}
