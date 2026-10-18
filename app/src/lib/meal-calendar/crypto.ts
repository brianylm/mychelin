const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeKey(value: string): Uint8Array {
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return Uint8Array.from(value.match(/.{2}/g)!, (pair) => Number.parseInt(pair, 16));
  }
  const decoded = base64UrlToBytes(value);
  if (decoded.byteLength !== 32) {
    throw new Error("MEAL_CALENDAR_ENCRYPTION_KEY must encode exactly 32 bytes");
  }
  return decoded;
}

async function importKey(value: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", toArrayBuffer(decodeKey(value)), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export interface EncryptedValue {
  ciphertext: string;
  iv: string;
}

export async function encryptCalendarSecret(
  plaintext: string,
  keyValue: string,
  context: string
): Promise<EncryptedValue> {
  if (!plaintext) throw new Error("Cannot encrypt an empty calendar secret");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(encoder.encode(context)),
    },
    await importKey(keyValue),
    toArrayBuffer(encoder.encode(plaintext))
  );
  return {
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
    iv: bytesToBase64Url(iv),
  };
}

export async function decryptCalendarSecret(
  encrypted: EncryptedValue,
  keyValue: string,
  context: string
): Promise<string> {
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(base64UrlToBytes(encrypted.iv)),
        additionalData: toArrayBuffer(encoder.encode(context)),
      },
      await importKey(keyValue),
      toArrayBuffer(base64UrlToBytes(encrypted.ciphertext))
    );
    return decoder.decode(plaintext);
  } catch {
    throw new Error("Stored calendar credential could not be decrypted");
  }
}

export async function hashCalendarToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    toArrayBuffer(encoder.encode(token))
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

export function secureEqual(left: string, right: string): boolean {
  const size = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < size; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export function randomOpaqueToken(byteLength = 24): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}
