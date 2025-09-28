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
import type { 
  BackendQuestion, 
  TriagePhase, 
  Vitals, 
  PatientData, 
  DiagnosisResult, 
  ApiResponse 
} from "../utils/types";
import { medicalApi } from "../utils/api";

// ---- Context
interface Ctx {
  sessionId?: string;
  phase: TriagePhase;
  currentQuestion?: BackendQuestion;
  diagnosis?: DiagnosisResult;
  confirmMessage?: string;
  patientData: PatientData;
  error?: string;
  busy: boolean;
  
  // Data collection methods
  updateVitals: (vitals: Vitals) => void;
  updatePassport: (data: unknown) => void;
  updateSymptoms: (symptoms: string[]) => void;
  updateMedicalRecords: (records: string) => void;
  
  // Navigation methods
  nextStep: () => void;
  previousStep: () => void;
  canGoNext: () => boolean;
  canGoPrevious: () => boolean;
  
  // Flow control methods
  startDiagnosis: (symptomsOverride?: string[]) => Promise<void>;
  answerQuestion: (answer: string) => Promise<void>;
  confirmProceed: (confirm: boolean) => Promise<void>;
  reset: () => void;
}

const TriageCtx = createContext<Ctx | null>(null);

export const useTriage = () => {
  const ctx = useContext(TriageCtx);
  if (!ctx) throw new Error("TriageProvider missing");
  return ctx;
};

export default function TriageProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string>();
  const [phase, setPhase] = useState<TriagePhase>("vitals");
  const [busy, setBusy] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<BackendQuestion>();
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult>();
  const [confirmMessage, setConfirmMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [patientData, setPatientData] = useState<PatientData>({
    symptoms: [],
  });

  // Generate session ID when needed
  const generateSessionId = useCallback(() => {
    return `patient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Data update methods
  const updateVitals = useCallback((vitals: Vitals) => {
    setPatientData(prev => ({ ...prev, vitals }));
  }, []);

  const updatePassport = useCallback((data: unknown) => {
    setPatientData(prev => ({ ...prev, passportData: data }));
  }, []);

  const updateSymptoms = useCallback((symptoms: string[]) => {
    setPatientData(prev => ({ ...prev, symptoms }));
  }, []);

  const updateMedicalRecords = useCallback((records: string) => {
    setPatientData(prev => ({ ...prev, medicalRecords: records }));
  }, []);

  // Navigation methods
  const nextStep = useCallback(() => {
    switch (phase) {
      case "vitals":
        setPhase("passport");
        break;
      case "passport":
        setPhase("symptoms");
        break;
      case "symptoms":
        // Don't auto-start diagnosis, let user click start button
        break;
      default:
        break;
    }
  }, [phase]);

  const previousStep = useCallback(() => {
    switch (phase) {
      case "passport":
        setPhase("vitals");
        break;
      case "symptoms":
        setPhase("passport");
        break;
      default:
        break;
    }
  }, [phase]);

  const canGoNext = useCallback(() => {
    switch (phase) {
      case "vitals":
        return !!patientData.vitals;
      case "passport":
        return true; // Passport is optional
      case "symptoms":
        return patientData.symptoms.length > 0;
      default:
        return false;
    }
  }, [phase, patientData]);

  const canGoPrevious = useCallback(() => {
    return phase === "passport" || phase === "symptoms";
  }, [phase]);

  // Start diagnosis with all collected data
  const startDiagnosis = useCallback(async (symptomsOverride?: string[]) => {
    const symptomsToUse = symptomsOverride || patientData.symptoms;
    
    if (!symptomsToUse.length) {
      setError("Please provide symptoms before starting diagnosis");
      return;
    }

    const threadId = sessionId || generateSessionId();
    setSessionId(threadId);
    setBusy(true);
    setError(undefined);
    setPhase("processing");

    try {
      // Create updated patient data with current symptoms
      const updatedPatientData = {
        ...patientData,
        symptoms: symptomsToUse
      };
      
      const response = await medicalApi.startDiagnosis(threadId, updatedPatientData);
      
      if (response.type === 'question') {
        setCurrentQuestion(response);
        setPhase("prompt");
      } else if (response.type === 'confirm') {
        setCurrentQuestion(undefined);
        setPhase("confirm");
      } else if (response.type === 'diagnosis') {
        setDiagnosis(response);
        setPhase("diagnosis");
      } else if (response.type === 'error') {
        setError(response.error);
        setPhase("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start diagnosis');
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [patientData, sessionId, generateSessionId]);

  // Answer diagnostic question
  const answerQuestion = useCallback(async (answer: string) => {
    if (!sessionId || !currentQuestion) return;

    setBusy(true);
    try {
      const response = await medicalApi.resumeDiagnosis(sessionId, answer, currentQuestion.query);
      
      if (response.type === 'question') {
        setCurrentQuestion(response);
        setPhase("prompt");
      } else if (response.type === 'confirm') {
        // Transition to confirmation phase
        setCurrentQuestion(undefined);
        setDiagnosis(undefined);
        setConfirmMessage(response.message);
        setPhase("confirm");
      } else if (response.type === 'diagnosis') {
        setDiagnosis(response);
        setCurrentQuestion(undefined);
        setConfirmMessage(undefined);
        setPhase("diagnosis");
      } else if (response.type === 'error') {
        setError(response.error);
        setPhase("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process response');
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [sessionId, currentQuestion]);

  // Confirm or cancel proceed-to-diagnosis
  const confirmProceed = useCallback(async (confirm: boolean) => {
    if (!sessionId) return;
    // Optimistic UI: immediately mark completed on confirm, and clear confirm message
    if (confirm) {
      setConfirmMessage(undefined);
      setPhase("completed");
    }
    setBusy(true);
    try {
      // Send confirm but intentionally ignore the response to avoid UI branching here
      await medicalApi.confirmDiagnosis(sessionId, confirm);
    } catch (err) {
      // Intentionally ignore errors from confirm to avoid disrupting UI flow
      // You can log if needed: console.error(err);
    } finally {
      setBusy(false);
    }
  }, [sessionId]);

  // Reset the entire triage process
  const reset = useCallback(() => {
    setSessionId(undefined);
    setPhase("vitals");
    setBusy(false);
    setCurrentQuestion(undefined);
    setDiagnosis(undefined);
    setConfirmMessage(undefined);
    setError(undefined);
    setPatientData({ symptoms: [] });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      sessionId,
      phase,
      currentQuestion,
      diagnosis,
  confirmMessage,
      patientData,
      error,
      busy,
      updateVitals,
      updatePassport,
      updateSymptoms,
      updateMedicalRecords,
      nextStep,
      previousStep,
      canGoNext,
      canGoPrevious,
      startDiagnosis,
      answerQuestion,
      confirmProceed,
      reset,
    }),
    [
      sessionId,
      phase,
      currentQuestion,
      diagnosis,
  confirmMessage,
      patientData,
      error,
      busy,
      updateVitals,
      updatePassport,
      updateSymptoms,
      updateMedicalRecords,
      nextStep,
      previousStep,
      canGoNext,
      canGoPrevious,
      startDiagnosis,
      answerQuestion,
      confirmProceed,
      reset,
    ]
  );

  return <TriageCtx.Provider value={value}>{children}</TriageCtx.Provider>;
}
