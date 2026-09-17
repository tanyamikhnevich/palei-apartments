ALTER TABLE "bouquets" ADD COLUMN "wrapping_price" integer;--> statement-breakpoint
ALTER TABLE "flower_orders" ADD COLUMN "wrapping" boolean DEFAULT false NOT NULL;