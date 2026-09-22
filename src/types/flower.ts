import type { Locale } from '@/i18n/types';
import type { ApartmentArea } from './region';

/**
 * A bouquet in the shop window.
 *
 * Not an apartment and not a car: there is nothing to be busy on, so no
 * calendar and no availability. What a bouquet has instead is a delivery — a
 * date, an address and someone to hand it to. That is the whole difference
 * between this and the two rental products, and it is why the request below
 * asks completely different questions.
 *
 * Lives in code until the shop earns its tables — see `src/data/flowers.ts`.
 */

/**
 * What is being sold. Balloons share the shop, the delivery and the order form
 * with flowers — the only thing that differs is what arrives — so they are a
 * kind of item here, not a second product with its own everything. Wine joined
 * on the same terms: a bottle to go with the bouquet, same delivery, same form.
 */
export type ItemKind = 'flowers' | 'balloons' | 'mixed' | 'wine';
export const ITEM_KINDS: ItemKind[] = ['flowers', 'balloons', 'mixed', 'wine'];

export type BouquetCategory =
  | 'classic'
  | 'seasonal'
  | 'roses'
  | 'boxed'
  | 'plants'
  | 'numbers'
  | 'birthday'
  | 'baby'
  | 'red'
  | 'white'
  | 'rose'
  | 'sparkling';

export interface BouquetCopy {
  name: string;
  note: string;
}

export interface Bouquet {
  id: string;
  /** Region it is sold in — decides the currency, like everything else. */
  area: ApartmentArea;
  kind: ItemKind;
  category: BouquetCategory;
  price: number;
  /** Stem count for flowers, balloon count for balloons — the size of it. */
  stems?: number;
  /** Can reach the recipient today if ordered before the cut-off. */
  sameDay: boolean;
  /** Off the window without deleting it — seasonal flowers come back. */
  listed: boolean;
  photos?: string[];
  /**
   * What gift wrapping costs on top, when this one is offered wrapped at all.
   * Undefined is the answer for most of the window: a boxed arrangement and a
   * balloon set have nothing to wrap, so the buyer is never asked.
   */
  wrappingPrice?: number;
  /**
   * Turns the card into the rose builder: the buyer picks how many, which
   * colour and how it is presented, instead of taking the bouquet as shot.
   * Undefined on everything else in the window — see {@link RoseBuilder}.
   */
  builder?: RoseBuilder;
  locales: Record<Locale, BouquetCopy>;
  /** What it cost to make. Admin-only — see {@link BouquetCost}. */
  cost?: BouquetCost;
}

/**
 * The made-to-order card: one rose, sold by the stem.
 *
 * The window sells photographs — this sells a choice, and the two do not mix on
 * one card. Someone who wants "51 white in a basket" is not browsing, and
 * someone who is browsing should not be asked three questions before they can
 * order what they are already looking at.
 *
 * Everything here is priced by the florist in admin. The stem price falls in
 * steps rather than by a formula, because that is how the supplier quotes it:
 * a tier says "from this many, each one costs this much".
 */
export interface RoseBuilder {
  /** How few, and how many, may be ordered. */
  min: number;
  max: number;
  /** One-tap counts, for the sizes people actually ask for. */
  presets: number[];
  /** Sorted by `from`; the first one starts at `min`. */
  tiers: StemTier[];
  colors: RoseColor[];
  /** Hand-tied, wrapped, in a basket — and what each adds. */
  presentations: Presentation[];
  /**
   * Tick-box additions: greenery, a vase, a card. Optional on the type because
   * cards set up before they existed have none, and an absent list means the
   * buyer is asked nothing.
   */
  extras?: BuilderExtra[];
}

export interface StemTier {
  /** The count this price starts applying at. */
  from: number;
  pricePerStem: number;
}

export interface RoseColor {
  id: string;
  /** English, like the rest of the card's copy. */
  label: string;
  /** For the swatch the buyer taps — a hex colour. */
  swatch: string;
  /**
   * The second half of the swatch on a mixed colour — "red and white" is one
   * choice to the buyer, not two, so it is one entry here with two hues.
   */
  swatch2?: string;
  /**
   * The made-up colour: picking it asks how many of each of the others. One
   * entry rather than a pair per combination — "red and white" and "red, white
   * and pink" are the same question with different answers.
   */
  mix?: boolean;
  /**
   * Days needed to get it in. Zero is "in stock"; anything else pushes the
   * earliest delivery date out, so the buyer sees the wait while choosing
   * rather than hearing about it on the phone afterwards.
   */
  leadDays: number;
  /**
   * Not promised, but not hidden either: the colour can usually be had, and
   * the florist says yes or no when confirming the order. Unlike `leadDays`
   * this moves no dates — it is an honest "let me check", which is what the
   * shop can actually promise for anything but the red ones.
   */
  onRequest?: boolean;
}

/** Something ticked on top of the roses, priced flat. */
export interface BuilderExtra {
  id: string;
  label: string;
  price: number;
}

export interface Presentation {
  id: string;
  label: string;
  /** Added to the stems' price. Zero for plain, stem-tied roses. */
  price: number;
  /**
   * What it costs at bigger sizes, when it is not one price: a basket for 101
   * roses is a different basket from the one for 11. Same rule as the stem
   * tiers — the last `from` reached wins — and an empty list means `price`
   * covers every size.
   */
  tiers?: PresentationTier[];
}

