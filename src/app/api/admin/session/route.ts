import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  SESSION_DAYS,
  adminAuthConfigured,
  createAdminToken,
  credentialsValid,
} from '@/lib/auth/adminAuth';

/** Sign in: swaps credentials for a signed, http-only cookie. */
export async function POST(request: Request) {
  if (!adminAuthConfigured()) {
    return NextResponse.json(
      { error: 'Admin credentials are not configured on the server.' },
      { status: 503 }
    );
  }

  let login = '';
  let password = '';
  try {
    const body = (await request.json()) as { login?: string; password?: string };
    login = body.login ?? '';
    password = body.password ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!credentialsValid(login, password)) {
    return NextResponse.json({ error: 'Wrong login or password' }, { status: 401 });
  }

  const token = await createAdminToken();
  if (!token) {
    return NextResponse.json({ error: 'Cannot start a session' }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return response;
}

/** Sign out. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
