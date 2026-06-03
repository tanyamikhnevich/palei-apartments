import { NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { DEFAULT_AVAILABILITY, mergeBlockedRanges } from '@/lib/availability';
import { isDbConfigured, jsonError } from '@/lib/api/errors';

function isoFromDate(value: string | Date): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

async function blockedForMockApartments(): Promise<Record<string, { checkIn: string; checkOut: string }[]>> {
  const { apartments: mockApts, bookings: mockBookings } = await import('@/data/apartments');
  const { DEFAULT_AVAILABILITY, mergeBlockedRanges } = await import('@/lib/availability');

  const activeStatuses = new Set(['New request', 'Confirmed']);
  const byApartment: Record<string, { checkIn: string; checkOut: string }[]> = {};

  for (const apt of mockApts) {
    const bookingBlocked = mockBookings
      .filter((b) => b.apartmentId === apt.id && activeStatuses.has(b.status))
      .map((b) => ({ checkIn: b.checkIn.slice(0, 10), checkOut: b.checkOut.slice(0, 10) }));
    const manual =
      apt.availability?.mode === 'calendar' ? apt.availability.blocked : [];
    byApartment[apt.id] = mergeBlockedRanges(bookingBlocked, manual);
  }

  return byApartment;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all') === '1';
  const apartmentId = searchParams.get('apartmentId');

  if (all) {
    if (!isDbConfigured()) {
      const byApartment = await blockedForMockApartments();
      return NextResponse.json({ byApartment, source: 'mock' as const });
    }

    try {
      const db = getDb();
      const bookingRows = await db
        .select({
          apartmentId: schema.bookings.apartmentId,
          checkIn: schema.bookings.checkIn,
          checkOut: schema.bookings.checkOut,
        })
        .from(schema.bookings)
        .where(inArray(schema.bookings.status, ['New request', 'Confirmed']));

      const aptRows = await db
        .select({ id: schema.apartments.id, availability: schema.apartments.availability })
        .from(schema.apartments);

      const byApartment: Record<string, { checkIn: string; checkOut: string }[]> = {};

      for (const apt of aptRows) {
        const bookingBlocked = bookingRows
          .filter((r) => r.apartmentId === apt.id)
          .map((r) => ({
            checkIn: isoFromDate(r.checkIn),
            checkOut: isoFromDate(r.checkOut),
          }));
        const availability = apt.availability ?? DEFAULT_AVAILABILITY;
        const manualBlocked =
          availability.mode === 'calendar' ? availability.blocked : [];
        byApartment[apt.id] = mergeBlockedRanges(bookingBlocked, manualBlocked);
      }

      return NextResponse.json({ byApartment, source: 'database' as const });
    } catch (e) {
      console.error('GET /api/bookings/availability?all=1', e);
      return jsonError('Failed to load availability', 500);
    }
  }

  if (!apartmentId) return jsonError('apartmentId is required');

  if (!isDbConfigured()) {
    const byApartment = await blockedForMockApartments();
    return NextResponse.json({
      blocked: byApartment[apartmentId] ?? [],
      source: 'mock' as const,
    });
  }

  try {
    const db = getDb();

    const bookingRows = await db
      .select({
        checkIn: schema.bookings.checkIn,
        checkOut: schema.bookings.checkOut,
      })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.apartmentId, apartmentId),
          inArray(schema.bookings.status, ['New request', 'Confirmed'])
        )
      );

    const bookingBlocked = bookingRows.map((r) => ({
      checkIn: isoFromDate(r.checkIn),
      checkOut: isoFromDate(r.checkOut),
    }));

    const aptRows = await db
      .select({ availability: schema.apartments.availability })
      .from(schema.apartments)
      .where(eq(schema.apartments.id, apartmentId))
      .limit(1);

    const availability = aptRows[0]?.availability ?? DEFAULT_AVAILABILITY;
    const manualBlocked =
      availability.mode === 'calendar' ? availability.blocked : [];

    const blocked = mergeBlockedRanges(bookingBlocked, manualBlocked);

    return NextResponse.json({ blocked, source: 'database' as const });
  } catch (e) {
    console.error('GET /api/bookings/availability', e);
    return jsonError('Failed to load availability', 500);
  }
}
