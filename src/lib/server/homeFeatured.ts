import { unstable_cache } from 'next/cache';
import { asc } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { APARTMENTS_TAG } from '@/lib/cacheTags';

async function selectFeaturedIds(): Promise<string[]> {
  const rows = await getDb()
    .select({ id: schema.homeFeatured.apartmentId })
    .from(schema.homeFeatured)
    .orderBy(asc(schema.homeFeatured.position));
  return rows.map((row) => row.id);
}

const selectFeaturedIdsCached = unstable_cache(selectFeaturedIds, ['home-featured'], {
  revalidate: 60,
  tags: [APARTMENTS_TAG],
});

/**
 * The order of one row is never worth failing the whole catalogue for — for
 * instance when a deploy gets ahead of its migration.
 */
async function orNone(read: () => Promise<string[]>): Promise<string[]> {
  try {
    return await read();
  } catch (e) {
    console.warn('home_featured unavailable', e);
    return [];
  }
}

/** Uncached, for the admin panel. */
export const readFeaturedIds = () => orNone(selectFeaturedIds);

/** Cached with the public catalogue and dropped by the same writes. */
export const readPublicFeaturedIds = () => orNone(selectFeaturedIdsCached);
