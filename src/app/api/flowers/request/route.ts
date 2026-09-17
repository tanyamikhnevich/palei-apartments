import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/errors';
import { isFlowersTelegramConfigured, notifyFlowerOrder } from '@/lib/notify/telegram';
import { validatePersonName, validatePhone, validationMessageEn } from '@/lib/validation/contact';
import { getFlowersDb, isFlowersDbConfigured, schema } from '@/db/flowers';
import { rowToBouquet } from '@/db/flowers/schema';
import { bouquetCopy, offersWrapping, orderTotal } from '@/lib/flowers';
import { earliestDelivery } from '@/lib/flowers';
import { formatMoney } from '@/lib/money';
import { currencyOf } from '@/lib/regions';
import {
  DELIVERY_SLOTS,
  type Bouquet,
  type DeliverySlot,
  type RoseSelection,
} from '@/types/flower';
import {
  builderTotal,
  colorLeadDays,
  isBuilder,
  selectionName,
  validateSelection,
} from '@/lib/roseBuilder';
import { publicSubmitThrottle } from '@/lib/auth/throttle';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const CARD_MAX = 300;
const COMMENT_MAX = 500;
const ADDRESS_MAX = 200;

type OrderBody = {
  bouquetId?: string;
  date?: string;
  slot?: DeliverySlot;
  address?: string;
  recipient?: string;
  recipientPhone?: string;
  card?: string;
  comment?: string;
  wrapping?: boolean;
  roses?: Partial<RoseSelection>;
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

  if (!isFlowersTelegramConfigured()) {
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

    /*
      A made-to-order card is priced from what was chosen, and what was chosen
      is checked against the stored card: the browser sends a count, a colour
      and a presentation — never a price.
    */
    const builder = isBuilder(bouquet) ? bouquet.builder : null;
    let roses: RoseSelection | null = null;
    if (builder) {
      const checked = validateSelection(builder, body.roses);
      if (!checked.ok) {
        return jsonError(
          checked.problem === 'count'
            ? `Choose between ${builder.min} and ${builder.max} roses`
            : checked.problem === 'mix'
              ? 'The colours in the mix must add up to the number of roses'
              : 'That option is no longer offered'
        );
      }
      roses = checked.selection;
    }

    if (!ISO.test(body.date ?? '')) return jsonError('Invalid delivery date');
    /*
      The earliest date is recalculated here rather than trusted: the browser's
      clock can be wrong or edited, and promising same-day after the florist's
      cut-off is a promise we cannot keep.
    */
    const leadDays = builder && roses ? colorLeadDays(builder, roses.colorId, roses.mix) : 0;
    if (body.date! < earliestDelivery(bouquet, new Date(), leadDays)) {
      return jsonError(
        leadDays > 0
          ? `That colour needs ${leadDays} more day(s) — please pick a later date`
          : 'That delivery date has already passed our cut-off'
      );
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
    const comment = (body.comment ?? '').trim().slice(0, COMMENT_MAX);

    /*
      Wrapping is asked for, not priced, by the browser: the surcharge and the
      total are read back off the stored bouquet. A checkbox on an item that is
      not offered wrapped is simply not wrapped — there is nothing to charge.
    */
    const wrapping = !builder && Boolean(body.wrapping) && offersWrapping(bouquet);
    const total = builder && roses ? builderTotal(builder, roses) : orderTotal(bouquet, wrapping);

    /*
      Saved before the chat, and the save is what decides success. Telegram is a
      notification, not the record — an order that reached the shop but not the
      phone is still an order, while the reverse would be lost the moment
      someone scrolls past the message.
    */
    const order = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      bouquetId: bouquet.id,
      itemName:
        builder && roses ? selectionName(builder, roses) : bouquetCopy(bouquet, 'en').name,
      price: total,
      currency: currencyOf(bouquet),
      deliveryDate: body.date!,
      slot,
      address,
      recipient: recipient.normalized!,
      recipientPhone: recipientPhone.normalized!,
      card: card || null,
      comment: comment || null,
      wrapping,
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
      wrapping,
      date: body.date!,
      slot,
      address,
      recipient: recipient.normalized!,
      recipientPhone: recipientPhone.normalized!,
      card: order.card ?? undefined,
      comment: order.comment ?? undefined,
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
