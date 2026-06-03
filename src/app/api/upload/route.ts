import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/errors';
import {
  extensionForImageMime,
  IMAGE_UPLOAD_MAX_FILES,
  resolveImageMime,
  validateImageFile,
} from '@/lib/imageUpload';

function collectFiles(formData: FormData): File[] {
  const fromFiles = formData.getAll('files').filter((f): f is File => f instanceof File);
  const single = formData.get('file');
  if (single instanceof File) return [...fromFiles, single];
  return fromFiles;
}

async function saveImage(file: File): Promise<string> {
  const err = validateImageFile(file);
  if (err) throw new Error(err);

  const mime = resolveImageMime(file)!;
  const ext = extensionForImageMime(mime);
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads', 'apartments');
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buffer);

  return `/uploads/apartments/${name}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = collectFiles(formData);

    if (!files.length) {
      return jsonError('No files provided');
    }

    if (files.length > IMAGE_UPLOAD_MAX_FILES) {
      return jsonError(`You can upload up to ${IMAGE_UPLOAD_MAX_FILES} images at once`);
    }

    const urls: string[] = [];
    for (const file of files) {
      try {
        urls.push(await saveImage(file));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Invalid image';
        return jsonError(files.length === 1 ? msg : `${file.name}: ${msg}`);
      }
    }

    if (urls.length === 1) {
      return NextResponse.json({ url: urls[0], urls });
    }

    return NextResponse.json({ urls });
  } catch (e) {
    console.error('POST /api/upload', e);
    return jsonError('Upload failed', 500);
  }
}
