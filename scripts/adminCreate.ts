/**
 * Create an admin account, or reset its password.
 *
 *   npm run admin:create -- 'login' 'password'            → owner
 *   npm run admin:create -- 'login' 'password' florist    → the shop only
 *
 * The role decides which panel the account opens: an owner gets the whole
 * dashboard, a florist gets the shop and nothing else. It defaults to owner
 * because that is what every account was before roles existed, and a default
 * that quietly narrowed them would lock people out on the next password reset.
 *
 * The password is hashed here and only the hash reaches the database. Nothing
 * about the account is written to .env — that is the point of this script.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { createAdmin } from '@/lib/auth/accounts';
import { hashPassword } from '@/lib/auth/password';
import {
  checkPasswordStrength,
  loginIsWellFormed,
  normaliseLogin,
  passwordProblemMessage,
} from '@/lib/auth/passwordRules';
import { revokeAllForUser } from '@/lib/auth/sessions';
import { ADMIN_ROLES, isAdminRole } from '@/lib/auth/roles';

async function main() {
  const [login, password, role = 'owner'] = process.argv.slice(2);

  if (!login || !password) {
    console.error("Usage: npm run admin:create -- 'login' 'password' [owner|florist]");
    process.exit(1);
  }
  if (!isAdminRole(role)) {
    console.error(`Unknown role "${role}". Use one of: ${ADMIN_ROLES.join(', ')}`);
    process.exit(1);
  }
  if (!loginIsWellFormed(login)) {
    console.error('The login needs to be between 3 and 64 characters.');
    process.exit(1);
  }

  const problem = checkPasswordStrength(password);
  if (problem) {
    console.error(passwordProblemMessage(problem));
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing. Add your Neon connection string to .env.local');
    process.exit(1);
  }

  const db = getDb();
  const normalised = normaliseLogin(login);
  const [existing] = await db
    .select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.login, normalised))
    .limit(1);

  if (existing) {
    await db
      .update(schema.adminUsers)
      .set({
        passwordHash: await hashPassword(password),
        passwordChangedAt: new Date(),
        role,
      })
      .where(eq(schema.adminUsers.id, existing.id));

    // A password reset from the command line is usually a lockout or a scare;
    // either way the sessions that are already open should not survive it.
    await revokeAllForUser(existing.id);
    console.log(
      `Password updated for "${normalised}" (role: ${role}). All open sessions were signed out.`
    );
    return;
  }

  await createAdmin(normalised, password, role);
  const where = role === 'florist' ? '/admin/flowers' : '/admin';
  console.log(`Account "${normalised}" created as ${role}. Sign in at ${where}.`);

  if (!process.env.ADMIN_SECRET) {
    console.warn('\nADMIN_SECRET is not set — sign-in will fail until it is.');
    console.warn('Add a long random string to .env.local, for example:');
    console.warn(`ADMIN_SECRET=${require('crypto').randomBytes(32).toString('base64url')}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
