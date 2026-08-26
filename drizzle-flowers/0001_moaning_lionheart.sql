CREATE TABLE "flower_orders" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"bouquet_id" varchar(64) NOT NULL,
	"item_name" text NOT NULL,
	"price" integer NOT NULL,
	"currency" varchar(8) NOT NULL,
	"delivery_date" date NOT NULL,
	"slot" varchar(16) NOT NULL,
	"address" text NOT NULL,
	"recipient" text NOT NULL,
	"recipient_phone" text NOT NULL,
	"card" text,
	"guest" text NOT NULL,
	"guest_contact" text NOT NULL,
	"status" varchar(24) DEFAULT 'New' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bouquets" ADD COLUMN "kind" varchar(16) DEFAULT 'flowers' NOT NULL;