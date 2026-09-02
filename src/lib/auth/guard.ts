import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { ACCESS_COOKIE } from '@/lib/auth/cookies';
import { readAccessToken, type AccessClaims } from '@/lib/auth/tokens';
import { jsonError } from '@/lib/api/errors';

/**
 * The same check the middleware runs, repeated inside the handler.
 *
 * The middleware is the gate; this is the lock on the door behind it. A route
 * that forgets to be listed in the policy, a matcher that stops covering a
 * path, a request that reaches the handler some other way — none of those turn
 * an admin endpoint into a public one.
 */
export async function currentAdmin(): Promise<AccessClaims | null> {
  return readAccessToken(cookies().get(ACCESS_COOKIE)?.value);
}

/** `null` when the caller is signed in, otherwise the 401 to return. */
export async function requireAdmin(): Promise<NextResponse | null> {
  return (await currentAdmin()) ? null : jsonError('Unauthorized', 401);
}

/**
 * For handlers that need to know *who* is asking — the account screen, the
 * password change — rather than merely that someone is.
 */
export async function requireAdminClaims(): Promise<
  { ok: true; claims: AccessClaims } | { ok: false; response: NextResponse }
> {
  const claims = await currentAdmin();
  return claims ? { ok: true, claims } : { ok: false, response: jsonError('Unauthorized', 401) };
}
