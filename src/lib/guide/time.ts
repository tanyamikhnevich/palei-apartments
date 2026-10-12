import type { Region } from '@/types/region';
import { REGIONS } from '@/types/region';

/**
 * Check-in is at three o'clock *there* — in Bat Yam or in Limassol — whatever
 * clock the server or the guest's phone happens to keep. Everything about a
 * stay's window is therefore worked out in the apartment's own time zone.
 */
const TIME_ZONES: Record<Region['country'], string> = {
  IL: 'Asia/Jerusalem',
  CY: 'Asia/Nicosia',
};

export function timeZoneForArea(area: string): string {
  const region = REGIONS.find((r) => r.area === area);
  return TIME_ZONES[region?.country ?? 'IL'];
}

/** How far `timeZone` is ahead of UTC at this instant, in milliseconds. */
function offsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

  const asUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second')
  );
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * The instant a wall-clock time (`YYYY-MM-DDTHH:mm`) happens in `timeZone`,
 * as epoch milliseconds. `NaN` when the string is not a time.
 */
export function zonedToUtcMs(local: string, timeZone: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(local);
  if (!match) return NaN;
  const [, y, m, d, hh = '00', mm = '00'] = match;
  const wall = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));

  // The offset depends on the instant, and the instant on the offset. One
  // correction settles it everywhere but inside the hour a clock change skips.
  const first = offsetMs(wall, timeZone);
  const second = offsetMs(wall - first, timeZone);
  return wall - second;
}

/** `YYYY-MM-DDTHH:mm` on the wall clock in `timeZone` right now. */
export function nowInZone(timeZone: string, now = Date.now()): string {
  return new Date(now + offsetMs(now, timeZone)).toISOString().slice(0, 16);
}
