import { boolean, date, integer, jsonb, pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core';
import type { CarClass, CarRateTier, CarStatus, Transmission } from '@/types/car';

/**
 * The fleet's own schema, in its own database.
 *
 * Deliberately separate from the apartments schema: cars and apartments share
 * no rows and no foreign keys, so they can live on different connections and be
 * backed up, migrated and — if it ever comes to it — moved apart without either
 * noticing. `CARS_DATABASE_URL` points it somewhere else; without it, it falls
 * back to the main database and simply keeps its own tables there.
 */
export const cars = pgTable('cars', {
  id: varchar('id', { length: 64 }).primaryKey(),
  /** Region the car is based in — decides its currency, like an apartment's. */
  area: varchar('area', { length: 32 }).notNull(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  carClass: varchar('car_class', { length: 24 }).notNull().$type<CarClass>(),
  transmission: varchar('transmission', { length: 16 }).notNull().$type<Transmission>(),
  seats: integer('seats').notNull(),
  bags: integer('bags').notNull().default(2),
  airConditioning: boolean('air_conditioning').notNull().default(true),
  pricePerDay: integer('price_per_day').notNull(),
  rateTiers: jsonb('rate_tiers').$type<CarRateTier[]>(),
  minDays: integer('min_days').notNull().default(1),
  deposit: integer('deposit').notNull().default(0),
  pickupPoints: jsonb('pickup_points').notNull().$type<string[]>(),
  photos: jsonb('photos').$type<string[]>(),
  status: varchar('status', { length: 24 }).notNull().$type<CarStatus>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Blocked ranges, one row per booked stretch — a table rather than a JSON blob
 * so the calendar can add and remove single ranges without rewriting the car.
 * `to` is exclusive: the return day is free for the next hire.
 */
export const carBlocks = pgTable('car_blocks', {
  id: varchar('id', { length: 64 }).primaryKey(),
  carId: varchar('car_id', { length: 64 }).notNull(),
  from: date('from').notNull(),
  to: date('to').notNull(),
  /** Why it is blocked — a hire, a service, an owner's trip. */
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const carsSchema = { cars, carBlocks };
