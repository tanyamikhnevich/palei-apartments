import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { REFRESH_COOKIE } from '@/lib/auth/cookies';
import { attachSession, clearSession } from '@/lib/auth/issue';
import { rotateSession } from '@/lib/auth/sessions';
import { isDbConfigured } from '@/lib/api/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Spend the refresh token for a new pair.
 *
 * This is the only endpoint that touches the session table on a normal request,
 * and the client only reaches it when an access token has run out — roughly
 * once every fifteen minutes per open tab.
 *
 * Every failure clears both cookies. A browser holding a token this endpoint
 * will not honour is signed out, and should be told so rather than left
 * retrying with something dead.
 */
export async function POST() {
  if (!isDbConfigured()) {
    return clearSession(NextResponse.json({ error: 'Database not configured' }, { status: 503 }));
  }

  const token = cookies().get(REFRESH_COOKIE)?.value;
  if (!token) {
    return clearSession(NextResponse.json({ error: 'No session' }, { status: 401 }));
  }

  try {
    const outcome = await rotateSession(token);

    if (!outcome.ok) {
      if (outcome.reason === 'reused') {
        // The same token arrived twice. Everything from that sign-in is now
        // revoked; whoever is legitimate signs in again.
        console.warn('Admin refresh token reused — session family revoked.');
        return clearSession(
          NextResponse.json(
            { error: 'Session ended for safety. Please sign in again.', code: 'reused' },
            { status: 401 }
          )
        );
      }
      return clearSession(
        NextResponse.json({ error: 'Session expired', code: outcome.reason }, { status: 401 })
      );
    }

    return attachSession({ ok: true }, outcome.session);
  } catch (e) {
    console.error('POST /api/admin/session/refresh', e);
    return NextResponse.json({ error: 'Could not refresh the session' }, { status: 500 });
  }
}
