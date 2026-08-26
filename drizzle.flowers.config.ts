import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });
config();

/* The shop's own migration set, kept apart from apartments and the fleet. */
const databaseUrl = process.env.FLOWERS_DATABASE_URL || process.env.DATABASE_URL || '';

export default defineConfig({
  schema: './src/db/flowers/schema.ts',
  out: './drizzle-flowers',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
});
