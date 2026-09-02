import { and, eq, inArray, lt, or, isNull } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { rowToCalendarFeed } from '@/db/map';
import { parseIcal, type IcalEvent } from '@/lib/ical/parse';
import { addDaysISO, compareISO, todayISO } from '@/lib/dates';
import type { CalendarFeed, CalendarFeedSource, CalendarSyncOutcome } from '@/types/calendar';

/** Give up on a slow feed rather than hanging the request that triggered the sync. */
const FETCH_TIMEOUT_MS = 12_000;

/** How long an imported calendar may go unrefreshed before a page view re-pulls it. */
export const FEED_STALE_MINUTES = 30;

/** Reservations that ended more than this long ago are not worth storing. */
const KEEP_PAST_DAYS = 7;

type Db = ReturnType<typeof getDb>;

function blockId(feedId: string, uid: string): string {
  // Feed ids are ours and short; UIDs come from the platform and can be long.
  const safeUid = uid.replace(/[^\w.@-]/g, '').slice(0, 60);
  return `${feedId}:${safeUid}`.slice(0, 128);
}

async function fetchIcalText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.8' },
    });

    if (!res.ok) {
      throw new Error(`Feed responded ${res.status} ${res.statusText}`);
    }

    const text = await res.text();
    if (!text.includes('BEGIN:VCALENDAR')) {
      throw new Error('Response is not an iCal calendar — check the link');
    }
    return text;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Feed timed out');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function usefulEvents(events: IcalEvent[]): IcalEvent[] {
  const cutoff = addDaysISO(todayISO(), -KEEP_PAST_DAYS);
  const seen = new Set<string>();

  return events.filter((event) => {
    if (compareISO(event.checkOut, cutoff) <= 0) return false;
    if (seen.has(event.uid)) return false;
    seen.add(event.uid);
    return true;
  });
}

/**
 * Pulls one feed and replaces its stored blocks.
 *
 * A failed fetch leaves the previous blocks in place on purpose: a network blip
 * must not silently free up dates that are actually booked elsewhere. The error
 * is recorded on the feed so admin can see the calendar has gone stale.
 */
export async function syncFeed(db: Db, feed: CalendarFeed): Promise<CalendarSyncOutcome> {
  const now = new Date();

  try {
    const text = await fetchIcalText(feed.url);
    const events = usefulEvents(parseIcal(text));

    await db.delete(schema.externalBlocks).where(eq(schema.externalBlocks.feedId, feed.id));

    if (events.length) {
      await db.insert(schema.externalBlocks).values(
        events.map((event) => ({
          id: blockId(feed.id, event.uid),
          feedId: feed.id,
          apartmentId: feed.apartmentId,
          uid: event.uid,
          summary: event.summary || null,
          checkIn: event.checkIn,
          checkOut: event.checkOut,
          updatedAt: now,
        }))
      );
    }

    await db
      .update(schema.calendarFeeds)
      .set({
        lastSyncAt: now,
        lastStatus: 'ok',
        lastError: null,
        eventCount: events.length,
        updatedAt: now,
      })
      .where(eq(schema.calendarFeeds.id, feed.id));

    return { feedId: feed.id, apartmentId: feed.apartmentId, ok: true, eventCount: events.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed';

    await db
      .update(schema.calendarFeeds)
      .set({ lastSyncAt: now, lastStatus: 'error', lastError: message, updatedAt: now })
      .where(eq(schema.calendarFeeds.id, feed.id));

    return {
      feedId: feed.id,
      apartmentId: feed.apartmentId,
      ok: false,
      eventCount: 0,
      error: message,
    };
  }
}

async function syncFeedRows(db: Db, rows: (typeof schema.calendarFeeds.$inferSelect)[]) {
  const outcomes: CalendarSyncOutcome[] = [];
  // Sequential: a handful of feeds, and Neon's HTTP driver has no connection pool.
  for (const row of rows) {
    outcomes.push(await syncFeed(db, rowToCalendarFeed(row)));
  }
  return outcomes;
}

export async function syncAllFeeds(): Promise<CalendarSyncOutcome[]> {
  const db = getDb();
  const rows = await db.select().from(schema.calendarFeeds);
  return syncFeedRows(db, rows);
}

export async function syncApartmentFeeds(apartmentId: string): Promise<CalendarSyncOutcome[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.calendarFeeds)
    .where(eq(schema.calendarFeeds.apartmentId, apartmentId));
  return syncFeedRows(db, rows);
}

