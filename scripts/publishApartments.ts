/**
 * Stage 2 of the photo import: put the processed photos where the site reads
 * them from, then replace the apartment table with the 15 real flats.
 *
 *   npx tsx scripts/publishApartments.ts --target=local   # public/uploads
 *   npx tsx scripts/publishApartments.ts --target=blob    # Vercel Blob
 *   npx tsx scripts/publishApartments.ts --target=local --photos-only
 *
 * Bookings, reviews, calendar feeds and external blocks all hang off apartment
 * ids that are about to disappear, so they are cleared with them.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config();
import { readdir, readFile, mkdir, rm, copyFile } from 'fs/promises';
import path from 'path';
import { getDb, schema } from '@/db/index';
import { apartmentToInsert } from '@/db/map';
import type { Apartment } from '@/types/apartment';
import { APARTMENT_SOURCES, MIN_NIGHTS, PRICE, PROCESSED_DIR, ROOT } from './apartmentSources';

type Target = 'local' | 'blob';

const PUBLIC_PHOTOS = path.join(ROOT, 'public', 'uploads', 'apartments');

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
}

async function processedPhotos(slug: string): Promise<string[]> {
  try {
    return (await readdir(path.join(PROCESSED_DIR, slug)))
      .filter((f) => f.endsWith('.webp'))
      .sort();
  } catch {
    return [];
  }
}

/** Copies into public/uploads — served straight from the deployment. */
async function placeLocal(slug: string, files: string[]): Promise<string[]> {
  const dir = path.join(PUBLIC_PHOTOS, slug);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  for (const file of files) {
    await copyFile(path.join(PROCESSED_DIR, slug, file), path.join(dir, file));
  }
  return files.map((f) => `/uploads/apartments/${slug}/${f}`);
}

/** Uploads to Vercel Blob — needed for uploads to survive on serverless. */
async function placeBlob(slug: string, files: string[]): Promise<string[]> {
  const { put } = await import('@vercel/blob');
  const urls: string[] = [];

  for (const file of files) {
    const body = await readFile(path.join(PROCESSED_DIR, slug, file));
    const { url } = await put(`apartments/${slug}/${file}`, body, {
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    urls.push(url);
  }
  return urls;
}

async function main() {
  const target = (arg('target') ?? 'local') as Target;
  const photosOnly = process.argv.includes('--photos-only');

  if (target !== 'local' && target !== 'blob') {
    throw new Error('--target must be "local" or "blob"');
  }
  if (target === 'blob' && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is missing — add it to .env.local');
  }
  if (target === 'local') {
    // Wipe the old demo photos; every current apartment gets its own folder.
    await rm(PUBLIC_PHOTOS, { recursive: true, force: true });
    await mkdir(PUBLIC_PHOTOS, { recursive: true });
  }

  const apartments: Apartment[] = [];

  for (const src of APARTMENT_SOURCES) {
    const files = await processedPhotos(src.slug);
    const photos = files.length
      ? target === 'local'
        ? await placeLocal(src.slug, files)
        : await placeBlob(src.slug, files)
      : [];

    console.log(`${src.slug.padEnd(28)} ${String(photos.length).padStart(2)} photos`);

    apartments.push({
      id: src.slug,
      area: 'Bat Yam',
      guests: src.guests,
      bedrooms: src.bedrooms,
      beds: src.beds,
      bathrooms: src.bathrooms,
      price: PRICE,
      minNights: MIN_NIGHTS,
      status: 'Available',
      tagIds: src.tagIds,
      rating: 0,
      reviews: 0,
      photos: photos.length ? photos : undefined,
      locales: src.locales,
    });
  }

  if (photosOnly) {
    console.log('\n--photos-only: database left untouched');
    return;
  }

  const db = getDb();
  const now = new Date();

  console.log('\nClearing bookings, reviews, calendar feeds and apartments…');
  await db.delete(schema.externalBlocks);
  await db.delete(schema.calendarFeeds);
  await db.delete(schema.reviews);
  await db.delete(schema.bookings);
  await db.delete(schema.apartments);

  for (const apt of apartments) {
    await db.insert(schema.apartments).values({
      ...apartmentToInsert(apt),
      createdAt: now,
      updatedAt: now,
    });
  }

  const withPhotos = apartments.filter((a) => a.photos?.length).length;
  console.log(
    `Inserted ${apartments.length} apartments (${withPhotos} with photos) — target: ${target}`
  );
}

void main();
