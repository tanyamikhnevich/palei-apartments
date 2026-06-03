import { NextResponse } from 'next/server';

export function dbUnavailableResponse() {
  return NextResponse.json(
    { error: 'Database not configured. Set DATABASE_URL in .env.local' },
    { status: 503 }
  );
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
