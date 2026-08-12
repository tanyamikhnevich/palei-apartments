import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/**
 * Where apartment photos live. Vercel's filesystem is read-only and wiped on
 * every deploy, so anything uploaded through the admin panel has to go to Blob
 * storage; without a token (local dev) we fall back to public/uploads.
 */
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** Matches the import pipeline: long edge 1600px, WebP q80. */
const MAX_EDGE = 1600;
const WEBP_QUALITY = 80;

function fileName(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.webp`;
}

/** Re-encodes to WebP — a 4 MB phone photo lands at roughly 150 KB. */
async function toWebp(file: File): Promise<Buffer> {
  const input = Buffer.from(await file.arrayBuffer());
  return sharp(input)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

export async function storeApartmentPhoto(file: File): Promise<string> {
  const body = await toWebp(file);
  const name = fileName();

  if (useBlob()) {
    const { put } = await import('@vercel/blob');
    const { url } = await put(`apartments/uploads/${name}`, body, {
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
    });
    return url;
  }

  const dir = path.join(process.cwd(), 'public', 'uploads', 'apartments');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), body);
  return `/uploads/apartments/${name}`;
}
