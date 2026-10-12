import { NextResponse } from 'next/server';
import { isDbConfigured, jsonError } from '@/lib/api/errors';
import { publicSubmitThrottle } from '@/lib/auth/throttle';
import { escapeHtml, sendTelegramMessage } from '@/lib/notify/telegram';
import { recordStayEvent, type StayEvent } from '@/lib/server/guides';

type RouteContext = { params: { token: string } };

const PRIVATE = { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' };

/**
 * What a guest's page reports back: that it was opened, and that the guest is
 * inside. Sent by the page's own script rather than counted when the page is
 * served, because a chat app fetches a link to draw its preview — and that
 * would mark every guide "opened" the moment the owner pasted it.
 *
 * The token in the path is the credential. A wrong one is refused on its
 * signature alone, so nothing here can be used to pester the database.
 */
export async function POST(request: Request, { params }: RouteContext) {
  if (!isDbConfigured()) return jsonError('Not available', 503);

  let event: StayEvent;
  try {
    const body = (await request.json()) as { event?: string };
    if (body.event !== 'opened' && body.event !== 'arrived') return jsonError('Unknown event');
    event = body.event;
  } catch {
    return jsonError('Unknown event');
  }

  // Arriving ends in a message to the owner, so it gets the same brake as
  // every other thing a guest can submit.
  if (event === 'arrived') {
    const gate = publicSubmitThrottle.check(request);
    if (!gate.allowed) return jsonError('Too many requests', 429);
    publicSubmitThrottle.consume(request);
  }

  try {
    const result = await recordStayEvent(params.token, event);
    if (!result.ok) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: PRIVATE });

    if (result.announce) {
      const { guest, apartment, dates } = result.announce;
      await sendTelegramMessage(
        [
          '🔑 <b>Guest checked in</b>',
          `🏠 ${escapeHtml(apartment)}`,
          `👤 ${escapeHtml(guest)}`,
          `📅 ${escapeHtml(dates)}`,
        ].join('\n')
      );
    }

    return NextResponse.json({ ok: true }, { headers: PRIVATE });
  } catch (e) {
    console.error('POST /api/stay/[token]', e);
    return jsonError('Failed', 500);
  }
}
