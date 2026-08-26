import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

config({ path: '.env.local' });
config();

async function run() {
  const url = process.env.FLOWERS_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'FLOWERS_DATABASE_URL (or DATABASE_URL) is missing. Add it to .env.local — see .env.example'
    );
  }

  const target = process.env.FLOWERS_DATABASE_URL ? 'the shop database' : 'the main database';
  console.log(`Applying shop migrations from ./drizzle-flowers to ${target} …`);
  await migrate(drizzle(neon(url)), { migrationsFolder: './drizzle-flowers' });
  console.log('Shop migrations applied.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
