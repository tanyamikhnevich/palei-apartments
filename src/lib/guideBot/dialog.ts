import { getDb, schema } from '@/db/index';
import { rowToApartment } from '@/db/map';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { addDaysISO } from '@/lib/dates';
import { nowInZone, timeZoneForArea } from '@/lib/guide/time';
import { codesInForce } from '@/lib/guide/window';
import { escapeHtml } from '@/lib/notify/telegram';
import { addAccessCode, allAccessCodes, readGuide } from '@/lib/server/guides';
import type { Apartment } from '@/types/apartment';
import { ACCESS_CODE_KINDS, isAccessCodeKind, type AccessCodeKind } from '@/types/guide';

/**
 * Changing a door code from a phone.
 *
 * The code on a lockbox is changed standing in front of it, which is the one
 * moment the panel is furthest away. So the bot that already announces
 * bookings also takes `/code`: pick the apartment, pick what the code opens,
 * send the new code, say when it starts.
 *
 * Nothing is remembered between messages — a serverless function has nowhere
 * to keep a conversation. Each step carries what it needs: the buttons hold
 * the apartment and the kind, and the new code is sent as a reply to a prompt
 * whose last line says what it is for.
 *
 * Russian, like the florist's bot: it talks to the owner, not to guests.
 */

interface TgUser {
  id: number;
}

interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: { id: number; type: string };
  text?: string;
  reply_to_message?: { text?: string };
}

export interface GuideUpdate {
  message?: TgMessage;
  callback_query?: { id: string; from: TgUser; message?: TgMessage; data?: string };
}

type Keyboard = { text: string; callback_data: string }[][];

const KIND_LABELS: Record<AccessCodeKind, string> = {
  building: 'Вход в дом',
  lockbox: 'Локер',
  door: 'Дверь квартиры',
};

/** What a keypad can take: digits, letters, `#` and `*`. No spaces to mistype. */
const CODE = /^[0-9A-Za-z#*]{1,16}$/;

/** The last line of the prompt a new code is sent in reply to. */
const PROMPT_TAG = /⚙️ (\w+) · (\S+)\s*$/;

/** Telegram refuses a button whose data is longer than this many bytes. */
const CALLBACK_MAX_BYTES = 64;

const HELP = [
  '🔑 <b>Коды доступа</b>',
  '',
  '/code — сменить код',
  '/codes — действующие коды',
  '',
  'Новый код гости увидят на своей странице сами — пересылать его не нужно.',
].join('\n');

async function callBot(method: string, params: object): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const body = (await res.json()) as { ok: boolean; description?: string };
  if (!body.ok) throw new Error(`Telegram ${method}: ${body.description ?? res.status}`);
}

function send(chatId: number, text: string, extra: object = {}) {
  return callBot('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra,
  });
}

/** Rewrites the message the buttons were on, so a finished step cannot be pressed again. */
function rewrite(message: TgMessage, text: string, keyboard: Keyboard = []) {
  return callBot('editMessageText', {
    chat_id: message.chat.id,
    message_id: message.message_id,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard },
  });
}

