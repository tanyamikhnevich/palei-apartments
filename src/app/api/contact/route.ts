import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/errors';
import { isTelegramConfigured, notifyContactMessage } from '@/lib/notify/telegram';
import {
  contactMessageValidationEn,
  validateContactMessage,
  type ContactMessageInput,
} from '@/lib/validation/contactMessage';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

/*
  A public endpoint that pushes straight into our Telegram chat is an inviting
  target, so the obvious floods get turned away here. Per-instance memory only —
  it thins out bursts rather than guaranteeing a global limit — which together
  with the honeypot is proportionate for a contact form.
*/
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }

  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: 'Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.' },
      { status: 503 }
    );
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    return jsonError('Too many messages. Please try again later.', 429);
  }

  try {
    const body = (await request.json()) as ContactMessageInput & { page?: string };
    const check = validateContactMessage(body);

    if (!check.ok) {
      // Honeypot tripped: answer as if it went through so bots learn nothing.
      if (check.code === 'spam') return NextResponse.json({ ok: true });
      return jsonError(contactMessageValidationEn(check.code), 400);
    }

    const delivered = await notifyContactMessage({
      name: check.name,
      contact: check.contact,
      message: check.message,
      page: typeof body.page === 'string' ? body.page.slice(0, 200) : undefined,
    });

    // Nothing stores this message but the chat, so a failed send is a failure.
    if (!delivered) return jsonError('Could not deliver your message. Please try again.', 502);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/contact', e);
    return jsonError('Failed to send message', 500);
  }
}
