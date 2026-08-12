import type { Apartment } from '@/types/apartment';
import type { Locale } from '@/i18n/types';
import { getApartmentCopy } from '@/i18n/apartmentLocale';

export type GeoPoint = { lat: number; lng: number };

/** Seafront promenade — where the map opens when nothing else fits. */
export const BAT_YAM_CENTER: GeoPoint = { lat: 32.0186, lng: 34.7407 };

/**
 * Building coordinates, keyed by the English address in `locales.en.location`.
 * Only used for apartments that have no coordinates of their own — the admin
 * panel's latitude and longitude fields always take precedence.
 *
 * Resolved with Nominatim (OpenStreetMap). Only Ha'Atsmaut 23 matched an
 * actual house number; the others resolved to the street, so a pin can sit a
 * block or so off. To correct one: open the building in Google Maps,
 * right-click it, copy the coordinates and paste them here.
 *
 * An apartment whose address is missing from this table simply gets no pin —
 * the map says how many are unplaced.
 */
export const ADDRESS_COORDS: Record<string, GeoPoint> = {
  'yitshak sadeh st 3, bat yam': { lat: 32.0111235, lng: 34.7420087 },
  'harav kukis st 16, bat yam': { lat: 32.0206831, lng: 34.7422797 },
  'derech ben gurion 81, bat yam': { lat: 32.02093, lng: 34.7393318 },
  'haatsmaut blvd 23, bat yam': { lat: 32.0227269, lng: 34.7439456 },
  'shmuel yosef agnon st 3, bat yam': { lat: 32.0170678, lng: 34.7395901 },
};

/** Apostrophes and spacing vary between the admin panel and the import script. */
function normalizeAddress(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Coordinates saved in the admin panel win; the address table is the fallback. */
export function coordsForApartment(apt: Apartment): GeoPoint | undefined {
  if (typeof apt.lat === 'number' && typeof apt.lng === 'number') {
    return { lat: apt.lat, lng: apt.lng };
  }
  return ADDRESS_COORDS[normalizeAddress(apt.locales.en.location)];
}

export type MapGroup = {
  key: string;
  point: GeoPoint;
  /** Address in the reader's language. */
  address: string;
  apartments: Apartment[];
};

export type MapGrouping = {
  groups: MapGroup[];
  /** Apartments with no coordinates for their address. */
  unplaced: number;
};

/** Several flats share a building, so one pin stands for all of them. */
export function groupApartmentsForMap(apartments: Apartment[], locale: Locale): MapGrouping {
  const groups = new Map<string, MapGroup>();
  let unplaced = 0;

  for (const apt of apartments) {
    const point = coordsForApartment(apt);
    if (!point) {
      unplaced += 1;
      continue;
    }
    // Flats with their own pin stay separate; the rest group by building.
    const key =
      typeof apt.lat === 'number' && typeof apt.lng === 'number'
        ? `${apt.lat.toFixed(5)},${apt.lng.toFixed(5)}`
        : normalizeAddress(apt.locales.en.location);
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
