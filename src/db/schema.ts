import { date, integer, jsonb, pgTable, real, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import type {
  ApartmentAvailability,
  ApartmentLocaleCopy,
  ApartmentStatus,
  ApartmentTagId,
  BookingChannel,
  BookingStatus,
} from '@/types/apartment';
import type { Locale } from '@/i18n/types';
import type { CurrencyCode } from '@/types/settings';

export type ApartmentLocales = Record<Locale, ApartmentLocaleCopy>;

export const apartments = pgTable('apartments', {
  id: varchar('id', { length: 64 }).primaryKey(),
  area: varchar('area', { length: 32 }).notNull(),
  guests: integer('guests').notNull(),
  bedrooms: integer('bedrooms').notNull(),
  beds: integer('beds').notNull().default(1),
  bathrooms: integer('bathrooms').notNull(),
  price: integer('price').notNull(),
  minNights: integer('min_nights').notNull().default(1),
  status: varchar('status', { length: 32 }).notNull().$type<ApartmentStatus>(),
  tagIds: jsonb('tag_ids').notNull().$type<string[]>(),
  rating: real('rating').notNull(),
  reviews: integer('reviews').notNull(),
  photos: jsonb('photos').$type<string[]>(),
  availability: jsonb('availability').$type<ApartmentAvailability>(),
  locales: jsonb('locales').notNull().$type<ApartmentLocales>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const bookings = pgTable('bookings', {
  id: varchar('id', { length: 64 }).primaryKey(),
  apartmentId: varchar('apartment_id', { length: 64 }).notNull(),
  apartmentTitle: text('apartment_title').notNull(),
  guest: text('guest').notNull(),
  guestContact: text('guest_contact'),
  checkIn: date('check_in').notNull(),
  checkOut: date('check_out').notNull(),
  guests: integer('guests').notNull(),
  status: varchar('status', { length: 32 }).notNull().$type<BookingStatus>(),
  channel: varchar('channel', { length: 32 }).notNull().$type<BookingChannel>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const businessSettings = pgTable('business_settings', {
  id: varchar('id', { length: 32 }).primaryKey().default('default'),
  businessName: text('business_name').notNull(),
  contactPhone: text('contact_phone').notNull(),
  contactEmail: text('contact_email').notNull(),
  whatsappNumber: text('whatsapp_number').notNull(),
  defaultLanguage: varchar('default_language', { length: 8 }).notNull().$type<Locale>(),
  currency: varchar('currency', { length: 8 }).notNull().$type<CurrencyCode>(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ApartmentRow = typeof apartments.$inferSelect;
export type ApartmentInsert = typeof apartments.$inferInsert;
export type BookingRow = typeof bookings.$inferSelect;
export type BookingInsert = typeof bookings.$inferInsert;
export type BusinessSettingsRow = typeof businessSettings.$inferSelect;
