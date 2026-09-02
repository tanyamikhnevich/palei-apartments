import { constantTimeEqual, fromBase64Url, pbkdf2, randomToken, toBase64Url } from './crypto';

/**
 * How a password is stored: `pbkdf2:<iterations>:<salt>:<hash>`, salt and hash
 * base64url. The rules a password must satisfy live in ./passwordRules.
 */
export const PBKDF2_ITERATIONS = 210_000;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomToken(16);
  const digest = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${salt}:${toBase64Url(new Uint8Array(digest))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, digest] = stored.split(':');
  if (scheme !== 'pbkdf2' || !iterations || !salt || !digest) return false;

  const rounds = Number(iterations);
  if (!Number.isInteger(rounds) || rounds < 1000) return false;

  const expected = fromBase64Url(digest);
  if (!expected) return false;

  return constantTimeEqual(new Uint8Array(await pbkdf2(password, salt, rounds)), expected);
}
