import { NextResponse } from 'next/server';
import { revalidateTag, unstable_cache } from 'next/cache';
import { asc } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { apartmentToInsert, rowToApartment } from '@/db/map';
import type { Apartment } from '@/types/apartment';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/auth/guard';
import { APARTMENTS_TAG } from '@/lib/cacheTags';

/**
 * The guest-facing catalogue, cached.
 *
 * The home page alone asked for it twice — the carousel and the "about" block
 * each fetch it independently, both with `no-store` — so every visitor cost two
 * identical round trips to Neon. Nothing here changes without someone editing
 * an apartment in the panel, and those writes drop the tag below, so the cache
 * is never meaningfully stale.
 */
const readPublicApartments = unstable_cache(
  async () => {
    const rows = await getDb().select().from(schema.apartments).orderBy(asc(schema.apartments.id));
    const { filterListedApartments } = await import('@/lib/apartmentVisibility');
    const { withResolvedCoords } = await import('@/lib/server/apartmentCoords');
    // Resolve first: the address lookup needs the house number that
    // filterListedApartments is about to take off.
    return filterListedApartments(rows.map(rowToApartment).map(withResolvedCoords));
  },
  [APARTMENTS_TAG],
  { revalidate: 60, tags: [APARTMENTS_TAG] }
);

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
    if (publicOnly) {
      return NextResponse.json({
        apartments: await readPublicApartments(),
        source: 'database' as const,
      });
    }

    // Admin sees the unfiltered, uncached truth — it is editing it.
    const rows = await getDb().select().from(schema.apartments).orderBy(asc(schema.apartments.id));
    return NextResponse.json({
      apartments: rows.map(rowToApartment),
      source: 'database' as const,
    });
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

    revalidateTag(APARTMENTS_TAG);
    return NextResponse.json({ apartment: body }, { status: 201 });
  } catch (e) {
    console.error('POST /api/apartments', e);
    return jsonError('Failed to create apartment', 500);
  }
}
