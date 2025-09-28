function getSubtle(): SubtleCrypto {
  if (
    typeof globalThis !== "undefined" &&
    (globalThis as any).crypto &&
    (globalThis as any).crypto.subtle
  ) {
    return (globalThis as any).crypto.subtle as SubtleCrypto;
  }
  throw new Error("Subtle is not available in this runtime");
}

function nodeBuffer(): any | null {
  return (globalThis as any).Buffer ?? null;
}

export function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const _Buffer = nodeBuffer();
  if (_Buffer) {
    return _Buffer.from(buf).toString("base64");
  }

  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

export function base64ToBuf(b64: string): ArrayBuffer {
  const _Buffer = nodeBuffer();
  if (_Buffer) {
    const buf = _Buffer.from(b64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateAesKey(): Promise<CryptoKey> {
  const subtle = getSubtle();
  return subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const subtle = getSubtle();
  const raw = await subtle.exportKey("raw", key); // ArrayBuffer
  return bufToBase64(raw);
}

export async function importKey(b64: string): Promise<CryptoKey> {
  if (!b64) throw new Error("Empty base64 key provided to importKey");
  const subtle = getSubtle();
  const raw = base64ToBuf(b64);
  return subtle.importKey("raw", raw, { name: "AES-GCM" }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encrypt(key: CryptoKey, text: string) {
  const subtle = getSubtle();

  const iv = (globalThis as any).crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return {
    iv: bufToBase64(iv.buffer),
    ciphertext: bufToBase64(ciphertext),
  };
}

export async function decrypt(
  key: CryptoKey,
  ciphertextB64: string,
  ivB64: string
): Promise<string> {
  const subtle = getSubtle();
  const ciphertext = base64ToBuf(ciphertextB64);
  const iv = new Uint8Array(base64ToBuf(ivB64));
  const plainBuf = await subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plainBuf);
}
