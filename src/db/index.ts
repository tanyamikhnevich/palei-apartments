import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Add your Neon connection string to .env.local');
  }
  return url;
}

export function getDb() {
  // Neon's HTTP driver talks over `fetch`, which Next.js patches with its Data
  // Cache — without this a query can be answered from a stale cached response
  // (booked dates reappearing as free, freshly saved rows missing).
  const sql = neon(getDatabaseUrl(), { fetchOptions: { cache: 'no-store' } });
  return drizzle(sql, { schema });
}

export { schema };
