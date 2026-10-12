import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import type { AccessCodeRow, CheckInGuideRow, GuestPassRow } from '@/db/schema';
import { rowToApartment } from '@/db/map';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import type { Locale } from '@/i18n/types';
import { randomId, randomToken } from '@/lib/auth/crypto';
import { formatDateRange } from '@/lib/dates';
import { newPassId, passIdFromToken, pathForPass } from '@/lib/guide/passToken';
import { pickText } from '@/lib/guide/sanitize';
import { nowInZone, timeZoneForArea } from '@/lib/guide/time';
import { codesInForce, stayWindow } from '@/lib/guide/window';
import { withResolvedCoords } from '@/lib/server/apartmentCoords';
import {
  emptyGuide,
  type AccessCode,
  type CheckInGuide,
  type GuestPass,
  type StayView,
} from '@/types/guide';

/**
 * SERVER ONLY. Everything here reads or writes door codes; nothing under
 * `src/components` may import this file.
 */

function isoDate(value: string | Date): string {
  return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

function rowToGuide(row: CheckInGuideRow): CheckInGuide {
  return {
    apartmentId: row.apartmentId,
    address: row.address,
    checkInTime: row.checkInTime,
    checkOutTime: row.checkOutTime,
    revealHours: row.revealHours,
    wifiName: row.wifiName,
    wifiPassword: row.wifiPassword,
    steps: row.steps ?? [],
    notes: row.notes ?? {},
  };
}

function rowToCode(row: AccessCodeRow): AccessCode {
  return { id: row.id, kind: row.kind, code: row.code, validFrom: row.validFrom };
}

async function rowToPass(row: GuestPassRow): Promise<GuestPass> {
  return {
    id: row.id,
    apartmentId: row.apartmentId,
    bookingId: row.bookingId ?? undefined,
    guestName: row.guestName,
    guestContact: row.guestContact ?? undefined,
    checkIn: isoDate(row.checkIn),
    checkOut: isoDate(row.checkOut),
    revokedAt: row.revokedAt?.toISOString(),
    firstOpenedAt: row.firstOpenedAt?.toISOString(),
    openCount: row.openCount,
    arrivedAt: row.arrivedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    path: await pathForPass(row.id),
  };
}

/** The guide as the panel edits it. An apartment with none yet gets a blank one. */
export async function readGuide(
  apartmentId: string
): Promise<{ guide: CheckInGuide; codes: AccessCode[] }> {
  const db = getDb();
  const [guides, codes] = await Promise.all([
    db
      .select()
      .from(schema.checkInGuides)
      .where(eq(schema.checkInGuides.apartmentId, apartmentId))
      .limit(1),
    db.select().from(schema.accessCodes).where(eq(schema.accessCodes.apartmentId, apartmentId)),
  ]);

  return {
    guide: guides.length ? rowToGuide(guides[0]) : emptyGuide(apartmentId),
    codes: codes.map(rowToCode).sort((a, b) => b.validFrom.localeCompare(a.validFrom)),
  };
}

/** Saves the guide and replaces the apartment's codes with the list given. */
export async function writeGuide(guide: CheckInGuide, codes: AccessCode[]): Promise<void> {
  const db = getDb();
  const { apartmentId, ...fields } = guide;
  const now = new Date();

  const upsert = db
    .insert(schema.checkInGuides)
    .values({ apartmentId, ...fields, updatedAt: now })
    .onConflictDoUpdate({
      target: schema.checkInGuides.apartmentId,
      set: { ...fields, updatedAt: now },
    });
  const clear = db.delete(schema.accessCodes).where(eq(schema.accessCodes.apartmentId, apartmentId));

  // One round trip, all or nothing: a guide saved without its codes would
  // leave a guest standing at the lockbox.
  if (codes.length) {
    const fill = db.insert(schema.accessCodes).values(
      // Ids are minted here: the panel's are only keys for its own list.
      codes.map((c) => ({
        id: randomId(),
        apartmentId,
        kind: c.kind,
        code: c.code,
        validFrom: c.validFrom,
      }))
    );
    await db.batch([upsert, clear, fill]);
  } else {
    await db.batch([upsert, clear]);
  }
}

/**
 * Adds one code without touching the rest — what the Telegram bot does when a
 * lockbox is re-set from the pavement. The codes already there stay as the
 * history, and as what a guest still inside goes on seeing until `validFrom`.
 */
export async function addAccessCode(code: Omit<AccessCode, 'id'> & { apartmentId: string }) {
  await getDb().insert(schema.accessCodes).values({ id: randomId(), ...code });
}

/** Every apartment's codes, for the bot's overview. */
export async function allAccessCodes(): Promise<Map<string, AccessCode[]>> {
  const rows = await getDb().select().from(schema.accessCodes);
  const byApartment = new Map<string, AccessCode[]>();
  for (const row of rows) {
    const list = byApartment.get(row.apartmentId) ?? [];
    list.push(rowToCode(row));
    byApartment.set(row.apartmentId, list);
  }
  return byApartment;
}

export async function listPasses(apartmentId: string): Promise<GuestPass[]> {
  const rows = await getDb()
    .select()
    .from(schema.guestPasses)
    .where(eq(schema.guestPasses.apartmentId, apartmentId))
    .orderBy(desc(schema.guestPasses.checkIn));
  return Promise.all(rows.map(rowToPass));
}

export async function createPass(input: {
  apartmentId: string;
  bookingId?: string;
  guestName: string;
  guestContact?: string;
  checkIn: string;
  checkOut: string;
}): Promise<GuestPass> {
  const [row] = await getDb()
    .insert(schema.guestPasses)
    .values({
      id: newPassId(),
      apartmentId: input.apartmentId,
      bookingId: input.bookingId ?? null,
      guestName: input.guestName,
      guestContact: input.guestContact ?? null,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
    })
    .returning();
  return rowToPass(row);
}

/**
 * The link for a booking — the one already made for it, if there is one. A
 * second click on the same stay must hand back the link the guest already has,
 * not a new one that leaves theirs looking stale.
 */
export async function passForBooking(bookingId: string): Promise<GuestPass | null> {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.guestPasses)
    .where(and(eq(schema.guestPasses.bookingId, bookingId), isNull(schema.guestPasses.revokedAt)))
    .limit(1);
  if (existing.length) return rowToPass(existing[0]);

  const bookings = await db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.id, bookingId))
    .limit(1);
  if (!bookings.length) return null;

  const booking = bookings[0];
  return createPass({
    apartmentId: booking.apartmentId,
    bookingId: booking.id,
    guestName: booking.guest,
    guestContact: booking.guestContact ?? undefined,
    checkIn: isoDate(booking.checkIn),
    checkOut: isoDate(booking.checkOut),
  });
}

