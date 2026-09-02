import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { apartmentToInsert, rowToApartment } from '@/db/map';
import type { Apartment } from '@/types/apartment';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/auth/guard';

export async function GET(request: Request) {
  const publicOnly = new URL(request.url).searchParams.get('public') === '1';

  // Without ?public=1 the answer also carries unlisted drafts.
  if (!publicOnly) {
    const denied = await requireAdmin();
    if (denied) return denied;
  }

  if (!isDbConfigured()) {
    const { apartments: mock } = await import('@/data/apartments');
    const { filterListedApartments } = await import('@/lib/apartmentVisibility');
    const list = publicOnly ? filterListedApartments(mock) : mock;
    return NextResponse.json({ apartments: list, source: 'mock' as const });
  }

  try {
    const db = getDb();
    const rows = await db.select().from(schema.apartments).orderBy(asc(schema.apartments.id));
    let data = rows.map(rowToApartment);
    if (publicOnly) {
      const { filterListedApartments } = await import('@/lib/apartmentVisibility');
      const { withResolvedCoords } = await import('@/lib/server/apartmentCoords');
      // Resolve first: the address lookup needs the house number that
      // filterListedApartments is about to take off.
      data = filterListedApartments(data.map(withResolvedCoords));
    }
    return NextResponse.json({ apartments: data, source: 'database' as const });
  } catch (e) {
    console.error('GET /api/apartments', e);
    return jsonError('Failed to load apartments', 500);
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    const body = (await request.json()) as Apartment;
    if (!body?.id || !body.locales?.en?.title) {
      return jsonError('Invalid apartment payload');
    }

    const db = getDb();
    const now = new Date();
    await db.insert(schema.apartments).values({
      ...apartmentToInsert(body),
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ apartment: body }, { status: 201 });
  } catch (e) {
    console.error('POST /api/apartments', e);
    return jsonError('Failed to create apartment', 500);
  }
}
