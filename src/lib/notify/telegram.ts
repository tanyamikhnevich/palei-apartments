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

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Send a raw HTML message. Never throws — a failed notify must not break the flow. */
export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

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
    }
  } catch (e) {
    console.error('Telegram notify error', e);
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
