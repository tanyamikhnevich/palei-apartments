import type { AccessCode, AccessCodeKind, StayPhase } from '@/types/guide';
import { ACCESS_CODE_KINDS } from '@/types/guide';
import { zonedToUtcMs } from './time';

const HOUR = 60 * 60 * 1000;

/**
 * The page keeps answering for an hour past check-out: a guest who is running
 * late, or already at the door with the key in hand, still needs the lockbox
 * code to give it back.
 */
const CHECKOUT_GRACE_MS = HOUR;

export type StayWindow = {
  phase: StayPhase;
  /** When the codes appear, epoch ms. */
  revealAt: number;
  endsAt: number;
};

/**
 * Where a stay stands right now: before the codes are shown, while they are,
 * or after the guest has left.
 */
export function stayWindow(
  stay: { checkIn: string; checkOut: string },
  guide: { checkInTime: string; checkOutTime: string; revealHours: number },
  timeZone: string,
  now = Date.now()
): StayWindow {
  const arrival = zonedToUtcMs(`${stay.checkIn}T${guide.checkInTime}`, timeZone);
  const departure = zonedToUtcMs(`${stay.checkOut}T${guide.checkOutTime}`, timeZone);
  const revealAt = arrival - guide.revealHours * HOUR;
  const endsAt = departure + CHECKOUT_GRACE_MS;

  // Dates that cannot be read open nothing, rather than everything.
  if (!Number.isFinite(revealAt) || !Number.isFinite(endsAt)) {
    return { phase: 'ended', revealAt: 0, endsAt: 0 };
  }

  const phase: StayPhase = now < revealAt ? 'upcoming' : now < endsAt ? 'open' : 'ended';
  return { phase, revealAt, endsAt };
}

/**
 * The code in force for each kind: the newest one whose start has passed.
 * Returned in the fixed order of the kinds, so the page never reshuffles.
 */
export function codesInForce(
  codes: AccessCode[],
  timeZone: string,
  now = Date.now()
): { kind: AccessCodeKind; code: string; id: string }[] {
  const latest = new Map<AccessCodeKind, { at: number; code: AccessCode }>();

  for (const code of codes) {
    const at = zonedToUtcMs(code.validFrom, timeZone);
    if (!Number.isFinite(at) || at > now) continue;
    const held = latest.get(code.kind);
    if (!held || at >= held.at) latest.set(code.kind, { at, code });
  }

  return ACCESS_CODE_KINDS.flatMap((kind) => {
    const held = latest.get(kind);
    return held ? [{ kind, code: held.code.code, id: held.code.id }] : [];
  });
}
