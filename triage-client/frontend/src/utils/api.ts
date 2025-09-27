/**
 * Unified API client for the Medical Diagnosis backend
 */

import type { PatientData, ApiResponse, Vitals } from './types';
import type { Patient, MedicalHistory } from '../../public/schema';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface StartDiagnosisRequest {
  thread_id: string;
  symptoms: string[];
  medical_records?: string | Patient | MedicalHistory | object;
}

export interface ResumeDiagnosisRequest {
  thread_id: string;
  response: string;
  question?: string;
}

class MedicalApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Start diagnosis with all patient data in one request
   */
  async startDiagnosis(threadId: string, patientData: PatientData): Promise<ApiResponse> {
    // Convert patient data to structured JSON format expected by backend
    const medicalRecordsData = this.buildMedicalRecords(patientData);
    
    const request: StartDiagnosisRequest = {
      thread_id: threadId,
      symptoms: patientData.symptoms,
      medical_records: medicalRecordsData, // Now sending structured JSON instead of string
    };

    return this.request<ApiResponse>('/start', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Resume diagnosis with a response to a question
   */
  async resumeDiagnosis(threadId: string, response: string, question?: string): Promise<ApiResponse> {
    const request: ResumeDiagnosisRequest = {
      thread_id: threadId,
      response: response,
      question,
    };

    return this.request<ApiResponse>('/resume', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get session status
   */
  async getSessionStatus(threadId: string) {
    return this.request(`/session/${threadId}/status`);
  }

  /**
   * Health check
   */
  async healthCheck() {
    return this.request('/health');
  }

  /**
   * Build comprehensive medical records JSON object from patient data
   */
  private buildMedicalRecords(patientData: PatientData): Patient | MedicalHistory | object {
    // If we already have structured medical records, return them
    if (patientData.medicalRecords && typeof patientData.medicalRecords === 'object') {
      return patientData.medicalRecords;
    }

    // If we have passport data as structured object, use it
    if (patientData.passportData && typeof patientData.passportData === 'object') {
      return patientData.passportData as Patient | MedicalHistory;
    }

    // Build a structured medical record from available data
    const medicalRecord: Partial<Patient> = {};

    // Add vitals to the medical history if available
    if (patientData.vitals) {
      const vitals = patientData.vitals;
      
      // Create a basic patient record structure
      medicalRecord.medicalHistory = {
        prescriptions: [],
        imaging: [],
        labs: [],
        allergies: [],
        familyHistory: [],
        personalHistory: [],
        insurance: [],
        surgeries: "",
        visits: [],
        notes: [
          `Vital Signs: Temperature ${vitals.temperature}°, Blood Pressure ${vitals.systolic}/${vitals.diastolic} mmHg, ` +
          `Heart Rate ${vitals.heartRate} bpm, Respirations ${vitals.respirations}/min, Oxygen Saturation ${vitals.spo2}%`
        ]
      };
    }

    // Handle string medical records as notes
    if (patientData.medicalRecords && typeof patientData.medicalRecords === 'string') {
      if (!medicalRecord.medicalHistory) {
        medicalRecord.medicalHistory = {
          prescriptions: [],
          imaging: [],
          labs: [],
          allergies: [],
          familyHistory: [],
          personalHistory: [],
          insurance: [],
          surgeries: "",
          visits: [],
          notes: []
        };
      }
      medicalRecord.medicalHistory.notes.push(patientData.medicalRecords);
    }

    // Handle string passport data as notes
    if (patientData.passportData && typeof patientData.passportData === 'string') {
      if (!medicalRecord.medicalHistory) {
        medicalRecord.medicalHistory = {
          prescriptions: [],
          imaging: [],
          labs: [],
          allergies: [],
          familyHistory: [],
          personalHistory: [],
          insurance: [],
          surgeries: "",
          visits: [],
          notes: []
        };
      }
      medicalRecord.medicalHistory.notes.push(`Medical History: ${patientData.passportData}`);
    }

    // Add symptoms to notes
    if (patientData.symptoms && patientData.symptoms.length > 0) {
      if (!medicalRecord.medicalHistory) {
        medicalRecord.medicalHistory = {
          prescriptions: [],
          imaging: [],
          labs: [],
          allergies: [],
          familyHistory: [],
          personalHistory: [],
          insurance: [],
          surgeries: "",
          visits: [],
          notes: []
        };
      }
      medicalRecord.medicalHistory.notes.push(`Current Symptoms: ${patientData.symptoms.join(', ')}`);
    }

    // Return the medical history part if that's all we have, or the full patient record
    return medicalRecord.medicalHistory || medicalRecord;
  }
}

export const medicalApi = new MedicalApiClient();