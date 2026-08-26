import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

config({ path: '.env.local' });
config();

async function run() {
  const url = process.env.CARS_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'CARS_DATABASE_URL (or DATABASE_URL) is missing. Add it to .env.local — see .env.example'
    );
  }

  const target = process.env.CARS_DATABASE_URL ? 'the fleet database' : 'the main database';
  console.log(`Applying fleet migrations from ./drizzle-cars to ${target} …`);
  await migrate(drizzle(neon(url)), { migrationsFolder: './drizzle-cars' });
  console.log('Fleet migrations applied.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
