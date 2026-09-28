import type { Bouquet, BouquetCategory } from '@/types/flower';
import { isBuilder } from '@/lib/roseBuilder';
import { CATEGORIES } from '@/lib/flowers';

/**
 * The shop's aisles, as a buyer walks them — what the header lists and what
 * each `/flowers/<slug>` page shows.
 *
 * Not the same thing as an item's `kind` and `category`. Those describe what
 * the florist made; these describe what someone came looking for. "Roses" is a
 * category of flowers *and* the made-to-order card, and a flowers-and-balloons
 * set is looked for under either word — so an aisle is a rule over the item,
 * not a column in the database. Admin keeps choosing kind and category as it
 * always has, and the aisles follow.
 */
export type ShopCategory = 'bouquets' | 'roses' | 'boxes' | 'plants' | 'balloons' | 'wine';

/** Header order — also the order the front page lays its shelves out in. */
export const SHOP_CATEGORIES: ShopCategory[] = [
  'bouquets',
  'roses',
  'boxes',
  'plants',
  'balloons',
  'wine',
];

/** The flower categories that have an aisle of their own rather than living under bouquets. */
const OWN_AISLE: BouquetCategory[] = ['roses', 'boxed', 'plants'];

const MATCHES: Record<ShopCategory, (b: Bouquet) => boolean> = {
  roses: (b) => isBuilder(b) || (b.kind === 'flowers' && b.category === 'roses'),
  boxes: (b) => (b.kind === 'flowers' || b.kind === 'mixed') && b.category === 'boxed',
  plants: (b) => b.kind === 'flowers' && b.category === 'plants',
  // Everything flowery that has no aisle of its own, so nothing falls through.
  bouquets: (b) =>
    (b.kind === 'flowers' && !isBuilder(b) && !OWN_AISLE.includes(b.category)) ||
    (b.kind === 'mixed' && b.category !== 'boxed'),
  balloons: (b) => b.kind === 'balloons' || b.kind === 'mixed',
  wine: (b) => b.kind === 'wine',
};

export function isShopCategory(value: string): value is ShopCategory {
  return (SHOP_CATEGORIES as string[]).includes(value);
}

export function inCategory(bouquet: Bouquet, category: ShopCategory): boolean {
  return MATCHES[category](bouquet);
}

/**
 * The aisles with something on them, in header order. The header, the front
 * page and the sitemap all offer only these: a link that opens onto an empty
 * shelf is a promise the shop cannot keep today. Takes the public window —
 * listed, delivered here — so what counts is what a buyer could order.
 */
export function stockedCategories(window: Bouquet[]): ShopCategory[] {
  return SHOP_CATEGORIES.filter((c) => window.some((b) => MATCHES[c](b)));
}

/**
 * The one aisle an item is shelved under when it can only be shown once — on
 * the front page, and as the way back from its own page. Most specific first:
 * a boxed flowers-and-balloons set is a box before it is a bouquet.
 */
const PRIMARY_ORDER: ShopCategory[] = ['roses', 'boxes', 'plants', 'bouquets', 'balloons', 'wine'];

export function primaryCategory(bouquet: Bouquet): ShopCategory {
  return PRIMARY_ORDER.find((c) => MATCHES[c](bouquet)) ?? 'bouquets';
}

/**
 * What to offer alongside an item — the shop has no basket yet, so a second
 * thing goes to the same address as a second order, offered right after the
 * first. Flowers get a bottle of red, a sparkling one and a balloon set; wine
 * and balloons get a bouquet and whichever of the two they are not. The
 * cheapest of each, so the suggestion reads as a small addition rather than a
 * second present. Only what is on show and can actually be ordered as it is —
 * never the rose builder, which needs its own choices made.
 */
export function addOnsFor(bought: Bouquet, window: Bouquet[]): Bouquet[] {
  const offer = window.filter((b) => b.listed && !isBuilder(b) && b.id !== bought.id);
  const cheapest = (match: (b: Bouquet) => boolean) =>
    offer.filter(match).sort((a, b) => a.price - b.price)[0];

  const redWine = () => cheapest((b) => b.kind === 'wine' && b.category === 'red');
  const sparkling = () => cheapest((b) => b.kind === 'wine' && b.category === 'sparkling');
  const balloons = () => cheapest((b) => b.kind === 'balloons');
  const bouquet = () => cheapest((b) => b.kind === 'flowers');

  const picks =
    bought.kind === 'wine'
      ? [bouquet(), balloons()]
      : bought.kind === 'balloons'
        ? [bouquet(), redWine()]
        : [redWine(), sparkling(), balloons()];
  return picks.filter((b): b is Bouquet => Boolean(b));
}

/**
 * The finer split inside an aisle, where one is worth offering: someone after
 * champagne should not scroll past the reds, nor someone after a "1" past the
 * baby-shower sets. Listed in the order the admin form offers them.
 */
export const SUB_FILTERS: Partial<Record<ShopCategory, BouquetCategory[]>> = {
  wine: CATEGORIES.wine,
  balloons: CATEGORIES.balloons,
};
