import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { rowToBooking } from '@/db/map';
import type { Booking, BookingStatus } from '@/types/apartment';
import { bookings as mockBookings } from '@/data/apartments';
import { formatDateRange, nightsBetween, rangesOverlap } from '@/lib/dates';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import { validateBookingGuest, validationMessageEn } from '@/lib/validation/contact';
import { notifyNewBooking } from '@/lib/notify/telegram';
import { requireAdmin } from '@/lib/auth/guard';
import { publicSubmitThrottle } from '@/lib/auth/throttle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_STATUSES: BookingStatus[] = ['New request', 'Confirmed', 'Declined'];

/** Only a booking the owner has confirmed takes dates off the calendar. */
const OCCUPYING: BookingStatus[] = ['Confirmed'];

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

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

/**
 * A guest asks for dates. Anyone may call this — that is the point of a booking
 * form — so nothing the caller sends is trusted beyond the dates, the party
 * size and how to reach them.
 *
 * In particular the id and the status are decided here, never by the caller.
 * They used to be taken from the request body, which let anyone POST a booking
 * marked `Confirmed` (blocking whatever dates they liked), or re-POST an
 * existing booking's id to overwrite it — the row was upserted, and the
 * overlap check excluded the very id being written. Booking ids are not even
 * secret: they are published in the iCal feed the platforms subscribe to.
 *
 * A request does not block the calendar. Several guests may ask for the same
 * nights; the owner confirms one and declines the rest, which is how a request
 * without a card behind it has to work — otherwise anyone could empty the
 * calendar for free.
 */
export async function POST(request: Request) {
  if (!isDbConfigured()) return dbUnavailableResponse();

  const gate = publicSubmitThrottle.check(request);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSeconds) } }
    );
  }

  // Charged before anything is parsed: a rejected payload has to cost the
  // sender just as much as an accepted one, or the limit protects nothing.
  publicSubmitThrottle.consume(request);

  try {
    const body = (await request.json()) as Partial<Booking>;

    const apartmentId = typeof body.apartmentId === 'string' ? body.apartmentId : '';
    const checkIn = typeof body.checkIn === 'string' ? body.checkIn.slice(0, 10) : '';
    const checkOut = typeof body.checkOut === 'string' ? body.checkOut.slice(0, 10) : '';

    if (!apartmentId || !checkIn || !checkOut || checkOut <= checkIn) {
      return jsonError('Invalid booking payload');
    }

    const guests = Number.isInteger(body.guests) && (body.guests as number) > 0
      ? Math.min(body.guests as number, 30)
      : 1;

    const db = getDb();

    const aptRows = await db
      .select({
        id: schema.apartments.id,
        minNights: schema.apartments.minNights,
        locales: schema.apartments.locales,
      })
      .from(schema.apartments)
      .where(eq(schema.apartments.id, apartmentId))
      .limit(1);

    if (!aptRows.length) return jsonError('Apartment not found', 404);

    const minNights = aptRows[0].minNights ?? 1;
    if (nightsBetween(checkIn, checkOut) < minNights) {
      return jsonError(`Minimum stay is ${minNights} night(s)`, 400);
    }

    // Only a confirmed stay can stand in the way — pending requests may overlap.
    const taken = await db
      .select()
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.apartmentId, apartmentId),
          inArray(schema.bookings.status, OCCUPYING)
        )
      );

    const clash = taken.some((b) =>
      rangesOverlap(checkIn, checkOut, String(b.checkIn).slice(0, 10), String(b.checkOut).slice(0, 10))
    );
    if (clash) return jsonError('These dates are no longer available', 409);

    const guestCheck = validateBookingGuest(body.guest ?? '', body.guestContact, {
      draft: false,
      requireContact: true,
    });
    if (!guestCheck.ok) {
      return jsonError(validationMessageEn(guestCheck.code), 400);
    }

    const now = new Date();
    // The title is read from the apartment, not from the request: it is shown
    // to the owner, and a caller-supplied one is a free text injection point.
    const apartmentTitle = aptRows[0].locales?.en?.title ?? apartmentId;

    const id = `web-${randomUUID()}`;
    await db.insert(schema.bookings).values({
      id,
      apartmentId,
      apartmentTitle,
      guest: guestCheck.guest || 'Guest',
      guestContact: guestCheck.guestContact ?? null,
      checkIn,
      checkOut,
      guests,
      status: 'New request',
      channel: 'Website',
      createdAt: now,
      updatedAt: now,
    });

    const saved = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, id))
      .limit(1);

    await notifyNewBooking({
      apartmentTitle,
      guest: guestCheck.guest || 'Guest',
      contact: guestCheck.guestContact,
      dates: formatDateRange(checkIn, checkOut, 'en'),
      guests,
      channel: 'Website',
    });

    return NextResponse.json({ booking: rowToBooking(saved[0]) }, { status: 201 });
  } catch (e) {
    console.error('POST /api/bookings', e);
    return jsonError('Failed to save booking', 500);
  }
}