export async function revokePass(id: string): Promise<boolean> {
  const rows = await getDb()
    .update(schema.guestPasses)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.guestPasses.id, id), isNull(schema.guestPasses.revokedAt)))
    .returning({ id: schema.guestPasses.id });
  return rows.length > 0;
}

/** A pass that can be used, with the dates it currently stands for. */
type LivePass = { row: GuestPassRow; checkIn: string; checkOut: string };

async function livePass(token: string): Promise<LivePass | 'missing' | 'revoked'> {
  // Checked before the database is asked anything: a guessed link costs one
  // HMAC and never a query.
  const id = await passIdFromToken(token);
  if (!id) return 'missing';

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.guestPasses)
    .where(eq(schema.guestPasses.id, id))
    .limit(1);
  if (!rows.length) return 'missing';

  const row = rows[0];
  if (row.revokedAt) return 'revoked';

  let checkIn = isoDate(row.checkIn);
  let checkOut = isoDate(row.checkOut);

  /*
    A pass made from a booking follows it. Dates moved in the panel move the
    window with them, and a stay that was declined takes its link down too —
    nobody has to remember that a link was ever sent.
  */
  if (row.bookingId) {
    const bookings = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, row.bookingId))
      .limit(1);
    if (bookings.length) {
      if (bookings[0].status === 'Declined') return 'revoked';
      checkIn = isoDate(bookings[0].checkIn);
      checkOut = isoDate(bookings[0].checkOut);
    }
  }

  return { row, checkIn, checkOut };
}

