import type { Apartment } from '@/types/apartment';

/** Shown on the public site (home + /apartments). */
export function isApartmentListedOnSite(apt: Apartment): boolean {
  return apt.status === 'Available';
}

export function filterListedApartments(apartments: Apartment[]): Apartment[] {
  return apartments.filter(isApartmentListedOnSite).map(stripPrivateFields);
}

/**
 * Drops fields the public site must not see. `icalToken` is the secret segment
 * of the calendar export URL — with it anyone could read the booking calendar.
 */
export function stripPrivateFields(apt: Apartment): Apartment {
  if (!apt.icalToken) return apt;
  const { icalToken: _icalToken, ...rest } = apt;
  return rest;
}

/** Admin list toggle: on = Available (public), off = hidden (Maintenance). */
export function toggleApartmentListing(apt: Apartment): Apartment {
  return {
    ...apt,
    status: isApartmentListedOnSite(apt) ? 'Maintenance' : 'Available',
  };
}
