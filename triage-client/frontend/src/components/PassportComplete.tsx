"use client";

import ui from "./ui.module.css";
import s from "./PassportUploader.module.css";

interface Props {
  data?: {
    json: unknown;
    images: string[];
  };
}

export default function PassportComplete({ data }: Props) {
  return (
    <div className={s.card} style={{ textAlign: "center" }}>
      <p className={ui.kicker}>Step 2</p>
      <h2 className={ui.title}>Upload Complete</h2>
      <p className={ui.sub}>The patient passport has been uploaded.</p>

      {data && (
        <>
          <h3 className={ui.title} style={{ marginTop: "1rem" }}>
            Passport JSON
          </h3>
          <pre
            style={{
              textAlign: "left",
              background: "#f5f5f5",
              padding: "0.75rem",
              borderRadius: "8px",
              maxHeight: "200px",
              overflow: "auto",
            }}
          >
            {JSON.stringify(data.json, null, 2)}
          </pre>

          <h3 className={ui.title} style={{ marginTop: "1rem" }}>
            Images
          </h3>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {data.images.map((img, i) => (
              <img
                key={i}
                src={`data:image/jpeg;base64,${img}`}
                alt={`Passport image ${i + 1}`}
                style={{
                  maxWidth: "150px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
