"use client";

import QRCode from "react-qr-code";
import ui from "./ui.module.css";
import s from "./PassportUploader.module.css";

interface Props {
  otp?: { sessionId: string; address: string; time: number };
  timeLeft: number;
}

export default function PassportStart({ otp, timeLeft }: Props) {
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
        </>
      ) : (
        <p>Generating QR...</p>
      )}
    </div>
  );
}