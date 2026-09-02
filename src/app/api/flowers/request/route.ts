import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/errors';
import { isTelegramConfigured, notifyFlowerOrder } from '@/lib/notify/telegram';
import { validatePersonName, validatePhone, validationMessageEn } from '@/lib/validation/contact';
import { getFlowersDb, isFlowersDbConfigured, schema } from '@/db/flowers';
import { rowToBouquet } from '@/db/flowers/schema';
import { bouquetCopy } from '@/lib/flowers';
import { earliestDelivery } from '@/lib/flowers';
import { formatMoney } from '@/lib/money';
import { currencyOf } from '@/lib/regions';
import { DELIVERY_SLOTS, type Bouquet, type DeliverySlot } from '@/types/flower';
import { publicSubmitThrottle } from '@/lib/auth/throttle';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const CARD_MAX = 300;
const ADDRESS_MAX = 200;

type OrderBody = {
  bouquetId?: string;
  date?: string;
  slot?: DeliverySlot;
  address?: string;
  recipient?: string;
  recipientPhone?: string;
  card?: string;
  name?: string;
  contact?: string;
  honeypot?: string;
};

/** The window the order is checked against. */
async function loadBouquets(): Promise<Bouquet[]> {
  if (!isFlowersDbConfigured()) return [];
  try {
    const rows = await getFlowersDb().select().from(schema.bouquets);
    return rows.map(rowToBouquet);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  // A honeypot stops a bot filling a form; it does nothing against a loop.
  const gate = publicSubmitThrottle.check(request);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSeconds) } }
    );
  }
  publicSubmitThrottle.consume(request);

  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: 'Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.' },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as OrderBody;

    // Honeypot tripped: answer as if it went through so bots learn nothing.
    if (body.honeypot?.trim()) return NextResponse.json({ ok: true });

    const bouquet = (await loadBouquets()).find((b) => b.id === body.bouquetId);
    if (!bouquet || !bouquet.listed) return jsonError('Unknown bouquet');

    if (!ISO.test(body.date ?? '')) return jsonError('Invalid delivery date');
    /*
      The earliest date is recalculated here rather than trusted: the browser's
      clock can be wrong or edited, and promising same-day after the florist's
      cut-off is a promise we cannot keep.
    */
    if (body.date! < earliestDelivery(bouquet)) {
      return jsonError('That delivery date has already passed our cut-off');
    }

    const slot = body.slot ?? 'morning';
    if (!DELIVERY_SLOTS.includes(slot)) return jsonError('Unknown delivery slot');

    const address = (body.address ?? '').trim();
    if (address.length < 5 || address.length > ADDRESS_MAX) return jsonError('Enter a full address');

    const recipient = validatePersonName(body.recipient ?? '');
    if (!recipient.ok) return jsonError(validationMessageEn(recipient.code), 400);
    const recipientPhone = validatePhone(body.recipientPhone ?? '');
    if (!recipientPhone.ok) return jsonError(validationMessageEn(recipientPhone.code), 400);

    const name = validatePersonName(body.name ?? '');
    if (!name.ok) return jsonError(validationMessageEn(name.code), 400);
    const phone = validatePhone(body.contact ?? '');
    if (!phone.ok) return jsonError(validationMessageEn(phone.code), 400);

    const card = (body.card ?? '').trim().slice(0, CARD_MAX);

    /*
      Saved before the chat, and the save is what decides success. Telegram is a
      notification, not the record — an order that reached the shop but not the
      phone is still an order, while the reverse would be lost the moment
      someone scrolls past the message.
    */
    const order = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      bouquetId: bouquet.id,
      itemName: bouquetCopy(bouquet, 'en').name,
      price: bouquet.price,
      currency: currencyOf(bouquet),
      deliveryDate: body.date!,
      slot,
      address,
      recipient: recipient.normalized!,
      recipientPhone: recipientPhone.normalized!,
      card: card || null,
      guest: name.normalized!,
      guestContact: phone.normalized!,
      status: 'New' as const,
    };

    let saved = false;
    if (isFlowersDbConfigured()) {
      try {
        await getFlowersDb().insert(schema.flowerOrders).values(order);
        saved = true;
      } catch (e) {
        console.error('saving flower order', e);
      }
    }

    const delivered = await notifyFlowerOrder({
      bouquet: order.itemName,
      price: formatMoney(order.price, order.currency, 'en'),
      date: body.date!,
      slot,
      address,
      recipient: recipient.normalized!,
      recipientPhone: recipientPhone.normalized!,
      card: order.card ?? undefined,
      guest: name.normalized!,
      contact: phone.normalized!,
    });

    // Only a total loss is a failure: if neither the shop nor the chat has it.
    if (!saved && !delivered) {
      return jsonError('Could not place your order. Please try again.', 502);
    }

    return NextResponse.json({ ok: true, saved, notified: delivered });
  } catch (e) {
    console.error('POST /api/flowers/request', e);
    return jsonError('Failed to send order', 500);
  }
}
