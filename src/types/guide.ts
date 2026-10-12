import type { Locale } from '@/i18n/types';

/** A text the owner may have written in some languages and not others. */
export type LocalizedText = Partial<Record<Locale, string>>;

/** What a code opens. Fixed, so each one has a translated name on the guest's page. */
export const ACCESS_CODE_KINDS = ['building', 'lockbox', 'door'] as const;
export type AccessCodeKind = (typeof ACCESS_CODE_KINDS)[number];

export function isAccessCodeKind(value: unknown): value is AccessCodeKind {
  return (ACCESS_CODE_KINDS as readonly unknown[]).includes(value);
}

/**
 * Which part of the stay a step belongs to: getting in, or leaving — where the
 * key goes back, where the rubbish goes. Absent means the way in.
 */
export type GuideStage = 'in' | 'out';

/** How many photos one step may carry. */
export const MAX_STEP_PHOTOS = 6;

/** One step: its photos, what to do there, and the code it needs. */
export interface GuideStep {
  id: string;
  stage?: GuideStage;
  /** In the order the guest should look at them — the wide shot, then the detail. */
  photos?: string[];
  text: LocalizedText;
  /** Prints this code inside the step once the guest's window has opened. */
  codeKind?: AccessCodeKind;
}

/** Everything about getting into one apartment, except the codes themselves. */
export interface CheckInGuide {
  apartmentId: string;
  /** The exact address, house and flat number included — never on the public site. */
  address: string;
  /** `HH:mm`, in the apartment's own time zone. */
  checkInTime: string;
  checkOutTime: string;
  /** How long before check-in the codes and Wi-Fi password appear. */
  revealHours: number;
  wifiName: string;
  wifiPassword: string;
  steps: GuideStep[];
  /** House rules, parking, rubbish — anything that is not a step. */
  notes: LocalizedText;
}

/**
 * A code and the moment it takes over. The newest one whose moment has passed
 * is the one guests see, so a change is entered ahead of time as a new row.
 */
export interface AccessCode {
  id: string;
  kind: AccessCodeKind;
  code: string;
  /** `YYYY-MM-DDTHH:mm`, wall-clock time where the apartment is. */
  validFrom: string;
}

/** A guest's personal link to the guide, good for one stay. */
export interface GuestPass {
  id: string;
  apartmentId: string;
  bookingId?: string;
  guestName: string;
  guestContact?: string;
  checkIn: string;
  checkOut: string;
  revokedAt?: string;
  firstOpenedAt?: string;
  openCount: number;
  /** When the guest pressed "I'm in". */
  arrivedAt?: string;
  createdAt: string;
  /** `/stay/<token>` — without language prefix or origin. */
  path: string;
}

export type StayPhase = 'upcoming' | 'open' | 'ended';

/**
 * What the guest's page is given. Built on the server for one request: outside
 * the window `codes` is empty and `wifi` absent, so they are not in the page at
 * all rather than hidden in it.
 */
export interface StayView {
  phase: StayPhase;
  apartmentId: string;
  apartmentTitle: string;
  guestName: string;
  datesLabel: string;
  checkInTime: string;
  checkOutTime: string;
  address: string;
  lat?: number;
  lng?: number;
  /** Epoch ms the codes appear at, and the same moment written out. */
  revealAt: number;
  revealLabel: string;
  steps: {
    id: string;
    stage: GuideStage;
    photos: string[];
    text: string;
    codeKind?: AccessCodeKind;
  }[];
  /** The day of departure, where the apartment is: leaving comes first then. */
  leavingToday: boolean;
  notes: string;
  /** Which codes this apartment has, so a locked page can say what is coming. */
  codeKinds: AccessCodeKind[];
  codes: { kind: AccessCodeKind; code: string }[];
  hasWifi: boolean;
  wifi?: { name: string; password: string };
  arrived: boolean;
}

export const DEFAULT_CHECK_IN_TIME = '15:00';
export const DEFAULT_CHECK_OUT_TIME = '11:00';
export const DEFAULT_REVEAL_HOURS = 3;

export function emptyGuide(apartmentId: string): CheckInGuide {
  return {
    apartmentId,
    address: '',
    checkInTime: DEFAULT_CHECK_IN_TIME,
    checkOutTime: DEFAULT_CHECK_OUT_TIME,
    revealHours: DEFAULT_REVEAL_HOURS,
    wifiName: '',
    wifiPassword: '',
    steps: [],
    notes: {},
  };
}
