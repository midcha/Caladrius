import React, { useState } from "react";
import { SafeAreaView, View, Text, Button, ScrollView } from "react-native";
import * as FileSystem from "expo-file-system";
import { zip } from "react-native-zip-archive";

/**
 * ========= CONFIG (fill these) =========
 * 1) RUN_ID from your backend flow
 * 2) S3 pre-signed PUT URL for runs/<runId>/bundle.enc
 * 3) S3 pre-signed PUT URL for runs/<runId>/manifest.json
 */
const RUN_ID = "run_demo_001";               // <-- set me (e.g., "run_9f2d...")
const S3_PUT_BUNDLE_URL = "";                // <-- presigned PUT for .../runs/<runId>/bundle.enc
const S3_PUT_MANIFEST_URL = "";              // <-- presigned PUT for .../runs/<runId>/manifest.json

/**
 * ========= STAGING PATHS =========
 * Stage under cache so nothing leaks to shared storage.
 * We zip this folder and upload the bytes as "bundle.enc" (no encryption in demo).
 */
const CACHE_DIR = FileSystem.cacheDirectory ?? FileSystem.documentDirectory!;
const STAGE_DIR = `${CACHE_DIR}run_${RUN_ID}/`;
const ATTACH_DIR = `${STAGE_DIR}attachments/`;
const PASSPORT_JSON = `${STAGE_DIR}passport.json`;
const ATTACH_INDEX_JSON = `${ATTACH_DIR}index.json`;
const ZIP_PATH = `${CACHE_DIR}bundle-${RUN_ID}.zip`; // local file; uploaded as bundle.enc remotely

// ---- helpers ----
const nowIso = () => new Date().toISOString();
const uuid = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
async function ensureDir(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
}
async function statSize(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  return info.exists ? info.size ?? 0 : 0;
}

// 1x1 PNG (base64) so we can create a real binary
const ONE_BY_ONE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=";

// ---- step 1: stage passport.json ----
async function stageInit(log: (s: string) => void) {
  await ensureDir(STAGE_DIR);
  await ensureDir(ATTACH_DIR);

  if ((await FileSystem.getInfoAsync(PASSPORT_JSON)).exists) {
    log("✔ passport.json already staged");
    return;
  }

  const passport = {
    version: 1,
    passportId: `pp_${uuid().slice(0, 8)}`,
    issuedAt: nowIso(),
    source: "patient-app",
    patient: {
      mrn: null,
      givenName: "—",
      familyName: "—",
      dob: "2000-01-01",
      sexAtBirth: "Unknown",
      genderIdentity: "Unknown",
      contact: { phone: null, email: null }
    },
    identifiers: { national: null, insuranceMemberId: null },
    encounter: {
      site: "Triage-Station-Demo",
      capturedAt: nowIso(),
      chiefComplaint: "Demo",
      historyOfPresentIllness: "—",
      allergies: [],
      medications: [],
      conditions: []
    },
    vitals: {
      hr_bpm: 80, bp_mmHg: "120/80", rr_bpm: 16, spo2_pct: 98, temp_c: 37.0, recordedAt: nowIso()
    },
    attachments: [], // logical refs by id; filled after adding files
    notes: [],
    meta: { appVersion: "demo-1", deviceId: "android-demo", runId: RUN_ID }
  };

  await FileSystem.writeAsStringAsync(PASSPORT_JSON, JSON.stringify(passport, null, 2), {
    encoding: FileSystem.EncodingType.UTF8
  });
  log("✔ staged passport.json");
}

// ---- step 2: add opaque attachments + index.json ----
async function stageAttachments(log: (s: string) => void) {
  await ensureDir(ATTACH_DIR);

  const file1 = `${ATTACH_DIR}file-001.png`;
  const file2 = `${ATTACH_DIR}file-002.txt`;

  if (!(await FileSystem.getInfoAsync(file1)).exists) {
    await FileSystem.writeAsStringAsync(file1, ONE_BY_ONE_PNG_BASE64, {
      encoding: FileSystem.EncodingType.Base64
    });
  }
  if (!(await FileSystem.getInfoAsync(file2)).exists) {
    await FileSystem.writeAsStringAsync(file2, "demo file\n", {
      encoding: FileSystem.EncodingType.UTF8
    });
  }

  const index = {
    version: 1,
    runId: RUN_ID,
    files: [
      {
        id: "file-001",
        filename: "attachments/file-001.png",
        mime: "image/png",
        size: await statSize(file1),
        capturedAt: nowIso(),
        context: { label: "Tiny PNG", source: "demo", tags: ["image", "png"] }
      },
      {
        id: "file-002",
        filename: "attachments/file-002.txt",
        mime: "text/plain",
        size: await statSize(file2),
        capturedAt: nowIso(),
        context: { label: "Text stub", source: "demo", tags: ["text"] }
      }
    ]
  };

  await FileSystem.writeAsStringAsync(ATTACH_INDEX_JSON, JSON.stringify(index, null, 2), {
    encoding: FileSystem.EncodingType.UTF8
  });

  // update passport.attachments[]
  const passport = JSON.parse(
    await FileSystem.readAsStringAsync(PASSPORT_JSON, { encoding: "utf8" })
  );
  passport.attachments = index.files.map((f: any) => ({ id: f.id, mime: f.mime, role: "demo" }));
  await FileSystem.writeAsStringAsync(PASSPORT_JSON, JSON.stringify(passport, null, 2), {
    encoding: FileSystem.EncodingType.UTF8
  });

  log("✔ staged attachments + index.json and updated passport.attachments");
}

