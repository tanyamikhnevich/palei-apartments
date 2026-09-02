import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { rowToReview } from '@/db/map';
import type { Review } from '@/types/review';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import { reviewValidationMessageEn, validateReview, type ReviewInput } from '@/lib/validation/review';
import { requireAdmin } from '@/lib/auth/guard';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const admin = searchParams.get('admin') === '1';
  const apartmentId = searchParams.get('apartmentId');

  // The moderation queue carries private contact details.
  if (admin) {
    const denied = await requireAdmin();
    if (denied) return denied;
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ reviews: [] as Review[], source: 'mock' as const });
  }

  try {
    const db = getDb();

    if (admin) {
      // Moderation queue: every review, newest first, with private contact.
      const rows = await db
        .select()
        .from(schema.reviews)
        .orderBy(desc(schema.reviews.createdAt));
      return NextResponse.json({
        reviews: rows.map((r) => rowToReview(r, { includeContact: true })),
        source: 'database' as const,
      });
    }

    // Public: approved only, contact stripped.
    const rows = await db
      .select()
      .from(schema.reviews)
      .where(
        apartmentId
          ? and(eq(schema.reviews.status, 'approved'), eq(schema.reviews.apartmentId, apartmentId))
          : eq(schema.reviews.status, 'approved')
      )
      .orderBy(desc(schema.reviews.createdAt));

    return NextResponse.json({
      reviews: rows.map((r) => rowToReview(r)),
      source: 'database' as const,
    });
  } catch (e) {
    console.error('GET /api/reviews', e);
    return jsonError('Failed to load reviews', 500);
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    const body = (await request.json()) as ReviewInput & { apartmentId?: string };

    if (!body.apartmentId) {
      return jsonError('Missing apartment');
    }

    const check = validateReview(body);
    if (!check.ok) {
      // Honeypot tripped: pretend success so bots don't probe, but store nothing.
      if (check.code === 'spam') {
        return NextResponse.json({ ok: true }, { status: 201 });
      }
      return jsonError(reviewValidationMessageEn(check.code), 400);
    }

    const db = getDb();

    const apt = await db
      .select({ id: schema.apartments.id })
      .from(schema.apartments)
      .where(eq(schema.apartments.id, body.apartmentId))
      .limit(1);
    if (!apt.length) {
      return jsonError('Apartment not found', 404);
    }

    const now = new Date();
    const review: Review = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      apartmentId: body.apartmentId,
      guestName: check.guestName,
      rating: check.rating,
      text: check.text,
      contact: check.contact,
      status: 'pending',
      createdAt: now.toISOString(),
    };

    await db.insert(schema.reviews).values({
      id: review.id,
      apartmentId: review.apartmentId,
      guestName: review.guestName,
      rating: review.rating,
      text: review.text ?? null,
      contact: review.contact ?? null,
      status: review.status,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error('POST /api/reviews', e);
    return jsonError('Failed to submit review', 500);
  }
}
