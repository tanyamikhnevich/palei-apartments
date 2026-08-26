import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import type {
  Bouquet,
  BouquetCategory,
  BouquetCopy,
  DeliverySlot,
  FlowerOrder,
  FlowerOrderStatus,
  ItemKind,
} from '@/types/flower';
import type { Locale } from '@/i18n/types';

/**
 * The shop's own schema, in its own database — the same arrangement the fleet
 * has. No foreign keys to apartments or cars, so the three can be migrated,
 * backed up and moved apart without any of them noticing.
 */
export const bouquets = pgTable('bouquets', {
  id: varchar('id', { length: 64 }).primaryKey(),
  area: varchar('area', { length: 32 }).notNull(),
  /** flowers | balloons | mixed — added once balloons joined the shop. */
  kind: varchar('kind', { length: 16 }).notNull().default('flowers').$type<ItemKind>(),
  category: varchar('category', { length: 24 }).notNull().$type<BouquetCategory>(),
  price: integer('price').notNull(),
  stems: integer('stems'),
  sameDay: boolean('same_day').notNull().default(true),
  listed: boolean('listed').notNull().default(true),
  photos: jsonb('photos').$type<string[]>(),
  locales: jsonb('locales').notNull().$type<Record<Locale, BouquetCopy>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type BouquetRow = typeof bouquets.$inferSelect;

export function rowToBouquet(row: BouquetRow): Bouquet {
  return {
    id: row.id,
    area: row.area as Bouquet['area'],
    kind: row.kind,
    category: row.category,
    price: row.price,
    stems: row.stems ?? undefined,
    sameDay: row.sameDay,
    listed: row.listed,
    photos: row.photos ?? undefined,
    locales: row.locales,
  };
}

export function bouquetToInsert(bouquet: Bouquet) {
  return {
    id: bouquet.id,
    area: bouquet.area,
    kind: bouquet.kind,
    category: bouquet.category,
    price: bouquet.price,
    stems: bouquet.stems ?? null,
    sameDay: bouquet.sameDay,
    listed: bouquet.listed,
    photos: bouquet.photos ?? null,
    locales: bouquet.locales,
  };
}


/**
 * Orders placed on the shop, so they can be worked through in admin instead of
 * living only in a chat thread. Deliberately a flat row: there is no cart, so
 * one order is one item at one address.
 */
export const flowerOrders = pgTable('flower_orders', {
  id: varchar('id', { length: 64 }).primaryKey(),
  bouquetId: varchar('bouquet_id', { length: 64 }).notNull(),
  /** Copied at order time — the window changes, the order should not. */
  itemName: text('item_name').notNull(),
  price: integer('price').notNull(),
  currency: varchar('currency', { length: 8 }).notNull(),
  deliveryDate: date('delivery_date').notNull(),
  slot: varchar('slot', { length: 16 }).notNull().$type<DeliverySlot>(),
  address: text('address').notNull(),
  recipient: text('recipient').notNull(),
  recipientPhone: text('recipient_phone').notNull(),
  card: text('card'),
  guest: text('guest').notNull(),
  guestContact: text('guest_contact').notNull(),
  status: varchar('status', { length: 24 }).notNull().default('New').$type<FlowerOrderStatus>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type FlowerOrderRow = typeof flowerOrders.$inferSelect;

export function rowToOrder(row: FlowerOrderRow): FlowerOrder {
  return {
    id: row.id,
    bouquetId: row.bouquetId,
    itemName: row.itemName,
    price: row.price,
    currency: row.currency,
    deliveryDate: String(row.deliveryDate).slice(0, 10),
    slot: row.slot,
    address: row.address,
    recipient: row.recipient,
    recipientPhone: row.recipientPhone,
    card: row.card ?? undefined,
    guest: row.guest,
    guestContact: row.guestContact,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export const flowersSchema = { bouquets, flowerOrders };
