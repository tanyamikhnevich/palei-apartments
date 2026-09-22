CREATE TABLE "cost_items" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"group" varchar(16) DEFAULT 'other' NOT NULL,
	"unit_net" double precision DEFAULT 0 NOT NULL,
	"vat" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
