import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { rowToReview } from '@/db/map';
import { recomputeApartmentRating } from '@/db/reviewsAggregate';
import type { ReviewStatus } from '@/types/review';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/auth/guard';

type RouteContext = { params: { id: string } };

const ALLOWED: ReviewStatus[] = ['pending', 'approved', 'rejected'];

export async function PATCH(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    const body = (await request.json()) as { status?: ReviewStatus };
    if (!body.status || !ALLOWED.includes(body.status)) {
      return jsonError('Invalid status');
    }

    const db = getDb();
    const existing = await db
      .select()
      .from(schema.reviews)
      .where(eq(schema.reviews.id, params.id))
      .limit(1);

    if (!existing.length) {
      return jsonError('Review not found', 404);
    }

    await db
      .update(schema.reviews)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(schema.reviews.id, params.id));

    // Approving/rejecting changes what counts toward the apartment's rating.
    await recomputeApartmentRating(db, existing[0].apartmentId);

    const saved = await db
      .select()
      .from(schema.reviews)
      .where(eq(schema.reviews.id, params.id))
      .limit(1);

    return NextResponse.json({ review: rowToReview(saved[0], { includeContact: true }) });
  } catch (e) {
    console.error('PATCH /api/reviews/[id]', e);
    return jsonError('Failed to update review', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    const db = getDb();
    const existing = await db
      .select({ apartmentId: schema.reviews.apartmentId })
      .from(schema.reviews)
      .where(eq(schema.reviews.id, params.id))
      .limit(1);

    if (!existing.length) {
      return jsonError('Review not found', 404);
    }

    await db.delete(schema.reviews).where(eq(schema.reviews.id, params.id));
    await recomputeApartmentRating(db, existing[0].apartmentId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/reviews/[id]', e);
    return jsonError('Failed to delete review', 500);
  }
}
