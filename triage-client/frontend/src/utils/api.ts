/**
 * Unified API client for the Medical Diagnosis backend
 */

import type { PatientData, ApiResponse } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface StartDiagnosisRequest {
  thread_id: string;
  symptoms: string[];
  medical_records?: string;
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
    // Convert patient data to the format expected by backend
    const medicalRecordsData = this.buildMedicalRecords(patientData);
    
    const request: StartDiagnosisRequest = {
      thread_id: threadId,
      symptoms: patientData.symptoms,
      medical_records: medicalRecordsData,
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
   * Confirm or cancel proceeding to final diagnosis
   */
  async confirmDiagnosis(threadId: string, confirm: boolean): Promise<ApiResponse> {
    return this.request<ApiResponse>('/confirm', {
      method: 'POST',
      body: JSON.stringify({ thread_id: threadId, confirm }),
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
   * Build comprehensive medical records string from patient data
   */
  private buildMedicalRecords(patientData: PatientData): string {
    const records: string[] = [];

    // Add vitals information
    if (patientData.vitals) {
      const vitals = patientData.vitals;
      records.push(
        `Vital Signs: Temperature ${vitals.temperature}°, Blood Pressure ${vitals.systolic}/${vitals.diastolic} mmHg, ` +
        `Heart Rate ${vitals.heartRate} bpm, Respirations ${vitals.respirations}/min, Oxygen Saturation ${vitals.spo2}%`
      );
    }

    // Add passport/medical history data if available
    if (patientData.passportData) {
      if (typeof patientData.passportData === 'string') {
        records.push(`Medical History: ${patientData.passportData}`);
      } else {
        records.push(`Medical History: ${JSON.stringify(patientData.passportData)}`);
      }
    }

    if (patientData.passportAttachments?.length) {
      const formatted = patientData.passportAttachments.map((attachment, index) => {
        const name = attachment.context?.ogFileName || attachment.filename;
        const details: string[] = [];

        if (attachment.context?.description) {
          details.push(`Description: ${attachment.context.description}`);
        }
        if (attachment.context?.source) {
          details.push(`Source: ${attachment.context.source}`);
        }
        if (attachment.context?.tags?.length) {
          details.push(`Tags: ${attachment.context.tags.join(', ')}`);
        }

        return `Attachment ${index + 1}: ${name}${details.length ? ` (${details.join('; ')})` : ''}`;
      });

      records.push(`Uploaded Attachments:\n${formatted.join('\n')}`);
    }

    // Add any additional medical records
    if (patientData.medicalRecords) {
      records.push(patientData.medicalRecords);
    }

    return records.join('\n\n');
  }
}

export const medicalApi = new MedicalApiClient();