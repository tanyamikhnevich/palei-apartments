CREATE TABLE "cost_item_prices" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"item_id" varchar(64) NOT NULL,
	"unit_net" double precision NOT NULL,
	"vat" boolean NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cost_item_prices_item_idx" ON "cost_item_prices" USING btree ("item_id");