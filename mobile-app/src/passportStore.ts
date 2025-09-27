// src/passportStore.ts
import { DOC_ROOT } from './fs';

export const PASSPORT = `${DOC_ROOT}passport.json`;
export const ATT_DIR  = `${DOC_ROOT}attachments/`;
export const INDEX    = `${ATT_DIR}index.json`;

export function buildDemoPassport(runId: string) {
  return {
    version: 1,
    passportId: `pp_${runId.slice(-6)}`,
    issuedAt: new Date().toISOString(),
    source: 'patient-app',
    patient: {
      mrn: null,
      givenName: '—',
      familyName: '—',
      dob: '2000-01-01',
      sexAtBirth: 'Unknown',
      genderIdentity: 'Unknown',
      contact: { phone: null, email: null },
    },
    identifiers: { national: null, insuranceMemberId: null },
    encounter: {
      site: 'Triage-Station-3',
      capturedAt: new Date().toISOString(),
      chiefComplaint: 'Demo',
      historyOfPresentIllness: '—',
      allergies: [],
      medications: [],
      conditions: [],
    },
    vitals: {
      hr_bpm: 80,
      bp_mmHg: '120/80',
      rr_bpm: 16,
      spo2_pct: 99,
      temp_c: 36.8,
      recordedAt: new Date().toISOString(),
    },
    attachments: [] as Array<{ id: string; mime: string; role?: string }>,
    notes: [{ author: 'demo', at: new Date().toISOString(), text: 'seeded' }],
    meta: { appVersion: '1.0.0', deviceId: 'android-dev', runId },
  };
}

export function buildEmptyIndex(runId: string) {
  return { version: 1, runId, files: [] as any[] };
}
