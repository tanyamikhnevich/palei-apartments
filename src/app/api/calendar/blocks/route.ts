import { NextResponse } from 'next/server';
import { getDb } from '@/db/index';
import { requireAdmin } from '@/lib/auth/guard';
import { isDbConfigured, jsonError } from '@/lib/api/errors';
import { loadImportedBlocks, syncStaleFeeds } from '@/lib/server/calendarSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reservations imported from the platforms, for the admin calendar.
 *
 * Opening the calendar refreshes any feed that has gone stale, so the view is
 * current without waiting for the nightly cron — the same trick the public
 * availability endpoint uses.
 */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDbConfigured()) return NextResponse.json({ blocks: [] });

  try {
    await syncStaleFeeds().catch((e) => {
      console.warn('calendar/blocks: stale feed refresh failed', e);
    });

    return NextResponse.json({ blocks: await loadImportedBlocks(getDb()) });
  } catch (e) {
    console.error('GET /api/calendar/blocks', e);
    return jsonError('Failed to load imported reservations', 500);
  }
}
