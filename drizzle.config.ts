import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Next.js uses .env.local; drizzle-kit only loads .env by default
config({ path: '.env.local' });
config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is missing. Add your Neon connection string to .env.local (see .env.example).'
  );
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
