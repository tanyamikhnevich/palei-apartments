-- Admin accounts and their sessions.
--
-- Hand-trimmed: drizzle-kit diffs against 0000_snapshot, and migrations 0001–0004
-- were written by hand without snapshots, so the generated file also tried to
-- re-create reviews, calendar_feeds and external_blocks. Only the two new
-- tables belong here.

-- One row per person who can open the panel. `password_hash` is PBKDF2 —
-- the password itself is never stored anywhere.
CREATE TABLE IF NOT EXISTS "admin_users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"login" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"password_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "admin_users_login_unique" UNIQUE("login")
);
--> statement-breakpoint

-- One row per signed-in browser, holding only the SHA-256 of the refresh token.
-- Spent rows are kept, not deleted: a token that comes back twice means the
-- cookie was copied, and recognising that needs the old row to still exist.
CREATE TABLE IF NOT EXISTS "admin_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"token_hash" text NOT NULL,
	"family_id" varchar(64) NOT NULL,
	"replaced_by" varchar(64),
	"revoked_at" timestamp with time zone,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint

-- Refresh looks a session up by token hash; the sweep and the sessions list
-- both work per user.
CREATE INDEX IF NOT EXISTS "admin_sessions_user_idx" ON "admin_sessions" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_sessions_family_idx" ON "admin_sessions" ("family_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_sessions_expires_idx" ON "admin_sessions" ("expires_at");
