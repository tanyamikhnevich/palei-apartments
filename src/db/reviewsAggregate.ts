import { and, eq, sql } from 'drizzle-orm';
import type { getDb } from './index';
import { schema } from './index';

type Db = ReturnType<typeof getDb>;

/**
 * Recompute an apartment's `rating` (avg, 1 decimal) and `reviews` (count) from
 * its APPROVED reviews only. Call after any change to a review's approved state.
 * With no approved reviews both fall to 0, which the UI renders as a "New" badge.
 */
export async function recomputeApartmentRating(db: Db, apartmentId: string): Promise<void> {
  const [agg] = await db
    .select({
      avg: sql<number>`coalesce(avg(${schema.reviews.rating}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.reviews)
    .where(
      and(
        eq(schema.reviews.apartmentId, apartmentId),
        eq(schema.reviews.status, 'approved')
      )
    );

  const count = agg ? Number(agg.count) : 0;
  const rating = count > 0 ? Math.round(Number(agg.avg) * 10) / 10 : 0;

  await db
    .update(schema.apartments)
    .set({ rating, reviews: count, updatedAt: new Date() })
    .where(eq(schema.apartments.id, apartmentId));
}
