// Edge-compatible helpers for secure random tokens and hashing.
// Uses Web Crypto (crypto.getRandomValues + crypto.subtle), not Node's
// `crypto` module, so this works on both Edge and Node runtimes.

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa exists on both Edge and Node runtimes.
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generates a cryptographically secure random token.
 * Returns a ~43-character base64url string (32 bytes of entropy).
 */
export function generateResetToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64urlEncode(bytes);
}

/**
 * SHA-256 hashes a token so we can store the hash (not the raw token) in the DB.
 * Token is sent to the user once via email and never stored server-side in plain form.
 */
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64urlEncode(new Uint8Array(hash));
}
