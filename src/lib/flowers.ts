import type { Bouquet, BouquetCopy } from '@/types/flower';
import type { Locale } from '@/i18n/types';
import type { CurrencyCode } from '@/types/settings';
import type { Region } from '@/types/region';
import { REGIONS } from '@/types/region';
import { countryOf, currencyOf, regionForArea } from '@/lib/regions';

/**
 * Where the shop sells. Israel only, and not by oversight: flowers are cut,
 * driven and handed over the same day, so a bouquet cannot be sold anywhere the
 * florist cannot reach that morning. The Cyprus apartments have no florist
 * behind them, so Cyprus is not offered — in the window, on the bouquet pages,
 * or in the admin picker that creates them.
 */
export const FLOWER_COUNTRY: Region['country'] = 'IL';

/** The regions a bouquet may belong to — what admin is allowed to choose. */
export const FLOWER_REGIONS = REGIONS.filter((r) => r.country === FLOWER_COUNTRY);

export const DEFAULT_FLOWER_AREA = FLOWER_REGIONS[0].area;

/**
 * Whether the shop reaches it at all. Takes a plain area because the callers
 * that need it most are holding a database row, not a typed bouquet.
 */
export function sellsHere(item: { area: string }): boolean {
  return regionForArea(item.area).country === FLOWER_COUNTRY;
}

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

/**
 * The window's top-level split. Balloons and flowers share a shop, a delivery
 * and an order form, but nobody browses them together: a wall of birthday foil
 * between two bouquets helps neither shopper.
 */
export type KindFilter = 'all' | 'flowers' | 'balloons';
export const KIND_FILTERS: KindFilter[] = ['all', 'flowers', 'balloons'];

/** `mixed` is both at once, so it belongs under either heading — never alone. */
export function bouquetsOfKind(list: Bouquet[], kind: KindFilter): Bouquet[] {
  if (kind === 'all') return list;
  return list.filter((b) => b.kind === kind || b.kind === 'mixed');
}

/** Whether the split is worth offering at all — one kind needs no switch. */
export function windowMixesKinds(list: Bouquet[]): boolean {
  return new Set(list.map((b) => b.kind)).size > 1;
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
