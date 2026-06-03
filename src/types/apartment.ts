import type { Locale } from '@/i18n/types';

export type ApartmentStatus = 'Available' | 'Booked' | 'Maintenance';

export type BookingStatus = 'Draft' | 'New request' | 'Confirmed' | 'Declined';

export type BookingChannel = 'WhatsApp' | 'Website' | 'Booking';

export type ApartmentArea = 'Bat Yam' | 'Tel Aviv';

export type ApartmentTagId =
  | 'seaView'
  | 'balcony'
  | 'family'
  | 'nearBeach'
  | 'terrace'
  | 'premium'
  | 'garden'
  | 'central'
  | 'design'
  | 'nightlife'
  | 'equipped';

export type ApartmentAvailabilityMode = 'always' | 'calendar';

export interface ApartmentAvailability {
  mode: ApartmentAvailabilityMode;
  /** Blocked night ranges (check-out exclusive), used when mode is calendar */
  blocked: { checkIn: string; checkOut: string }[];
}

export interface ApartmentLocaleCopy {
  title: string;
  location: string;
  description: string;
  photoLabel: string;
}

export interface Apartment {
  id: string;
  area: ApartmentArea;
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  price: number;
  /** Minimum stay length in nights (default 1). */
  minNights: number;
  status: ApartmentStatus;
  /** Preset ids (e.g. seaView) or custom labels typed in admin. Order matters — first is primary. */
  tagIds: string[];
  rating: number;
  reviews: number;
  photos?: string[];
  locales: Record<Locale, ApartmentLocaleCopy>;
  availability?: ApartmentAvailability;
}

export interface Booking {
  id: string;
  apartmentId: string;
  guest: string;
  guestContact?: string;
  apt: string;
  checkIn: string;
  checkOut: string;
  dates: string;
  guests: number;
  status: BookingStatus;
  channel: BookingChannel;
}
