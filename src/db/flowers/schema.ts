import {
  boolean,
  date,
  doublePrecision,
  index,
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
  BouquetCost,
  CostGroup,
  CostItem,
  DeliverySlot,
  FlowerOrder,
  FlowerOrderStatus,
  ItemKind,
  RoseBuilder,
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
  /** Surcharge for gift wrapping; null on anything not offered wrapped. */
  wrappingPrice: integer('wrapping_price'),
  /** Set on the made-to-order rose card only — see `RoseBuilder`. */
  builder: jsonb('builder').$type<RoseBuilder>(),
  locales: jsonb('locales').notNull().$type<Record<Locale, BouquetCopy>>(),
  /** The costing sheet. Admin-only — stripped before the window sees a row. */
  cost: jsonb('cost').$type<BouquetCost>(),
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
    wrappingPrice: row.wrappingPrice ?? undefined,
    builder: row.builder ?? undefined,
    locales: row.locales,
    cost: row.cost ?? undefined,
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
    wrappingPrice: bouquet.wrappingPrice ?? null,
    builder: bouquet.builder ?? null,
    locales: bouquet.locales,
    cost: bouquet.cost ?? null,
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
  /** The buyer's note to the florist. Optional, and often the useful part. */
  comment: text('comment'),
  wrapping: boolean('wrapping').notNull().default(false),
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
    comment: row.comment ?? undefined,
    wrapping: row.wrapping,
    guest: row.guest,
    guestContact: row.guestContact,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * A bouquet half-way through being added from the florist's Telegram bot, one
 * per chat. The bot runs as a webhook — every message is a fresh serverless
 * call — so the conversation has to remember where it is somewhere other than
 * memory. Removed once the bouquet is saved or the florist cancels.
 */
export const botDrafts = pgTable('bot_drafts', {
  chatId: varchar('chat_id', { length: 32 }).primaryKey(),
  step: varchar('step', { length: 16 }).notNull(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * The price list the costing sheets draw from — one row per thing bought, so
 * its price lives in one place. See `CostItem`.
 */
export const costItems = pgTable('cost_items', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: text('name').notNull(),
  nameHe: text('name_he'),
  group: varchar('group', { length: 16 }).notNull().default('other').$type<CostGroup>(),
  /** Kept to the cent: a stem bought at 3.60 is not a stem at 4. */
  unitNet: doublePrecision('unit_net').notNull().default(0),
  vat: boolean('vat').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type CostItemRow = typeof costItems.$inferSelect;

export function rowToCostItem(row: CostItemRow): CostItem {
  return {
    id: row.id,
    name: row.name,
    nameHe: row.nameHe ?? undefined,
    group: row.group,
    unitNet: row.unitNet,
    vat: row.vat,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Every price a list entry has had. Written on each change of price or VAT, so
 * "roses went from 3.00 to 3.60 in March" can be read back rather than
 * remembered. Kept after the entry is deleted: it is a record, not a setting.
 */
export const costItemPrices = pgTable(
  'cost_item_prices',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    itemId: varchar('item_id', { length: 64 }).notNull(),
    unitNet: doublePrecision('unit_net').notNull(),
    vat: boolean('vat').notNull(),
    changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ byItem: index('cost_item_prices_item_idx').on(t.itemId) })
);

export const flowersSchema = { bouquets, flowerOrders, botDrafts, costItems, costItemPrices };
