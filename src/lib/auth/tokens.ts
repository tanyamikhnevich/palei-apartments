/**
 * The access token: short-lived, signed, and carrying everything needed to
 * authorise a request.
 *
 * It is deliberately stateless. The middleware runs on every `/admin` and
 * `/api` request, and a database round trip there would tax every page load;
 * instead the token is checked with one HMAC and the database is only touched
 * when it expires and the refresh token is spent.
 *
 * The cost of that choice: a signed-out or password-changed session keeps a
 * usable access token until it expires. That is why the lifetime is minutes,
 * not days — see ACCESS_TOKEN_TTL_MS.
 */
import { constantTimeEqual, fromBase64Url, hkdfKey, hmac, toBase64Url, utf8 } from './crypto';
import { isAdminRole, type AdminRole } from './roles';

/*
  Bumped when the claims changed shape. A v3 token carries no role, and there
  is no safe way to read one — guessing "owner" would hand the whole panel to
  every session open at deploy time. Refusing them signs those browsers out,
  which costs one silent refresh: the token they hold is fifteen minutes old at
  most, and the refresh cookie behind it still works.
*/
const TOKEN_VERSION = 'v4';

export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

export type AccessClaims = {
  /** admin_users.id */
  sub: string;
  /** admin_sessions.family_id — which sign-in this came from. */
  fam: string;
  /**
   * What this session may open. Carried in the token rather than looked up,
   * because the middleware authorises every request and cannot reach the
   * database — the same reason the token is stateless at all.
   *
   * The cost is the same as the rest of the design: a role changed in the
   * database takes effect on the next refresh, within fifteen minutes.
   */
  rol: AdminRole;
  /** Expiry, epoch milliseconds. */
  exp: number;
};

/**
 * `ADMIN_SECRET` is infrastructure, not a credential: it signs tokens, it is
 * not something anyone types. Credentials live in the database.
 */
export class MissingSecretError extends Error {
  constructor() {
    super('ADMIN_SECRET is not set — the server cannot sign admin sessions.');
    this.name = 'MissingSecretError';
  }
}

export function adminSecretConfigured(): boolean {
  return Boolean(process.env.ADMIN_SECRET?.trim());
}

let cachedKey: { secret: string; key: CryptoKey } | null = null;

async function signingKey(): Promise<CryptoKey> {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) throw new MissingSecretError();
  if (cachedKey?.secret === secret) return cachedKey.key;

  const key = await hkdfKey(secret, 'access-token');
  cachedKey = { secret, key };
  return key;
}

export async function createAccessToken(
  sub: string,
  fam: string,
  rol: AdminRole
): Promise<string> {
  const claims: AccessClaims = { sub, fam, rol, exp: Date.now() + ACCESS_TOKEN_TTL_MS };
  const payload = toBase64Url(utf8(JSON.stringify(claims)));
  const body = `${TOKEN_VERSION}.${payload}`;
  return `${body}.${await hmac(body, await signingKey())}`;
}

/** The claims when the token is intact and unexpired, otherwise null. */
export async function readAccessToken(token: string | undefined): Promise<AccessClaims | null> {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [version, payload, signature] = parts;
  if (version !== TOKEN_VERSION) return null;

  let key: CryptoKey;
  try {
    key = await signingKey();
  } catch {
    return null;
  }

  const expected = await hmac(`${version}.${payload}`, key);
  if (!constantTimeEqual(utf8(signature), utf8(expected))) return null;

  // Only now, with the signature confirmed, is the payload worth parsing.
  const raw = fromBase64Url(payload);
  if (!raw) return null;

  let claims: AccessClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(raw)) as AccessClaims;
  } catch {
    return null;
  }

  if (typeof claims.sub !== 'string' || typeof claims.fam !== 'string') return null;
  /* An unreadable role is not a role, and never falls back to the wider one. */
  if (!isAdminRole(claims.rol)) return null;
  if (typeof claims.exp !== 'number' || claims.exp <= Date.now()) return null;

  return claims;
}
