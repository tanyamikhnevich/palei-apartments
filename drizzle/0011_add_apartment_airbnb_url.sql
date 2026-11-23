ALTER TABLE "apartments" ADD COLUMN "airbnb_url" text;
--> statement-breakpoint
UPDATE "apartments" AS a
SET "airbnb_url" = 'https://www.airbnb.com/rooms/' || v.listing
FROM (VALUES
	('agnon-grand-studio', '1025322126195199017'),
	('boulevard-bright-219', '1218220982557748220'),
	('boulevard-monochrome-765', '1308636233637613451'),
	('boulevard-nightfall-216', '1144186820349301132'),
	('boulevard-suite-109', '927466238566441319'),
	('boulevard-suite-330', '1011538986462132228'),
	('independence-blue-suite', '925866300518144234'),
	('independence-magenta-studio', '909106956451584224'),
	('kukis-sunny-suite', '644232953185993653'),
	('panorama-sea-view-542', '1452775248679701555'),
	('sadeh-golden-balcony', '42045059'),
	('sadeh-three-room-deluxe', '37206950'),
	('seaside-designer-five', '1533569961413870559'),
	('sky26-pool-penthouse', '1492187357424500085'),
	('sunset-sea-view-101', '1420962964855689473')
) AS v(id, listing)
WHERE a."id" = v.id;
