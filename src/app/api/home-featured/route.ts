import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { inArray } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import { requireAdminAccess } from '@/lib/auth/guard';
import { APARTMENTS_TAG } from '@/lib/cacheTags';
import { HOME_FEATURED_LIMIT } from '@/lib/homeFeatured';

function isValidSelection(ids: unknown): ids is string[] {
  return (
    Array.isArray(ids) &&
    ids.length <= HOME_FEATURED_LIMIT &&
    ids.every((id) => typeof id === 'string') &&
    new Set(ids).size === ids.length
  );
}

/** Replaces the home page selection; the order of `ids` is the order on the page. */
export async function PUT(request: Request) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    const body = (await request.json()) as { ids?: unknown };
    const ids = body?.ids;
    if (!isValidSelection(ids)) return jsonError('Invalid home page selection');

    const db = getDb();
    const clear = db.delete(schema.homeFeatured);

    if (ids.length === 0) {
      await clear;
    } else {
      const found = await db
        .select({ id: schema.apartments.id })
        .from(schema.apartments)
        .where(inArray(schema.apartments.id, ids));
      if (found.length !== ids.length) return jsonError('One of these apartments no longer exists');

      // In one transaction, so a failed write cannot leave the row half-chosen.
      await db.batch([
        clear,
        db
          .insert(schema.homeFeatured)
          .values(ids.map((apartmentId, position) => ({ apartmentId, position }))),
      ]);
    }

    revalidateTag(APARTMENTS_TAG);
    return NextResponse.json({ ids });
  } catch (e) {
    console.error('PUT /api/home-featured', e);
    return jsonError('Failed to save the home page selection', 500);
  }
}
