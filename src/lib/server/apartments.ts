import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { rowToApartment } from '@/db/map';
import { apartments as mockApartments } from '@/data/apartments';
import { isApartmentListedOnSite, stripPrivateFields } from '@/lib/apartmentVisibility';
import { withResolvedCoords } from '@/lib/server/apartmentCoords';
import { isDbConfigured } from '@/lib/api/errors';
import type { Apartment } from '@/types/apartment';

function findMockApartment(id: string): Apartment | null {
  const apt = mockApartments.find((a) => a.id === id);
  return apt && isApartmentListedOnSite(apt) ? stripPrivateFields(apt) : null;
}

/**
 * One apartment for the public detail page — server side, no API round trip.
 * Memoised per request: the metadata and the page body both need it.
 * Returns null when the apartment does not exist or is not listed on the site.
 * Falls back to the mock catalogue when the database is missing or errors,
 * mirroring what `fetchApartments` does on the client.
 */
export const loadPublicApartment = cache(async (id: string): Promise<Apartment | null> => {
  if (!isDbConfigured()) return findMockApartment(id);

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.apartments)
      .where(eq(schema.apartments.id, id))
      .limit(1);

    if (!rows.length) return null;
    const apt = rowToApartment(rows[0]);
    return isApartmentListedOnSite(apt) ? stripPrivateFields(withResolvedCoords(apt)) : null;
  } catch (e) {
    console.warn('loadPublicApartment fallback', e);
    return findMockApartment(id);
  }
});
