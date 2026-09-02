import {
  date,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import type {
  ApartmentAvailability,
  ApartmentLocaleCopy,
  ApartmentService,
  ApartmentStatus,
  ApartmentTagId,
  PriceTier,
  BookingChannel,
  BookingStatus,
} from '@/types/apartment';
import type { CalendarFeedSource, CalendarSyncStatus } from '@/types/calendar';
import type { Locale } from '@/i18n/types';
import type { CurrencyCode } from '@/types/settings';
import type { ReviewStatus } from '@/types/review';

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
  priceTiers: jsonb('price_tiers').$type<PriceTier[]>(),
  services: jsonb('services').$type<ApartmentService[]>(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  availability: jsonb('availability').$type<ApartmentAvailability>(),
  /** Secret path segment of the public iCal export other platforms subscribe to. */
  icalToken: varchar('ical_token', { length: 64 }),
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

/** An external iCal calendar (Airbnb, Booking.com …) we pull blocked dates from. */
export const calendarFeeds = pgTable('calendar_feeds', {
  id: varchar('id', { length: 64 }).primaryKey(),
  apartmentId: varchar('apartment_id', { length: 64 }).notNull(),
  source: varchar('source', { length: 32 }).notNull().$type<CalendarFeedSource>(),
  label: text('label').notNull(),
  url: text('url').notNull(),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  lastStatus: varchar('last_status', { length: 16 }).$type<CalendarSyncStatus>(),
  lastError: text('last_error'),
  eventCount: integer('event_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/** Blocked ranges imported from a feed; replaced wholesale on every successful sync. */
export const externalBlocks = pgTable('external_blocks', {
  id: varchar('id', { length: 128 }).primaryKey(),
  feedId: varchar('feed_id', { length: 64 }).notNull(),
  apartmentId: varchar('apartment_id', { length: 64 }).notNull(),
  uid: text('uid').notNull(),
  summary: text('summary'),
  checkIn: date('check_in').notNull(),
  checkOut: date('check_out').notNull(),
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

export const reviews = pgTable('reviews', {
  id: varchar('id', { length: 64 }).primaryKey(),
  apartmentId: varchar('apartment_id', { length: 64 }).notNull(),
  guestName: text('guest_name').notNull(),
  rating: integer('rating').notNull(),
  text: text('text'),
  /** Private phone number for moderation — never sent to the public site. */
  contact: text('contact'),
  status: varchar('status', { length: 32 }).notNull().$type<ReviewStatus>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * The people who can open the panel. The password is only ever here as a
 * PBKDF2 hash — nothing in the system can read it back.
 */
export const adminUsers = pgTable('admin_users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  /** Matched case-insensitively at sign-in; stored as typed. */
  login: text('login').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  /** Bumped on every password change, which retires the whole session family. */
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});

/**
 * One row per signed-in browser. The refresh token itself is never stored —
 * only its SHA-256 — so a copy of this table does not let anyone in.
 *
 * Rows are kept after they are spent rather than deleted: a refresh token that
 * comes back a second time is evidence the cookie was copied, and that is only
 * visible if the spent row is still here to recognise.
 */
export const adminSessions = pgTable('admin_sessions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  /** Groups every rotation of one sign-in, so theft can retire all of them. */
  familyId: varchar('family_id', { length: 64 }).notNull(),
  /** Set when this token is rotated away; the replacement's id. */
  replacedBy: varchar('replaced_by', { length: 64 }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  /** Free-text note for the sessions list — browser and platform, no more. */
  label: text('label'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export type ApartmentRow = typeof apartments.$inferSelect;
export type ApartmentInsert = typeof apartments.$inferInsert;
export type BookingRow = typeof bookings.$inferSelect;
export type CalendarFeedRow = typeof calendarFeeds.$inferSelect;
export type CalendarFeedInsert = typeof calendarFeeds.$inferInsert;
export type AdminUserRow = typeof adminUsers.$inferSelect;
export type AdminSessionRow = typeof adminSessions.$inferSelect;
export type ExternalBlockRow = typeof externalBlocks.$inferSelect;
export type ExternalBlockInsert = typeof externalBlocks.$inferInsert;
export type BookingInsert = typeof bookings.$inferInsert;
export type BusinessSettingsRow = typeof businessSettings.$inferSelect;
export type ReviewRow = typeof reviews.$inferSelect;
export type ReviewInsert = typeof reviews.$inferInsert;
