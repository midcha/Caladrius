"use client";

import ui from "./ui.module.css";
import s from "./PassportUploader.module.css";
import Spinner from "./Spinner";

export default function PassportWaiting() {
  return (
    <div className={s.card} style={{ textAlign: "center" }}>
      <p className={ui.kicker}>Step 2</p>
      <h2 className={ui.title}>Waiting for upload</h2>
      <p className={ui.sub}>
        QR code scanned successfully. Waiting for data upload to complete...
      </p>
      <div style={{ marginTop: "1rem" }}>
        <Spinner />
      </div>
    </div>
  );
}