/** Only people named in TELEGRAM_ALLOWED_USERS may read or change a code. */
function allowedUsers(): Set<string> {
  return new Set(
    (process.env.TELEGRAM_ALLOWED_USERS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

async function loadApartments(): Promise<Apartment[]> {
  const rows = await getDb().select().from(schema.apartments);
  return rows
    .map(rowToApartment)
    .sort((a, b) => titleOf(a).localeCompare(titleOf(b), 'ru'));
}

const titleOf = (apartment: Apartment) => getApartmentCopy(apartment, 'ru').title;

/** `12.10 16:59` from `2026-10-12T16:59`. */
function shortMoment(local: string): string {
  const [date, time = ''] = local.split('T');
  const [, month, day] = date.split('-');
  return `${day}.${month} ${time}`.trim();
}

async function askApartment(chatId: number) {
  const apartments = await loadApartments();
  if (!apartments.length) return send(chatId, 'Квартир пока нет.');

  return send(chatId, 'В какой квартире меняем код?', {
    reply_markup: {
      inline_keyboard: apartments.map((a) => [{ text: titleOf(a), callback_data: `a:${a.id}` }]),
    },
  });
}

async function askKind(message: TgMessage, apartment: Apartment) {
  const { codes } = await readGuide(apartment.id);
  const inForce = codesInForce(codes, timeZoneForArea(apartment.area));

  const keyboard: Keyboard = ACCESS_CODE_KINDS.map((kind) => {
    const current = inForce.find((c) => c.kind === kind)?.code;
    return [
      {
        text: current ? `${KIND_LABELS[kind]} · сейчас ${current}` : KIND_LABELS[kind],
        callback_data: `k:${kind}:${apartment.id}`,
      },
    ];
  });
  keyboard.push([{ text: '✖️ Отмена', callback_data: 'x' }]);

  return rewrite(message, `<b>${escapeHtml(titleOf(apartment))}</b>\nКакой код меняем?`, keyboard);
}

async function askCode(message: TgMessage, apartment: Apartment, kind: AccessCodeKind) {
  await rewrite(message, `<b>${escapeHtml(titleOf(apartment))}</b> — ${KIND_LABELS[kind]}`);
  return send(
    message.chat.id,
    [
      `✏️ <b>${KIND_LABELS[kind]}</b> — ${escapeHtml(titleOf(apartment))}`,
      'Ответь на это сообщение новым кодом.',
      '',
      `⚙️ ${kind} · ${apartment.id}`,
    ].join('\n'),
    { reply_markup: { force_reply: true, input_field_placeholder: 'Новый код' } }
  );
}

/** The three moments a new code can start: now, or at check-out time today or tomorrow. */
async function startOptions(apartment: Apartment) {
  const { guide } = await readGuide(apartment.id);
  const now = nowInZone(timeZoneForArea(apartment.area));
  const today = now.slice(0, 10);
  return {
    now,
    today: `${today}T${guide.checkOutTime}`,
    tomorrow: `${addDaysISO(today, 1)}T${guide.checkOutTime}`,
    checkOutTime: guide.checkOutTime,
  };
}

async function applyCode(
  apartment: Apartment,
  kind: AccessCodeKind,
  code: string,
  validFrom: string
): Promise<string> {
  await addAccessCode({ apartmentId: apartment.id, kind, code, validFrom });
  return [
    `✅ <b>${KIND_LABELS[kind]}</b> — ${escapeHtml(titleOf(apartment))}`,
    `Новый код <code>${escapeHtml(code)}</code> действует с ${shortMoment(validFrom)}.`,
    'Гости увидят его на своей странице.',
  ].join('\n');
}

async function askStart(chatId: number, apartment: Apartment, kind: AccessCodeKind, code: string) {
  const options = await startOptions(apartment);
  const data = (when: string) => `s:${when}:${kind}:${apartment.id}:${code}`;

  // The whole decision has to ride in the button. If it does not fit, the
  // code is simply applied now — which is what "I just changed it" means.
  if (Buffer.byteLength(data('tomorrow')) > CALLBACK_MAX_BYTES) {
    return send(chatId, await applyCode(apartment, kind, code, options.now));
  }

  const keyboard: Keyboard = [[{ text: '✅ Уже сейчас', callback_data: data('now') }]];
  // A guest still inside keeps the old code until they leave.
  if (options.today > options.now) {
    keyboard.push([
      { text: `🕚 Сегодня с ${options.checkOutTime}`, callback_data: data('today') },
    ]);
  }
  keyboard.push([{ text: `📅 Завтра с ${options.checkOutTime}`, callback_data: data('tomorrow') }]);
  keyboard.push([{ text: '✖️ Отмена', callback_data: 'x' }]);

  return send(
    chatId,
    [
      `<b>${KIND_LABELS[kind]}</b> — ${escapeHtml(titleOf(apartment))}`,
      `Новый код: <code>${escapeHtml(code)}</code>`,
      'С какого момента он действует?',
    ].join('\n'),
    { reply_markup: { inline_keyboard: keyboard } }
  );
}

async function listCodes(chatId: number) {
  const [apartments, codes] = await Promise.all([loadApartments(), allAccessCodes()]);

  const blocks = apartments.flatMap((apartment) => {
    const own = codes.get(apartment.id) ?? [];
    if (!own.length) return [];

    const timeZone = timeZoneForArea(apartment.area);
    const now = nowInZone(timeZone);
    const lines = codesInForce(own, timeZone).map(
      (c) => `${KIND_LABELS[c.kind]}: <code>${escapeHtml(c.code)}</code>`
    );
    for (const code of own.filter((c) => c.validFrom > now)) {
      lines.push(
        `${KIND_LABELS[code.kind]}: <code>${escapeHtml(code.code)}</code> — с ${shortMoment(code.validFrom)}`
      );
    }
    return [[`🏠 <b>${escapeHtml(titleOf(apartment))}</b>`, ...lines].join('\n')];
  });

  return send(chatId, blocks.length ? blocks.join('\n\n') : 'Кодов пока нет. Добавить: /code');
}

async function handleCallback(query: NonNullable<GuideUpdate['callback_query']>) {
  const message = query.message;
  const [step, ...rest] = (query.data ?? '').split(':');
  // Stops the button's spinner whatever happens next.
  await callBot('answerCallbackQuery', { callback_query_id: query.id }).catch(() => undefined);
  if (!message) return;

  if (step === 'x') return rewrite(message, 'Отменено.');

  const apartments = await loadApartments();
  const find = (id: string | undefined) => apartments.find((a) => a.id === id);
  const gone = () => rewrite(message, 'Такой квартиры больше нет. Начни заново: /code');

  if (step === 'a') {
    const apartment = find(rest[0]);
    return apartment ? askKind(message, apartment) : gone();
  }

  if (step === 'k') {
    const [kind, id] = rest;
    const apartment = find(id);
    if (!apartment || !isAccessCodeKind(kind)) return gone();
    return askCode(message, apartment, kind);
  }

  if (step === 's') {
    const [when, kind, id, code] = rest;
    const apartment = find(id);
    if (!apartment || !isAccessCodeKind(kind) || !CODE.test(code ?? '')) return gone();

    const options = await startOptions(apartment);
    const validFrom =
      when === 'today' ? options.today : when === 'tomorrow' ? options.tomorrow : options.now;
    return rewrite(message, await applyCode(apartment, kind, code, validFrom));
  }
}

async function handleMessage(message: TgMessage) {
  const chatId = message.chat.id;
  const text = message.text?.trim() ?? '';
  const command = text.startsWith('/') ? text.split(/[\s@]/)[0].toLowerCase() : '';

  if (command === '/code') return askApartment(chatId);
  if (command === '/codes') return listCodes(chatId);
  if (command) return send(chatId, HELP);

  // A new code, sent as a reply to the prompt that says what it is for.
  const tag = PROMPT_TAG.exec(message.reply_to_message?.text ?? '');
  if (!tag) return send(chatId, HELP);

  const [, kind, id] = tag;
  const apartment = (await loadApartments()).find((a) => a.id === id);
  if (!apartment || !isAccessCodeKind(kind)) {
    return send(chatId, 'Не понял, для какой квартиры этот код. Начни заново: /code');
  }
  if (!CODE.test(text)) {
    return send(
      chatId,
      'Код — до 16 знаков: цифры, латинские буквы, # и *, без пробелов. Ответь на сообщение выше ещё раз.'
    );
  }
  return askStart(chatId, apartment, kind, text);
}

export async function handleGuideUpdate(update: GuideUpdate): Promise<void> {
  const message = update.message ?? update.callback_query?.message;
  const from = update.message?.from ?? update.callback_query?.from;
  if (!from || !message) return;

  // Codes are never discussed in a group or in the channel the bot posts to.
  if (message.chat.type !== 'private') return;

  if (!allowedUsers().has(String(from.id))) {
    // Saying the id back is what makes the first set-up possible at all.
    await send(message.chat.id, `Нет доступа. Твой Telegram id: <code>${from.id}</code>`);
    return;
  }

  if (update.callback_query) await handleCallback(update.callback_query);
  else if (update.message) await handleMessage(update.message);
}
