"use client";

import { useTriage } from "./TriageProvider";
import VitalsForm from "./VitalsForm";
import PassportUploader from "./PassportUploader";
import SymptomsInput from "./SymptomsInput";
import QuestionPrompt from "./QuestionPrompt";
import StepTransition from "./StepTransition";
import LoadingAnimation from "./LoadingAnimation";
import ui from "./ui.module.css";
import { ConfirmPanel } from "./ConfirmPanel";
import ConfirmName from "./ConfirmName";
import PassportComplete from "./PassportComplete";
import SuccessNotice from "./SuccessNotice";

export default function TriageFlow() {
  const { 
    phase, 
    error, 
    diagnosis, 
    reset, 
    busy, 
    nextStep, 
    previousStep, 
    canGoNext, 
    canGoPrevious,
    patientData,
  } = useTriage();

  const getStepNumber = () => {
    switch (phase) {
      case "vitals": return 1;
      case "passport":
      case "passportConfirm":
      case "passportReview":
        return 2;
      case "symptoms": return 3;
      default: return 0;
    }
  };

  const showSteps = ["vitals", "passport", "passportConfirm", "passportReview", "symptoms"].includes(phase);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Progress Indicator */}
      {showSteps && (
        <StepIndicator currentStep={getStepNumber()} />
      )}
      
      {/* Step 1: Vitals */}
      {phase === "vitals" && (
        <div>
          <StepTransition 
            isLoading={busy} 
            loadingMessage="Preparing your health assessment..."
          >
            <VitalsForm />
          </StepTransition>
          <NavigationButtons 
            onNext={nextStep}
            onPrevious={previousStep}
            canGoNext={canGoNext()}
            canGoPrevious={canGoPrevious()}
            nextLabel="Next: Medical History"
          />
        </div>
      )}
      
      {/* Step 2: Passport/Medical History */}
      {phase === "passport" && (
        <div>
          <StepTransition 
            isLoading={busy} 
            loadingMessage="Processing your medical history..."
          >
            <PassportUploader />
          </StepTransition>
          <NavigationButtons 
            onNext={nextStep}
            onPrevious={previousStep}
            canGoNext={canGoNext()}
            canGoPrevious={canGoPrevious()}
            nextLabel="Next: Confirm Name"
            previousLabel="Back: Vitals"
          />
        </div>
      )}
      
      {/* Step 2.5: Confirm Name */}
      {phase === "passportConfirm" && (
        <div>
          <StepTransition
            isLoading={busy}
            loadingMessage="Double-checking your profile..."
          >
            <ConfirmName />
          </StepTransition>
          <NavigationButtons
            onNext={nextStep}
            onPrevious={previousStep}
            canGoNext={canGoNext()}
            canGoPrevious={canGoPrevious()}
            nextLabel="Yes, show my records"
            previousLabel="Back: Medical History"
          />
        </div>
      )}

      {/* Step 2.75: Review Passport Data */}
      {phase === "passportReview" && (
        <div>
          <StepTransition
            isLoading={busy}
            loadingMessage="Preparing your medical records..."
          >
            {patientData.passportBundle ? (
              <PassportComplete data={patientData.passportBundle} />
            ) : (
              <div className={ui.panel}>
                <p className={ui.kicker}>Medical Records</p>
                <p className={ui.sub}>
                  We couldn&apos;t load your medical records. Please go back and try uploading again.
                </p>
              </div>
            )}
          </StepTransition>
          <NavigationButtons
            onNext={nextStep}
            onPrevious={previousStep}
            canGoNext={canGoNext()}
            canGoPrevious={canGoPrevious()}
            nextLabel="Next: Symptoms"
            previousLabel="Back: Confirm Name"
          />
        </div>
      )}

      {/* Step 3: Symptoms */}
      {phase === "symptoms" && (
        <div>
          <StepTransition 
            isLoading={busy} 
            loadingMessage="Analyzing your symptoms..."
          >
            <SymptomsInput />
          </StepTransition>
          <NavigationButtons 
            onPrevious={previousStep}
            canGoPrevious={canGoPrevious()}
            previousLabel="Back: Medical Records"
            showNext={false}
          />
        </div>
      )}
      
      {/* Processing */}
      {phase === "processing" && (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingAnimation 
            message="Creating personalized questions based on your information..."
            size="large"
          />
        </div>
      )}
      
      {/* Diagnostic Questions */}
      {phase === "prompt" && (
        <StepTransition 
          isLoading={busy} 
          loadingMessage="Preparing your next question..."
        >
          <QuestionPrompt />
        </StepTransition>
      )}

      {/* Confirm Proceed to Diagnosis */}
      {phase === "confirm" && (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ConfirmPanel />
        </div>
      )}

      {/* Completed message */}
      {phase === "completed" && (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SuccessNotice />
        </div>
      )}
      
      {/* Final Diagnosis */}
      {phase === "diagnosis" && diagnosis && (
        <div className={ui.panel}>
          <p className={ui.kicker}>Diagnosis Complete</p>
          <div>
            <h3>Medical Assessment:</h3>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>
              {typeof diagnosis.diagnosis === 'string' 
                ? diagnosis.diagnosis 
                : JSON.stringify(diagnosis.diagnosis, null, 2)}
            </pre>
          </div>
          <button 
            className={`${ui.btn} ${ui.primary}`}
            onClick={reset}
            style={{ marginTop: '16px' }}
          >
            Start New Assessment
          </button>
        </div>
      )}
      
      {/* Error State */}
      {phase === "error" && (
        <div className={ui.panel} style={{ borderColor: '#ff6b6b' }}>
          <p className={ui.kicker} style={{ color: '#ff6b6b' }}>Error</p>
          <p className={ui.sub}>
            {error || 'An unexpected error occurred'}
          </p>
          <button 
            className={`${ui.btn} ${ui.primary}`}
            onClick={reset}
            style={{ marginTop: '16px' }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, title: "Vitals" },
    { number: 2, title: "Medical History" },
    { number: 3, title: "Symptoms" }
  ];

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '16px',
      padding: '20px',
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      marginBottom: '8px'
    }}>
      {steps.map((step, index) => (
        <div key={step.number} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: step.number === currentStep ? '#3b82f6' : step.number < currentStep ? '#10b981' : '#e5e7eb',
              color: step.number <= currentStep ? 'white' : '#6b7280',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              {step.number < currentStep ? '✓' : step.number}
            </div>
            <span style={{
              fontSize: '14px',
              fontWeight: step.number === currentStep ? 'bold' : 'normal',
              color: step.number === currentStep ? '#3b82f6' : step.number < currentStep ? '#10b981' : '#6b7280'
            }}>
              {step.title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div style={{
              width: '24px',
              height: '2px',
              backgroundColor: step.number < currentStep ? '#10b981' : '#e5e7eb'
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

function NavigationButtons({ 
  onNext, 
  onPrevious, 
  canGoNext, 
  canGoPrevious, 
  nextLabel = "Next",
  previousLabel = "Previous",
  showNext = true
}: {
  onNext?: () => void;
  onPrevious?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  showNext?: boolean;
}) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      marginTop: '24px',
      paddingTop: '16px',
      borderTop: '1px solid #e5e7eb'
    }}>
      <div>
        {canGoPrevious && onPrevious && (
          <button 
            className={`${ui.btn} ${ui.ghost}`}
            onClick={onPrevious}
          >
            ← {previousLabel}
          </button>
        )}
      </div>
      <div>
        {showNext && canGoNext && onNext && (
          <button 
            className={`${ui.btn} ${ui.primary}`}
            onClick={onNext}
          >
            {nextLabel} →
          </button>
        )}
      </div>
    </div>
  );
}
