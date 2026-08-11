import { and, eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { isDbConfigured } from '@/lib/api/errors';
import { buildIcal, type IcalExportEvent } from '@/lib/ical/build';
import { DEFAULT_AVAILABILITY } from '@/lib/availability';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { token: string } };

function isoFromDate(value: string | Date): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function notFound() {
  return new Response('Calendar not found', { status: 404 });
}

/**
 * Public feed the other platforms subscribe to: every date this apartment is
 * taken through us. Imported blocks are deliberately left out — echoing a
 * platform's own reservations back at it creates phantom blocks.
 *
 * No guest names, no prices: an iCal URL is a shared secret, not a login.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  if (!isDbConfigured()) return notFound();

  const token = params.token.replace(/\.ics$/i, '');
  if (!token) return notFound();

  try {
    const db = getDb();

    const aptRows = await db
      .select({
        id: schema.apartments.id,
        locales: schema.apartments.locales,
        availability: schema.apartments.availability,
      })
      .from(schema.apartments)
      .where(eq(schema.apartments.icalToken, token))
      .limit(1);

    if (!aptRows.length) return notFound();
    const apt = aptRows[0];

    const bookingRows = await db
      .select({
        id: schema.bookings.id,
        checkIn: schema.bookings.checkIn,
        checkOut: schema.bookings.checkOut,
        status: schema.bookings.status,
      })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.apartmentId, apt.id),
          inArray(schema.bookings.status, ['New request', 'Confirmed'])
        )
      );

    const events: IcalExportEvent[] = bookingRows.map((row) => ({
      uid: `booking-${row.id}@palei-apartments`,
      checkIn: isoFromDate(row.checkIn),
      checkOut: isoFromDate(row.checkOut),
      summary: row.status === 'Confirmed' ? 'Booked (Palei site)' : 'Held (Palei site request)',
    }));

    const availability = apt.availability ?? DEFAULT_AVAILABILITY;
    if (availability.mode === 'calendar') {
      for (const range of availability.blocked) {
        events.push({
          uid: `block-${apt.id}-${range.checkIn}-${range.checkOut}@palei-apartments`,
          checkIn: range.checkIn,
          checkOut: range.checkOut,
          summary: 'Not available',
        });
      }
    }

    const title = apt.locales?.en?.title ?? apt.id;
    const body = buildIcal(`${title} — Palei Apartments`, events);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="${apt.id}.ics"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (e) {
    console.error('GET /api/ical/[token]', e);
    return new Response('Calendar temporarily unavailable', { status: 500 });
  }
}
