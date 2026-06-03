import type { ApartmentRow, BookingRow, BusinessSettingsRow } from './schema';
import type { Apartment, Booking } from '@/types/apartment';
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
    bathrooms: row.bathrooms,
    price: row.price,
    status: row.status,
    tagIds: row.tagIds,
    rating: row.rating,
    reviews: row.reviews,
    photos: row.photos ?? undefined,
    availability: row.availability ?? DEFAULT_AVAILABILITY,
    locales: sanitizeLocales(row.locales),
  };
}

export function apartmentToInsert(apt: Apartment): Omit<ApartmentRow, 'createdAt' | 'updatedAt'> {
  return {
    id: apt.id,
    area: apt.area,
    guests: apt.guests,
    bedrooms: apt.bedrooms,
    bathrooms: apt.bathrooms,
    price: apt.price,
    status: apt.status,
    tagIds: apt.tagIds,
    rating: apt.rating,
    reviews: apt.reviews,
    photos: apt.photos ?? null,
    availability: apt.availability ?? DEFAULT_AVAILABILITY,
    locales: sanitizeLocales(apt.locales),
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

export function rowToSettings(row: BusinessSettingsRow | undefined): BusinessSettings {
  if (!row) return DEFAULT_BUSINESS_SETTINGS;
  return {
    businessName: row.businessName,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    whatsappNumber: row.whatsappNumber,
    defaultLanguage: row.defaultLanguage as Locale,
    currency: row.currency as CurrencyCode,
  };
}
