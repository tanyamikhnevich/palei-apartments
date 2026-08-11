-- Two-way iCal calendar sync (Airbnb, Booking.com …).
-- `calendar_feeds` are the calendars we import from; `external_blocks` are the
-- ranges pulled from them; `ical_token` is the secret segment of the export URL
-- other platforms subscribe to.

ALTER TABLE "apartments" ADD COLUMN IF NOT EXISTS "ical_token" varchar(64);
--> statement-breakpoint
UPDATE "apartments"
SET "ical_token" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "ical_token" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "apartments_ical_token_idx" ON "apartments" ("ical_token");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_feeds" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"apartment_id" varchar(64) NOT NULL,
	"source" varchar(32) NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_status" varchar(16),
	"last_error" text,
	"event_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_feeds_apartment_idx" ON "calendar_feeds" ("apartment_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "external_blocks" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"feed_id" varchar(64) NOT NULL,
	"apartment_id" varchar(64) NOT NULL,
	"uid" text NOT NULL,
	"summary" text,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_blocks_apartment_idx" ON "external_blocks" ("apartment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_blocks_feed_idx" ON "external_blocks" ("feed_id");
