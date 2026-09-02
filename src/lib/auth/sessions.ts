/**
 * Refresh sessions — the stateful half of the login.
 *
 * One row per signed-in browser. The row holds the SHA-256 of the refresh
 * token, never the token, so a dump of this table gets nobody in. Spending a
 * token rotates it: the old row is marked as replaced and a fresh token goes
 * back in the cookie.
 *
 * Rotation is what makes a stolen cookie detectable. Whoever uses the token
 * second gets rejected, and the reuse retires the entire family — the thief and
 * the owner are both signed out, which is the right outcome when we cannot tell
 * which is which.
 *
 * Node only: this talks to the database.
 */
import { and, desc, eq, isNull, lt, ne } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { digestToken, randomId, randomToken } from './crypto';
import { REFRESH_TOKEN_TTL_MS } from './cookies';

/**
 * Two tabs whose access tokens expire together both try to refresh. The loser
 * presents a token that was rotated a moment ago — that is a race, not a theft,
 * so a just-replaced token is forgiven for this long and answered with the
 * replacement instead of retiring the family.
 */
const ROTATION_GRACE_MS = 60 * 1000;

export type IssuedSession = {
  refreshToken: string;
  sessionId: string;
  familyId: string;
  userId: string;
};

export type RefreshOutcome =
  | { ok: true; session: IssuedSession }
  | { ok: false; reason: 'unknown' | 'expired' | 'revoked' | 'reused' };

/** Browser and platform for the sessions list — nothing identifying. */
export function sessionLabel(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';

  const browser =
    /Edg\//.test(userAgent) ? 'Edge'
    : /OPR\//.test(userAgent) ? 'Opera'
    : /Firefox\//.test(userAgent) ? 'Firefox'
    : /Chrome\//.test(userAgent) ? 'Chrome'
    : /Safari\//.test(userAgent) ? 'Safari'
    : 'Browser';

  const platform =
    /iPhone|iPad/.test(userAgent) ? 'iOS'
    : /Android/.test(userAgent) ? 'Android'
    : /Mac OS X/.test(userAgent) ? 'macOS'
    : /Windows/.test(userAgent) ? 'Windows'
    : /Linux/.test(userAgent) ? 'Linux'
    : 'Unknown';

  return `${browser} · ${platform}`;
}

async function insertSession(params: {
  userId: string;
  familyId: string;
  label: string | null;
}): Promise<IssuedSession> {
  const refreshToken = randomToken(32);
  const id = randomId();

  await getDb()
    .insert(schema.adminSessions)
    .values({
      id,
      userId: params.userId,
      tokenHash: await digestToken(refreshToken),
      familyId: params.familyId,
      label: params.label,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

  return { refreshToken, sessionId: id, familyId: params.familyId, userId: params.userId };
}

/** A fresh sign-in: a new family, unrelated to anything already open. */
export async function startSession(userId: string, label: string | null): Promise<IssuedSession> {
  return insertSession({ userId, familyId: randomId(), label });
}

/** Spend a refresh token and hand back its replacement. */
export async function rotateSession(refreshToken: string): Promise<RefreshOutcome> {
  const db = getDb();
  const tokenHash = await digestToken(refreshToken);

  const [row] = await db
    .select()
    .from(schema.adminSessions)
    .where(eq(schema.adminSessions.tokenHash, tokenHash))
    .limit(1);

  if (!row) return { ok: false, reason: 'unknown' };
  if (row.revokedAt) return { ok: false, reason: 'revoked' };
  if (row.expiresAt.getTime() <= Date.now()) return { ok: false, reason: 'expired' };

  if (row.replacedBy) {
    // Already spent. Within the grace window this is two tabs racing; after it,
    // the only explanation left is that someone kept a copy.
    const spentAt = row.lastUsedAt.getTime();
    if (Date.now() - spentAt > ROTATION_GRACE_MS) {
      await revokeFamily(row.familyId);
      return { ok: false, reason: 'reused' };
    }

    const [replacement] = await db
      .select()
      .from(schema.adminSessions)
      .where(eq(schema.adminSessions.id, row.replacedBy))
      .limit(1);

    // The replacement's token is not recoverable from its hash, so the racing
    // tab gets a sibling of its own rather than a copy of the winner's.
    if (replacement && !replacement.revokedAt) {
      return {
        ok: true,
        session: await insertSession({
          userId: row.userId,
          familyId: row.familyId,
          label: row.label,
        }),
      };
    }
    return { ok: false, reason: 'revoked' };
  }

  const next = await insertSession({
    userId: row.userId,
    familyId: row.familyId,
    label: row.label,
  });

  await db
    .update(schema.adminSessions)
    .set({ replacedBy: next.sessionId, lastUsedAt: new Date() })
    .where(eq(schema.adminSessions.id, row.id));

  return { ok: true, session: next };
}

/** Sign out one browser. */
export async function revokeByToken(refreshToken: string): Promise<void> {
  await getDb()
    .update(schema.adminSessions)
    .set({ revokedAt: new Date() })
    .where(eq(schema.adminSessions.tokenHash, await digestToken(refreshToken)));
}

export async function revokeFamily(familyId: string): Promise<void> {
  await getDb()
    .update(schema.adminSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(schema.adminSessions.familyId, familyId), isNull(schema.adminSessions.revokedAt))
    );
}

/** Sign out everywhere. Used by "log out all devices" and by password changes. */
export async function revokeAllForUser(userId: string, exceptFamilyId?: string): Promise<void> {
  const conditions = [
    eq(schema.adminSessions.userId, userId),
    isNull(schema.adminSessions.revokedAt),
  ];
  if (exceptFamilyId) conditions.push(ne(schema.adminSessions.familyId, exceptFamilyId));

  await getDb()
    .update(schema.adminSessions)
    .set({ revokedAt: new Date() })
    .where(and(...conditions));
}

export type ActiveSession = {
  familyId: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
};

/**
 * The signed-in browsers, one entry per family rather than per rotation —
 * a list that grew a row every fifteen minutes would be unreadable.
 */
export async function listActiveSessions(
  userId: string,
  currentFamilyId: string
): Promise<ActiveSession[]> {
  const rows = await getDb()
    .select()
    .from(schema.adminSessions)
    .where(and(eq(schema.adminSessions.userId, userId), isNull(schema.adminSessions.revokedAt)))
    .orderBy(desc(schema.adminSessions.lastUsedAt));

  const byFamily = new Map<string, ActiveSession>();
  for (const row of rows) {
    if (row.expiresAt.getTime() <= Date.now()) continue;

    const seen = byFamily.get(row.familyId);
    if (seen) {
      // Keep the family's earliest start and its latest use.
      if (row.createdAt.toISOString() < seen.createdAt) seen.createdAt = row.createdAt.toISOString();
      if (row.lastUsedAt.toISOString() > seen.lastUsedAt) {
        seen.lastUsedAt = row.lastUsedAt.toISOString();
      }
      continue;
    }

    byFamily.set(row.familyId, {
      familyId: row.familyId,
      label: row.label,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt.toISOString(),
      current: row.familyId === currentFamilyId,
    });
  }

  return [...byFamily.values()].sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : -1));
}

/**
 * Rows stay behind after they are spent so that reuse stays detectable, which
 * means something has to clear them out eventually. Expired rows can no longer
 * prove anything, so they go.
 */
export async function purgeExpiredSessions(): Promise<void> {
  await getDb()
    .delete(schema.adminSessions)
    .where(lt(schema.adminSessions.expiresAt, new Date()));
}
