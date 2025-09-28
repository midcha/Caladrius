"use client";

import { useEffect, useState } from "react";
import { useTriage } from "./TriageProvider";
import PassportStart from "./PassportStart";
import PassportWaiting from "./PassportWaiting";
import PassportComplete from "./PassportComplete";

export default function PassportUploader() {
  const { phase, connectPhone, submitPassport } = useTriage();
  const [sessionId, setSessionId] = useState(crypto.randomUUID());
  const [otp, setOtp] = useState<{
    sessionId: string;
    address: string;
    time: number;
  }>();
  const [timeLeft, setTimeLeft] = useState<number>(60);

  const [uploadedData, setUploadedData] = useState<{
    json: unknown;
    images: Record<string, string>;
  }>();

  // Generate QR OTP
  useEffect(() => {
    if (!sessionId) return;

    function fetchOtp() {
      const newId = crypto.randomUUID();
      setSessionId(newId);
      setOtp({
        sessionId: newId,
        address: window.location.origin,
        time: Date.now(),
      });
      setTimeLeft(60);
    }

    fetchOtp();
    const interval = setInterval(fetchOtp, 60000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch uploaded bundle
  const readS3Bucket = async () => {
    const res = await fetch("/api/triage/read");
    const data: { json: unknown; images: Record<string, string> } =
      await res.json();
    setUploadedData(data);
  };

  // SSE listener
  useEffect(() => {
    const evtSource = new EventSource(
      `/api/triage/events?sessionId=${sessionId}`
    );

    evtSource.onmessage = (event) => {
      console.log("SSE message:", event.data);

      if (event.data === "PHONE_CONNECTED") {
        connectPhone();
      }
      if (event.data === "BUNDLE_READY") {
        readS3Bucket().then(() => {
          submitPassport();
        });
      }
    };

    evtSource.onerror = (err) => {
      console.error("SSE failed:", err);
      evtSource.close();
    };

    return () => evtSource.close();
  }, [submitPassport]);

  // Render based on phase
  if (phase === "passport-start") {
    return <PassportStart otp={otp} timeLeft={timeLeft} />;
  }

  if (phase === "passport-waiting") {
    return <PassportWaiting />;
  }

  if (phase === "passport-complete") {
    return <PassportComplete data={uploadedData} />;
  }

  return null;
}
