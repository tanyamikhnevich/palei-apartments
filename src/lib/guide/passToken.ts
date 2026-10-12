import { constantTimeEqual, fromBase64Url, hkdfKey, randomId, toBase64Url, utf8 } from '@/lib/auth/crypto';

/**
 * The secret half of a guest's link.
 *
 * A link is `<pass id><signature>`, where the signature is an HMAC of the id.
 * Nothing secret is stored: the database holds only the id, and the signature
 * is recomputed on the way in. So a copy of the `guest_passes` table opens no
 * guide, a made-up link is refused before the database is asked anything, and
 * the owner can be shown the same link again whenever they want to re-send it.
 *
 * `GUEST_PASS_SECRET` when set, `ADMIN_SECRET` otherwise. Changing whichever
 * is in use cancels every link handed out so far.
 */
const ID_LENGTH = 16;
const SIGNATURE_BYTES = 16;
/** 16 bytes in unpadded base64url. */
const SIGNATURE_LENGTH = 22;

export const STAY_PATH_PREFIX = '/stay/';

let cachedKey: { secret: string; key: CryptoKey } | null = null;

function passSecret(): string | null {
  return process.env.GUEST_PASS_SECRET?.trim() || process.env.ADMIN_SECRET?.trim() || null;
}

export function guestPassesConfigured(): boolean {
  return passSecret() !== null;
}

async function signingKey(): Promise<CryptoKey | null> {
  const secret = passSecret();
  if (!secret) return null;
  if (cachedKey?.secret === secret) return cachedKey.key;

  const key = await hkdfKey(secret, 'guest-pass');
  cachedKey = { secret, key };
  return key;
}

async function signature(id: string, key: CryptoKey): Promise<Uint8Array> {
  const full = new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(`guest-pass:${id}`)));
  return full.slice(0, SIGNATURE_BYTES);
}

/** A fresh pass id — 12 random bytes, which is exactly `ID_LENGTH` characters. */
export function newPassId(): string {
  return randomId();
}

/** The token for a pass, or null when the server has no secret to sign with. */
export async function tokenForPass(id: string): Promise<string | null> {
  const key = await signingKey();
  if (!key) return null;
  return `${id}${toBase64Url(await signature(id, key))}`;
}

export async function pathForPass(id: string): Promise<string> {
  const token = await tokenForPass(id);
  return token ? `${STAY_PATH_PREFIX}${token}` : '';
}

/** The pass id a token belongs to — null for anything we did not issue. */
export async function passIdFromToken(token: string): Promise<string | null> {
  if (token.length !== ID_LENGTH + SIGNATURE_LENGTH) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return null;

  const key = await signingKey();
  if (!key) return null;

  const id = token.slice(0, ID_LENGTH);
  const given = fromBase64Url(token.slice(ID_LENGTH));
  if (!given) return null;

  return constantTimeEqual(given, await signature(id, key)) ? id : null;
}
