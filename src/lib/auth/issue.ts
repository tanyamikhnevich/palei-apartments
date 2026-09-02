import { NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from './cookies';
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
  const accessToken = await createAccessToken(session.userId, session.familyId);

  response.cookies.set(ACCESS_COOKIE, accessToken, accessCookieOptions());
  response.cookies.set(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions());
  return response;
}

/** Clear both cookies. Used by sign-out and by every failed refresh. */
export function clearSession(response: NextResponse): NextResponse {
  response.cookies.set(ACCESS_COOKIE, '', accessCookieOptions(true));
  response.cookies.set(REFRESH_COOKIE, '', refreshCookieOptions(true));
  return response;
}
