CREATE TABLE "house_links" (
	"apartment_id" varchar(64) PRIMARY KEY NOT NULL,
	"token" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "house_links_token_unique" UNIQUE("token")
);
