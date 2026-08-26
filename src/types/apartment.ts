import type { Locale } from '@/i18n/types';

export type ApartmentStatus = 'Available' | 'Booked' | 'Maintenance';

export type BookingStatus = 'Draft' | 'New request' | 'Confirmed' | 'Declined';

export type BookingChannel = 'WhatsApp' | 'Website' | 'Booking';

/*
  Areas now come from the region table, which also carries each one's currency
  and country — see `src/types/region.ts`. Re-exported here so the many callers
  that import it from the apartment types keep working.
*/
import type { ApartmentArea } from './region';
export type { ApartmentArea };

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

/**
 * A cheaper nightly rate that unlocks at `minNights` and then applies to every
 * night of the stay — 10 nights against a 7-night tier are all billed at the
 * tier's rate, the way Airbnb and Booking present weekly and monthly prices.
 */
export interface PriceTier {
  minNights: number;
  price: number;
}

/** How an extra is multiplied out: once, per night, or per guest. */
export type ServiceUnit = 'stay' | 'night' | 'guest';

export interface ApartmentService {
  id: string;
  name: string;
  price: number;
  unit: ServiceUnit;
  /** Always in the total; otherwise the guest ticks it themselves. */
  required: boolean;
}

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
  /** Nightly rate for longer stays; the base `price` covers everything below. */
  priceTiers?: PriceTier[];
  /** Cleaning, transfer and the like — priced per apartment. */
  services?: ApartmentService[];
  /** Exact position of the building, used by the listing map. */
  lat?: number;
  lng?: number;
  locales: Record<Locale, ApartmentLocaleCopy>;
  availability?: ApartmentAvailability;
  /** Secret segment of this apartment's public iCal export URL. */
  icalToken?: string;
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
