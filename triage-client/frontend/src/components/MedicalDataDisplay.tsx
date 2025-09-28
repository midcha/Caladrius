"use client";

import React from 'react';

interface Condition {
  name?: string;
  diagnosis?: string;
  status?: string;
  [key: string]: unknown;
}

interface Visit {
  date?: string;
  purpose?: string;
  doctor?: string;
  [key: string]: unknown;
}

interface FamilyHistory {
  relation?: string;
  condition?: string;
  [key: string]: unknown;
}

interface Insurance {
  provider?: string;
  policyNumber?: string;
  [key: string]: unknown;
}

interface MedicalData {
  patient?: PatientInfo;
  medicalHistory?: MedicalHistory & {
    conditions?: Condition[];
    chronicConditions?: Condition[];
    visits?: Visit[];
    familyHistory?: FamilyHistory[];
    insurance?: Insurance[];
  };
  prescriptions?: Prescription[];
  emergencyContacts?: EmergencyContact[];
  allergies?: Allergy[];
  conditions?: Condition[];
  chronicConditions?: Condition[];
  visits?: Visit[];
  familyHistory?: FamilyHistory[];
  insurance?: Insurance[];
  // Allow for patient info at root level
  firstName?: string;
  lastName?: string;
  name?: string;
  sex?: string;
  gender?: string;
  ethnicity?: string;
  race?: string;
  dob?: string;
  bloodType?: string;
  age?: number;
  mrn?: string;
  ssn?: string;
  [key: string]: unknown;
}

interface MedicalDataDisplayProps {
  data: MedicalData;
}

interface PatientInfo {
  firstName?: string;
  lastName?: string;
  sex?: string;
  ethnicity?: string;
  dob?: string;
  bloodType?: string;
  age?: number;
  [key: string]: unknown;
}

interface Prescription {
  medication?: Array<{
    name?: string;
    dosageForm?: string;
    strength?: string;
  }> | string;
  instructions?: string;
  startDate?: string;
  endDate?: string;
  name?: string;
  dosage?: string;
  [key: string]: unknown;
}

interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
  [key: string]: unknown;
}

interface Allergy {
  name?: string;
  reaction?: string;
  severity?: string;
  treatment?: string;
  notes?: string;
  [key: string]: unknown;
}

interface MedicalHistory {
  prescriptions?: Prescription[];
  allergies?: Allergy[];
  emergencyContacts?: EmergencyContact[];
  [key: string]: unknown;
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'Not specified';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};

const InfoSection: React.FC<{ title: string; children: React.ReactNode; isEmpty?: boolean }> = ({ 
  title, 
  children, 
  isEmpty = false 
}) => (
  <div style={styles.section}>
    <h3 style={styles.sectionTitle}>{title}</h3>
    {isEmpty ? (
      <p style={styles.emptyMessage}>No information available</p>
    ) : (
      <div style={styles.sectionContent}>
        {children}
      </div>
    )}
  </div>
);

const InfoCard: React.FC<{ children: React.ReactNode; highlighted?: boolean }> = ({ 
  children, 
  highlighted = false 
}) => (
  <div style={{
    ...styles.card,
    ...(highlighted ? styles.highlightedCard : {})
  }}>
    {children}
  </div>
);

const InfoRow: React.FC<{ label: string; value: string | number | undefined; important?: boolean }> = ({ 
  label, 
  value, 
  important = false 
}) => (
  <div style={styles.infoRow}>
    <span style={styles.infoLabel}>{label}:</span>
    <span style={{
      ...styles.infoValue,
      ...(important ? styles.importantValue : {})
    }}>
      {value || 'Not specified'}
    </span>
  </div>
);

const safeString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

const safeNumber = (value: unknown): number | undefined => {
  return typeof value === 'number' ? value : undefined;
};

