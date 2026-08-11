export type IcalExportEvent = {
  uid: string;
  /** First blocked night (ISO date). */
  checkIn: string;
  /** Check-out day, exclusive. */
  checkOut: string;
  summary: string;
};

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function compactDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '');
}

function stamp(now: Date): string {
  return `${now.toISOString().slice(0, 19).replace(/[-:]/g, '')}Z`;
}

/** RFC 5545 wants lines of at most 75 octets, continued with a leading space. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join('\r\n');
}

/**
 * Builds the feed other platforms import from us: one all-day VEVENT per blocked
 * range, no guest details. `DTEND` is the check-out day (exclusive), which is how
 * Airbnb and Booking.com read availability too.
 */
export function buildIcal(calendarName: string, events: IcalExportEvent[]): string {
  const now = new Date();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Palei Apartments//Booking Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeText(event.uid)}`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${compactDate(event.checkIn)}`,
      `DTEND;VALUE=DATE:${compactDate(event.checkOut)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  return `${lines.map(fold).join('\r\n')}\r\n`;
}
