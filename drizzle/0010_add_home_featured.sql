CREATE TABLE "home_featured" (
	"apartment_id" varchar(64) PRIMARY KEY NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
INSERT INTO "home_featured" ("apartment_id", "position") VALUES
	('panorama-sea-view-542', 0),
	('seaside-designer-five', 1),
	('sky26-pool-penthouse', 2);
