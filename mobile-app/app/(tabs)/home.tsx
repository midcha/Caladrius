/* app/(tabs)/home.tsx */
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
(global as any).Buffer = (global as any).Buffer || require('buffer').Buffer;

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';

import * as FileSystem from 'expo-file-system/legacy';
import { zip } from 'react-native-zip-archive';

/* QR scanning via expo-camera */
import { CameraView, useCameraPermissions } from 'expo-camera';

/* Styles & FS helpers (ground truth) */
import { colors, S } from '../../src/styles';
import {
  DOC_ROOT, CACHE_ROOT, ensureDir, bytes, copyDirRecursive, writeJson, readJson
} from '../../src/fs';
import { PASSPORT, ATT_DIR, INDEX, buildDemoPassport, buildEmptyIndex } from '../../src/passportStore';

/* AWS S3 (direct IAM creds via env) */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { decode as atob } from 'base-64';

// ===================== helpers (kept parallel to admin) =====================
function makeRunId() {
  const now = new Date();
  const p2 = (n: number) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(
    now.getMinutes(),
  )}${p2(now.getSeconds())}`;
  const rnd = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  return `run_${ts}_${rnd}`;
}

async function postJSON(base: string, path: string, body: any, timeoutMs = 8000) {
  const url = `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    try { return await res.json(); } catch { return null; }
  } finally {
    clearTimeout(t);
  }
}

function makeS3Client() {
  const region = process.env.AWS_REGION as string;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID as string;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY as string;
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY');
  }
  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey } as any,
  });
}

function base64ToUint8Array(b64: string) {
  const binary = atob(b64);
  const len = binary.length;
  const bytesArr = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytesArr[i] = binary.charCodeAt(i);
  return bytesArr;
}

