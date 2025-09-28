"use client";

import QRCode from "react-qr-code";
import ui from "./ui.module.css";
import s from "./PassportUploader.module.css";

interface Props {
  otp?: { sessionId: string; address: string; time: number };
  timeLeft: number;
  onRefresh?: () => void;
}

export default function PassportStart({ otp, timeLeft, onRefresh }: Props) {
  return (
    <div className={s.card} style={{ textAlign: "center" }}>
      <p className={ui.kicker}>Step 2</p>
      <h2 className={ui.title}>Scan QR with phone</h2>
      <p className={ui.sub}>
        Scan this QR in the phone app to start the secure upload. It refreshes
        every minute.
      </p>

      {otp ? (
        <>
          <QRCode value={JSON.stringify(otp)} size={200} />
          <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
            QR expires in: {timeLeft}s
          </div>
          {onRefresh && (
            <button 
              onClick={onRefresh}
              title="Generate new QR code"
              style={{ 
                marginTop: "0.75rem",
                background: "none",
                border: "1px solid rgba(0,0,0,0.1)", 
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "14px",
                color: "#666",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.05)";
                e.currentTarget.style.color = "#333";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = "#666";
              }}
            >
              ↻
            </button>
          )}
        </>
      ) : (
        <p>Generating QR...</p>
      )}
    </div>
  );
}