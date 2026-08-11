import { addDaysISO, compareISO } from '@/lib/dates';

export type IcalEvent = {
  /** Stable id from the feed — used to recognise the same reservation across syncs. */
  uid: string;
  /** First blocked night (ISO date). */
  checkIn: string;
  /** Check-out day, exclusive — matches DTEND in an all-day VEVENT. */
  checkOut: string;
  summary: string;
};

/** RFC 5545 line folding: a CRLF followed by a space or tab continues the previous line. */
function unfold(raw: string): string[] {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n');
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

/** `DTSTART;VALUE=DATE:20260810` → `{ name: 'DTSTART', value: '20260810' }` */
function splitProperty(line: string): { name: string; value: string } | null {
  const colon = line.indexOf(':');
  if (colon === -1) return null;
  const head = line.slice(0, colon);
  const semi = head.indexOf(';');
  const name = (semi === -1 ? head : head.slice(0, semi)).trim().toUpperCase();
  if (!name) return null;
  return { name, value: line.slice(colon + 1) };
}

/** Accepts `20260810`, `20260810T140000Z` and `2026-08-10`; returns an ISO date or null. */
function toISODateValue(raw: string): string | null {
  const value = raw.trim();
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const dashed = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dashed) return `${dashed[1]}-${dashed[2]}-${dashed[3]}`;
  return null;
}

/**
 * Reads the VEVENTs out of an iCal feed (Airbnb, Booking.com, Vrbo — the format is
 * the same). Only what a calendar needs is kept: the blocked range and a label.
 * Malformed events are skipped rather than failing the whole feed.
 */
export function parseIcal(raw: string): IcalEvent[] {
  const events: IcalEvent[] = [];
  let current: Partial<IcalEvent> | null = null;

  for (const line of unfold(raw)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.toUpperCase() === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }

    if (trimmed.toUpperCase() === 'END:VEVENT') {
      if (current?.uid && current.checkIn) {
        const checkIn = current.checkIn;
        const rawEnd = current.checkOut ?? addDaysISO(checkIn, 1);
        // A same-day or inverted range would block nothing — give it one night.
        const checkOut = compareISO(rawEnd, checkIn) > 0 ? rawEnd : addDaysISO(checkIn, 1);
        events.push({
          uid: current.uid,
          checkIn,
          checkOut,
          summary: current.summary ?? '',
        });
      }
      current = null;
      continue;
    }

    if (!current) continue;

    const prop = splitProperty(trimmed);
    if (!prop) continue;

    switch (prop.name) {
      case 'UID':
        current.uid = prop.value.trim();
        break;
      case 'SUMMARY':
        current.summary = unescapeText(prop.value);
        break;
      case 'DTSTART': {
        const iso = toISODateValue(prop.value);
        if (iso) current.checkIn = iso;
        break;
      }
      case 'DTEND': {
        const iso = toISODateValue(prop.value);
        if (iso) current.checkOut = iso;
        break;
      }
      default:
        break;
    }
  }

  return events;
}
