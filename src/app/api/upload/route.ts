import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/errors';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return jsonError('No file provided');
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return jsonError('Only JPEG, PNG and WebP images are allowed');
    }

    if (file.size > MAX_BYTES) {
      return jsonError('Image must be 5 MB or smaller');
    }

    const ext =
      file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const dir = path.join(process.cwd(), 'public', 'uploads', 'apartments');
    await mkdir(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, name), buffer);

    return NextResponse.json({ url: `/uploads/apartments/${name}` });
  } catch (e) {
    console.error('POST /api/upload', e);
    return jsonError('Upload failed', 500);
  }
}
