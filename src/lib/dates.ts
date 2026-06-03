const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseISODate(iso: string): Date {
  if (!ISO_RE.test(iso)) throw new Error(`Invalid date: ${iso}`);
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = parseISODate(checkIn).getTime();
  const b = parseISODate(checkOut).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function rangesOverlap(
  aIn: string,
  aOut: string,
  bIn: string,
  bOut: string
): boolean {
  return aIn < bOut && bIn < aOut;
}

export function isNightBlocked(
  iso: string,
  ranges: { checkIn: string; checkOut: string }[]
): boolean {
  const next = addDaysISO(iso, 1);
  return ranges.some((r) => rangesOverlap(iso, next, r.checkIn, r.checkOut));
}

export function formatDateRange(
  checkIn: string,
  checkOut: string,
  locale: string
): string {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  return `${fmt.format(parseISODate(checkIn))} – ${fmt.format(parseISODate(checkOut))}`;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

export function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function compareISO(a: string, b: string): number {
  return a.localeCompare(b);
}

export function rangeHasBlockedNight(
  from: string,
  to: string,
  blocked: { checkIn: string; checkOut: string }[]
): boolean {
  for (let d = from; compareISO(d, to) < 0; d = addDaysISO(d, 1)) {
    if (isNightBlocked(d, blocked)) return true;
  }
  return false;
}

export function todayISO(): string {
  return toISODate(new Date());
}
