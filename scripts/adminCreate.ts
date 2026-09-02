/**
 * Create the admin account, or reset its password.
 *
 *   npm run admin:create -- 'login' 'password'
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

async function main() {
  const [login, password] = process.argv.slice(2);

  if (!login || !password) {
    console.error("Usage: npm run admin:create -- 'login' 'password'");
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
      .set({ passwordHash: await hashPassword(password), passwordChangedAt: new Date() })
      .where(eq(schema.adminUsers.id, existing.id));

    // A password reset from the command line is usually a lockout or a scare;
    // either way the sessions that are already open should not survive it.
    await revokeAllForUser(existing.id);
    console.log(`Password updated for "${normalised}". All open sessions were signed out.`);
    return;
  }

  await createAdmin(normalised, password);
  console.log(`Admin "${normalised}" created. Sign in at /admin.`);

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
