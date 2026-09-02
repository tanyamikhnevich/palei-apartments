import type { Apartment } from '@/types/apartment';
import type { Locale } from '@/i18n/types';
import { getApartmentCopy } from '@/i18n/apartmentLocale';

export type GeoPoint = { lat: number; lng: number };

/** Seafront promenade — where the map opens when nothing else fits. */
export const BAT_YAM_CENTER: GeoPoint = { lat: 32.0186, lng: 34.7407 };

/**
 * Where an apartment sits, as far as this side of the wire knows.
 *
 * The address-to-coordinates table that used to back this lookup now lives in
 * `src/lib/server/apartmentCoords.ts`: it holds full addresses, and compiling
 * it into the browser bundle published exactly what the site hides. The server
 * resolves coordinates before it answers, so by the time an apartment reaches a
 * component it either carries a position or genuinely has none.
 */
export function coordsForApartment(apt: Apartment): GeoPoint | undefined {
  if (typeof apt.lat === 'number' && typeof apt.lng === 'number') {
    return { lat: apt.lat, lng: apt.lng };
  }
  return undefined;
}

export type MapGroup = {
  key: string;
  point: GeoPoint;
  /** Address in the reader's language, house number already removed. */
  address: string;
  apartments: Apartment[];
};

export type MapGrouping = {
  groups: MapGroup[];
  /** Apartments with no position to show. */
  unplaced: number;
};

/**
 * Several flats share a building, so one pin stands for all of them. Published
 * coordinates are rounded to a grid, which makes neighbours in the same block
 * collapse onto the same point by themselves.
 */
export function groupApartmentsForMap(apartments: Apartment[], locale: Locale): MapGrouping {
  const groups = new Map<string, MapGroup>();
  let unplaced = 0;

  for (const apt of apartments) {
    const point = coordsForApartment(apt);
    if (!point) {
      unplaced += 1;
      continue;
    }

    const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.apartments.push(apt);
    } else {
      groups.set(key, {
        key,
        point,
        address: getApartmentCopy(apt, locale).location,
        apartments: [apt],
      });
    }
  }

  return { groups: [...groups.values()], unplaced };
}
