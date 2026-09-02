import { NextResponse } from 'next/server';
import { authenticate, changePassword, findAdminById } from '@/lib/auth/accounts';
import { requireAdminClaims } from '@/lib/auth/guard';
import { revokeAllForUser } from '@/lib/auth/sessions';
import { checkPasswordStrength, passwordProblemMessage } from '@/lib/auth/passwordRules';
import { passwordChangeThrottle } from '@/lib/auth/throttle';
import { isDbConfigured, jsonError } from '@/lib/api/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Change the password.
 *
 * The current password is required even though the caller is already signed in:
 * it is what stops a borrowed open laptop from becoming a permanent takeover.
 * Every other browser is signed out afterwards, because a password change is
 * usually a reaction to suspecting one of them.
 */
export async function POST(request: Request) {
  const auth = await requireAdminClaims();
  if (!auth.ok) return auth.response;
  if (!isDbConfigured()) return jsonError('Database not configured', 503);

  const gate = passwordChangeThrottle.check(request);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSeconds) } }
    );
  }

  let currentPassword = '';
  let newPassword = '';
  try {
    const body = (await request.json()) as { currentPassword?: unknown; newPassword?: unknown };
    currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  } catch {
    return jsonError('Invalid request');
  }

  try {
    const user = await findAdminById(auth.claims.sub);
    if (!user) return jsonError('Account no longer exists', 401);

    if (!(await authenticate(user.login, currentPassword))) {
      passwordChangeThrottle.fail(request);
      return jsonError('Current password is wrong', 401);
    }

    const problem = checkPasswordStrength(newPassword);
    if (problem) return jsonError(passwordProblemMessage(problem));

    if (newPassword === currentPassword) {
      return jsonError('The new password is the same as the old one');
    }

    await changePassword(user.id, newPassword);
    passwordChangeThrottle.succeed(request);

    // This browser keeps its session; every other one is retired.
    await revokeAllForUser(user.id, auth.claims.fam);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/admin/account/password', e);
    return jsonError('Could not change the password', 500);
  }
}
