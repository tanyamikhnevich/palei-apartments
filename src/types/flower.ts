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
