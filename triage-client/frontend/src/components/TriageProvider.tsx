"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type {
  BackendQuestion,
  TriagePhase,
  Vitals,
  PatientData,
  DiagnosisResult,
  PassportBundle,
  PassportStage,
} from "../utils/types";
import { medicalApi } from "../utils/api";
import { extractPatientName } from "../utils/passport";

// ---- Context
interface Ctx {
  sessionId?: string;
  phase: TriagePhase;
  passportStage: PassportStage;
  currentQuestion?: BackendQuestion;
  diagnosis?: DiagnosisResult;
  confirmMessage?: string;
  patientData: PatientData;
  error?: string;
  busy: boolean;
  
  // Data collection methods
  updateVitals: (vitals: Vitals) => void;
  updatePassport: (data: unknown, bundle?: PassportBundle) => void;
  updateSymptoms: (symptoms: string[]) => void;
  updateMedicalRecords: (records: string) => void;
  
  connectPhone: () => void;
  submitPassport: (bundle: PassportBundle) => void;

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
  const [passportStage, setPassportStage] = useState<PassportStage>("start");
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

  const updatePassport = useCallback(
    (data: unknown, bundle?: PassportBundle) => {
      setPatientData((prev) => ({
        ...prev,
        passportData: data,
        passportBundle: bundle ?? prev.passportBundle,
        passportAttachments: bundle?.attachments ?? prev.passportAttachments,
      }));
    },
    []
  );

  const updateSymptoms = useCallback((symptoms: string[]) => {
    setPatientData(prev => ({ ...prev, symptoms }));
  }, []);

  const updateMedicalRecords = useCallback((records: string) => {
    setPatientData(prev => ({ ...prev, medicalRecords: records }));
  }, []);

  const connectPhone = useCallback(() => {
    setPassportStage("waiting");
  }, []);

  const submitPassport = useCallback(
    (bundle: PassportBundle) => {
      updatePassport(bundle.json, bundle);
      setPassportStage("complete");
    },
    [updatePassport]
  );

  // Navigation methods
  const nextStep = useCallback(() => {
    switch (phase) {
      case "vitals": {
        setPhase("passport");
        setPassportStage((prev) =>
          prev === "complete" || patientData.passportBundle
            ? "complete"
            : "start"
        );
        break;
      }
      case "passport":
        if (passportStage === "complete") {
          setPhase("passportConfirm");
        }
        break;
      case "passportConfirm":
        setPhase("passportReview");
        break;
      case "passportReview":
        setPhase("symptoms");
        break;
      case "symptoms":
        // Don't auto-start diagnosis, let user click start button
        break;
      default:
        break;
    }
  }, [phase, passportStage, patientData.passportBundle]);

  const previousStep = useCallback(() => {
    switch (phase) {
      case "passport":
        setPhase("vitals");
        break;
      case "passportConfirm":
        setPhase("passport");
        break;
      case "symptoms":
        setPhase("passportReview");
        break;
      case "passportReview":
        setPhase("passportConfirm");
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
        return passportStage === "complete";
      case "passportConfirm": {
        const passportJson =
          patientData.passportBundle?.json ?? patientData.passportData;
        const extracted = extractPatientName(passportJson);
        return !!extracted || !!patientData.passportBundle;
      }
      case "passportReview":
        return !!patientData.passportBundle;
      case "symptoms":
        return patientData.symptoms.length > 0;
      default:
        return false;
    }
  }, [phase, patientData, passportStage]);

  const canGoPrevious = useCallback(() => {
    return (
      phase === "passport" ||
      phase === "passportConfirm" ||
      phase === "passportReview" ||
      phase === "symptoms"
    );
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
    setBusy(true);
    
    try {
      // Extract patient name from medical data
      const passportSource = patientData.passportBundle?.json ?? patientData.passportData;
      const extractedName = extractPatientName(passportSource);
      const fullName = extractedName?.fullName;
      
      // Send confirm with extracted patient name (fire and forget)
      medicalApi.confirmDiagnosis(sessionId, confirm, fullName);
    } catch {
      // Ignore any errors from the API call
    }
    
    // Always transition straight to success notice regardless of API response
    setPhase("completed");
    setBusy(false);
  }, [sessionId, patientData.passportBundle, patientData.passportData]);

  // Reset the entire triage process
  const reset = useCallback(() => {
    setSessionId(undefined);
    setPhase("vitals");
    setPassportStage("start");
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
      passportStage,
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
      connectPhone,
      submitPassport,
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
      passportStage,
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
      connectPhone,
      submitPassport,
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
