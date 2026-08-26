import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * The shop's connection. `FLOWERS_DATABASE_URL` puts it on its own database;
 * without it, it shares the main one and keeps its own table there.
 */
export function flowersDatabaseUrl(): string | undefined {
  return process.env.FLOWERS_DATABASE_URL || process.env.DATABASE_URL;
}

export function isFlowersDbConfigured(): boolean {
  return Boolean(flowersDatabaseUrl());
}

export function getFlowersDb() {
  const url = flowersDatabaseUrl();
  if (!url) {
    throw new Error('FLOWERS_DATABASE_URL (or DATABASE_URL) is missing. See .env.example');
  }
  return drizzle(neon(url), { schema });
}

/**
 * The database being a migration behind — no table yet (42P01) or a column the
 * code already expects (42703). Both mean the same thing to a caller: run the
 * migration. Catching the column case matters because code ships before
 * migrations run, and the shop must not go down in that window.
 */
export function isShopSchemaOutdated(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string; message?: string } })?.cause;
  const code = (error as { code?: string })?.code ?? cause?.code;
  if (code === '42P01' || code === '42703') return true;

  const text = `${(error as Error)?.message ?? ''} ${cause?.message ?? ''}`;
  return /(relation|column) ".*" does not exist/i.test(text);
}

export const SHOP_MIGRATION_HINT =
  'The shop database is behind. Run: npm run db:flowers:migrate';

export { schema };
