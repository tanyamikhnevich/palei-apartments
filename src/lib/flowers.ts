import type { Bouquet, BouquetCopy } from '@/types/flower';
import type { Locale } from '@/i18n/types';
import type { CurrencyCode } from '@/types/settings';
import type { Region } from '@/types/region';
import { countryOf, currencyOf } from '@/lib/regions';

export function bouquetCurrency(bouquet: Bouquet): CurrencyCode {
  return currencyOf(bouquet);
}

/**
 * Copy for one language, falling back **field by field** rather than all or
 * nothing. Fill in English only and every other language shows English instead
 * of a blank card — which is what actually happens when a shop adds a bouquet
 * in a hurry.
 */
export function bouquetCopy(bouquet: Bouquet, locale: Locale): BouquetCopy {
  const wanted = bouquet.locales[locale];
  const fallback = bouquet.locales.en;
  return {
    name: wanted?.name?.trim() || fallback?.name || '',
    note: wanted?.note?.trim() || fallback?.note || '',
  };
}

export function bouquetsInCountry(
  list: Bouquet[],
  country: Region['country'] | undefined
): Bouquet[] {
  if (!country) return list;
  return list.filter((b) => countryOf(b) === country);
}

/** What the window shows: listed only, cheapest first. */
export function windowBouquets(list: Bouquet[]): Bouquet[] {
  return list.filter((b) => b.listed).sort((a, b) => a.price - b.price);
}

export function bouquetsInCategory(list: Bouquet[], category: string | null): Bouquet[] {
  return category ? list.filter((b) => b.category === category) : list;
}

/** Categories actually present, so the filter never offers an empty one. */
export function collectCategories(list: Bouquet[]): string[] {
  return [...new Set(list.map((b) => b.category))];
}

/**
 * Same-day only holds while the florist can still get to the market. After the
 * cut-off the earliest honest date is tomorrow, and the form says so rather
 * than taking an order we cannot keep.
 */
export const SAME_DAY_CUTOFF_HOUR = 14;

export function earliestDelivery(bouquet: Bouquet, now = new Date()): string {
  const day = new Date(now);
  const tooLate = now.getHours() >= SAME_DAY_CUTOFF_HOUR;
  if (!bouquet.sameDay || tooLate) day.setDate(day.getDate() + 1);
  return day.toISOString().slice(0, 10);
}
