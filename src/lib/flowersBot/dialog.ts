import { eq } from 'drizzle-orm';
import { getFlowersDb, schema } from '@/db/flowers';
import { bouquetToInsert, rowToBouquet } from '@/db/flowers/schema';
import { CATEGORIES, DEFAULT_FLOWER_AREA } from '@/lib/flowers';
import { formatMoney } from '@/lib/money';
import { escapeHtml } from '@/lib/notify/telegram';
import { currencyForArea } from '@/lib/regions';
import { absoluteUrl } from '@/lib/seo';
import { storeApartmentPhoto } from '@/lib/server/photoStorage';
import { ITEM_KINDS, type Bouquet, type BouquetCategory, type ItemKind } from '@/types/flower';
import {
  answerCallback,
  callBot,
  clearButtons,
  downloadFile,
  sendText,
  type InlineKeyboard,
  type TgCallbackQuery,
  type TgMessage,
  type TgUpdate,
} from './api';
import { appendPhoto, deleteDraft, loadDraft, saveDraft, type Draft } from './drafts';

/**
 * The florist's bot: add a bouquet to the window from a phone, one question at
 * a time, without opening the panel.
 *
 * The bot talks Russian because the florist does; what goes on the card is
 * English, like the English tab in admin, and the other languages fall back to
 * it until they are translated there.
 */

const HEIC = /\.(heic|heif)$/i;
const IMAGE_DOCUMENT = /^image\/(jpeg|png|webp)$/;

const KIND_LABELS: Record<ItemKind, string> = {
  flowers: '💐 Цветы',
  balloons: '🎈 Шары',
  mixed: '💐🎈 Микс',
  wine: '🍷 Вино',
};

const CANCEL: InlineKeyboard = [[{ text: '✖️ Отмена', callback_data: 'cancel' }]];
const SKIP = (step: string): InlineKeyboard => [
  [{ text: '⏭ Пропустить', callback_data: `skip:${step}` }],
  ...CANCEL,
];

const HELP = [
  '🌸 <b>Бот витрины цветов</b>',
  '',
  '/new — добавить карточку',
  '/cancel — отменить текущую',
  '',
  'Текст карточки пиши на английском — переводы потом в админке.',
].join('\n');

