import type {
  ApartmentRow,
  BookingRow,
  BusinessSettingsRow,
  CalendarFeedRow,
  ReviewRow,
} from './schema';
import type { Apartment, Booking } from '@/types/apartment';
import type { CalendarFeed } from '@/types/calendar';
import type { Review } from '@/types/review';
import { DEFAULT_AVAILABILITY } from '@/lib/availability';
import { isPhotoUrl } from '@/lib/apartmentMedia';
import type { ApartmentLocales } from './schema';
import { formatDateRange } from '@/lib/dates';
import type { BusinessSettings } from '@/types/settings';
import { DEFAULT_BUSINESS_SETTINGS } from '@/types/settings';
import type { Locale } from '@/i18n/types';
import type { CurrencyCode } from '@/types/settings';

function sanitizeLocales(locales: ApartmentLocales): ApartmentLocales {
  const out = { ...locales };
  for (const loc of Object.keys(out) as (keyof ApartmentLocales)[]) {
    const copy = out[loc];
    if (copy?.photoLabel && isPhotoUrl(copy.photoLabel)) {
      out[loc] = { ...copy, photoLabel: 'main photo' };
    }
  }
  return out;
}

export function rowToApartment(row: ApartmentRow): Apartment {
  return {
    id: row.id,
    area: row.area as Apartment['area'],
    guests: row.guests,
    bedrooms: row.bedrooms,
    beds: row.beds ?? row.bedrooms,
    bathrooms: row.bathrooms,
    price: row.price,
    minNights: row.minNights ?? 1,
    status: row.status,
    tagIds: row.tagIds,
    rating: row.rating,
    reviews: row.reviews,
    photos: row.photos ?? undefined,
    priceTiers: row.priceTiers ?? undefined,
    services: row.services ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    availability: row.availability ?? DEFAULT_AVAILABILITY,
    icalToken: row.icalToken ?? undefined,
    locales: sanitizeLocales(row.locales),
  };
}

/** 32 hex chars — unguessable enough for a calendar URL, short enough to paste. */
export function createIcalToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function apartmentToInsert(apt: Apartment): Omit<ApartmentRow, 'createdAt' | 'updatedAt'> {
  return {
    id: apt.id,
    area: apt.area,
    guests: apt.guests,
    bedrooms: apt.bedrooms,
    beds: apt.beds,
    bathrooms: apt.bathrooms,
    price: apt.price,
    minNights: apt.minNights,
    status: apt.status,
    tagIds: apt.tagIds,
    rating: apt.rating,
    reviews: apt.reviews,
    photos: apt.photos ?? null,
    priceTiers: apt.priceTiers?.length ? apt.priceTiers : null,
    services: apt.services?.length ? apt.services : null,
    lat: apt.lat ?? null,
    lng: apt.lng ?? null,
    availability: apt.availability ?? DEFAULT_AVAILABILITY,
    icalToken: apt.icalToken ?? createIcalToken(),
    locales: sanitizeLocales(apt.locales),
  };
}

export function rowToCalendarFeed(row: CalendarFeedRow): CalendarFeed {
  return {
    id: row.id,
    apartmentId: row.apartmentId,
    source: row.source,
    label: row.label,
    url: row.url,
    lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
    lastStatus: row.lastStatus ?? null,
    lastError: row.lastError ?? null,
    eventCount: row.eventCount,
  };
}

function isoFromDate(value: string | Date): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function rowToBooking(row: BookingRow, locale = 'en'): Booking {
  const checkIn = isoFromDate(row.checkIn);
  const checkOut = isoFromDate(row.checkOut);
  return {
    id: row.id,
    apartmentId: row.apartmentId,
    guest: row.guest,
    guestContact: row.guestContact ?? undefined,
    apt: row.apartmentTitle,
    checkIn,
    checkOut,
    dates: formatDateRange(checkIn, checkOut, locale),
    guests: row.guests,
    status: row.status,
    channel: row.channel,
  };
}

export function bookingToInsert(
  booking: Booking
): Omit<BookingRow, 'createdAt' | 'updatedAt'> {
  return {
    id: booking.id,
    apartmentId: booking.apartmentId,
    apartmentTitle: booking.apt,
    guest: booking.guest,
    guestContact: booking.guestContact ?? null,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: booking.guests,
    status: booking.status,
    channel: booking.channel,
  };
}

export function rowToReview(row: ReviewRow, options: { includeContact?: boolean } = {}): Review {
  return {
    id: row.id,
    apartmentId: row.apartmentId,
    guestName: row.guestName,
    rating: row.rating,
    text: row.text ?? undefined,
    contact: options.includeContact ? row.contact ?? undefined : undefined,
    status: row.status,
    createdAt: (row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)).toISOString(),
  };
}

export function reviewToInsert(review: Review): Omit<ReviewRow, 'createdAt' | 'updatedAt'> {
  return {
    id: review.id,
    apartmentId: review.apartmentId,
    guestName: review.guestName,
    rating: review.rating,
    text: review.text?.trim() || null,
    contact: review.contact?.trim() || null,
    status: review.status,
  };
}

export function rowToSettings(row: BusinessSettingsRow | undefined): BusinessSettings {
  if (!row) return DEFAULT_BUSINESS_SETTINGS;
  return {
    businessName: row.businessName,
    contactPhone: row.contactPhone,
    whatsappNumber: row.whatsappNumber,
    defaultLanguage: row.defaultLanguage as Locale,
    currency: row.currency as CurrencyCode,
  };
}
