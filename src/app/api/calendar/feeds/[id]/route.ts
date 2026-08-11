import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { rowToCalendarFeed } from '@/db/map';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import { syncFeedById } from '@/lib/server/calendarSync';

type RouteContext = { params: { id: string } };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    const body = (await request.json()) as { url?: string; label?: string };
    const patch: { url?: string; label?: string; updatedAt: Date } = { updatedAt: new Date() };

    if (typeof body.url === 'string') {
      try {
        const parsed = new URL(body.url.trim());
        if (parsed.protocol === 'webcal:') parsed.protocol = 'https:';
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('bad');
        patch.url = parsed.toString();
      } catch {
        return jsonError('Enter a valid calendar link (https://…/calendar.ics)');
      }
    }

    if (typeof body.label === 'string' && body.label.trim()) {
      patch.label = body.label.trim();
    }

    const db = getDb();
    const updated = await db
      .update(schema.calendarFeeds)
      .set(patch)
      .where(eq(schema.calendarFeeds.id, params.id))
      .returning();

    if (!updated.length) return jsonError('Calendar feed not found', 404);

    if (patch.url) await syncFeedById(params.id);

    const saved = await db
      .select()
      .from(schema.calendarFeeds)
      .where(eq(schema.calendarFeeds.id, params.id))
      .limit(1);

    return NextResponse.json({ feed: rowToCalendarFeed(saved[0]) });
  } catch (e) {
    console.error('PATCH /api/calendar/feeds/[id]', e);
    return jsonError('Failed to update calendar feed', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    const db = getDb();

    // Blocks first — an orphaned block would keep dates busy forever.
    await db.delete(schema.externalBlocks).where(eq(schema.externalBlocks.feedId, params.id));

    const removed = await db
      .delete(schema.calendarFeeds)
      .where(eq(schema.calendarFeeds.id, params.id))
      .returning({ id: schema.calendarFeeds.id });

    if (!removed.length) return jsonError('Calendar feed not found', 404);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/calendar/feeds/[id]', e);
    return jsonError('Failed to delete calendar feed', 500);
  }
}
