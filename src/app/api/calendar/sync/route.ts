import { NextResponse } from 'next/server';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import { syncAllFeeds, syncApartmentFeeds, syncFeedById } from '@/lib/server/calendarSync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Scheduled pull (Vercel cron hits this with GET).
 * When CRON_SECRET is set the call must carry it, so the endpoint cannot be
 * used by strangers to hammer the platforms' calendar servers.
 */
export async function GET(request: Request) {
  if (!isDbConfigured()) return dbUnavailableResponse();

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(request.url);
    const header = request.headers.get('authorization');
    const provided = header?.replace(/^Bearer\s+/i, '') ?? url.searchParams.get('secret');
    if (provided !== secret) return jsonError('Unauthorized', 401);
  }

  try {
    const results = await syncAllFeeds();
    return NextResponse.json({
      synced: results.length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  } catch (e) {
    console.error('GET /api/calendar/sync', e);
    return jsonError('Calendar sync failed', 500);
  }
}

/** Manual "Sync now" from admin: whole site, one apartment, or one feed. */
export async function POST(request: Request) {
  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      apartmentId?: string;
      feedId?: string;
    };

    if (body.feedId) {
      const result = await syncFeedById(body.feedId);
      if (!result) return jsonError('Calendar feed not found', 404);
      return NextResponse.json({ synced: 1, failed: result.ok ? 0 : 1, results: [result] });
    }

    const results = body.apartmentId
      ? await syncApartmentFeeds(body.apartmentId)
      : await syncAllFeeds();

    return NextResponse.json({
      synced: results.length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  } catch (e) {
    console.error('POST /api/calendar/sync', e);
    return jsonError('Calendar sync failed', 500);
  }
}
