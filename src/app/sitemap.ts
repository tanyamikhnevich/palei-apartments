import type { MetadataRoute } from 'next';
import { asc } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { isApartmentListedOnSite } from '@/lib/apartmentVisibility';
import { rowToApartment } from '@/db/map';
import { isDbConfigured } from '@/lib/api/errors';
import { isSectionLive } from '@/lib/services';
import { unstable_cache } from 'next/cache';
import { SITE_URL } from '@/lib/seo';
import { localeAlternates, localePath } from '@/i18n/routing';
import { LOCALES } from '@/i18n/types';

/**
 * Rebuilt hourly: apartments come and go far more slowly than that.
 *
 * `export const revalidate` alone does nothing here — Neon's driver runs its
 * queries with `no-store`, which opts the route out of caching entirely, so
 * every crawler hit went to the database. Caching the query itself is what
 * actually holds.
 */
export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

/**
 * One line per page per language, each declaring the other three.
 *
 * A sitemap that lists only the English addresses tells Google the
 * translations do not exist; `alternates.languages` is how the four are
 * presented as one page in four languages rather than four rival pages.
 */
function alternatesFor(path: string) {
  const map = localeAlternates(path);
  return {
    languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}${map[l]}`])),
  };
}

function entries(
  path: string,
  priority: number,
  changeFrequency: Entry['changeFrequency'],
  lastModified: Date = new Date()
): Entry[] {
  return LOCALES.map((locale) => ({
    url: `${SITE_URL}${localePath(path, locale)}`,
    lastModified,
    changeFrequency,
    priority,
    alternates: alternatesFor(path),
  }));
}

/**
 * Only pages a guest can actually open.
 *
 * A parked section is left out rather than listed — its routes answer 404, and
 * a sitemap full of 404s is how a site teaches Google to trust it less. The
 * panel is absent for the same reason it is absent from robots.txt.
 */
const listApartments = unstable_cache(
  async () => getDb().select().from(schema.apartments).orderBy(asc(schema.apartments.id)),
  ['sitemap-apartments'],
  { revalidate: 3600 }
);

async function apartmentEntries(): Promise<Entry[]> {
  if (!isDbConfigured()) return [];

  try {
    const rows = await listApartments();

    return rows
      .filter((row) => isApartmentListedOnSite(rowToApartment(row)))
      .flatMap((row) =>
        entries(`/apartments/${row.id}`, 0.8, 'weekly', row.updatedAt ?? new Date())
      );
  } catch (e) {
    // A sitemap missing its detail pages is a smaller problem than a sitemap
    // that fails to build at all.
    console.error('sitemap: could not list apartments', e);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: Entry[] = [
    ...entries('/', 1, 'weekly'),
    ...entries('/apartments', 0.9, 'daily'),
    ...entries('/about', 0.5, 'monthly'),
    ...entries('/location', 0.5, 'monthly'),
    ...entries('/contact', 0.5, 'monthly'),
  ];

  if (isSectionLive('/flowers')) pages.push(...entries('/flowers', 0.6, 'monthly'));
  if (isSectionLive('/cars')) pages.push(...entries('/cars', 0.6, 'monthly'));
  if (isSectionLive('/cyprus')) pages.push(...entries('/cyprus', 0.7, 'weekly'));

  return [...pages, ...await apartmentEntries()];
}
