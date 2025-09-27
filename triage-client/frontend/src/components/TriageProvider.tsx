"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { BackendQuestion, TriagePhase, Vitals } from "../utils/types";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? ""; // same-origin fallback

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ---- API wrappers (adjust paths if your backend differs)
async function startSession() {
  return json<{ sessionId: string }>("/triage/session/start", {
    method: "POST",
  });
}
async function postVitals(sessionId: string, vitals: Vitals) {
  return json<{ ok: true }>(`/triage/${sessionId}/vitals`, {
    method: "POST",
    body: JSON.stringify(vitals),
  });
}
async function postPassport(sessionId: string, dump: unknown) {
  return json<{ ok: true }>(`/triage/${sessionId}/passport`, {
    method: "POST",
    body: JSON.stringify({ dump }),
  });
}
async function postSymptoms(sessionId: string, text: string) {
  return json<{ ok: true }>(`/triage/${sessionId}/symptoms`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
async function pollPrompt(sessionId: string) {
  return json<{ question?: BackendQuestion }>(`/triage/${sessionId}/prompt`, {
    method: "GET",
  });
}
async function postPromptAnswer(
  sessionId: string,
  q: BackendQuestion,
  answer: { value?: string; refused?: boolean }
) {
  return json<{ ok: true }>(`/triage/${sessionId}/prompt/${q.id}/answer`, {
    method: "POST",
    body: JSON.stringify({ yesNo: q.yesNo, ...answer }),
  });
}
async function getStatus(sessionId: string) {
  return json<{ status: "processing" | "success" }>(
    `/triage/${sessionId}/status`,
    { method: "GET" }
  );
}

// ---- Context
interface Ctx {
  sessionId?: string;
  phase: TriagePhase;
  currentQuestion?: BackendQuestion;
  busy: boolean;
  start: () => Promise<void>;
  submitVitals: (v: Vitals) => Promise<void>;
  submitPassport: (dump: unknown) => Promise<void>;
  submitSymptoms: (text: string) => Promise<void>;
  answerPrompt: (answer: string | boolean | null) => Promise<void>; // null => refused
}

const TriageCtx = createContext<Ctx | null>(null);
export const useTriage = () => {
  const ctx = useContext(TriageCtx);
  if (!ctx) throw new Error("TriageProvider missing");
  return ctx;
};

export default function TriageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sessionId, setSessionId] = useState<string>();
  const [phase, setPhase] = useState<TriagePhase>("vitals");
  const [busy, setBusy] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<BackendQuestion>();
  const poller = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(async () => {
    if (sessionId) return;
    setBusy(true);
    try {
      const s = await startSession();
      setSessionId(s.sessionId);
      setPhase("vitals");
    } finally {
      setBusy(false);
    }
  }, [sessionId]);

  const submitVitals = useCallback(async (v: Vitals) => {
    // if (!sessionId) await start();
    // const id = sessionId ?? (await startSession()).sessionId;
    // setSessionId(id);
    // setBusy(true);
    // try {
    //   await postVitals(id, v);
    //   setPhase("passport");
    // } finally {
    //   setBusy(false);
    // }
    setPhase("passport");
  }, []);

  const submitPassport = useCallback(
    async (dump: unknown) => {
      if (!sessionId) throw new Error("Session not initialized");
      setBusy(true);
      try {
        await postPassport(sessionId, dump);
        setPhase("symptoms");
      } finally {
        setBusy(false);
      }
    },
    [sessionId]
  );

  const submitSymptoms = useCallback(
    async (text: string) => {
      if (!sessionId) throw new Error("Session not initialized");
      setBusy(true);
      try {
        await postSymptoms(sessionId, text);
        setPhase("processing");
      } finally {
        setBusy(false);
      }
    },
    [sessionId]
  );

  // polling loop while processing
  useEffect(() => {
    if (phase !== "processing") return;
    const tick = async () => {
      if (!sessionId) return;
      try {
        const p = await pollPrompt(sessionId);
        if (p.question) {
          setCurrentQuestion(p.question);
          setPhase("prompt");
          return;
        }
        const s = await getStatus(sessionId);
        if (s.status === "success") setPhase("success");
      } catch {
        /* keep polling */
      }
    };
    poller.current = setInterval(tick, 1500);
    return () => {
      if (poller.current) clearInterval(poller.current);
    };
  }, [phase, sessionId]);

  const answerPrompt = useCallback(
    async (answer: string | boolean | null) => {
      if (!sessionId || !currentQuestion) return;
      setBusy(true);
      try {
        if (answer === null) {
          await postPromptAnswer(sessionId, currentQuestion, { refused: true });
        } else if (typeof answer === "boolean") {
          await postPromptAnswer(sessionId, currentQuestion, {
            value: String(answer),
          });
        } else {
          await postPromptAnswer(sessionId, currentQuestion, { value: answer });
        }
        setCurrentQuestion(undefined);
        setPhase("processing");
      } finally {
        setBusy(false);
      }
    },
    [sessionId, currentQuestion]
  );

  const value = useMemo<Ctx>(
    () => ({
      sessionId,
      phase,
      currentQuestion,
      busy,
      start,
      submitVitals,
      submitPassport,
      submitSymptoms,
      answerPrompt,
    }),
    [
      sessionId,
      phase,
      currentQuestion,
      busy,
      start,
      submitVitals,
      submitPassport,
      submitSymptoms,
      answerPrompt,
    ]
  );

  return <TriageCtx.Provider value={value}>{children}</TriageCtx.Provider>;
}
