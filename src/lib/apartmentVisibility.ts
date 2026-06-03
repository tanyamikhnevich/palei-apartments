import type { Apartment } from '@/types/apartment';

/** Shown on the public site (home + /apartments). */
export function isApartmentListedOnSite(apt: Apartment): boolean {
  return apt.status === 'Available';
}

export function filterListedApartments(apartments: Apartment[]): Apartment[] {
  return apartments.filter(isApartmentListedOnSite);
}

/** Admin list toggle: on = Available (public), off = hidden (Maintenance). */
export function toggleApartmentListing(apt: Apartment): Apartment {
  return {
    ...apt,
    status: isApartmentListedOnSite(apt) ? 'Maintenance' : 'Available',
  };
}
