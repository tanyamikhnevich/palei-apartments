import { DEFAULT_AREA, REGIONS, type Region } from '@/types/region';
import type { Apartment } from '@/types/apartment';
import type { CurrencyCode } from '@/types/settings';

/**
 * Anything stored before a region existed, or typed by hand in admin, falls
 * back to the home region rather than throwing — a listing with an unfamiliar
 * area should still render, just in the default currency.
 */
export function regionForArea(area: string): Region {
  return (
    REGIONS.find((r) => r.area === area) ??
    REGIONS.find((r) => r.area === DEFAULT_AREA)!
  );
}

export function currencyForArea(area: string): CurrencyCode {
  return regionForArea(area).currency;
}

export function currencyOf(apt: Pick<Apartment, 'area'>): CurrencyCode {
  return currencyForArea(apt.area);
}

/** Areas grouped by country, for pickers and filters. */
export function areasByCountry(country: Region['country']): readonly Region[] {
  return REGIONS.filter((r) => r.country === country);
}

export function countryOf(apt: Pick<Apartment, 'area'>): Region['country'] {
  return regionForArea(apt.area).country;
}

/**
 * Scopes a listing to one country. This is what keeps the two apartment sites
 * out of each other's way: a listing belongs to the site its region sits in,
 * and nothing else has to know which site is being rendered.
 */
export function apartmentsInCountry<T extends Pick<Apartment, 'area'>>(
  list: T[],
  country: Region['country'] | undefined
): T[] {
  if (!country) return list;
  return list.filter((a) => countryOf(a) === country);
}
