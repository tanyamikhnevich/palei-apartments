ALTER TABLE "apartments" ADD COLUMN IF NOT EXISTS "min_nights" integer NOT NULL DEFAULT 1;
