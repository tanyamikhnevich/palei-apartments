import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

config({ path: '.env.local' });
config();

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is missing. Add your Neon URL to .env.local');
  }

  const sql = neon(url);
  const db = drizzle(sql);

  console.log('Applying migrations from ./drizzle …');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations applied.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
