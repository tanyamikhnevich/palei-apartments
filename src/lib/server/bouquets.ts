import { cache } from 'react';
import { eq } from 'drizzle-orm';
import {
  getFlowersDb,
  isFlowersDbConfigured,
  isShopSchemaOutdated,
  schema,
} from '@/db/flowers';
import { rowToBouquet } from '@/db/flowers/schema';
import { withoutCost } from '@/lib/bouquetCost';
import { sellsHere } from '@/lib/flowers';
import type { Bouquet } from '@/types/flower';

/**
 * One bouquet for its own page — read on the server, no API round trip, and
 * memoised per request because the metadata and the page body both want it.
 *
 * Returns null for anything not on show: an unlisted bouquet has been taken
 * out of the window on purpose, and a link to it should 404 rather than sell
 * something that is no longer offered. The same goes for anywhere the shop
 * does not deliver. What does come back has its costing
 * sheet removed — this page is server-rendered into HTML anyone can read.
 */
export const loadPublicBouquet = cache(async (id: string): Promise<Bouquet | null> => {
  if (!isFlowersDbConfigured()) return null;

  try {
    const rows = await getFlowersDb()
      .select()
      .from(schema.bouquets)
      .where(eq(schema.bouquets.id, id))
      .limit(1);

    if (!rows.length) return null;
    const bouquet = rowToBouquet(rows[0]);
    return bouquet.listed && sellsHere(bouquet) ? withoutCost(bouquet) : null;
  } catch (e) {
    // A shop still waiting for its migration has no window to show from.
    if (isShopSchemaOutdated(e)) return null;
    console.error('loadPublicBouquet', e);
    return null;
  }
});
