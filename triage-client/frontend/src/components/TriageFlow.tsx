"use client";

import { useTriage } from "./TriageProvider";
import VitalsForm from "./VitalsForm";
import PassportUploader from "./PassportUploader";
import SymptomsInput from "./SymptomsInput";
import QuestionPrompt from "./QuestionPrompt";
import ui from "./ui.module.css";

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
    canGoPrevious 
  } = useTriage();

  const getStepNumber = () => {
    switch (phase) {
      case "vitals": return 1;
      case "passport": return 2;
      case "symptoms": return 3;
      default: return 0;
    }
  };

  const showSteps = ["vitals", "passport", "symptoms"].includes(phase);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Progress Indicator */}
      {showSteps && (
        <StepIndicator currentStep={getStepNumber()} />
      )}
      
      {/* Step 1: Vitals */}
      {phase === "vitals" && (
        <div>
          <VitalsForm />
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
          <PassportUploader />
          <NavigationButtons 
            onNext={nextStep}
            onPrevious={previousStep}
            canGoNext={canGoNext()}
            canGoPrevious={canGoPrevious()}
            nextLabel="Next: Symptoms"
            previousLabel="Back: Vitals"
          />
        </div>
      )}
      
      {/* Step 3: Symptoms */}
      {phase === "symptoms" && (
        <div>
          <SymptomsInput />
          <NavigationButtons 
            onPrevious={previousStep}
            canGoPrevious={canGoPrevious()}
            previousLabel="Back: Medical History"
            showNext={false}
          />
        </div>
      )}
      
      {/* Processing */}
      {phase === "processing" && (
        <div className={ui.panel}>
          <p className={ui.kicker}>Processing</p>
          <p className={ui.sub}>
            Analyzing your information and generating questions...
          </p>
          {busy && <div>Loading...</div>}
        </div>
      )}
      
      {/* Diagnostic Questions */}
      {phase === "prompt" && <QuestionPrompt />}
      
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