export async function syncFeedById(feedId: string): Promise<CalendarSyncOutcome | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.calendarFeeds)
    .where(eq(schema.calendarFeeds.id, feedId))
    .limit(1);
  if (!rows.length) return null;
  return syncFeed(db, rowToCalendarFeed(rows[0]));
}

/**
 * Refreshes calendars that have not been pulled recently. Called from the
 * availability endpoint so the site stays current even without a cron job.
 */
export async function syncStaleFeeds(
  apartmentId?: string,
  staleMinutes = FEED_STALE_MINUTES
): Promise<CalendarSyncOutcome[]> {
  const db = getDb();
  const cutoff = new Date(Date.now() - staleMinutes * 60_000);
  const stale = or(
    isNull(schema.calendarFeeds.lastSyncAt),
    lt(schema.calendarFeeds.lastSyncAt, cutoff)
  );

  const rows = await db
    .select()
    .from(schema.calendarFeeds)
    .where(apartmentId ? and(eq(schema.calendarFeeds.apartmentId, apartmentId), stale) : stale);

  if (!rows.length) return [];
  return syncFeedRows(db, rows);
}

export type BlockedRange = { checkIn: string; checkOut: string };

/** Imported blocked ranges, keyed by apartment. */
export async function loadExternalBlocks(
  db: Db,
  apartmentIds?: string[]
): Promise<Record<string, BlockedRange[]>> {
  const rows = await db
    .select({
      apartmentId: schema.externalBlocks.apartmentId,
      checkIn: schema.externalBlocks.checkIn,
      checkOut: schema.externalBlocks.checkOut,
    })
    .from(schema.externalBlocks)
    .where(
      apartmentIds?.length
        ? inArray(schema.externalBlocks.apartmentId, apartmentIds)
        : undefined
    );

  const byApartment: Record<string, BlockedRange[]> = {};
  for (const row of rows) {
    const list = byApartment[row.apartmentId] ?? (byApartment[row.apartmentId] = []);
    list.push({
      checkIn: String(row.checkIn).slice(0, 10),
      checkOut: String(row.checkOut).slice(0, 10),
    });
  }
  return byApartment;
}

export type ImportedBlock = {
  id: string;
  apartmentId: string;
  checkIn: string;
  checkOut: string;
  /** Which platform it came from, for the colour and the label. */
  source: CalendarFeedSource;
  feedLabel: string;
  /** Whatever the platform called the event — often "Reserved" or a guest name. */
  summary: string | null;
};

/**
 * Imported reservations with the feed they came from attached.
 *
 * `loadExternalBlocks` above answers "is this date free?" and merges everything
 * into flat ranges; the admin calendar needs the opposite — each block kept
 * separate and labelled, so a night blocked by Airbnb reads as Airbnb.
 */
export async function loadImportedBlocks(
  db: Db,
  apartmentIds?: string[]
): Promise<ImportedBlock[]> {
  const rows = await db
    .select({
      id: schema.externalBlocks.id,
      apartmentId: schema.externalBlocks.apartmentId,
      checkIn: schema.externalBlocks.checkIn,
      checkOut: schema.externalBlocks.checkOut,
      summary: schema.externalBlocks.summary,
      source: schema.calendarFeeds.source,
      feedLabel: schema.calendarFeeds.label,
    })
    .from(schema.externalBlocks)
    .innerJoin(schema.calendarFeeds, eq(schema.externalBlocks.feedId, schema.calendarFeeds.id))
    .where(
      apartmentIds?.length ? inArray(schema.externalBlocks.apartmentId, apartmentIds) : undefined
    );

  return rows.map((row) => ({
    id: row.id,
    apartmentId: row.apartmentId,
    checkIn: String(row.checkIn).slice(0, 10),
    checkOut: String(row.checkOut).slice(0, 10),
    source: row.source,
    feedLabel: row.feedLabel,
    summary: row.summary,
  }));
}
