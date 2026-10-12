CREATE TABLE "access_codes" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"apartment_id" varchar(64) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"code" text NOT NULL,
	"valid_from" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "check_in_guides" (
	"apartment_id" varchar(64) PRIMARY KEY NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"check_in_time" varchar(5) DEFAULT '15:00' NOT NULL,
	"check_out_time" varchar(5) DEFAULT '11:00' NOT NULL,
	"reveal_hours" integer DEFAULT 3 NOT NULL,
	"wifi_name" text DEFAULT '' NOT NULL,
	"wifi_password" text DEFAULT '' NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_passes" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"apartment_id" varchar(64) NOT NULL,
	"booking_id" varchar(64),
	"guest_name" text NOT NULL,
	"guest_contact" text,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"revoked_at" timestamp with time zone,
	"first_opened_at" timestamp with time zone,
	"last_opened_at" timestamp with time zone,
	"open_count" integer DEFAULT 0 NOT NULL,
	"arrived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
