/**
 * The primitives the rest of the auth code is built from.
 *
 * Web Crypto only, so every one of these works unchanged in the Edge
 * middleware, in a Node route handler and in a `tsx` script.
 */
const encoder = new TextEncoder();

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(value: string): Uint8Array | null {
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Return type is inferred on purpose: `TextEncoder` hands back a view backed
 *  by a plain ArrayBuffer, which is what Web Crypto's BufferSource requires. */
export function utf8(value: string) {
  return encoder.encode(value);
}

/** Compare two byte strings without letting the timing say where they differ. */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(value)));
}

/** The stored form of a bearer token: we keep the digest, never the token. */
export async function digestToken(token: string): Promise<string> {
  return toBase64Url(await sha256(token));
}

export function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** A short opaque id for a database row. */
export function randomId(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(12)));
}

/**
 * Slow on purpose — this one guards a human-chosen password, so the cost is
 * the whole point.
 */
export async function pbkdf2(
  password: string,
  salt: string,
  iterations: number
): Promise<ArrayBuffer> {
  const base = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: utf8(salt), iterations, hash: 'SHA-256' },
    base,
    256
  );
}

/**
 * Fast on purpose — the input here is already a high-entropy secret, so
 * stretching it would only add latency to every request that verifies a token.
 */
export async function hkdfKey(secret: string, info: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', utf8(secret), 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: utf8('palei-admin'), info: utf8(info) },
    base,
    256
  );
  return crypto.subtle.importKey('raw', bits, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

export async function hmac(payload: string, key: CryptoKey): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(payload))));
}
