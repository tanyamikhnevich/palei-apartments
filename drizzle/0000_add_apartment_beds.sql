-- Adds beds column to existing apartments table (Neon / production).
ALTER TABLE "apartments" ADD COLUMN IF NOT EXISTS "beds" integer NOT NULL DEFAULT 1;
--> statement-breakpoint
UPDATE "apartments" SET "beds" = GREATEST("bedrooms", 1);