export type StayLookup =
  | { status: 'missing' }
  | { status: 'revoked' }
  | { status: 'ok'; view: StayView };

/**
 * What one guest may see right now, in their language.
 *
 * The decision about codes is made here, per request: before the window opens
 * and after it closes they are simply not part of the answer.
 */
export async function loadStay(token: string, locale: Locale): Promise<StayLookup> {
  const pass = await livePass(token);
  if (pass === 'missing' || pass === 'revoked') return { status: pass };

  const db = getDb();
  const { row, checkIn, checkOut } = pass;

  const [apartments, guides, codeRows] = await Promise.all([
    db.select().from(schema.apartments).where(eq(schema.apartments.id, row.apartmentId)).limit(1),
    db
      .select()
      .from(schema.checkInGuides)
      .where(eq(schema.checkInGuides.apartmentId, row.apartmentId))
      .limit(1),
    db.select().from(schema.accessCodes).where(eq(schema.accessCodes.apartmentId, row.apartmentId)),
  ]);
  if (!apartments.length) return { status: 'missing' };

  const apartment = withResolvedCoords(rowToApartment(apartments[0]));
  const copy = getApartmentCopy(apartment, locale);
  const guide = guides.length ? rowToGuide(guides[0]) : emptyGuide(row.apartmentId);
  const timeZone = timeZoneForArea(apartment.area);
  const { phase, revealAt } = stayWindow({ checkIn, checkOut }, guide, timeZone);

  const base = {
    phase,
    apartmentId: apartment.id,
    apartmentTitle: copy.title,
    guestName: row.guestName,
    datesLabel: formatDateRange(checkIn, checkOut, locale),
    checkInTime: guide.checkInTime,
    checkOutTime: guide.checkOutTime,
    revealAt,
    revealLabel: new Intl.DateTimeFormat(locale, {
      timeZone,
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(revealAt)),
    arrived: Boolean(row.arrivedAt),
  };

  // Once the guest has left, the way in is no longer theirs to read either.
  if (phase === 'ended') {
    return {
      status: 'ok',
      view: {
        ...base,
        address: '',
        steps: [],
        leavingToday: false,
        notes: '',
        codeKinds: [],
        codes: [],
        hasWifi: false,
      },
    };
  }

  const codes = codeRows.map(rowToCode);
  const open = phase === 'open';
  const inForce = codesInForce(codes, timeZone);
  const hasWifi = Boolean(guide.wifiName || guide.wifiPassword);

  return {
    status: 'ok',
    view: {
      ...base,
      // The owner's exact address when they wrote one, otherwise the listing's
      // own — read here in full, house number included.
      address: guide.address || copy.location,
      lat: apartment.lat,
      lng: apartment.lng,
      steps: guide.steps.map((step) => ({
        id: step.id,
        stage: step.stage ?? 'in',
        photos: step.photos ?? [],
        text: pickText(step.text, locale),
        codeKind: step.codeKind,
      })),
      leavingToday: nowInZone(timeZone).slice(0, 10) >= checkOut,
      notes: pickText(guide.notes, locale),
      codeKinds: [...new Set(codes.map((c) => c.kind))],
      codes: open ? inForce.map(({ kind, code }) => ({ kind, code })) : [],
      hasWifi,
      wifi: open && hasWifi ? { name: guide.wifiName, password: guide.wifiPassword } : undefined,
    },
  };
}

export const HOUSE_PATH_PREFIX = '/house/';

/** The sticker link for an apartment, minted the first time it is asked for. */
export async function houseLinkFor(apartmentId: string): Promise<string> {
  const db = getDb();
  await db
    .insert(schema.houseLinks)
    .values({ apartmentId, token: randomToken(16) })
    .onConflictDoNothing({ target: schema.houseLinks.apartmentId });

  const rows = await db
    .select()
    .from(schema.houseLinks)
    .where(eq(schema.houseLinks.apartmentId, apartmentId))
    .limit(1);
  return `${HOUSE_PATH_PREFIX}${rows[0].token}`;
}

/** A new link for the sticker. The one already on the wall stops working. */
export async function reissueHouseLink(apartmentId: string): Promise<string> {
  const token = randomToken(16);
  await getDb()
    .insert(schema.houseLinks)
    .values({ apartmentId, token })
    .onConflictDoUpdate({
      target: schema.houseLinks.apartmentId,
      set: { token, createdAt: new Date() },
    });
  return `${HOUSE_PATH_PREFIX}${token}`;
}

/**
 * What the sticker's link shows to whoever is standing in the apartment:
 * Wi-Fi, the house notes and how to leave. It is the same shape the guest's
 * page takes, with everything about one particular stay left empty — and no
 * codes and no address, whoever asks and whenever.
 */
export async function loadHouse(token: string, locale: Locale): Promise<StayView | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;

  const db = getDb();
  const links = await db
    .select()
    .from(schema.houseLinks)
    .where(eq(schema.houseLinks.token, token))
    .limit(1);
  if (!links.length) return null;

  const { apartmentId } = links[0];
  const [apartments, guides] = await Promise.all([
    db.select().from(schema.apartments).where(eq(schema.apartments.id, apartmentId)).limit(1),
    db
      .select()
      .from(schema.checkInGuides)
      .where(eq(schema.checkInGuides.apartmentId, apartmentId))
      .limit(1),
  ]);
  if (!apartments.length) return null;

  const apartment = rowToApartment(apartments[0]);
  const guide = guides.length ? rowToGuide(guides[0]) : emptyGuide(apartmentId);
  const hasWifi = Boolean(guide.wifiName || guide.wifiPassword);

  return {
    phase: 'open',
    apartmentId,
    apartmentTitle: getApartmentCopy(apartment, locale).title,
    guestName: '',
    datesLabel: '',
    checkInTime: guide.checkInTime,
    checkOutTime: guide.checkOutTime,
    address: '',
    revealAt: 0,
    revealLabel: '',
    steps: guide.steps
      .filter((step) => step.stage === 'out')
      .map((step) => ({
        id: step.id,
        stage: 'out' as const,
        photos: step.photos ?? [],
        text: pickText(step.text, locale),
      })),
    leavingToday: true,
    notes: pickText(guide.notes, locale),
    codeKinds: [],
    codes: [],
    hasWifi,
    wifi: hasWifi ? { name: guide.wifiName, password: guide.wifiPassword } : undefined,
    arrived: false,
  };
}

