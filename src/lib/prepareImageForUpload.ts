/**
 * Shrinks a photo in the browser before it is uploaded.
 *
 * Two reasons this can't wait for the server: sharp's prebuilt binaries have no
 * HEVC decoder, so iPhone HEIC photos can't be read there at all; and Vercel
 * rejects request bodies over ~4.5 MB, which a single straight-off-the-phone
 * photo can already exceed. The server still re-encodes to WebP at 1600px, so
 * this only needs to be "small enough and readable", not final quality.
 */

const MAX_EDGE = 2400;
const JPEG_QUALITY = 0.9;
/** Below this a JPEG/PNG/WebP goes up untouched — re-encoding would only lose quality. */
const PASSTHROUGH_BYTES = 1.5 * 1024 * 1024;

export function isHeicFile(file: Pick<File, 'type' | 'name'>): boolean {
  if (file.type === 'image/heic' || file.type === 'image/heif') return true;
  return /\.(heic|heif)$/i.test(file.name);
}

async function decode(file: File): Promise<ImageBitmap> {
  if (isHeicFile(file)) {
    // ~3 MB of libheif wasm — only loaded once someone actually picks a HEIC.
    const { heicTo } = await import('heic-to/csp');
    return heicTo({ blob: file, type: 'bitmap' });
  }
  return createImageBitmap(file, { imageOrientation: 'from-image' });
}

function jpegName(name: string): string {
  return `${name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`;
}

export async function prepareImageForUpload(file: File): Promise<File> {
  const heic = isHeicFile(file);
  if (!heic && file.size <= PASSTHROUGH_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await decode(file);
  } catch {
    // Not decodable here (e.g. AVIF in an older browser): let the server try.
    if (!heic) return file;
    throw new Error('Could not read HEIC photo');
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );
    if (!blob) throw new Error('Could not compress photo');

    return new File([blob], jpegName(file.name), { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
