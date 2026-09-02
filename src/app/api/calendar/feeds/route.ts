import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { rowToCalendarFeed } from '@/db/map';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import { syncFeedById } from '@/lib/server/calendarSync';
import {
  CALENDAR_FEED_SOURCES,
  CALENDAR_SOURCE_LABELS,
  type CalendarFeedInput,
} from '@/types/calendar';
import { requireAdmin } from '@/lib/auth/guard';

function validateFeedUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  // webcal:// is what platforms often copy — same thing over https.
  if (url.protocol === 'webcal:') url.protocol = 'https:';
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  return url.toString();
}

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDbConfigured()) return dbUnavailableResponse();

  const apartmentId = new URL(request.url).searchParams.get('apartmentId');

  try {
    const db = getDb();
    const rows = apartmentId
      ? await db
          .select()
          .from(schema.calendarFeeds)
          .where(eq(schema.calendarFeeds.apartmentId, apartmentId))
      : await db.select().from(schema.calendarFeeds);

    return NextResponse.json({ feeds: rows.map(rowToCalendarFeed) });
  } catch (e) {
    console.error('GET /api/calendar/feeds', e);
    return jsonError('Failed to load calendar feeds', 500);
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    const body = (await request.json()) as CalendarFeedInput;

    if (!body?.apartmentId) return jsonError('apartmentId is required');
    if (!CALENDAR_FEED_SOURCES.includes(body.source)) return jsonError('Unknown calendar source');

    const url = validateFeedUrl(body.url ?? '');
    if (!url) return jsonError('Enter a valid calendar link (https://…/calendar.ics)');

    const db = getDb();
    const now = new Date();
    const id = `feed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await db.insert(schema.calendarFeeds).values({
      id,
      apartmentId: body.apartmentId,
      source: body.source,
      label: body.label?.trim() || CALENDAR_SOURCE_LABELS[body.source],
      url,
      eventCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Pull straight away so admin sees whether the link actually works.
    await syncFeedById(id);

    const saved = await db
      .select()
      .from(schema.calendarFeeds)
      .where(eq(schema.calendarFeeds.id, id))
      .limit(1);

    return NextResponse.json({ feed: rowToCalendarFeed(saved[0]) }, { status: 201 });
  } catch (e) {
    console.error('POST /api/calendar/feeds', e);
    return jsonError('Failed to add calendar feed', 500);
  }
}
