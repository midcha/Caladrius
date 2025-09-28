// src/passportStore.ts
import { DOC_ROOT } from './fs';

export const PASSPORT = `${DOC_ROOT}passport.json`;
export const ATT_DIR  = `${DOC_ROOT}attachments/`;
export const INDEX    = `${ATT_DIR}index.json`;

export function buildDemoPassport(runId: string) {
  return {
    version: 2,
    passportId: `pp_${runId.slice(-6)}`,
    issuedAt: new Date().toISOString(),
    source: 'patient-app',

    patient: {
      mrn: null,
      firstName: 'Jordan',
      lastName: 'Lee',
      dob: '2005-03-14',
      sex: 'Unknown',          // "M" | "F" | "X" | "Unknown"
      ethnicity: null,
      bloodType: null,
      contact: { phone: null, email: null },
    },

    identifiers: { national: null, insuranceMemberId: null },

    // core collections (start empty)
    prescriptions: [],
    imaging: [],
    labs: [],
    encounters: [],

    // global attachment registry (unchanged contract)
    attachments: [],

    // normalized notes
    notes: [{ author: 'demo', at: new Date().toISOString(), text: 'seeded v2' }],
  };
}

export function buildEmptyIndex(runId: string) {
  return { version: 1, runId, files: [] as any[] };
}