/** Only people named in FLOWERS_TELEGRAM_ALLOWED_USERS may use the bot. */
function allowedUsers(): Set<string> {
  return new Set(
    (process.env.FLOWERS_TELEGRAM_ALLOWED_USERS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

export async function handleUpdate(update: TgUpdate): Promise<void> {
  const from = update.message?.from ?? update.callback_query?.from;
  const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
  if (!from || chatId === undefined) return;

  if (!allowedUsers().has(String(from.id))) {
    // Saying the id back is what makes the first set-up possible at all.
    if (update.message?.chat.type === 'private') {
      await sendText(chatId, `Нет доступа. Твой Telegram id: <code>${from.id}</code>`);
    }
    if (update.callback_query) await answerCallback(update.callback_query.id);
    return;
  }

  try {
    if (update.callback_query) await onCallback(chatId, update.callback_query);
    else if (update.message) await onMessage(chatId, update.message);
  } catch (e) {
    console.error('flowers bot', e);
    await sendText(chatId, `⚠️ Что-то пошло не так: ${escapeHtml((e as Error).message)}`).catch(
      () => undefined
    );
  }
}

/* ---------------------------------------------------------------- messages */

async function onMessage(chatId: number, message: TgMessage) {
  const text = message.text?.trim() ?? '';

  if (text.startsWith('/new')) return startDraft(chatId);
  if (text.startsWith('/cancel')) return cancel(chatId);
  if (text.startsWith('/start') || text.startsWith('/help')) return sendText(chatId, HELP);

  const draft = await loadDraft(chatId);
  if (!draft) return sendText(chatId, HELP);

  if (message.photo || message.document) return onPhoto(chatId, draft, message);

  switch (draft.step) {
    case 'photos':
      return sendText(chatId, 'Жду фото. Когда все загрузятся — нажми «Готово».', photosKeyboard());

    case 'name': {
      if (!text) return sendText(chatId, 'Пришли название текстом.', CANCEL);
      draft.data.name = text.slice(0, 120);
      return advance(chatId, draft, 'price');
    }

    case 'price': {
      const price = Number(text.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!Number.isFinite(price) || price <= 0) {
        return sendText(chatId, 'Цена — просто число, например <code>250</code>.', CANCEL);
      }
      draft.data.price = Math.round(price);
      return advance(chatId, draft, 'kind');
    }

    case 'stems': {
      const stems = parseInt(text, 10);
      if (!Number.isInteger(stems) || stems <= 0) {
        return sendText(chatId, 'Пришли число или нажми «Пропустить».', SKIP('stems'));
      }
      draft.data.stems = stems;
      return advance(chatId, draft, 'sameDay');
    }

    case 'note': {
      if (!text) return sendText(chatId, 'Пришли описание текстом или нажми «Пропустить».', SKIP('note'));
      draft.data.note = text.slice(0, 1000);
      return advance(chatId, draft, 'confirm');
    }

    default:
      return ask(chatId, draft);
  }
}

async function onPhoto(chatId: number, draft: Draft, message: TgMessage) {
  if (draft.step !== 'photos') {
    return sendText(chatId, 'Фото добавляются только в начале. Начни заново: /new');
  }

  let fileId: string;
  let name = 'photo.jpg';
  if (message.photo?.length) {
    // Telegram sends every size it made; the last one is the largest.
    fileId = message.photo[message.photo.length - 1].file_id;
  } else {
    const doc = message.document!;
    if (HEIC.test(doc.file_name ?? '') || /heic|heif/.test(doc.mime_type ?? '')) {
      return sendText(
        chatId,
        'HEIC файлом не читается. Отправь как <b>фото</b> (не «файл») — Telegram сам сконвертирует.'
      );
    }
    if (!IMAGE_DOCUMENT.test(doc.mime_type ?? '')) {
      return sendText(chatId, 'Это не картинка. Пришли фото.');
    }
    fileId = doc.file_id;
    name = doc.file_name ?? name;
  }

  // An album arrives as one update per photo: say hello to it once.
  const group = message.media_group_id;
  if (group && draft.data.mediaGroup !== group) {
    draft.data.mediaGroup = group;
    await saveDraft(chatId, draft);
    await sendText(chatId, '📥 Загружаю альбом… Когда всё придёт — нажми «Готово».', photosKeyboard());
  }

  const body = await downloadFile(fileId);
  const url = await storeApartmentPhoto(new File([new Uint8Array(body)], name));
  const count = await appendPhoto(chatId, url);
  if (count === null) return;

  if (!group) {
    await sendText(chatId, `✅ Фото ${count} добавлено. Ещё — или «Готово».`, photosKeyboard());
  }
}

/* --------------------------------------------------------------- callbacks */

async function onCallback(chatId: number, query: TgCallbackQuery) {
  const data = query.data ?? '';
  const [action, value] = data.split(':');
  const messageId = query.message?.message_id;

  // Buttons on a saved card work without a draft.
  if (action === 'hide' || action === 'show') return setListed(chatId, query, value, action === 'show');
  if (action === 'del') {
    await answerCallback(query.id);
    return sendText(chatId, 'Точно удалить карточку с сайта?', [
      [
        { text: '🗑 Да, удалить', callback_data: `delyes:${value}` },
        { text: 'Нет', callback_data: 'noop' },
      ],
    ]);
  }
  if (action === 'delyes') {
    await getFlowersDb().delete(schema.bouquets).where(eq(schema.bouquets.id, value));
    await answerCallback(query.id, 'Удалено');
    if (messageId) await clearButtons(chatId, messageId);
    return sendText(chatId, '🗑 Карточка удалена.');
  }
  if (action === 'noop') {
    await answerCallback(query.id);
    if (messageId) await clearButtons(chatId, messageId);
    return;
  }
  if (action === 'new') {
    await answerCallback(query.id);
    return startDraft(chatId);
  }

  if (action === 'cancel') {
    await answerCallback(query.id);
    if (messageId) await clearButtons(chatId, messageId);
    return cancel(chatId);
  }

  const draft = await loadDraft(chatId);
  const stale = async () => {
    await answerCallback(query.id, 'Кнопка устарела');
    if (messageId) await clearButtons(chatId, messageId);
  };
  if (!draft) return stale();

  switch (action) {
    case 'done': {
      if (draft.step !== 'photos') return stale();
      if (!draft.data.photos.length) {
        await answerCallback(query.id, 'Сначала пришли хотя бы одно фото');
        return;
      }
      break;
    }
    case 'kind': {
      if (draft.step !== 'kind' || !ITEM_KINDS.includes(value as ItemKind)) return stale();
      draft.data.kind = value as ItemKind;
      break;
    }
    case 'cat': {
      const allowed = draft.data.kind ? CATEGORIES[draft.data.kind] : [];
      if (draft.step !== 'category' || !allowed.includes(value as BouquetCategory)) return stale();
      draft.data.category = value as BouquetCategory;
      break;
    }
    case 'skip': {
      if (draft.step !== value || (value !== 'stems' && value !== 'note')) return stale();
      if (value === 'stems') draft.data.stems = null;
      else draft.data.note = '';
      break;
    }
    case 'same': {
      if (draft.step !== 'sameDay') return stale();
      draft.data.sameDay = value === 'yes';
      break;
    }
    case 'save': {
      if (draft.step !== 'confirm') return stale();
      await answerCallback(query.id);
      if (messageId) await clearButtons(chatId, messageId);
      return publish(chatId, draft);
    }
    default:
      return stale();
  }

  await answerCallback(query.id);
  if (messageId) await clearButtons(chatId, messageId);
  return advance(chatId, draft, NEXT_STEP[draft.step]);
}

/* ------------------------------------------------------------------- steps */

const NEXT_STEP: Record<Draft['step'], Draft['step']> = {
  photos: 'name',
  name: 'price',
  price: 'kind',
  kind: 'category',
  category: 'stems',
  stems: 'sameDay',
  sameDay: 'note',
  note: 'confirm',
  confirm: 'confirm',
};

function photosKeyboard(): InlineKeyboard {
  return [[{ text: '✅ Готово', callback_data: 'done' }], ...CANCEL];
}

async function startDraft(chatId: number) {
  await saveDraft(chatId, { step: 'photos', data: { photos: [] } });
  return sendText(
    chatId,
    '📷 Пришли фото букета — одно или альбомом. Когда все загрузятся, нажми «Готово».',
    photosKeyboard()
  );
}

async function cancel(chatId: number) {
  await deleteDraft(chatId);
  return sendText(chatId, 'Отменено. Новая карточка — /new');
}

async function advance(chatId: number, draft: Draft, step: Draft['step']) {
  draft.step = step;
  await saveDraft(chatId, draft);
  return ask(chatId, draft);
}

function ask(chatId: number, draft: Draft) {
  const { data } = draft;
  switch (draft.step) {
    case 'photos':
      return sendText(chatId, `Фото: ${data.photos.length}. Ещё — или «Готово».`, photosKeyboard());
    case 'name':
      return sendText(chatId, `📷 Фото: ${data.photos.length}\n\n✏️ Название (на английском)?`, CANCEL);
    case 'price':
      return sendText(chatId, `💰 Цена в ${currencyForArea(DEFAULT_FLOWER_AREA)}?`, CANCEL);
    case 'kind':
      return sendText(chatId, 'Что это?', [
        ITEM_KINDS.map((k) => ({ text: KIND_LABELS[k], callback_data: `kind:${k}` })),
        ...CANCEL,
      ]);
    case 'category': {
      const options = CATEGORIES[data.kind ?? 'flowers'];
      const rows: InlineKeyboard = [];
      for (let i = 0; i < options.length; i += 3) {
        rows.push(options.slice(i, i + 3).map((c) => ({ text: c, callback_data: `cat:${c}` })));
      }
      return sendText(chatId, 'Категория?', [...rows, ...CANCEL]);
    }
    case 'stems':
      return sendText(
        chatId,
        data.kind === 'balloons'
          ? '🎈 Сколько шаров?'
          : data.kind === 'wine'
            ? '🍷 Сколько бутылок?'
            : '🌹 Сколько стеблей?',
        SKIP('stems')
      );
    case 'sameDay':
      return sendText(chatId, '🚚 Можно доставить в тот же день?', [
        [
          { text: 'Да', callback_data: 'same:yes' },
          { text: 'Нет', callback_data: 'same:no' },
        ],
        ...CANCEL,
      ]);
    case 'note':
      return sendText(chatId, '📝 Описание (на английском)?', SKIP('note'));
    case 'confirm':
      return sendText(chatId, summary(draft), [
        [{ text: '💾 Сохранить на сайт', callback_data: 'save' }],
        ...CANCEL,
      ]);
  }
}

function summary({ data }: Draft): string {
  const currency = currencyForArea(DEFAULT_FLOWER_AREA);
  return [
    '<b>Проверь карточку</b>',
    '',
    `🌸 <b>${escapeHtml(data.name ?? '')}</b>`,
    `💰 ${formatMoney(data.price ?? 0, currency, 'en')}`,
    `${KIND_LABELS[data.kind ?? 'flowers']} · ${data.category}`,
    data.stems ? `🔢 ${data.stems} шт.` : null,
    `🚚 В тот же день: ${data.sameDay ? 'да' : 'нет'}`,
    `📷 Фото: ${data.photos.length}`,
    data.note ? `\n📝 ${escapeHtml(data.note)}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

async function publish(chatId: number, { data }: Draft) {
  const empty = { name: '', note: '' };
  const bouquet: Bouquet = {
    id: `bq-${Date.now()}`,
    area: DEFAULT_FLOWER_AREA,
    kind: data.kind ?? 'flowers',
    category: data.category ?? CATEGORIES[data.kind ?? 'flowers'][0],
    price: data.price ?? 0,
    stems: data.stems ?? undefined,
    sameDay: data.sameDay ?? false,
    listed: true,
    photos: data.photos,
    locales: {
      en: { name: data.name ?? '', note: data.note ?? '' },
      ru: { ...empty },
      he: { ...empty },
      fr: { ...empty },
    },
  };

  const now = new Date();
  await getFlowersDb()
    .insert(schema.bouquets)
    .values({ ...bouquetToInsert(bouquet), createdAt: now, updatedAt: now });
  await deleteDraft(chatId);

  return sendText(
    chatId,
    `✅ <b>${escapeHtml(bouquet.locales.en.name)}</b> на витрине\n${absoluteUrl(`/flowers/${bouquet.id}`)}`,
    cardKeyboard(bouquet.id, true)
  );
}

function cardKeyboard(id: string, listed: boolean): InlineKeyboard {
  return [
    [
      listed
        ? { text: '🙈 Скрыть с витрины', callback_data: `hide:${id}` }
        : { text: '👁 Вернуть на витрину', callback_data: `show:${id}` },
      { text: '🗑 Удалить', callback_data: `del:${id}` },
    ],
    [{ text: '➕ Ещё карточка', callback_data: 'new' }],
  ];
}

async function setListed(chatId: number, query: TgCallbackQuery, id: string, listed: boolean) {
  const rows = await getFlowersDb()
    .update(schema.bouquets)
    .set({ listed, updatedAt: new Date() })
    .where(eq(schema.bouquets.id, id))
    .returning();
  if (!rows.length) {
    await answerCallback(query.id, 'Карточки уже нет');
    return;
  }
  const bouquet = rowToBouquet(rows[0]);
  await answerCallback(query.id, listed ? 'Снова на витрине' : 'Скрыта');
  if (query.message) {
    await callBot('editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: { inline_keyboard: cardKeyboard(bouquet.id, bouquet.listed) },
    }).catch(() => undefined);
  }
}
