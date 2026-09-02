import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authenticate, countAdmins, markSignedIn } from '@/lib/auth/accounts';
import { attachSession, clearSession } from '@/lib/auth/issue';
import { REFRESH_COOKIE } from '@/lib/auth/cookies';
import { revokeByToken, sessionLabel, startSession } from '@/lib/auth/sessions';
import { adminSecretConfigured } from '@/lib/auth/tokens';
import { isDbConfigured } from '@/lib/api/errors';
import { throttle } from '@/lib/auth/throttle';

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
  try {
    const body = (await request.json()) as { login?: unknown; password?: unknown };
    login = typeof body.login === 'string' ? body.login : '';
    password = typeof body.password === 'string' ? body.password : '';
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

    throttle.succeed(request);

    const session = await startSession(
      user.id,
      sessionLabel(request.headers.get('user-agent'))
    );
    await markSignedIn(user.id);

    return attachSession({ ok: true, login: user.login }, session);
  } catch (e) {
    console.error('POST /api/admin/session', e);
    return NextResponse.json({ error: 'Could not sign in' }, { status: 500 });
  }
}

/** Sign out this browser. The other devices keep their sessions. */
export async function DELETE() {
  const token = cookies().get(REFRESH_COOKIE)?.value;

  if (token && isDbConfigured()) {
    try {
      await revokeByToken(token);
    } catch (e) {
      // The cookies still go, so the browser is signed out either way.
      console.error('DELETE /api/admin/session', e);
    }
  }

  return clearSession(NextResponse.json({ ok: true }));
}
