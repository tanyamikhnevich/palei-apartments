import type { CurrencyCode } from './settings';

/**
 * A place we let apartments in, and everything that follows from it.
 *
 * Region is the seam the expansion plan turns on: currency, country and (later)
 * which site a listing belongs to are all properties of where it is, not global
 * settings. `area` is the value already stored in `apartments.area`, so adding a
 * region needs no migration — the column is a plain varchar.
 */
export interface Region {
  /** Value stored in `apartments.area`. */
  area: string;
  country: 'IL' | 'CY';
  currency: CurrencyCode;
}

export const REGIONS = [
  { area: 'Bat Yam', country: 'IL', currency: 'ILS' },
  { area: 'Limassol', country: 'CY', currency: 'EUR' },
  { area: 'Paphos', country: 'CY', currency: 'EUR' },
  { area: 'Ayia Napa', country: 'CY', currency: 'EUR' },
] as const satisfies readonly Region[];

export type ApartmentArea = (typeof REGIONS)[number]['area'];

export const DEFAULT_AREA: ApartmentArea = 'Bat Yam';
