CREATE TABLE "bouquets" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"area" varchar(32) NOT NULL,
	"category" varchar(24) NOT NULL,
	"price" integer NOT NULL,
	"stems" integer,
	"same_day" boolean DEFAULT true NOT NULL,
	"listed" boolean DEFAULT true NOT NULL,
	"photos" jsonb,
	"locales" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
