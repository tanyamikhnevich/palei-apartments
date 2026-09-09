import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { ACCESS_COOKIE } from '@/lib/auth/cookies';
import { readAccessToken, type AccessClaims } from '@/lib/auth/tokens';
import { jsonError } from '@/lib/api/errors';
import { roleMayReach } from '@/lib/auth/policy';
import type { AdminRole } from '@/lib/auth/roles';

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

/**
 * `null` when the caller is signed in **and** their role reaches this exact
 * request. The lock to the middleware's gate, and the same policy read twice.
 *
 * Handlers pass their own request rather than naming a role, so the answer
 * comes from one table instead of from a judgement repeated in twenty files —
 * and a route that later moves keeps whatever the policy says about its new
 * address.
 */
export async function requireAdminAccess(request: Request): Promise<NextResponse | null> {
  const claims = await currentAdmin();
  if (!claims) return jsonError('Unauthorized', 401);

  const { pathname } = new URL(request.url);
  if (!roleMayReach(claims.rol, pathname, request.method)) {
    return jsonError('Not allowed for this account', 403);
  }
  return null;
}

/** `null` only for the owner. For the handful of routes that say so outright. */
export async function requireRole(role: AdminRole): Promise<NextResponse | null> {
  const claims = await currentAdmin();
  if (!claims) return jsonError('Unauthorized', 401);
  return claims.rol === role ? null : jsonError('Not allowed for this account', 403);
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