export interface PresentationTier {
  from: number;
  price: number;
}

/** What the buyer chose on a builder card. */
export interface RoseSelection {
  count: number;
  colorId: string;
  presentationId: string;
  /** Ticked extras, by id. Absent means none were offered or none chosen. */
  extraIds?: string[];
  /** How many of each colour, when a mix was picked. Must add up to `count`. */
  mix?: Record<string, number>;
}

/** One thing that went into the bouquet: how many, what, and what it cost. */
export interface CostLine {
  id: string;
  /**
   * The price-list entry this line is bought from — see {@link CostItem}. Set,
   * the name, price and VAT below are the list's, copied in and rewritten
   * whenever the list changes, so every sheet using it moves together. Unset,
   * the line is typed by hand and belongs to this sheet alone.
   */
  itemId?: string;
  qty: number;
  name: string;
  /** Price of one, net of VAT — the number the supplier's invoice quotes. */
  unitNet: number;
  /**
   * Whether VAT is added to this line. Per line, not per sheet: the roses come
   * off an invoice that charges it and the ribbon from a market stall that does
   * not, and both go into the same bouquet.
   */
  vat: boolean;
}

/** How the price list is shelved. */
export type CostGroup = 'flowers' | 'greenery' | 'balloons' | 'packaging' | 'wine' | 'other';
export const COST_GROUPS: CostGroup[] = [
  'flowers',
  'greenery',
  'balloons',
  'packaging',
  'wine',
  'other',
];

/**
 * One thing the shop buys, priced once: "Roses, Lovely Red 50 cm" at 3.00 net.
 *
 * The costing sheets point at these rather than each keeping its own copy of
 * the price, so a supplier putting roses up is one edit — here — and every
 * bouquet made of them is re-costed at once. Admin-only, like the sheets.
 */
export interface CostItem {
  id: string;
  /** The Russian name — or whatever it is called, for things with one name. */
  name: string;
  /** The Hebrew name, as it reads on the supplier's invoice. */
  nameHe?: string;
  group: CostGroup;
  /** Price of one, net of VAT — as the supplier's invoice quotes it. */
  unitNet: number;
  /** Whether VAT is paid on top; the rate is the sheet's. */
  vat: boolean;
  updatedAt?: string;
  /** Every price it has had, oldest first — the first entry is where it started. */
  history?: CostPricePoint[];
}

/** One price a list entry had, and from when. */
export interface CostPricePoint {
  unitNet: number;
  vat: boolean;
  /** ISO timestamp of the change. */
  at: string;
}

/**
 * The costing sheet behind a bouquet: the stems and wrapping that went into it,
 * plus the time spent making it.
 *
 * Private by construction. Supplier prices and the margin they imply are the
 * florist's business, so this never leaves admin — the public window and the
 * public bouquet page both strip it before the number reaches a browser.
 *
 * Flowers are bought net and sold gross, so the sheet keeps the net prices and
 * adds VAT on top, line by line, rather than storing two numbers that can drift
 * apart.
 */
export interface BouquetCost {
  lines: CostLine[];
  /**
   * Percent, and shared by every line that is marked as carrying VAT — the rate
   * is the country's, so only which lines it touches is a per-line question.
   */
  vatRate: number;
  /** Hours spent on it, and what an hour of that time is worth. */
  hours: number;
  hourlyRate: number;
}

/** What the guest fills in. There is no cart: one bouquet, one delivery. */
export interface FlowerOrderDraft {
  bouquetId: string;
  date: string;
  slot: DeliverySlot;
  address: string;
  recipient: string;
  recipientPhone: string;
  /** Handwritten on the card that goes with it. */
  card?: string;
  /**
   * Anything the florist should know before making it up — an allergy, a
   * building code, "no lilies". Not the card: this one nobody reads aloud.
   */
  comment?: string;
  /** Wrapped, on the items that offer it. */
  wrapping?: boolean;
  /** What was chosen on a builder card; ignored on every other card. */
  roses?: RoseSelection;
  name: string;
  contact: string;
}

export type DeliverySlot = 'morning' | 'afternoon' | 'evening';
export const DELIVERY_SLOTS: DeliverySlot[] = ['morning', 'afternoon', 'evening'];

export type FlowerOrderStatus = 'New' | 'Confirmed' | 'Delivered' | 'Cancelled';
export const FLOWER_ORDER_STATUSES: FlowerOrderStatus[] = [
  'New',
  'Confirmed',
  'Delivered',
  'Cancelled',
];

/** A placed order, as it is worked through in admin. */
export interface FlowerOrder {
  id: string;
  bouquetId: string;
  /** Copied at order time — the window changes, the order should not. */
  itemName: string;
  /** What the order comes to, wrapping included. */
  price: number;
  wrapping: boolean;
  currency: string;
  deliveryDate: string;
  slot: DeliverySlot;
  address: string;
  recipient: string;
  recipientPhone: string;
  card?: string;
  comment?: string;
  guest: string;
  guestContact: string;
  status: FlowerOrderStatus;
  createdAt: string;
}
