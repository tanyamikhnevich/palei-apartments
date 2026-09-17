import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { handleUpdate } from '@/lib/flowersBot/dialog';
import type { TgUpdate } from '@/lib/flowersBot/api';

// Downloading a photo, re-encoding it and putting it in Blob takes a few seconds.
export const maxDuration = 60;

/**
 * Telegram's webhook for the florist bot. The secret header is set when the
 * webhook is registered (`npm run flowers:bot:setup`), so a request without it
 * did not come from Telegram.
 */
function fromTelegram(request: Request): boolean {
  const expected = process.env.FLOWERS_TELEGRAM_WEBHOOK_SECRET;
  const got = request.headers.get('x-telegram-bot-api-secret-token');
  if (!expected || !got) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!fromTelegram(request)) return new NextResponse(null, { status: 401 });

  try {
    await handleUpdate((await request.json()) as TgUpdate);
  } catch (e) {
    console.error('POST /api/telegram/flowers', e);
  }
  // Always 200: an error answered to Telegram is retried, and a retried photo is a duplicate.
  return NextResponse.json({ ok: true });
}
