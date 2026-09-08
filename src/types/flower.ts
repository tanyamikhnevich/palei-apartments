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
 * kind of item here, not a second product with its own everything.
 */
export type ItemKind = 'flowers' | 'balloons' | 'mixed';
export const ITEM_KINDS: ItemKind[] = ['flowers', 'balloons', 'mixed'];

export type BouquetCategory =
  | 'classic'
  | 'seasonal'
  | 'roses'
  | 'boxed'
  | 'plants'
  | 'numbers'
  | 'birthday'
  | 'baby';

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
  locales: Record<Locale, BouquetCopy>;
  /** What it cost to make. Admin-only — see {@link BouquetCost}. */
  cost?: BouquetCost;
}

/** One thing that went into the bouquet: how many, what, and what it cost. */
export interface CostLine {
  id: string;
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
  price: number;
  currency: string;
  deliveryDate: string;
  slot: DeliverySlot;
  address: string;
  recipient: string;
  recipientPhone: string;
  card?: string;
  guest: string;
  guestContact: string;
  status: FlowerOrderStatus;
  createdAt: string;
}
