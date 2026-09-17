import { eq, sql } from 'drizzle-orm';
import { getFlowersDb, schema } from '@/db/flowers';
import type { BouquetCategory, ItemKind } from '@/types/flower';

/** Where the conversation is — the question the bot is waiting on. */
export type DraftStep =
  | 'photos'
  | 'name'
  | 'price'
  | 'kind'
  | 'category'
  | 'stems'
  | 'sameDay'
  | 'note'
  | 'confirm';

export interface DraftData {
  photos: string[];
  name?: string;
  price?: number;
  kind?: ItemKind;
  category?: BouquetCategory;
  stems?: number | null;
  sameDay?: boolean;
  note?: string;
  /** The album being received, so it is acknowledged once, not once per photo. */
  mediaGroup?: string;
}

export interface Draft {
  step: DraftStep;
  data: DraftData;
}

export async function loadDraft(chatId: number): Promise<Draft | null> {
  const rows = await getFlowersDb()
    .select()
    .from(schema.botDrafts)
    .where(eq(schema.botDrafts.chatId, String(chatId)))
    .limit(1);
  if (!rows.length) return null;
  return { step: rows[0].step as DraftStep, data: rows[0].data as DraftData };
}

export async function saveDraft(chatId: number, draft: Draft): Promise<void> {
  const now = new Date();
  await getFlowersDb()
    .insert(schema.botDrafts)
    .values({ chatId: String(chatId), step: draft.step, data: draft.data, updatedAt: now })
    .onConflictDoUpdate({
      target: schema.botDrafts.chatId,
      set: { step: draft.step, data: draft.data, updatedAt: now },
    });
}

export async function deleteDraft(chatId: number): Promise<void> {
  await getFlowersDb()
    .delete(schema.botDrafts)
    .where(eq(schema.botDrafts.chatId, String(chatId)));
}

/**
 * Adds a photo in one statement. An album arrives as one update per photo, and
 * reading the list, pushing and writing it back would let two of them overwrite
 * each other. Returns how many photos the draft now has, or null when the draft
 * has moved on (or was cancelled) while the photo was uploading.
 */
export async function appendPhoto(chatId: number, url: string): Promise<number | null> {
  const rows = await getFlowersDb()
    .update(schema.botDrafts)
    .set({
      data: sql`jsonb_set(${schema.botDrafts.data}, '{photos}', coalesce(${schema.botDrafts.data}->'photos', '[]'::jsonb) || ${JSON.stringify([url])}::jsonb)`,
      updatedAt: new Date(),
    })
    .where(sql`${schema.botDrafts.chatId} = ${String(chatId)} and ${schema.botDrafts.step} = 'photos'`)
    .returning({ data: schema.botDrafts.data });
  if (!rows.length) return null;
  return (rows[0].data as DraftData).photos.length;
}