// ---- step 3: zip staged folder ----
async function makeZip(log: (s: string) => void) {
  const old = await FileSystem.getInfoAsync(ZIP_PATH);
  if (old.exists) await FileSystem.deleteAsync(ZIP_PATH, { idempotent: true });

  await zip(STAGE_DIR, ZIP_PATH);
  const size = await statSize(ZIP_PATH);
  log(`✔ zipped ${STAGE_DIR} → ${ZIP_PATH} (${size} bytes)`);
}

// ---- step 4: upload to S3 (PUT bundle.enc + PUT manifest.json) ----
async function uploadToS3(log: (s: string) => void) {
  if (!S3_PUT_BUNDLE_URL || !S3_PUT_MANIFEST_URL) {
    throw new Error("Set S3_PUT_BUNDLE_URL and S3_PUT_MANIFEST_URL at top of file.");
  }

  // PUT the zip bytes (acting as bundle.enc in the demo)
  const put1 = await FileSystem.uploadAsync(S3_PUT_BUNDLE_URL, ZIP_PATH, {
    httpMethod: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT
  });
  log(`✔ S3 PUT bundle.enc → status ${put1.status}`);

  // PUT tiny manifest.json next to it
  const manifestBody = JSON.stringify({ bundleKey: "bundle.enc", format: "E1" });
  const MANIFEST_TMP = `${CACHE_DIR}manifest-${RUN_ID}.json`;
  await FileSystem.writeAsStringAsync(MANIFEST_TMP, manifestBody, {
    encoding: FileSystem.EncodingType.UTF8
  });

  const put2 = await FileSystem.uploadAsync(S3_PUT_MANIFEST_URL, MANIFEST_TMP, {
    httpMethod: "PUT",
    headers: { "Content-Type": "application/json" },
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT
  });
  log(`✔ S3 PUT manifest.json → status ${put2.status}`);
}

// ---- optional: peek current stage ----
async function peek(log: (s: string) => void) {
  log(`STAGE_DIR: ${STAGE_DIR}`);
  const files = await FileSystem.readDirectoryAsync(STAGE_DIR).catch(() => []);
  log(`files: ${files.join(", ") || "(empty)"}`);

  const info = await FileSystem.getInfoAsync(PASSPORT_JSON);
  if (info.exists) {
    const txt = await FileSystem.readAsStringAsync(PASSPORT_JSON, { encoding: "utf8" });
    log((txt.length > 1200 ? txt.slice(0, 1200) + " …(truncated)" : txt));
  } else {
    log("passport.json not found");
  }
}

export default function HomeTab() {
  const [logs, setLogs] = useState<string[]>([]);
  const log = (s: string) => setLogs((prev) => [s, ...prev].slice(0, 120));

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>Data Transfer (Demo)</Text>

      <View style={{ gap: 10, marginBottom: 12 }}>
        <Button title="1) Stage init" onPress={() => stageInit(log).catch(e => log(String(e)))} />
        <Button title="2) Add attachments" onPress={() => stageAttachments(log).catch(e => log(String(e)))} />
        <Button title="3) Zip staged folder" onPress={() => makeZip(log).catch(e => log(String(e)))} />
        <Button title="4) Upload to S3" onPress={() => uploadToS3(log).catch(e => log(String(e)))} />
        <Button title="Peek stage" onPress={() => peek(log).catch(e => log(String(e)))} />
      </View>

      <Text style={{ fontWeight: "600" }}>Logs</Text>
      <ScrollView style={{ marginTop: 6 }}>
        {logs.map((l, i) => (
          <Text key={i} style={{ fontFamily: "Courier", marginBottom: 4 }}>{l}</Text>
        ))}
      </ScrollView>

      <Text style={{ marginTop: 8, opacity: 0.7 }}>
        Cache: {CACHE_DIR}
      </Text>
    </SafeAreaView>
  );
}
