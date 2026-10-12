import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { handleGuideUpdate, type GuideUpdate } from '@/lib/guideBot/dialog';

/**
 * Telegram's webhook for the owner's bot — the one that already announces
 * bookings — so a door code can be changed from a phone. The secret header is
 * set when the webhook is registered (`npm run guide:bot:setup`); a request
 * without it did not come from Telegram.
 */
function fromTelegram(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const got = request.headers.get('x-telegram-bot-api-secret-token');
  if (!expected || !got) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!fromTelegram(request)) return new NextResponse(null, { status: 401 });

  try {
    await handleGuideUpdate((await request.json()) as GuideUpdate);
  } catch (e) {
    console.error('POST /api/telegram/guide', e);
  }
  // Always 200: an error answered to Telegram is retried, and a retried
  // "apply this code" would write the code twice.
  return NextResponse.json({ ok: true });
}
