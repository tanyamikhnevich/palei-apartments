/**
 * Telegram notifications. Configure with env vars:
 *   TELEGRAM_BOT_TOKEN  — from @BotFather
 *   TELEGRAM_CHAT_ID    — channel/group id (e.g. @my_channel or -100123...)
 * When either is missing, notifications are silently skipped, so the site
 * keeps working without Telegram set up.
 */

export interface BookingNotification {
  apartmentTitle: string;
  guest: string;
  contact?: string;
  dates: string;
  guests: number;
  channel: string;
}

export interface CarNotification {
  car: string;
  dates: string;
  days: number;
  pickup: string;
  total: string;
  guest: string;
  contact: string;
}

export interface FlowerNotification {
  bouquet: string;
  price: string;
  date: string;
  slot: string;
  address: string;
  recipient: string;
  recipientPhone: string;
  card?: string;
  guest: string;
  contact: string;
}

export interface ContactNotification {
  name: string;
  contact: string;
  message?: string;
  /** Where on the site the form was submitted from. */
  page?: string;
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Send a raw HTML message. Never throws — a failed notify must not break the
 * flow that triggered it. Returns whether Telegram actually accepted it, so a
 * caller with nowhere else to store the message can tell the guest the truth.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error('Telegram sendMessage failed', res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('Telegram notify error', e);
    return false;
  }
}

export async function notifyNewBooking(b: BookingNotification): Promise<void> {
  const lines = [
    '🆕 <b>New booking request</b>',
    `🏠 ${escapeHtml(b.apartmentTitle)}`,
    `📅 ${escapeHtml(b.dates)}`,
    `👥 ${b.guests} guest(s)`,
    `👤 ${escapeHtml(b.guest)}`,
    b.contact ? `📞 ${escapeHtml(b.contact)}` : null,
    `🔗 via ${escapeHtml(b.channel)}`,
  ].filter(Boolean) as string[];

  await sendTelegramMessage(lines.join('\n'));
}

/**
 * A car hire request. The fleet has no table yet, so — like the contact form —
 * Telegram is the only place it lands, and the delivery result comes back to
 * the caller rather than being swallowed.
 */
export async function notifyCarRequest(c: CarNotification): Promise<boolean> {
  const lines = [
    '🚗 <b>New car hire request</b>',
    `🚙 ${escapeHtml(c.car)}`,
    `📅 ${escapeHtml(c.dates)} · ${c.days} day(s)`,
    `📍 ${escapeHtml(c.pickup)}`,
    `💰 ${escapeHtml(c.total)}`,
    `👤 ${escapeHtml(c.guest)}`,
    `📞 ${escapeHtml(c.contact)}`,
  ];

  return sendTelegramMessage(lines.join('\n'));
}

/**
 * A flower delivery order. No table behind it yet, so Telegram is the only
 * place it lands and the delivery result comes back to the caller.
 */
export async function notifyFlowerOrder(f: FlowerNotification): Promise<boolean> {
  const lines = [
    '💐 <b>New flower order</b>',
    `🌸 ${escapeHtml(f.bouquet)} — ${escapeHtml(f.price)}`,
    `📅 ${escapeHtml(f.date)} · ${escapeHtml(f.slot)}`,
    `📍 ${escapeHtml(f.address)}`,
    `🎁 ${escapeHtml(f.recipient)} · ${escapeHtml(f.recipientPhone)}`,
    f.card ? `✍️ «${escapeHtml(f.card)}»` : null,
    `👤 ${escapeHtml(f.guest)} · ${escapeHtml(f.contact)}`,
  ].filter(Boolean) as string[];

  return sendTelegramMessage(lines.join('\n'));
}

/**
 * A message from the site's contact form. Unlike a booking there is no database
 * row behind it — Telegram is the only place it lands — so the delivery result
 * is handed back to the caller rather than swallowed.
 */
export async function notifyContactMessage(c: ContactNotification): Promise<boolean> {
  const lines = [
    '✉️ <b>New message from the website</b>',
    `👤 ${escapeHtml(c.name)}`,
    `📞 ${escapeHtml(c.contact)}`,
    c.message ? `\n💬 ${escapeHtml(c.message)}` : null,
    c.page ? `\n🔗 ${escapeHtml(c.page)}` : null,
  ].filter(Boolean) as string[];

  return sendTelegramMessage(lines.join('\n'));
}
