export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_UPLOAD_MAX_FILES = 24;

/** MIME types accepted for apartment photos */
export const IMAGE_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export type ImageUploadMime = (typeof IMAGE_UPLOAD_MIME_TYPES)[number];

const MIME_SET = new Set<string>(IMAGE_UPLOAD_MIME_TYPES);

const EXT_TO_MIME: Record<string, ImageUploadMime> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

const MIME_TO_EXT: Record<ImageUploadMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/** Value for `<input accept>` — MIME types + extensions (Safari / AVIF). */
export const IMAGE_UPLOAD_ACCEPT =
  'image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif';

export function resolveImageMime(file: Pick<File, 'type' | 'name'>): ImageUploadMime | null {
  if (file.type && MIME_SET.has(file.type)) {
    return file.type as ImageUploadMime;
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext && ext in EXT_TO_MIME) return EXT_TO_MIME[ext];
  return null;
}

export function extensionForImageMime(mime: ImageUploadMime): string {
  return MIME_TO_EXT[mime];
}

export function isAvifImagePath(src: string): boolean {
  return src.split('?')[0].toLowerCase().endsWith('.avif');
}

export function validateImageFile(file: Pick<File, 'type' | 'name' | 'size'>): string | null {
  const mime = resolveImageMime(file);
  if (!mime) {
    return 'Only JPEG, PNG, WebP and AVIF images are allowed';
  }
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    return `"${file.name}" must be 5 MB or smaller`;
  }
  return null;
}
