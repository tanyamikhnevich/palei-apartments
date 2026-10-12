import { NextResponse } from 'next/server';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import { requireAdminAccess } from '@/lib/auth/guard';
import { compareISO } from '@/lib/dates';
import { guestPassesConfigured } from '@/lib/guide/passToken';
import { ISO_DATE } from '@/lib/guide/sanitize';
import { createPass, listPasses, passForBooking } from '@/lib/server/guides';

/** The guest links handed out for one apartment. */
export async function GET(request: Request) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  if (!isDbConfigured()) return dbUnavailableResponse();

  const apartmentId = new URL(request.url).searchParams.get('apartmentId');
  if (!apartmentId) return jsonError('apartmentId is required');

  try {
    return NextResponse.json({ passes: await listPasses(apartmentId) });
  } catch (e) {
    console.error('GET /api/guest-passes', e);
    return jsonError('Failed to load guest links', 500);
  }
}

type PassInput = {
  bookingId?: string;
  apartmentId?: string;
  guestName?: string;
  guestContact?: string;
  checkIn?: string;
  checkOut?: string;
};

/**
 * A link for a booking (`bookingId` alone), or for a stay that is not in the
 * bookings table at all — a guest who came through Airbnb or Booking.com.
 */
export async function POST(request: Request) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  if (!isDbConfigured()) return dbUnavailableResponse();
  if (!guestPassesConfigured()) {
    return jsonError('ADMIN_SECRET is not set — the server cannot sign guest links', 503);
  }

  try {
    const body = (await request.json()) as PassInput;

    if (body.bookingId) {
      const pass = await passForBooking(body.bookingId);
      return pass ? NextResponse.json({ pass }) : jsonError('Booking not found', 404);
    }

    const guestName = body.guestName?.trim().slice(0, 120) ?? '';
    const checkIn = body.checkIn ?? '';
    const checkOut = body.checkOut ?? '';

    if (!body.apartmentId) return jsonError('apartmentId is required');
    if (!guestName) return jsonError('Enter the guest’s name');
    if (!ISO_DATE.test(checkIn) || !ISO_DATE.test(checkOut)) {
      return jsonError('Enter the check-in and check-out dates');
    }
    if (compareISO(checkOut, checkIn) <= 0) {
      return jsonError('Check-out has to be after check-in');
    }

    const pass = await createPass({
      apartmentId: body.apartmentId,
      guestName,
      guestContact: body.guestContact?.trim().slice(0, 40) || undefined,
      checkIn,
      checkOut,
    });
    return NextResponse.json({ pass }, { status: 201 });
  } catch (e) {
    console.error('POST /api/guest-passes', e);
    return jsonError('Failed to create the guest link', 500);
  }
}
