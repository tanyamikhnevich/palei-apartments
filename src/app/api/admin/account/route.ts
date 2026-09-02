import { NextResponse } from 'next/server';
import { findAdminById } from '@/lib/auth/accounts';
import { requireAdminClaims } from '@/lib/auth/guard';
import { listActiveSessions, purgeExpiredSessions, revokeAllForUser } from '@/lib/auth/sessions';
import { isDbConfigured, jsonError } from '@/lib/api/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Who is signed in, and from where. */
export async function GET() {
  const auth = await requireAdminClaims();
  if (!auth.ok) return auth.response;
  if (!isDbConfigured()) return jsonError('Database not configured', 503);

  try {
    const user = await findAdminById(auth.claims.sub);
    if (!user) return jsonError('Account no longer exists', 401);

    // Cheap housekeeping on a page nobody opens often.
    await purgeExpiredSessions();

    return NextResponse.json({
      login: user.login,
      passwordChangedAt: user.passwordChangedAt.toISOString(),
      sessions: await listActiveSessions(user.id, auth.claims.fam),
    });
  } catch (e) {
    console.error('GET /api/admin/account', e);
    return jsonError('Could not load the account', 500);
  }
}

/** Sign out every other browser, keeping this one. */
export async function DELETE() {
  const auth = await requireAdminClaims();
  if (!auth.ok) return auth.response;
  if (!isDbConfigured()) return jsonError('Database not configured', 503);

  try {
    await revokeAllForUser(auth.claims.sub, auth.claims.fam);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/admin/account', e);
    return jsonError('Could not sign the other devices out', 500);
  }
}
