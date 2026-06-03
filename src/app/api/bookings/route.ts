import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { bookingToInsert, rowToBooking } from '@/db/map';
import type { Booking, BookingStatus } from '@/types/apartment';
import { bookings as mockBookings } from '@/data/apartments';
import { formatDateRange, nightsBetween, rangesOverlap } from '@/lib/dates';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import { validateBookingGuest, validationMessageEn } from '@/lib/validation/contact';

const ADMIN_STATUSES: BookingStatus[] = ['New request', 'Confirmed', 'Declined'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const admin = searchParams.get('admin') === '1';

  if (!isDbConfigured()) {
    const list = admin
      ? mockBookings.filter((b) => ADMIN_STATUSES.includes(b.status))
      : mockBookings;
    return NextResponse.json({ bookings: list, source: 'mock' as const });
  }

  try {
    const db = getDb();
    let rows = await db.select().from(schema.bookings).orderBy(desc(schema.bookings.createdAt));

    if (admin) {
      rows = rows.filter((r) => ADMIN_STATUSES.includes(r.status));
    }

    return NextResponse.json({
      bookings: rows.map((r) => rowToBooking(r)),
      source: 'database' as const,
    });
  } catch (e) {
    console.error('GET /api/bookings', e);
    return jsonError('Failed to load bookings', 500);
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    const body = (await request.json()) as Booking;
    if (
      !body.id ||
      !body.apartmentId ||
      !body.checkIn ||
      !body.checkOut ||
      body.checkOut <= body.checkIn
    ) {
      return jsonError('Invalid booking payload');
    }

    const db = getDb();

    const aptRows = await db
      .select({ minNights: schema.apartments.minNights })
      .from(schema.apartments)
      .where(eq(schema.apartments.id, body.apartmentId))
      .limit(1);

    const minNights = aptRows[0]?.minNights ?? 1;
    if (body.status !== 'Draft' && nightsBetween(body.checkIn, body.checkOut) < minNights) {
      return jsonError(`Minimum stay is ${minNights} night(s)`, 400);
    }

    const blocked = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.apartmentId, body.apartmentId));

    const conflicts = blocked.filter(
      (b) =>
        b.id !== body.id &&
        b.status !== 'Draft' &&
        b.status !== 'Declined' &&
        rangesOverlap(body.checkIn, body.checkOut, String(b.checkIn).slice(0, 10), String(b.checkOut).slice(0, 10))
    );

    if (conflicts.length > 0 && body.status !== 'Draft') {
      return jsonError('These dates are no longer available', 409);
    }

    const guestCheck = validateBookingGuest(body.guest ?? '', body.guestContact, {
      draft: body.status === 'Draft',
      requireContact: body.status === 'New request',
    });
    if (!guestCheck.ok) {
      return jsonError(validationMessageEn(guestCheck.code), 400);
    }

    const now = new Date();
    const dates = formatDateRange(body.checkIn, body.checkOut, 'en');
    const row: Booking = {
      ...body,
      guest: guestCheck.guest || body.guest.trim() || 'Guest',
      guestContact: guestCheck.guestContact ?? body.guestContact?.trim(),
      dates,
      apt: body.apt || body.apartmentId,
      channel: body.channel ?? 'Website',
    };

    await db
      .insert(schema.bookings)
      .values({
        ...bookingToInsert(row),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.bookings.id,
        set: {
          apartmentId: row.apartmentId,
          apartmentTitle: row.apt,
          guest: row.guest,
          guestContact: row.guestContact ?? null,
          checkIn: row.checkIn,
          checkOut: row.checkOut,
          guests: row.guests,
          status: row.status,
          channel: row.channel,
          updatedAt: now,
        },
      });

    const saved = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, row.id))
      .limit(1);

    return NextResponse.json({ booking: rowToBooking(saved[0]) }, { status: 201 });
  } catch (e) {
    console.error('POST /api/bookings', e);
    return jsonError('Failed to save booking', 500);
  }
}
