import type { Apartment } from '@/types/apartment';
import type { Locale } from '@/i18n/types';
import { hideHouseNumber } from '@/lib/address';
import { approximateCoords } from '@/lib/geoPrivacy';

/** Shown on the public site (home + /apartments). */
export function isApartmentListedOnSite(apt: Apartment): boolean {
  return apt.status === 'Available';
}

export function filterListedApartments(apartments: Apartment[]): Apartment[] {
  return apartments.filter(isApartmentListedOnSite).map(stripPrivateFields);
}

/** Every locale's address, with the house number taken off. */
function publicLocales(apt: Apartment): Apartment['locales'] {
  const out = {} as Apartment['locales'];
  for (const [locale, copy] of Object.entries(apt.locales) as [Locale, Apartment['locales'][Locale]][]) {
    out[locale] = { ...copy, location: hideHouseNumber(copy.location) };
  }
  return out;
}

/**
 * Drops what the public site must not see.
 *
 * `icalToken` is the secret segment of the calendar export URL — with it anyone
 * could read the booking calendar. House numbers go for the guests' and the
 * owners' safety; admin keeps the full address.
 *
 * Coordinates are rounded to a grid, because a pin on the door republishes the
 * house number we just removed. Callers that read from the database resolve a
 * missing position first — see `withResolvedCoords`.
 */
export function stripPrivateFields(apt: Apartment): Apartment {
  const { icalToken: _icalToken, ...rest } = apt;
  const point =
    typeof apt.lat === 'number' && typeof apt.lng === 'number'
      ? approximateCoords({ lat: apt.lat, lng: apt.lng })
      : null;

  return {
    ...rest,
    ...(point ? { lat: point.lat, lng: point.lng } : null),
    locales: publicLocales(apt),
  };
}

/** Admin list toggle: on = Available (public), off = hidden (Maintenance). */
export function toggleApartmentListing(apt: Apartment): Apartment {
  return {
    ...apt,
    status: isApartmentListedOnSite(apt) ? 'Maintenance' : 'Available',
  };
}
