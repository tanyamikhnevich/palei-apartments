import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/errors';
import { isTelegramConfigured, notifyCarRequest } from '@/lib/notify/telegram';
import { validatePersonName, validatePhone, validationMessageEn } from '@/lib/validation/contact';
import { cars } from '@/data/cars';
import { quoteHire } from '@/lib/cars';
import { formatMoney } from '@/lib/money';
import { currencyOf } from '@/lib/regions';
import { formatDateRange } from '@/lib/dates';

type CarRequestBody = {
  carId?: string;
  from?: string;
  to?: string;
  pickup?: string;
  name?: string;
  contact?: string;
  /** Hidden anti-bot field — must stay empty. */
  honeypot?: string;
};

export async function POST(request: Request) {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: 'Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.' },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as CarRequestBody;

    // Honeypot tripped: answer as if it went through so bots learn nothing.
    if (body.honeypot?.trim()) return NextResponse.json({ ok: true });

    const car = cars.find((c) => c.id === body.carId);
    if (!car) return jsonError('Unknown car');

    /*
      The quote is recalculated here rather than trusted from the browser — the
      price in the message has to be the price our own rules produce.
    */
    const quote = quoteHire(car, body.from ?? null, body.to ?? null);
    if (!quote) return jsonError(`Minimum hire is ${car.minDays} day(s)`);

    const pickup = body.pickup ?? car.pickupPoints[0];
    if (!car.pickupPoints.includes(pickup)) return jsonError('Unknown pick-up point');

    const name = validatePersonName(body.name ?? '');
    if (!name.ok) return jsonError(validationMessageEn(name.code), 400);
    const phone = validatePhone(body.contact ?? '');
    if (!phone.ok) return jsonError(validationMessageEn(phone.code), 400);

    const delivered = await notifyCarRequest({
      car: `${car.make} ${car.model} ${car.year}`,
      dates: formatDateRange(body.from!, body.to!, 'en'),
      days: quote.days,
      pickup,
      total: formatMoney(quote.total, currencyOf(car), 'en'),
      guest: name.normalized!,
      contact: phone.normalized!,
    });

    // Nothing stores this request but the chat, so a failed send is a failure.
    if (!delivered) return jsonError('Could not deliver your request. Please try again.', 502);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/cars/request', e);
    return jsonError('Failed to send request', 500);
  }
}
