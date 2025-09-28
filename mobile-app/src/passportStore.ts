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
      mrn: 'MRN789012345',
      firstName: 'Jordan',
      lastName: 'Lee',
      dob: '2005-03-14',
      sex: 'Unknown',
      ethnicity: 'Asian',
      bloodType: 'O+',
      contact: { phone: null, email: null },
    },

    identifiers: { 
      national: null, 
      insuranceMemberId: 'ABC123456789',
      insuranceGroupNumber: 'GRP001234',
      insurancePlanName: 'BlueCross BlueShield Standard',
      insuranceProvider: 'Anthem BCBS'
    },

    // core collections (start empty)
    prescriptions: [],
    imaging: [],
    labs: [],
    encounters: [],

    // global attachment registry (unchanged contract)
    attachments: [],

    // normalized notes
    notes: [{ author: 'demo', at: new Date().toISOString(), text: 'seeded v2' }],

    // Emergency contacts
    emergencyContacts: [
      {
        name: 'Sarah Lee',
        relationship: 'Mother',
        phone: '+1-555-0123',
        email: 'sarah.lee@email.com'
      },
      {
        name: 'Michael Chen',
        relationship: 'Friend',
        phone: '+1-555-0456',
        email: null
      }
    ],
  };
}

export function buildEmptyIndex(runId: string) {
  return { version: 1, runId, files: [] as any[] };
}