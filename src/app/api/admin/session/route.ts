import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { authenticate, countAdmins, markSignedIn, roleOf } from '@/lib/auth/accounts';
import { attachSession, clearSession } from '@/lib/auth/issue';
import { refreshCookieName } from '@/lib/auth/cookies';
import { PANEL_HEADER } from '@/lib/auth/panel';
import { revokeByToken, sessionLabel, startSession } from '@/lib/auth/sessions';
import { adminSecretConfigured } from '@/lib/auth/tokens';
import { isDbConfigured } from '@/lib/api/errors';
import { throttle } from '@/lib/auth/throttle';
import { isAdminRole, ROLE_HOME, type AdminRole } from '@/lib/auth/roles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Sign in: credentials in, an access token and a refresh token out. */
export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured — admin accounts live in the database.' },
      { status: 503 }
    );
  }
  if (!adminSecretConfigured()) {
    return NextResponse.json(
      { error: 'ADMIN_SECRET is not set on the server.' },
      { status: 503 }
    );
  }

  const gate = throttle.check(request);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSeconds) } }
    );
  }

  let login = '';
  let password = '';
  /* Which door the form was on. Missing means the owner's — never "any". */
  let panel: AdminRole = 'owner';
  try {
    const body = (await request.json()) as { login?: unknown; password?: unknown; panel?: unknown };
    login = typeof body.login === 'string' ? body.login : '';
    password = typeof body.password === 'string' ? body.password : '';
    if (isAdminRole(body.panel)) panel = body.panel;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    if (!login || !password) {
      throttle.fail(request);
      return NextResponse.json({ error: 'Wrong login or password' }, { status: 401 });
    }

    if ((await countAdmins()) === 0) {
      return NextResponse.json(
        {
          error: 'No admin account exists yet. Create one with: npm run admin:create',
          code: 'no_account',
        },
        { status: 503 }
      );
    }

    const user = await authenticate(login, password);
    if (!user) {
      throttle.fail(request);
      // One message for both fields: never confirm that a login exists.
      return NextResponse.json({ error: 'Wrong login or password' }, { status: 401 });
    }

    const role = roleOf(user);

    /*
      Each panel has its own account. The right password at the wrong door does
      not start a session — otherwise the shop's sign-in would be a second way
      into the apartments, and the other way round.
    */
    if (role !== panel) {
      throttle.fail(request);
      return NextResponse.json({ error: 'Wrong login or password' }, { status: 401 });
    }

    throttle.succeed(request);

    // Signing in replaces this panel's previous session in this browser — end
    // that one properly. The other panel's session is left alone.
    const previous = cookies().get(refreshCookieName(panel))?.value;
    if (previous) await revokeByToken(previous).catch(() => undefined);

    const session = await startSession(
      user.id,
      sessionLabel(request.headers.get('user-agent')),
      role
    );
    await markSignedIn(user.id);

    /*
      `home` is what the sign-in screen redirects to. It is decided here rather
      than in the browser because the role is not something the browser should
      be told to work out for itself — and because a florist who lands on the
      owner's dashboard only to be bounced back has been shown a door that was
      never open to them.
    */
    return attachSession({ ok: true, login: user.login, role, home: ROLE_HOME[role] }, session);
  } catch (e) {
    console.error('POST /api/admin/session', e);
    return NextResponse.json({ error: 'Could not sign in' }, { status: 500 });
  }
}

/** Sign out of one panel in this browser. Other panels and devices stay signed in. */
export async function DELETE() {
  const panel = headers().get(PANEL_HEADER) === 'florist' ? 'florist' : 'owner';
  const token = cookies().get(refreshCookieName(panel))?.value;

  if (token && isDbConfigured()) {
    try {
      await revokeByToken(token);
    } catch (e) {
      // The cookies still go, so the browser is signed out either way.
      console.error('DELETE /api/admin/session', e);
    }
  }

  return clearSession(NextResponse.json({ ok: true }), panel);
}
