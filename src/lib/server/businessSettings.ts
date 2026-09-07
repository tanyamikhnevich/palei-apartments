import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { rowToSettings } from '@/db/map';
import { isDbConfigured } from '@/lib/api/errors';
import { DEFAULT_BUSINESS_SETTINGS, type BusinessSettings } from '@/types/settings';

const SETTINGS_ID = 'default';

/**
 * The business details the owner edits in the panel — read here on the server
 * rather than fetched by the browser, so the phone number is in the HTML from
 * the first paint instead of replacing a placeholder a moment later.
 *
 * Costs nothing in rendering terms: the root layout already reads a header to
 * decide the language, so every page is rendered per request either way. React's
 * `cache` keeps it to one query per request however many components ask.
 *
 * A database that is missing or unwell falls back to the defaults rather than
 * failing the page. A footer with a placeholder number is a smaller problem
 * than a site that will not render.
 */
export const readBusinessSettings = cache(async (): Promise<BusinessSettings> => {
  if (!isDbConfigured()) return DEFAULT_BUSINESS_SETTINGS;

  try {
    const rows = await getDb()
      .select()
      .from(schema.businessSettings)
      .where(eq(schema.businessSettings.id, SETTINGS_ID))
      .limit(1);

    return rowToSettings(rows[0]);
  } catch (e) {
    console.error('readBusinessSettings', e);
    return DEFAULT_BUSINESS_SETTINGS;
  }
});
