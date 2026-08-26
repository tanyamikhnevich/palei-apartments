CREATE TABLE "car_blocks" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"car_id" varchar(64) NOT NULL,
	"from" date NOT NULL,
	"to" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cars" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"area" varchar(32) NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"car_class" varchar(24) NOT NULL,
	"transmission" varchar(16) NOT NULL,
	"seats" integer NOT NULL,
	"bags" integer DEFAULT 2 NOT NULL,
	"air_conditioning" boolean DEFAULT true NOT NULL,
	"price_per_day" integer NOT NULL,
	"rate_tiers" jsonb,
	"min_days" integer DEFAULT 1 NOT NULL,
	"deposit" integer DEFAULT 0 NOT NULL,
	"pickup_points" jsonb NOT NULL,
	"photos" jsonb,
	"status" varchar(24) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
