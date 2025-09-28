"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTriage } from "./TriageProvider";
import PassportStart from "./PassportStart";
import PassportWaiting from "./PassportWaiting";
import type { PassportBundle } from "../utils/types";
import ui from "./ui.module.css";
import s from "./PassportUploader.module.css";

type OtpPayload = {
  sessionId: string;
  address: string;
  time: number;
};

const OTP_REFRESH_MS = 60_000;
const OTP_DURATION_SECONDS = 60;

export default function PassportUploader() {
  const { passportStage, connectPhone, submitPassport } = useTriage();
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [otp, setOtp] = useState<OtpPayload>();
  const [timeLeft, setTimeLeft] = useState<number>(OTP_DURATION_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [aesKey, setAesKey] = useState<CryptoKey | null>(null);
  const [aesKeyB64, setAesKeyB64] = useState<string>("");

  const hasRequestedBundle = useRef(false);

  useEffect(() => {
    if (passportStage !== "start") {
      return;
    }

    const issueOtp = () => {
      const newSessionId = crypto.randomUUID();
      setSessionId(newSessionId);
      setOtp({
        sessionId: newSessionId,
        address: window.location.origin,
        time: Date.now(),
      });
      setTimeLeft(OTP_DURATION_SECONDS);
      hasRequestedBundle.current = false;
    };

    issueOtp();
    const interval = setInterval(issueOtp, OTP_REFRESH_MS);
    return () => clearInterval(interval);
  }, [passportStage]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

  const fetchBundle = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/triage/read?sessionId=${sessionId}`);
      if (!res.ok) {
        throw new Error(`Failed to read bundle (${res.status})`);
      }
      const data = (await res.json()) as PassportBundle;
      submitPassport(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error fetching bundle";
      setError(message);
    }
  }, [sessionId, submitPassport]);

  useEffect(() => {
    if (!sessionId || passportStage === "complete") return;

    const evtSource = new EventSource(
      `/api/triage/events?sessionId=${sessionId}`
    );

    evtSource.onmessage = (event) => {
      if (event.data === "PHONE_CONNECTED") {
        connectPhone();
      }

      if (event.data === "BUNDLE_READY" && !hasRequestedBundle.current) {
        hasRequestedBundle.current = true;
        fetchBundle().finally(() => {
          hasRequestedBundle.current = false;
        });
      }
    };

    evtSource.onerror = (err) => {
      console.error("SSE failed:", err);
      evtSource.close();
    };

    return () => evtSource.close();
  }, [sessionId, passportStage, connectPhone, fetchBundle]);

  const refreshQR = useCallback(() => {
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    setOtp({
      sessionId: newSessionId,
      address: window.location.origin,
      time: Date.now(),
    });
    setTimeLeft(OTP_DURATION_SECONDS);
    hasRequestedBundle.current = false;
  }, []);

  const renderContent = useMemo(() => {
    if (passportStage === "start") {
      return (
        <PassportStart otp={otp} timeLeft={timeLeft} onRefresh={refreshQR} />
      );
    }

    if (passportStage === "waiting") {
      return <PassportWaiting />;
    }

    if (passportStage === "complete") {
      return (
        <div className={s.card} style={{ textAlign: "center" }}>
          <p className={ui.kicker}>Step 2</p>
          <h2 className={ui.title}>Upload received</h2>
          <p className={ui.sub}>
            We&apos;ve securely stored your medical history. Continue to confirm
            your name before we display any records.
          </p>
          <p style={{ fontSize: "0.9rem", color: "#0f172a" }}>
            Tap <strong>Next</strong> below to review your details.
          </p>
        </div>
      );
    }

    return null;
  }, [passportStage, otp, timeLeft]);

  return (
    <div className={s.slideIn}>
      {renderContent}
      {error && (
        <div
          className={ui.panel}
          style={{
            marginTop: "1rem",
            border: "1px solid rgba(220,38,38,0.2)",
            color: "#dc2626",
          }}
        >
          <strong style={{ display: "block", marginBottom: 4 }}>
            Couldn&apos;t fetch upload
          </strong>
          <span style={{ fontSize: "0.9rem", lineHeight: 1.4 }}>{error}</span>
        </div>
      )}
    </div>
  );
}
