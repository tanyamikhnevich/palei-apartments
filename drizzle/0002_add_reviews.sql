-- Guest reviews, one row per submission, moderated before they appear publicly.
CREATE TABLE IF NOT EXISTS "reviews" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"apartment_id" varchar(64) NOT NULL,
	"guest_name" text NOT NULL,
	"rating" integer NOT NULL,
	"text" text,
	"contact" text,
	"status" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_apartment_status_idx" ON "reviews" ("apartment_id","status");
