"use client";

import { useEffect, useRef, useState } from "react";
import { useTriage } from "./TriageProvider";
import ui from "./ui.module.css";
import s from "./PassportUploader.module.css";
import Spinner from "./Spinner";
import QRCode from "react-qr-code";

export default function PassportUploader() {
  const { submitPassport, busy } = useTriage();
  const [text, setText] = useState(
    '{\n  "allergies": ["penicillin"],\n  "medications": [],\n  "conditions": []\n}'
  );

  const sessionIdRef = useRef<string>(crypto.randomUUID()); //Hardcoded till i ask about context
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [otp, setOtp] = useState<{
    sessionId: string;
    address: string;
    time: number;
  }>();

  useEffect(() => {
    if (!sessionIdRef.current) return;

    async function fetchOtp() {
      try {
        // Need to get otp secret from backend, for now lets just hardcode
        // const res = await fetch(`/triage/${sessionId}`);
        // const data = await res.json();
        setOtp({
          sessionId: sessionIdRef.current,
          address: window.location.origin,
          time: Date.now(),
        });
        setTimeLeft(30);
      } catch (err) {
        console.error("Failed to fetch OTP:", err);
      }
    }

    fetchOtp();
    const interval = setInterval(fetchOtp, 30000);
    return () => clearInterval(interval);
  }, [sessionIdRef]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const readS3Bucket = async () => {
    const res = await fetch("/api/triage/read");
    const data = await res.json();
  };
  //Listen for complete signal

  useEffect(() => {
    const evtSource = new EventSource(
      `/api/triage/events?sessionId=${sessionIdRef.current}`
    );

    evtSource.onmessage = (event) => {
      console.log("SSE message:", event.data);

      if (event.data === "BUNDLE_READY") {
        console.log("Bundle ready received, fetching S3...");
        readS3Bucket();
      }
    };

    evtSource.onerror = (err) => {
      console.error("SSE failed:", err);
      evtSource.close();
    };

    return () => {
      evtSource.close();
    };
  }, []);

  // const handle = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   try {
  //     const json = JSON.parse(text);
  //     await submitPassport(json);
  //   } catch {
  //     alert("Invalid JSON");
  //   }
  // };

  return (
    <div className={s.card} style={{ textAlign: "center" }}>
      <p className={ui.kicker}>Step 2</p>
      <h2 className={ui.title}>Scan QR with phone</h2>
      <p className={ui.sub}>
        Scan this QR in the phone app to start the secure upload. It refreshes
        every 30 seconds.
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
