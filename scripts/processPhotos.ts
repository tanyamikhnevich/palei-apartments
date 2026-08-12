/**
 * Stage 1 of the photo import: raw camera files -> web-ready WebP.
 *
 *   npx tsx scripts/processPhotos.ts
 *
 * Reads every folder under import/raw, drops videos and junk, and writes
 * sequentially numbered WebP files to import/processed/<slug>/. Re-running is
 * safe: each apartment's output folder is rebuilt from scratch.
 *
 * Stage 2 (uploadPhotos.ts) puts the results into their final home.
 */
import { readdir, mkdir, rm, stat } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import {
  APARTMENT_SOURCES,
  PROCESSED_DIR,
  RAW_DIR,
  type ApartmentSource,
} from './apartmentSources';

/** Long edge of the stored image — enough for the 16:9 detail gallery. */
const MAX_EDGE = 1600;
const WEBP_QUALITY = 80;

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.tif', '.tiff']);
const SKIP_EXT = new Set(['.mp4', '.mov', '.avi', '.m4v', '.txt', '.pdf']);

/** "9.jpg" must sort before "10.jpg", and "4.3.png" between 4 and 5. */
const naturally = (a: string, b: string) =>
  a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });

function classify(file: string): 'image' | 'skip' {
  const ext = path.extname(file).toLowerCase();
  if (IMAGE_EXT.has(ext)) return 'image';
  if (SKIP_EXT.has(ext)) return 'skip';
  // Drive exports occasionally mangle an extension ("photo.1jpg"). Sniffing the
  // bytes is sharp's job — treat anything unknown as an image and let it fail.
  return file.startsWith('.') ? 'skip' : 'image';
}

async function processFolder(apt: ApartmentSource) {
  const { slug, folder } = apt;
  const srcDir = path.join(RAW_DIR, folder!);
  const outDir = path.join(PROCESSED_DIR, slug);

  const entries = (await readdir(srcDir)).filter((f) => !f.startsWith('.')).sort(naturally);
  const excluded = new Set(apt.skip ?? []);
  const all = entries.filter((f) => classify(f) === 'image');
  const images = all.filter((_, i) => !excluded.has(i + 1));
  const skipped = entries.length - images.length;

  // `cover` and `skip` both index the untouched listing, so the numbers stay
  // readable against a contact sheet even after photos are dropped.
  const cover = apt.cover ? all[apt.cover - 1] : undefined;
  if (cover) {
    const at = images.indexOf(cover);
    if (at > 0) images.unshift(...images.splice(at, 1));
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  let written = 0;
  let bytesIn = 0;
  let bytesOut = 0;
  const failed: string[] = [];

  for (const file of images) {
    const src = path.join(srcDir, file);
    const name = `${String(written + 1).padStart(2, '0')}.webp`;
    const dest = path.join(outDir, name);
    try {
      const info = await sharp(src)
        .rotate() // honour EXIF orientation, then strip it
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(dest);
      bytesIn += (await stat(src)).size;
      bytesOut += info.size;
      written += 1;
    } catch {
      failed.push(file);
    }
  }

  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  console.log(
    `${slug.padEnd(28)} ${String(written).padStart(2)} photos  ${mb(bytesIn)} -> ${mb(bytesOut)}` +
      (skipped ? `  (${skipped} skipped)` : '') +
      (failed.length ? `  FAILED: ${failed.join(', ')}` : '')
  );

  return { written, bytesIn, bytesOut, failed };
}

async function main() {
  await mkdir(PROCESSED_DIR, { recursive: true });

  let photos = 0;
  let bytesIn = 0;
  let bytesOut = 0;

  for (const apt of APARTMENT_SOURCES) {
    if (!apt.folder) {
      console.log(`${apt.slug.padEnd(28)} — no photos supplied, skipping`);
      continue;
    }
    const res = await processFolder(apt);
    photos += res.written;
    bytesIn += res.bytesIn;
    bytesOut += res.bytesOut;
  }

  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  console.log(`\n${photos} photos total: ${mb(bytesIn)} -> ${mb(bytesOut)}`);
}

void main();
