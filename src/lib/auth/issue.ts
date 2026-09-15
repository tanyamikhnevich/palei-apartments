import { NextResponse } from 'next/server';
import {
  accessCookieName,
  accessCookieOptions,
  refreshCookieName,
  refreshCookieOptions,
} from './cookies';
import type { AdminRole } from './roles';
import { createAccessToken } from './tokens';
import type { IssuedSession } from './sessions';

/**
 * Put a freshly minted session into the response. Both cookies are always
 * written together — an access token without its refresh token would strand the
 * browser fifteen minutes later, and the reverse would sign it out at once.
 */
export async function attachSession<T>(
  body: T,
  session: IssuedSession
): Promise<NextResponse> {
  const response = NextResponse.json(body);
  const accessToken = await createAccessToken(session.userId, session.familyId, session.role);

  // Into the pair of the panel the account belongs to — never the other one.
  response.cookies.set(accessCookieName(session.role), accessToken, accessCookieOptions());
  response.cookies.set(refreshCookieName(session.role), session.refreshToken, refreshCookieOptions());
  return response;
}

/** Clear one panel's cookies. Used by sign-out and by every failed refresh. */
export function clearSession(response: NextResponse, panel: AdminRole): NextResponse {
  response.cookies.set(accessCookieName(panel), '', accessCookieOptions(true));
  response.cookies.set(refreshCookieName(panel), '', refreshCookieOptions(true));
  return response;
}
