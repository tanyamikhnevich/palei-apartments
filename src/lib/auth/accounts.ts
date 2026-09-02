/**
 * Admin accounts. The login and password live here, in the database — not in
 * the environment — so the password can be changed from the panel and nothing
 * readable is left lying in a deploy configuration.
 *
 * Node only: this talks to the database.
 */
import { eq, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import type { AdminUserRow } from '@/db/schema';
import { randomId } from './crypto';
import { hashPassword, verifyPassword } from './password';
import { normaliseLogin } from './passwordRules';

/**
 * A PBKDF2 verification that is thrown away. A sign-in for a login that does
 * not exist must cost the same as one for a login that does, or the response
 * time answers "is there an account called this?" for anyone who asks.
 */
const DUMMY_HASH =
  'pbkdf2:210000:AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function countAdmins(): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.adminUsers);
  return row?.count ?? 0;
}

export async function findAdminById(id: string): Promise<AdminUserRow | null> {
  const [row] = await getDb()
    .select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.id, id))
    .limit(1);
  return row ?? null;
}

export async function createAdmin(login: string, password: string): Promise<AdminUserRow> {
  const [row] = await getDb()
    .insert(schema.adminUsers)
    .values({
      id: randomId(),
      login: normaliseLogin(login),
      passwordHash: await hashPassword(password),
    })
    .returning();
  return row;
}

/** The account when the credentials check out, otherwise null. */
export async function authenticate(login: string, password: string): Promise<AdminUserRow | null> {
  const [row] = await getDb()
    .select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.login, normaliseLogin(login)))
    .limit(1);

  if (!row) {
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }

  return (await verifyPassword(password, row.passwordHash)) ? row : null;
}

export async function markSignedIn(id: string): Promise<void> {
  await getDb()
    .update(schema.adminUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(schema.adminUsers.id, id));
}

export async function changePassword(id: string, password: string): Promise<void> {
  await getDb()
    .update(schema.adminUsers)
    .set({ passwordHash: await hashPassword(password), passwordChangedAt: new Date() })
    .where(eq(schema.adminUsers.id, id));
}
