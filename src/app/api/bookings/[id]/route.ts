import { NextResponse } from 'next/server';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { bookingToInsert, rowToBooking } from '@/db/map';
import type { Booking, BookingStatus } from '@/types/apartment';
import { rangesOverlap } from '@/lib/dates';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/auth/guard';

type RouteContext = { params: { id: string } };

const ALLOWED: BookingStatus[] = ['Draft', 'New request', 'Confirmed', 'Declined'];

export async function PATCH(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    const body = (await request.json()) as Partial<Booking> & { status?: BookingStatus };
    if (body.status && !ALLOWED.includes(body.status)) {
      return jsonError('Invalid status');
    }

    const db = getDb();
    const existing = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, params.id))
      .limit(1);

    if (!existing.length) {
      return jsonError('Booking not found', 404);
    }

    const current = rowToBooking(existing[0]);
    const merged: Booking = {
      ...current,
      ...body,
      id: params.id,
      dates: current.dates,
    };

    /*
      Confirming is the moment the dates actually become unavailable, so it is
      the moment the clash has to be caught. Requests no longer block anything,
      which means two guests can be holding overlapping requests for the same
      nights — perfectly normal, and exactly how it should be. What must never
      happen is both of them being confirmed.
    */
    if (merged.status === 'Confirmed' && current.status !== 'Confirmed') {
      const rivals = await db
        .select()
        .from(schema.bookings)
        .where(
          and(
            eq(schema.bookings.apartmentId, merged.apartmentId),
            eq(schema.bookings.status, 'Confirmed'),
            ne(schema.bookings.id, params.id)
          )
        );

      const clash = rivals.find((b) =>
        rangesOverlap(
          merged.checkIn,
          merged.checkOut,
          String(b.checkIn).slice(0, 10),
          String(b.checkOut).slice(0, 10)
        )
      );

      if (clash) {
        return jsonError(
          `Already confirmed for ${clash.guest} on these dates — decline one of them first.`,
          409
        );
      }
    }

    if (body.checkIn && body.checkOut) {
      const { formatDateRange } = await import('@/lib/dates');
      merged.dates = formatDateRange(merged.checkIn, merged.checkOut, 'en');
    }

    await db
      .update(schema.bookings)
      .set({
        ...bookingToInsert(merged),
        updatedAt: new Date(),
      })
      .where(eq(schema.bookings.id, params.id));

    const saved = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, params.id))
      .limit(1);

    return NextResponse.json({ booking: rowToBooking(saved[0]) });
  } catch (e) {
    console.error('PATCH /api/bookings/[id]', e);
    return jsonError('Failed to update booking', 500);
  }
}
