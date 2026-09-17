CREATE TABLE "bot_drafts" (
	"chat_id" varchar(32) PRIMARY KEY NOT NULL,
	"step" varchar(16) NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
