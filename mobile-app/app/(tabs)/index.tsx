/* app/(tabs)/index.tsx */
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
(global as any).Buffer = (global as any).Buffer || require('buffer').Buffer;

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Platform, Alert, Modal } from 'react-native';

import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { zip } from 'react-native-zip-archive';

/* QR scanning via expo-camera */
import { CameraView, useCameraPermissions } from 'expo-camera';

import { colors, S } from '../../src/styles';
import {
  DOC_ROOT, CACHE_ROOT, ensureDir, readJson, writeJson,
  listTree, bytes, guessExt, copyDirRecursive, type Node
} from '../../src/fs';
import { PASSPORT, ATT_DIR, INDEX, buildDemoPassport, buildEmptyIndex } from '../../src/passportStore';

// ---- AWS S3 (direct, IAM creds via .env/Babel) ----
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { decode as atob } from 'base-64';

// ==== unchanged helpers ====
function makeRunId() {
  const now = new Date();
  const p2 = (n: number) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(
    now.getMinutes(),
  )}${p2(now.getSeconds())}`;
  const rnd = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  return `run_${ts}_${rnd}`;
}

// ===== Passport Editor helpers =====
function isPlainObject(v: any) { return v && typeof v === 'object' && !Array.isArray(v); }
function deepMerge<T>(base: T, patch: any): T {
  if (Array.isArray(patch)) return patch as any; // arrays: replace
  if (isPlainObject(patch) && isPlainObject(base)) {
    const out: any = { ...base };
    for (const k of Object.keys(patch)) {
      out[k] = deepMerge((base as any)[k], (patch as any)[k]);
    }
    return out;
  }
  return patch as any;
}

// ---- HTTP helper (for connect/complete routes) ----
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

// ---- AWS helpers ----
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

export default function Home() {
  const [runId, setRunId] = useState(makeRunId()); // only for ZIP filename
  const [sessionId, setSessionId] = useState<string>(''); // user-entered or QR-populated session id (S3 prefix)
  const [address, setAddress] = useState<string>(''); // QR-populated server address (kept in-memory)
  const [zipPath, setZipPath] = useState<string | null>(null);
  const [docTree, setDocTree] = useState<Node[]>([]);
  const [cacheTree, setCacheTree] = useState<Node[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [passportEditor, setPassportEditor] = useState<string>('');
  const [indexViewer, setIndexViewer] = useState<string>('');
  const [resolvedAttachments, setResolvedAttachments] = useState<
  Array<{
    id: string;
    filename?: string;
    description?: string | null;
    ogFileName?: string | null;
    size?: number | null;
    mime?: string;
    capturedAt?: string;
  }>
>([]);

  // ---- OPTIONAL CONTEXT INPUTS FOR IMPORTS ----
  const [contextDescription, setContextDescription] = useState<string>(''); //required
  const [contextTags, setContextTags] = useState<string>('');
  const [contextSource, setContextSource] = useState<string>('patient-upload');

  // ---- QR Scanner (expo-camera) ----
  const [scanOpen, setScanOpen] = useState(false);
  const [perm, requestPermission] = useCameraPermissions();
  const hasCamPerm = perm?.granted ?? null;

  useEffect(() => { if (!perm) requestPermission(); }, [perm, requestPermission]);

  const log = useCallback((s: string) => {
    console.log(s);
    setLogs((prev) => [...prev.slice(-400), s]);
  }, []);

  const refreshTrees = useCallback(async () => {
    const [dt, ct] = await Promise.all([listTree(DOC_ROOT, 5), listTree(CACHE_ROOT, 3)]);
    setDocTree(dt);
    setCacheTree(ct);
  }, []);

  const initStage = useCallback(async () => {
    log(`INIT (root-scoped)`);
    await ensureDir(ATT_DIR);
    const pInfo = await FileSystem.getInfoAsync(PASSPORT);
    const iInfo = await FileSystem.getInfoAsync(INDEX);
    if (!pInfo.exists) await writeJson(PASSPORT, buildDemoPassport(runId));
    if (!iInfo.exists) await writeJson(INDEX, buildEmptyIndex(runId));
    log('Seeded passport.json + attachments/index.json (root)');
    await refreshTrees();
  }, [runId, log, refreshTrees]);

  const newRun = useCallback(async () => {
    const id = makeRunId();
    setRunId(id);
    setZipPath(null);
    log(`NEW SNAPSHOT ID: ${id}`);
  }, [log]);

  const importFiles = useCallback(async () => {
    if (!contextDescription.trim()) {
      Alert.alert('Missing description', 'Please enter a brief description before importing.');
      return;
    }

    await ensureDir(ATT_DIR);
    const hasP = await FileSystem.getInfoAsync(PASSPORT);
    const hasI = await FileSystem.getInfoAsync(INDEX);
    if (!hasP.exists) await writeJson(PASSPORT, buildDemoPassport(runId));
    if (!hasI.exists) await writeJson(INDEX, buildEmptyIndex(runId));

    const res = await DocumentPicker.getDocumentAsync({
      multiple: true,
      type: ['*/*'],
      copyToCacheDirectory: true,
    });
    if (res.canceled) {
      log('Import canceled');
      return;
    }

    const idx = (await readJson<any>(INDEX)) ?? buildEmptyIndex(runId);
    const passport = (await readJson<any>(PASSPORT)) ?? buildDemoPassport(runId);
    let counter = (idx.files?.length || 0) + 1;

    for (const a of res.assets) {
      const ext = guessExt(a.name, a.uri);
      const id = `file-${String(counter).padStart(3, '0')}`;
      const dest = `${ATT_DIR}${id}.${ext}`;

      await ensureDir(ATT_DIR);
      await FileSystem.copyAsync({ from: a.uri, to: dest });
      const info = await FileSystem.getInfoAsync(dest, { size: true });

      const mime =
        ext === 'pdf'
          ? 'application/pdf'
          : ['jpg', 'jpeg'].includes(ext)
          ? 'image/jpeg'
          : ext === 'png'
          ? 'image/png'
          : ext === 'dcm'
          ? 'application/dicom'
          : 'application/octet-stream';

      const userTags = contextTags
        ? contextTags.split(',').map(t => t.trim()).filter(Boolean)
        : [ext];

      idx.files.push({
        id,
        filename: `attachments/${id}.${ext}`,
        mime,
        size: info.size || null,
        capturedAt: new Date().toISOString(),
        context: {
          ogFileName: a.name || `${id}.${ext}`,
          description: contextDescription, // required text from the UI
          source: contextSource || 'patient-upload',
          tags: userTags,
        },
      });

      (passport as any).attachments = (passport as any).attachments || [];
      (passport as any).attachments.push({ id, mime, role: 'uploaded' });

      log(`Imported ${a.name ?? a.uri} → ${dest} (${bytes(info.size)})`);
      counter++;
    }

    await writeJson(INDEX, idx);
    await writeJson(PASSPORT, passport);
    await refreshTrees();
  }, [runId, contextDescription, contextTags, contextSource, log, refreshTrees]);

  const zipRun = useCallback(async () => {
    await ensureDir(ATT_DIR);
    const out = `${CACHE_ROOT}${runId}.zip`;
    const staging = `${CACHE_ROOT}bundle_${runId}/`;

    const stInfo = await FileSystem.getInfoAsync(staging);
    if (stInfo.exists) await FileSystem.deleteAsync(staging, { idempotent: true });
    await ensureDir(staging);
    await FileSystem.copyAsync({ from: PASSPORT, to: `${staging}passport.json` });
    await copyDirRecursive(ATT_DIR, `${staging}attachments/`);

    log(`Zipping ${staging} → ${out}`);
    const zipped = await zip(staging, out);
    setZipPath(out); // keep the file:// URI for expo-file-system
    const info = await FileSystem.getInfoAsync(out, { size: true });
    log(`ZIP ready: ${out} (${bytes(info.size)})`);

    await FileSystem.deleteAsync(staging, { idempotent: true });
    await refreshTrees();
  }, [runId, refreshTrees, log]);

  // === direct S3 upload (IAM creds) ===
  const uploadZip = useCallback(async () => {
    try {
      if (!zipPath) {
        Alert.alert('No ZIP', 'Create a ZIP first.');
        return;
      }
      if (!sessionId || !sessionId.trim()) {
        Alert.alert('Missing Session ID', 'Enter a sessionId (or scan QR) to use as the S3 subdirectory.');
        return;
      }

      const bucket = (process.env.BUCKET as string) || 'caladrius-buffer';

      const stat = await FileSystem.getInfoAsync(zipPath, { size: true });
      if (!stat.exists) {
        Alert.alert('File missing', 'ZIP file not found on device.');
        return;
      }
      const b64 = await FileSystem.readAsStringAsync(zipPath, { encoding: FileSystem.EncodingType.Base64 });
      const bodyBytes = base64ToUint8Array(b64);

      const s3 = makeS3Client();
      const keyBundle = `runs/${sessionId}/bundle.zip`;
      const keyManifest = `runs/${sessionId}/manifest.json`;

      log(`Uploading bundle → s3://${bucket}/${keyBundle} (${bytes(stat.size)})`);
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
      log('Bundle uploaded');

      const manifest = {
        sessionId,
        uploadedAt: new Date().toISOString(),
        bundle: {
          key: keyBundle,
          size: stat.size,
          contentType: 'application/zip'
        },
        // address kept in-memory only for now
        app: { name: 'caladrius', version: '1.0' }
      };

      log(`Uploading manifest → s3://${bucket}/${keyManifest}`);
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: keyManifest,
        Body: JSON.stringify(manifest, null, 2),
        ContentType: 'application/json',
      }));
      log('Manifest uploaded');

      // >>> TRIAGE COMPLETE NOTIFY <<<
      if (address && sessionId) {
        try {
          await postJSON(address, '/api/triage/complete', { sessionId });
          log('Notified server: /api/triage/complete');
        } catch (err: any) {
          log(`Notify /api/triage/complete failed: ${err?.message || String(err)}`);
        }
      }

      Alert.alert('Upload complete', `s3://${bucket}/runs/${sessionId}/`);
    } catch (e: any) {
      log(`Upload error: ${e?.message || String(e)}`);
      Alert.alert('Upload error', e?.message || String(e));
    }
  }, [zipPath, sessionId, address, log]);

  const browse = useCallback(async () => {
    await refreshTrees();
    Alert.alert('Browsed', 'Directory trees refreshed below.');
  }, [refreshTrees]);

  const resetStage = useCallback(async () => {
    const p = await FileSystem.getInfoAsync(PASSPORT);
    if (p.exists) {
      log(`Removing ${PASSPORT}`);
      await FileSystem.deleteAsync(PASSPORT, { idempotent: true });
    }
    const a = await FileSystem.getInfoAsync(ATT_DIR);
    if (a.exists) {
      log(`Removing ${ATT_DIR}`);
      await FileSystem.deleteAsync(ATT_DIR, { idempotent: true });
    }
    const zips = await FileSystem.readDirectoryAsync(CACHE_ROOT).catch(() => []);
    for (const name of zips) {
      if (name.endsWith('.zip') || name.startsWith('bundle_')) {
        await FileSystem.deleteAsync(`${CACHE_ROOT}${name}`, { idempotent: true });
      }
    }
    setZipPath(null);
    await refreshTrees();
  }, [log, refreshTrees]);

  // === Passport Editor ===
  const loadPassportToEditor = useCallback(async () => {
    const p = await readJson<any>(PASSPORT);
    setPassportEditor(JSON.stringify(p ?? buildDemoPassport(runId), null, 2));
    log('Loaded passport into editor');
  }, [runId, log]);

  const replacePassportFromEditor = useCallback(async () => {
    try {
      const obj = JSON.parse(passportEditor || '{}');
      await writeJson(PASSPORT, obj);
      log('Replaced passport.json from editor');
      await refreshTrees();
    } catch (e: any) {
      Alert.alert('Invalid JSON', e?.message || String(e));
    }
  }, [passportEditor, refreshTrees, log]);

  const mergePatchPassportFromEditor = useCallback(async () => {
    try {
      const patch = JSON.parse(passportEditor || '{}');
      const current = (await readJson<any>(PASSPORT)) ?? buildDemoPassport(runId);
      const merged = deepMerge(current, patch);
      await writeJson(PASSPORT, merged);
      log('Merged editor JSON into passport.json');
      await refreshTrees();
    } catch (e: any) {
      Alert.alert('Invalid JSON', e?.message || String(e));
    }
  }, [passportEditor, runId, refreshTrees, log]);

  // === Index Viewer & Resolver ===
  const loadIndexToViewer = useCallback(async () => {
    const idx = await readJson<any>(INDEX);
    if (!idx) {
      setIndexViewer('// index.json not found');
      log('index.json not found');
      return;
    }
    setIndexViewer(JSON.stringify(idx, null, 2));
    log('Loaded attachments/index.json into viewer');
  }, [log]);

  const resolvePassportAttachments = useCallback(async () => {
    const [passport, idx] = await Promise.all([readJson<any>(PASSPORT), readJson<any>(INDEX)]);
    if (!passport) {
      setResolvedAttachments([]);
      log('passport.json not found');
      return;
    }
    const files: any[] = idx?.files ?? [];
    const filesById = new Map<string, any>(files.map((f) => [f.id, f]));
    const out = (passport.attachments ?? []).map((att: any) => {
    const entry = filesById.get(att.id);
    return {
      id: att.id,
      filename: entry?.filename,
      description: entry?.context?.description || entry?.context?.label || null, // fallback to legacy label
      ogFileName: entry?.context?.ogFileName || null,
      size: entry?.size ?? null,
      mime: entry?.mime ?? att?.mime,
      capturedAt: entry?.capturedAt,
    };
    });
    setResolvedAttachments(out);
    log(`Resolved ${out.length} attachment references`);
  }, [log]);

  // === QR scan handler (expects JSON: { sessionId, address, ... }) ===
  const onScan = useCallback(({ data }: { data: string }) => {
    try {
      const obj = JSON.parse(data);
      const sid = typeof obj?.sessionId === 'string' ? obj.sessionId : '';
      const addr = typeof obj?.address === 'string' ? obj.address : '';
      if (!sid && !addr) throw new Error('QR JSON missing sessionId/address');

      if (sid) setSessionId(sid);
      if (addr) setAddress(addr);

      log(`QR parsed → sessionId=${sid || '(none)'} address=${addr || '(none)'}`);

      // >>> TRIAGE CONNECT NOTIFY <<<
      if (sid && addr) {
        postJSON(addr, '/api/triage/connect', { sessionId: sid })
          .then(() => log('Notified server: /api/triage/connect'))
          .catch((err) => log(`Notify /api/triage/connect failed: ${err?.message || String(err)}`));
      }

      setScanOpen(false); // one-shot
    } catch (e: any) {
      log(`QR parse error: ${e?.message || String(e)}`);
      Alert.alert('QR Error', 'Expecting JSON with { "sessionId", "address" }.');
      setScanOpen(false);
    }
  }, [log]);

  // ===================== UI =====================
  return (
    <ScrollView
      style={S.screen}
      showsVerticalScrollIndicator={true}
    >
      <Text style={S.h1}>Caladrius – Passport Store (Root-Scoped)</Text>

      {/* Init/Run Controls */}
      <View style={S.card}>
        <Text style={S.h2}>Snapshot ID (for ZIP filename only)</Text>
        <TextInput style={S.input} value={runId} onChangeText={setRunId} autoCapitalize="none" />

        <Text style={[S.h2, { marginTop: 12 }]}>Session ID (S3 subdirectory)</Text>
        <TextInput
          style={S.input}
          value={sessionId}
          onChangeText={setSessionId}
          autoCapitalize="none"
          placeholder="e.g., 123456 (required for S3 upload)"
          placeholderTextColor={colors.faint}
        />

        <Text style={[S.h2, { marginTop: 12 }]}>Server Address</Text>
        <TextInput
          style={S.input}
          value={address}
          onChangeText={setAddress}
          autoCapitalize="none"
          placeholder="address (from QR)"
          placeholderTextColor={colors.faint}
        />

        <View style={S.row}>
          <TouchableOpacity style={S.btn(colors.accent)} onPress={newRun}>
            <Text style={S.btnText}>New Snapshot ID</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.btn(colors.accent2)} onPress={initStage}>
            <Text style={S.btnText}>Init (seed root)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.btn(colors.warn)} onPress={resetStage}>
            <Text style={S.btnText}>Reset Passport + Attachments</Text>
          </TouchableOpacity>
        </View>

        <View style={[S.row, { marginTop: 10 }]}>
          <TouchableOpacity style={S.btn(colors.accent)} onPress={() => setScanOpen(true)}>
            <Text style={S.btnText}>Scan QR (Session + Address)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Passport Editor */}
      <View style={S.card}>
        <Text style={S.h2}>Passport Editor (JSON)</Text>
        <View style={S.row}>
          <TouchableOpacity style={S.btn(colors.accent)} onPress={loadPassportToEditor}>
            <Text style={S.btnText}>Load Current</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.btn(colors.ok)} onPress={mergePatchPassportFromEditor}>
            <Text style={S.btnText}>Merge Patch → passport.json</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.btn(colors.danger)} onPress={replacePassportFromEditor}>
            <Text style={S.btnText}>Replace passport.json</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[S.input, { minHeight: 160, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) }]}
          multiline
          value={passportEditor}
          onChangeText={setPassportEditor}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder='{"vitals":{"hr_bpm":72}}   // example patch'
          placeholderTextColor={colors.faint}
        />
      </View>

      {/* Index Viewer / Resolver */}
      <View style={S.card}>
        <Text style={S.h2}>Attachments Index & Resolution</Text>
        <View style={S.row}>
          <TouchableOpacity style={S.btn(colors.accent)} onPress={loadIndexToViewer}>
            <Text style={S.btnText}>Load index.json</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.btn(colors.ok)} onPress={resolvePassportAttachments}>
            <Text style={S.btnText}>Resolve passport ↔ index</Text>
          </TouchableOpacity>
        </View>

        <Text style={[S.mono, { marginTop: 8, color: colors.faint }]}>attachments/index.json</Text>
        <TextInput
          style={[S.input, { minHeight: 140, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) }]}
          multiline
          value={indexViewer}
          onChangeText={setIndexViewer}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder='// click "Load index.json" to display'
          placeholderTextColor={colors.faint}
          editable={false}
        />

        <ScrollView
          style={{ maxHeight: 160, marginTop: 10 }}
          showsVerticalScrollIndicator={true}
        >
          {resolvedAttachments.length === 0 ? (
            <Text style={[S.mono, { color: colors.faint }]}>
              // click "Resolve passport ↔ index" to see attachment details
            </Text>
          ) : (
            resolvedAttachments.map((r) => (
              <View key={r.id} style={{ marginBottom: 8 }}>
                <Text style={S.mono}>• id: {r.id}</Text>
                {r.description ? <Text style={S.mono}>  description: {r.description}</Text> : null}
                {r.ogFileName ? <Text style={S.mono}>  ogFileName: {r.ogFileName}</Text> : null}
                {r.filename ? <Text style={S.mono}>  file: {r.filename}</Text> : null}
                {r.mime ? <Text style={S.mono}>  mime: {r.mime}</Text> : null}
                <Text style={S.mono}>  size: {r.size ?? '—'}</Text>
                {r.capturedAt ? <Text style={S.mono}>  capturedAt: {r.capturedAt}</Text> : null}
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Import */}
      <View style={S.card}>
        <Text style={S.h2}>Import into attachments/</Text>

        {/* Optional Context */}
        <Text style={S.h2}>Optional Context</Text>
        <TextInput
          style={S.input}
          value={contextDescription}
          onChangeText={setContextDescription}
          autoCapitalize="none"
          placeholder="Brief description (required, e.g., 'Insurance card front')"
          placeholderTextColor={colors.faint}
        />

        <TextInput
          style={S.input}
          value={contextTags}
          onChangeText={setContextTags}
          autoCapitalize="none"
          placeholder="Tags (comma-separated, optional)"
          placeholderTextColor={colors.faint}
        />
        <TextInput
          style={S.input}
          value={contextSource}
          onChangeText={setContextSource}
          autoCapitalize="none"
          placeholder='Source (default "patient-upload")'
          placeholderTextColor={colors.faint}
        />

        <View style={S.row}>
          <TouchableOpacity style={S.btn(colors.ok)} onPress={importFiles}>
            <Text style={S.btnText}>Pick & Copy Files</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ZIP + Upload */}
      <View style={S.card}>
        <Text style={S.h2}>ZIP + Upload</Text>
        <View style={{ gap: 8 }}>
          <TouchableOpacity style={S.btn(colors.accent)} onPress={zipRun}>
            <Text style={S.btnText}>Create ZIP (passport + attachments)</Text>
          </TouchableOpacity>
          <Text style={[S.mono, { color: colors.faint }]}>ZIP: {zipPath ?? '(none yet)'}</Text>
          <TouchableOpacity style={S.btn(colors.ok)} onPress={uploadZip}>
            <Text style={S.btnText}>Upload to S3 (direct IAM)</Text>
          </TouchableOpacity>
        </View>
        <Text style={[S.mono, { marginTop: 8 }]}>
          Target: s3://{(process.env.BUCKET as string) || 'caladrius-buffer'}/runs/{sessionId || '—'}/
        </Text>
      </View>

      {/* Browse */}
      <View style={S.card}>
        <Text style={S.h2}>Browse App Directories</Text>
        <View style={S.row}>
          <TouchableOpacity style={S.btn(colors.accent)} onPress={browse}>
            <Text style={S.btnText}>Refresh Trees</Text>
          </TouchableOpacity>
        </View>
        <Text style={[S.mono, { marginTop: 8 }]}>documentDirectory: {DOC_ROOT}</Text>
        <ScrollView
          style={{ maxHeight: 140, marginTop: 6 }}
          showsVerticalScrollIndicator={true}
        >
          {docTree.map((n, i) => (
            <Text key={`d-${i}`} style={S.mono}>
              {n.isDir ? '📁' : '📄'} {n.path.replace(DOC_ROOT, 'doc:/')} {n.isDir ? '' : `(${bytes(n.size)})`}
            </Text>
          ))}
        </ScrollView>
        <Text style={[S.mono, { marginTop: 8 }]}>cacheDirectory: {CACHE_ROOT}</Text>
        <ScrollView
          style={{ maxHeight: 120, marginTop: 6 }}
          showsVerticalScrollIndicator={true}
        >
          {cacheTree.map((n, i) => (
            <Text key={`c-${i}`} style={S.mono}>
              {n.isDir ? '📁' : '📄'} {n.path.replace(CACHE_ROOT, 'cache:/')} {n.isDir ? '' : `(${bytes(n.size)})`}
            </Text>
          ))}
        </ScrollView>
      </View>

      {/* Logs */}
      <View style={[S.card, { marginBottom: 30 }]}>
        <Text style={S.h2}>Logs</Text>
        <ScrollView
          style={{ maxHeight: 160, marginTop: 6 }}
          showsVerticalScrollIndicator={true}
        >
          {logs.map((l, i) => (
            <Text key={i} style={S.mono}>
              {l}
            </Text>
          ))}
        </ScrollView>
      </View>

      {/* QR Scanner Modal (expo-camera) */}
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
                  onBarcodeScanned={({ data }: any) => onScan({ data })}
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
