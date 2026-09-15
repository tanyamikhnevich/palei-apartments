import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { refreshCookieName } from '@/lib/auth/cookies';
import { PANEL_HEADER } from '@/lib/auth/panel';
import { attachSession, clearSession } from '@/lib/auth/issue';
import { rotateSession } from '@/lib/auth/sessions';
import { isDbConfigured } from '@/lib/api/errors';
import { ROLE_HOME } from '@/lib/auth/roles';

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
  // Each panel renews its own session; the browser says which one this is.
  const panel = headers().get(PANEL_HEADER) === 'florist' ? 'florist' : 'owner';

  if (!isDbConfigured()) {
    return clearSession(
      NextResponse.json({ error: 'Database not configured' }, { status: 503 }),
      panel
    );
  }

  const token = cookies().get(refreshCookieName(panel))?.value;
  if (!token) {
    return clearSession(NextResponse.json({ error: 'No session' }, { status: 401 }), panel);
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
          ),
          panel
        );
      }
      return clearSession(
        NextResponse.json({ error: 'Session expired', code: outcome.reason }, { status: 401 }),
        panel
      );
    }

    /* The role is re-read from the account during rotation, so this is also
       where a session finds out its home has changed under it. */
    const { role } = outcome.session;
    // A session whose account has since moved to the other panel does not
    // renew into this one's cookies.
    if (role !== panel) {
      return clearSession(NextResponse.json({ error: 'Session expired' }, { status: 401 }), panel);
    }
    return attachSession({ ok: true, role, home: ROLE_HOME[role] }, outcome.session);
  } catch (e) {
    console.error('POST /api/admin/session/refresh', e);
    return NextResponse.json({ error: 'Could not refresh the session' }, { status: 500 });
  }
}
