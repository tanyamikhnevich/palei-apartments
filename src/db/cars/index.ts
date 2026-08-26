import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * The fleet's connection. `CARS_DATABASE_URL` puts it on its own database;
 * without it, it shares the main one and keeps its own tables there. Either way
 * nothing in the apartments code reaches these tables, and nothing here reaches
 * theirs.
 */
export function carsDatabaseUrl(): string | undefined {
  return process.env.CARS_DATABASE_URL || process.env.DATABASE_URL;
}

export function isCarsDbConfigured(): boolean {
  return Boolean(carsDatabaseUrl());
}

export function getCarsDb() {
  const url = carsDatabaseUrl();
  if (!url) {
    throw new Error('CARS_DATABASE_URL (or DATABASE_URL) is missing. See .env.example');
  }
  return drizzle(neon(url), { schema });
}

export { schema };

/**
 * The fleet tables not existing yet is the one failure worth naming: it happens
 * on every machine until the migration is run, and "internal error" sends
 * people looking in the wrong place.
 */
export function isMissingFleetTables(error: unknown): boolean {
  // Drizzle wraps the driver error, so the Postgres code sits on the cause.
  const cause = (error as { cause?: { code?: string; message?: string } })?.cause;
  const code = (error as { code?: string })?.code ?? cause?.code;
  if (code === '42P01') return true;

  const text = `${(error as Error)?.message ?? ''} ${cause?.message ?? ''}`;
  return /relation ".*(cars|car_blocks).*" does not exist/i.test(text);
}

export const FLEET_MIGRATION_HINT =
  'Fleet tables are missing. Run: npm run db:cars:migrate';
