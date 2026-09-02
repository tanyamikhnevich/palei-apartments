import type { Apartment } from '@/types/apartment';
import type { GeoPoint } from '@/data/apartmentGeo';

/**
 * Building coordinates, keyed by the full English address.
 *
 * SERVER ONLY. This table pairs house numbers with exact positions — the two
 * things the public site is meant not to publish. It used to live next to the
 * map helpers and was therefore compiled into the browser bundle, where anyone
 * could read it. Nothing under `src/components` may import this file.
 *
 * Only a fallback: coordinates typed into the admin panel always win. Resolved
 * with Nominatim (OpenStreetMap); only Ha'Atsmaut 23 matched an actual house
 * number, the others resolved to the street, so a position can sit a little
 * off. To correct one: open the building in Google Maps, right-click it, copy
 * the coordinates and paste them into the apartment instead.
 */
const ADDRESS_COORDS: Record<string, GeoPoint> = {
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

/**
 * Fills in `lat`/`lng` from the address table when the apartment has none.
 *
 * Must run before the address is trimmed for publication: the lookup is keyed
 * on the house number, so afterwards it would find nothing.
 */
export function withResolvedCoords(apt: Apartment): Apartment {
  if (typeof apt.lat === 'number' && typeof apt.lng === 'number') return apt;

  const point = ADDRESS_COORDS[normalizeAddress(apt.locales.en.location)];
  return point ? { ...apt, lat: point.lat, lng: point.lng } : apt;
}
