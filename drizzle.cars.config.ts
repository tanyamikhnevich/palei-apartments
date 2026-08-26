import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Next.js uses .env.local; drizzle-kit only loads .env by default
config({ path: '.env.local' });
config();

/*
  The fleet's own migration set, kept in ./drizzle-cars so it never interleaves
  with the apartments' history. A URL is only needed to push or open studio —
  `generate` writes SQL from the schema alone.
*/
const databaseUrl = process.env.CARS_DATABASE_URL || process.env.DATABASE_URL || '';

export default defineConfig({
  schema: './src/db/cars/schema.ts',
  out: './drizzle-cars',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
});