export type StayEvent = 'opened' | 'arrived';

/**
 * Notes that the guest opened the guide, or says they are inside. Answers with
 * what the owner should be told, if anything: an arrival is announced once.
 */
export async function recordStayEvent(
  token: string,
  event: StayEvent
): Promise<{ ok: false } | { ok: true; announce?: { guest: string; apartment: string; dates: string } }> {
  const pass = await livePass(token);
  if (pass === 'missing' || pass === 'revoked') return { ok: false };

  const db = getDb();
  const { row, checkIn, checkOut } = pass;
  const now = new Date();

  if (event === 'opened') {
    await db
      .update(schema.guestPasses)
      .set({
        openCount: sql`${schema.guestPasses.openCount} + 1`,
        firstOpenedAt: row.firstOpenedAt ?? now,
        lastOpenedAt: now,
      })
      .where(eq(schema.guestPasses.id, row.id));
    return { ok: true };
  }

  // Only the first press counts, and only the request that wins the update
  // gets to announce it — two taps must not send two messages.
  const claimed = await db
    .update(schema.guestPasses)
    .set({ arrivedAt: now })
    .where(and(eq(schema.guestPasses.id, row.id), isNull(schema.guestPasses.arrivedAt)))
    .returning({ id: schema.guestPasses.id });
  if (!claimed.length) return { ok: true };

  const apartments = await db
    .select()
    .from(schema.apartments)
    .where(eq(schema.apartments.id, row.apartmentId))
    .limit(1);

  return {
    ok: true,
    announce: {
      guest: row.guestName,
      apartment: apartments.length
        ? getApartmentCopy(rowToApartment(apartments[0]), 'en').title
        : row.apartmentId,
      dates: formatDateRange(checkIn, checkOut, 'en'),
    },
  };
}