// ===================== Home (restricted user flow) =====================
export default function Home() {
  const [runId, setRunId] = useState(makeRunId()); // for ZIP filename
  const [sessionId, setSessionId] = useState<string>(''); // from QR
  const [address, setAddress] = useState<string>('');      // from QR
  const [zipPath, setZipPath] = useState<string | null>(null);
  const [passport, setPassport] = useState<any>(null);

  const [status, setStatus] = useState<string>('Ready');
  const setStep = (s: string) => {
    console.log(s);
    setStatus(s);
  };

  // QR Scanner
  const [scanOpen, setScanOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false); // one-shot guard
  const [perm, requestPermission] = useCameraPermissions();
  const hasCamPerm = perm?.granted ?? null;
  useEffect(() => { if (!perm) requestPermission(); }, [perm, requestPermission]);

  // Load passport data for display
  const loadPassportData = useCallback(async () => {
    try {
      const data = await readJson<any>(PASSPORT);
      setPassport(data);
    } catch {
      setPassport(null);
    }
  }, []);

  // Load passport on mount
  useEffect(() => {
    loadPassportData();
  }, [loadPassportData]);

  // ---- Ensure files exist (exactly like admin initStage) ----
  const ensureFilesExist = useCallback(async () => {
    setStep(`INIT (ensuring files exist)`);
    await ensureDir(ATT_DIR);
    const pInfo = await FileSystem.getInfoAsync(PASSPORT);
    const iInfo = await FileSystem.getInfoAsync(INDEX);
    if (!pInfo.exists) await writeJson(PASSPORT, buildDemoPassport(runId));
    if (!iInfo.exists) await writeJson(INDEX, buildEmptyIndex(runId));
    setStep('Seeded passport.json + attachments/index.json');
    await loadPassportData(); // Refresh passport display
  }, [runId, setStep, loadPassportData]);

  // ---- Create ZIP and return path directly ----
  const createZipAndReturnPath = useCallback(async (): Promise<string> => {
    const out = `${CACHE_ROOT}${runId}.zip`;
    const staging = `${CACHE_ROOT}bundle_${runId}/`;

    const stInfo = await FileSystem.getInfoAsync(staging);
    if (stInfo.exists) await FileSystem.deleteAsync(staging, { idempotent: true });
    await ensureDir(staging);

    await FileSystem.copyAsync({ from: PASSPORT, to: `${staging}passport.json` });
    await copyDirRecursive(ATT_DIR, `${staging}attachments/`);

    setStep(`Zipping ${staging} → ${out}`);
    await zip(staging, out);
    const info = await FileSystem.getInfoAsync(out, { size: true });
    setZipPath(out); // Still update state for UI display
    setStep(`ZIP ready: ${out} (${bytes(info.size)})`);

    await FileSystem.deleteAsync(staging, { idempotent: true });
    return out; // Return the path directly
  }, [runId, setStep]);

  // ---- Upload with explicit path ----
  const uploadZipWithPath = useCallback(async (zipPath: string, sessionId: string, address: string) => {
    try {
      const bucket = (process.env.BUCKET as string) || 'caladrius-buffer';

      const stat = await FileSystem.getInfoAsync(zipPath, { size: true });
      if (!stat.exists) {
        throw new Error('ZIP file not found on device.');
      }
      const b64 = await FileSystem.readAsStringAsync(zipPath, { encoding: FileSystem.EncodingType.Base64 });
      const bodyBytes = base64ToUint8Array(b64);

      const s3 = makeS3Client();
      const keyBundle = `runs/${sessionId}/bundle.zip`;
      const keyManifest = `runs/${sessionId}/manifest.json`;

      setStep(`Uploading bundle → s3://${bucket}/${keyBundle} (${bytes(stat.size)})`);
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: keyBundle,
        Body: bodyBytes,
        ContentType: 'application/zip',
        Metadata: {
          'x-session-id': sessionId,
          'x-app': 'caladrius',
        },
      }));
      setStep('Bundle uploaded');

      const manifest = {
        sessionId,
        uploadedAt: new Date().toISOString(),
        bundle: {
          key: keyBundle,
          size: stat.size,
          contentType: 'application/zip',
        },
        app: { name: 'caladrius', version: '1.0' },
      };

      setStep(`Uploading manifest → s3://${bucket}/${keyManifest}`);
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: keyManifest,
        Body: JSON.stringify(manifest, null, 2),
        ContentType: 'application/json',
      }));
      setStep('Manifest uploaded');

      // >>> TRIAGE COMPLETE NOTIFY <<<
      if (address && sessionId) {
        try {
          await postJSON(address, '/api/triage/complete', { sessionId });
          setStep('Notified server: /api/triage/complete');
        } catch (err: any) {
          setStep(`Notify /api/triage/complete failed: ${err?.message || String(err)}`);
        }
      }

      Alert.alert('Upload complete', `s3://${bucket}/runs/${sessionId}/`);
    } catch (e: any) {
      setStep(`Upload error: ${e?.message || String(e)}`);
      Alert.alert('Upload error', e?.message || String(e));
    }
  }, [setStep]);

  // ---- QR scan handler (EXACT original working version) ----
  const onScan = useCallback(async ({ data }: { data: string }) => {
    if (scanBusy) return;
    setScanBusy(true);

    try {
      const obj = JSON.parse(data);
      const sid = typeof obj?.sessionId === 'string' ? obj.sessionId : '';
      const addr = typeof obj?.address === 'string' ? obj.address : '';
      if (!sid || !addr) throw new Error('QR JSON missing sessionId/address');

      setSessionId(sid);
      setAddress(addr);
      setStep(`QR parsed → sessionId=${sid} address=${addr}`);

      // >>> TRIAGE CONNECT NOTIFY <<<
      try {
        await postJSON(addr, '/api/triage/connect', { sessionId: sid });
        setStep('Notified server: /api/triage/connect');
      } catch (err: any) {
        setStep(`Notify /api/triage/connect failed: ${err?.message || String(err)}`);
      }

      setTimeout(() => setScanOpen(false), 200);

      // FIXED: Create zip and get the path, then pass it directly to upload
      const zipPath = await createZipAndReturnPath();
      await uploadZipWithPath(zipPath, sid, addr);
    } catch (e: any) {
      setStep(`QR parse error: ${e?.message || String(e)}`);
      Alert.alert('QR Error', 'Expecting JSON with { "sessionId", "address" }.');
      setTimeout(() => setScanOpen(false), 200);
    } finally {
      setScanBusy(false);
    }
  }, [scanBusy, createZipAndReturnPath, uploadZipWithPath, setStep]);

  // Helper to format dates
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not provided';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  // ===================== UI (patient info layout) =====================
  return (
    <ScrollView style={S.screen} showsVerticalScrollIndicator={true}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
        
        {/* Header with patient name */}
        <View style={{ marginBottom: 30, alignItems: 'center' }}>
          <Text style={[S.h1, { textAlign: 'center', marginBottom: 20 }]}>
            Hello, {passport?.patient?.firstName || 'Patient'} {passport?.patient?.lastName || ''}
          </Text>
          
          <TouchableOpacity 
            style={[S.btn(colors.accent), { paddingVertical: 20, paddingHorizontal: 40, borderRadius: 12 }]}
            onPress={async () => {
              await ensureFilesExist();
              setScanOpen(true);
            }}
          >
            <Text style={[S.btnText, { fontSize: 18 }]}>Scan to Upload</Text>
          </TouchableOpacity>

          {status !== 'Ready' && (
            <Text style={[S.mono, { marginTop: 15, textAlign: 'center', color: colors.accent }]}>
              {status}
            </Text>
          )}
        </View>

        {/* Basic Information Module */}
        <View style={[S.card, { marginBottom: 20 }]}>
          <Text style={[S.h2, { marginBottom: 15 }]}>Basic Information</Text>
          
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[S.mono, { color: colors.faint }]}>Date of Birth:</Text>
              <Text style={S.mono}>{formatDate(passport?.patient?.dob)}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[S.mono, { color: colors.faint }]}>Sex:</Text>
              <Text style={S.mono}>{passport?.patient?.sex || 'Not provided'}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[S.mono, { color: colors.faint }]}>Blood Type:</Text>
              <Text style={S.mono}>{passport?.patient?.bloodType || 'Not provided'}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[S.mono, { color: colors.faint }]}>Ethnicity:</Text>
              <Text style={S.mono}>{passport?.patient?.ethnicity || 'Not provided'}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[S.mono, { color: colors.faint }]}>MRN:</Text>
              <Text style={S.mono}>{passport?.patient?.mrn || 'Not provided'}</Text>
            </View>

            {(passport?.patient?.contact?.phone || passport?.patient?.contact?.email) && (
              <>
                <View style={{ height: 10 }} />
                <Text style={[S.mono, { color: colors.faint, fontWeight: 'bold' }]}>Contact:</Text>
                {passport?.patient?.contact?.phone && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[S.mono, { color: colors.faint }]}>Phone:</Text>
                    <Text style={S.mono}>{passport.patient.contact.phone}</Text>
                  </View>
                )}
                {passport?.patient?.contact?.email && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[S.mono, { color: colors.faint }]}>Email:</Text>
                    <Text style={S.mono}>{passport.patient.contact.email}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Insurance Module */}
        <View style={[S.card, { marginBottom: 20 }]}>
          <Text style={[S.h2, { marginBottom: 15 }]}>Insurance Information</Text>
          
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[S.mono, { color: colors.faint }]}>Member ID:</Text>
              <Text style={S.mono}>{passport?.identifiers?.insuranceMemberId || 'Not provided'}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[S.mono, { color: colors.faint }]}>Group Number:</Text>
              <Text style={S.mono}>{passport?.identifiers?.insuranceGroupNumber || 'Not provided'}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[S.mono, { color: colors.faint }]}>Plan Name:</Text>
              <Text style={S.mono}>{passport?.identifiers?.insurancePlanName || 'Not provided'}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[S.mono, { color: colors.faint }]}>Provider:</Text>
              <Text style={S.mono}>{passport?.identifiers?.insuranceProvider || 'Not provided'}</Text>
            </View>

            {passport?.identifiers?.national && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[S.mono, { color: colors.faint }]}>National ID:</Text>
                <Text style={S.mono}>{passport.identifiers.national}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Emergency Contacts Module */}
        <View style={[S.card, { marginBottom: 30 }]}>
          <Text style={[S.h2, { marginBottom: 15 }]}>Emergency Contacts</Text>
          
          {(!passport?.emergencyContacts || passport.emergencyContacts.length === 0) ? (
            <Text style={[S.mono, { color: colors.faint, fontStyle: 'italic' }]}>
              No emergency contacts on file
            </Text>
          ) : (
            <View style={{ gap: 15 }}>
              {passport.emergencyContacts.map((contact: any, index: number) => (
                <View key={index} style={{ paddingBottom: 15, borderBottomWidth: index < passport.emergencyContacts.length - 1 ? 1 : 0, borderBottomColor: colors.faint }}>
                  <Text style={[S.mono, { fontWeight: 'bold', marginBottom: 5 }]}>
                    {contact.name || `Contact ${index + 1}`}
                  </Text>
                  {contact.relationship && (
                    <Text style={[S.mono, { color: colors.faint }]}>
                      Relationship: {contact.relationship}
                    </Text>
                  )}
                  {contact.phone && (
                    <Text style={S.mono}>Phone: {contact.phone}</Text>
                  )}
                  {contact.email && (
                    <Text style={S.mono}>Email: {contact.email}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* QR Scanner Modal */}
      <Modal visible={scanOpen} animationType="slide" onRequestClose={() => setScanOpen(false)}>
        <View style={[S.screen, { justifyContent: 'center', alignItems: 'center' }]}>
          {hasCamPerm === false ? (
            <>
              <Text style={S.h2}>Camera permission denied</Text>
              <TouchableOpacity style={S.btn(colors.warn)} onPress={() => setScanOpen(false)}>
                <Text style={S.btnText}>Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={{ width: '100%', aspectRatio: 3 / 4, overflow: 'hidden', borderRadius: 12 }}>
                <CameraView
                  style={{ width: '100%', height: '100%' }}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={scanBusy ? undefined : ({ data }: any) => onScan({ data })}
                />
              </View>
              <TouchableOpacity style={[S.btn(colors.warn), { marginTop: 16 }]} onPress={() => setScanOpen(false)}>
                <Text style={S.btnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}