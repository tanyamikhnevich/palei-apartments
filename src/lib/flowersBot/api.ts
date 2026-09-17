/**
 * The handful of Bot API calls the florist bot makes. Plain fetch — a library
 * would bring polling, sessions and middleware for a bot that needs none.
 */

export interface TgUser {
  id: number;
  first_name?: string;
}

export interface TgPhotoSize {
  file_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TgDocument {
  file_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: { id: number; type: string };
  text?: string;
  caption?: string;
  photo?: TgPhotoSize[];
  document?: TgDocument;
  media_group_id?: string;
}

export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

export interface InlineButton {
  text: string;
  callback_data: string;
}

export type InlineKeyboard = InlineButton[][];

/** Telegram limits a single file download to 20 MB — plenty for a photo. */
const FILE_MAX_BYTES = 20 * 1024 * 1024;

export function botToken(): string | undefined {
  return process.env.FLOWERS_TELEGRAM_BOT_TOKEN;
}

export async function callBot<T = unknown>(method: string, params: object): Promise<T> {
  const token = botToken();
  if (!token) throw new Error('FLOWERS_TELEGRAM_BOT_TOKEN is not set');

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const body = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!body.ok) throw new Error(`Telegram ${method}: ${body.description ?? res.status}`);
  return body.result as T;
}

export function sendText(chatId: number, text: string, keyboard?: InlineKeyboard) {
  return callBot('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

/** Takes the buttons off a message once they have been answered. */
export function clearButtons(chatId: number, messageId: number) {
  return callBot('editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  }).catch(() => undefined);
}

export function answerCallback(id: string, text?: string) {
  return callBot('answerCallbackQuery', { callback_query_id: id, text }).catch(() => undefined);
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const token = botToken();
  const file = await callBot<{ file_path?: string; file_size?: number }>('getFile', {
    file_id: fileId,
  });
  if (!file.file_path) throw new Error('Telegram did not return a file path');
  if (file.file_size && file.file_size > FILE_MAX_BYTES) throw new Error('File is too large');

  const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
  if (!res.ok) throw new Error(`Downloading the photo failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}
