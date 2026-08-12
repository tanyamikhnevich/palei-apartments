ALTER TABLE "apartments" ADD COLUMN IF NOT EXISTS "price_tiers" jsonb;--> statement-breakpoint
ALTER TABLE "apartments" ADD COLUMN IF NOT EXISTS "services" jsonb;--> statement-breakpoint
ALTER TABLE "apartments" ADD COLUMN IF NOT EXISTS "lat" double precision;--> statement-breakpoint
ALTER TABLE "apartments" ADD COLUMN IF NOT EXISTS "lng" double precision;
