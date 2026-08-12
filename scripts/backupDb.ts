import { config } from 'dotenv';

config({ path: '.env.local' });
config();
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getDb, schema } from '@/db/index';
import { ROOT } from './apartmentSources';

async function main() {
  const db = getDb();
  const dump = {
    takenAt: new Date().toISOString(),
    apartments: await db.select().from(schema.apartments),
    bookings: await db.select().from(schema.bookings),
    reviews: await db.select().from(schema.reviews),
    calendarFeeds: await db.select().from(schema.calendarFeeds),
    externalBlocks: await db.select().from(schema.externalBlocks),
  };
  const dir = path.join(ROOT, 'import');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `db-backup-${dump.takenAt.slice(0, 10)}.json`);
  await writeFile(file, JSON.stringify(dump, null, 2));
  console.log(
    `${file}: ${dump.apartments.length} apartments, ${dump.bookings.length} bookings, ${dump.reviews.length} reviews`
  );
}

void main();