export default function MedicalDataDisplay({ data }: MedicalDataDisplayProps) {
  if (!data || typeof data !== 'object') {
    return (
      <div style={styles.container}>
        <p style={styles.errorMessage}>No medical data to display</p>
      </div>
    );
  }

  // Extract patient information (can be nested or at root level)
  const patient: PatientInfo = (data.patient as PatientInfo) || (data as PatientInfo);
  const medicalHistory = (patient.medicalHistory || data.medicalHistory || {}) as MedicalHistory & {
    conditions?: Condition[];
    chronicConditions?: Condition[];
    visits?: Visit[];
    familyHistory?: FamilyHistory[];
    insurance?: Insurance[];
  };

  // Extract main data arrays - handle both array and single object cases
  const prescriptions = (Array.isArray(medicalHistory.prescriptions) 
    ? medicalHistory.prescriptions 
    : Array.isArray(data.prescriptions) 
    ? data.prescriptions 
    : medicalHistory.prescriptions || data.prescriptions 
    ? [medicalHistory.prescriptions || data.prescriptions]
    : []).filter((item): item is Prescription => item != null);
    
  const emergencyContacts = (Array.isArray(medicalHistory.emergencyContacts) 
    ? medicalHistory.emergencyContacts 
    : Array.isArray(data.emergencyContacts) 
    ? data.emergencyContacts 
    : medicalHistory.emergencyContacts || data.emergencyContacts 
    ? [medicalHistory.emergencyContacts || data.emergencyContacts]
    : []).filter((item): item is EmergencyContact => item != null);
    
  const allergies = (Array.isArray(medicalHistory.allergies) 
    ? medicalHistory.allergies 
    : Array.isArray(data.allergies) 
    ? data.allergies 
    : medicalHistory.allergies || data.allergies 
    ? [medicalHistory.allergies || data.allergies]
    : []).filter((item): item is Allergy => item != null);

  return (
    <div style={styles.container}>
      {/* Patient Information */}
      <InfoSection title="Patient Information">
        <InfoCard highlighted>
          <InfoRow 
            label="Full Name" 
            value={`${patient.firstName || ''} ${patient.lastName || ''}`.trim() || safeString(patient.name)} 
            important 
          />
          <InfoRow label="Date of Birth" value={formatDate(patient.dob)} />
          <InfoRow label="Age" value={safeNumber(patient.age)} />
          <InfoRow label="Sex" value={safeString(patient.sex) || safeString(patient.gender)} />
          <InfoRow label="Ethnicity" value={safeString(patient.ethnicity) || safeString(patient.race)} />
          <InfoRow label="Blood Type" value={patient.bloodType} important />
          {safeString(patient.mrn) && <InfoRow label="Medical Record Number" value={safeString(patient.mrn)} />}
          {safeString(patient.ssn) && <InfoRow label="SSN" value={safeString(patient.ssn)} />}
        </InfoCard>
      </InfoSection>

      {/* Prescriptions/Medications */}
      <InfoSection 
        title={`Prescriptions & Medications (${prescriptions.length})`}
        isEmpty={prescriptions.length === 0}
      >
        {prescriptions.map((prescription: Prescription, index: number) => (
          <InfoCard key={index}>
            {prescription.medication ? (
              Array.isArray(prescription.medication) ? (
                prescription.medication.map((med, medIndex) => (
                  <div key={medIndex} style={styles.medicationGroup}>
                    <InfoRow label="Medication" value={med.name} important />
                    <InfoRow label="Dosage Form" value={med.dosageForm} />
                    <InfoRow label="Strength" value={med.strength} />
                  </div>
                ))
              ) : (
                <InfoRow label="Medication" value={prescription.medication as string} important />
              )
            ) : (
              <InfoRow label="Medication" value={prescription.name} important />
            )}
            <InfoRow label="Instructions" value={prescription.instructions} />
            <InfoRow label="Start Date" value={formatDate(prescription.startDate)} />
            <InfoRow label="End Date" value={formatDate(prescription.endDate)} />
            {prescription.dosage && <InfoRow label="Dosage" value={prescription.dosage} />}
          </InfoCard>
        ))}
      </InfoSection>

      {/* Emergency Contacts */}
      <InfoSection 
        title={`Emergency Contacts (${emergencyContacts.length})`}
        isEmpty={emergencyContacts.length === 0}
      >
        {emergencyContacts.map((contact: EmergencyContact, index: number) => (
          <InfoCard key={index}>
            <InfoRow label="Name" value={contact.name} important />
            <InfoRow label="Relationship" value={contact.relationship} />
            <InfoRow label="Phone" value={contact.phone} important />
            <InfoRow label="Email" value={contact.email} />
          </InfoCard>
        ))}
      </InfoSection>

      {/* Allergies */}
      <InfoSection 
        title={`Allergies & Reactions (${allergies.length})`}
        isEmpty={allergies.length === 0}
      >
        {allergies.map((allergy: Allergy, index: number) => (
          <InfoCard key={index}>
            <InfoRow label="Allergen" value={allergy.name} important />
            <InfoRow label="Reaction" value={allergy.reaction} />
            <InfoRow label="Severity" value={allergy.severity} important />
            <InfoRow label="Treatment" value={allergy.treatment} />
            {allergy.notes && <InfoRow label="Notes" value={allergy.notes} />}
          </InfoCard>
        ))}
      </InfoSection>

      {/* Medical Conditions */}
      {(() => {
        const conditions = [
          ...(Array.isArray(medicalHistory.conditions) ? medicalHistory.conditions : []),
          ...(Array.isArray(data.conditions) ? data.conditions : []),
          ...(Array.isArray(medicalHistory.chronicConditions) ? medicalHistory.chronicConditions : []),
          ...(Array.isArray(data.chronicConditions) ? data.chronicConditions : [])
        ].filter((item): item is Condition => item != null);
        
        return conditions.length > 0 ? (
          <InfoSection title="Medical Conditions">
            {conditions.map((condition, index: number) => (
              <InfoCard key={index}>
                <InfoRow label="Condition" value={condition.name || safeString(condition)} important />
                <InfoRow label="Diagnosis Date" value={formatDate(safeString(condition.diagnosis))} />
                <InfoRow label="Status" value={safeString(condition.status)} />
                <InfoRow label="Notes" value={safeString(condition.notes)} />
              </InfoCard>
            ))}
          </InfoSection>
        ) : null;
      })()}

      {/* Additional Medical Information */}
      {(() => {
        const visits = Array.isArray(medicalHistory.visits) ? medicalHistory.visits : [];
        return visits.length > 0 ? (
          <InfoSection title={`Recent Visits (${visits.length})`}>
            {visits.slice(0, 3).map((visit, index: number) => (
              <InfoCard key={index}>
                <InfoRow label="Date" value={formatDate(safeString(visit.date))} />
                <InfoRow label="Reason" value={safeString(visit.reason)} />
                <InfoRow label="Notes" value={safeString(visit.notes)} />
              </InfoCard>
            ))}
          </InfoSection>
        ) : null;
      })()}
      
      {/* Family History */}
      {(() => {
        const familyHistory = [
          ...(Array.isArray(medicalHistory.familyHistory) ? medicalHistory.familyHistory : []),
          ...(Array.isArray(data.familyHistory) ? data.familyHistory : [])
        ].filter((item): item is FamilyHistory => item != null);
        
        return familyHistory.length > 0 ? (
          <InfoSection title="Family History">
            {familyHistory.map((history, index: number) => (
              <InfoCard key={index}>
                <InfoRow label="Condition" value={safeString(history.condition)} />
                <InfoRow label="Relation" value={safeString(history.relation)} />
                <InfoRow label="Diagnosis Age" value={safeString(history.diagnosisAge)} />
              </InfoCard>
            ))}
          </InfoSection>
        ) : null;
      })()}

      {/* Insurance Information */}
      {(() => {
        const insurance = Array.isArray(medicalHistory.insurance) ? medicalHistory.insurance : [];
        return insurance.length > 0 ? (
          <InfoSection title="Insurance Information">
            {insurance.map((ins, index: number) => (
              <InfoCard key={index}>
                <InfoRow label="Provider" value={safeString(ins.provider) || safeString(ins.providerName)} important />
                <InfoRow label="Policy Number" value={safeString(ins.policyNumber)} />
                <InfoRow label="Group Number" value={safeString(ins.groupNumber)} />
                <InfoRow label="Coverage Start" value={formatDate(safeString(ins.coverageStart))} />
                <InfoRow label="Coverage End" value={formatDate(safeString(ins.coverageEnd))} />
              </InfoCard>
            ))}
          </InfoSection>
        ) : null;
      })()}

      {/* Raw JSON for debugging (collapsible) */}
      <details style={styles.debugSection}>
        <summary style={styles.debugSummary}>Show Raw JSON Data</summary>
        <pre style={styles.debugContent}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

const styles = {
  container: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    margin: 0,
    color: '#1f2937',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '8px',
  },
  sectionContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '12px',
  },
  card: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  highlightedCard: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  infoLabel: {
    fontWeight: '500',
    color: '#374151',
    minWidth: '120px',
    fontSize: '0.9rem',
  },
  infoValue: {
    color: '#1f2937',
    flex: 1,
    textAlign: 'right' as const,
    fontSize: '0.9rem',
  },
  importantValue: {
    fontWeight: '600',
    color: '#0f172a',
  },
  medicationGroup: {
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '8px',
  },
  emptyMessage: {
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center' as const,
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px dashed #d1d5db',
  },
  errorMessage: {
    color: '#dc2626',
    textAlign: 'center' as const,
    padding: '16px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
  },
  debugSection: {
    marginTop: '24px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  debugSummary: {
    padding: '12px 16px',
    backgroundColor: '#f3f4f6',
    cursor: 'pointer',
    fontWeight: '500',
    borderBottom: '1px solid #d1d5db',
  },
  debugContent: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    fontSize: '0.8rem',
    overflow: 'auto',
    maxHeight: '300px',
    margin: 0,
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  },
} as const;