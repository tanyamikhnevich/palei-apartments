import { LOCALES } from '@/i18n/types';
import type { Locale } from '@/i18n/types';
import { isPhotoUrl } from '@/lib/apartmentMedia';
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
  DEFAULT_REVEAL_HOURS,
  isAccessCodeKind,
  MAX_STEP_PHOTOS,
  type AccessCode,
  type CheckInGuide,
  type GuideStep,
  type LocalizedText,
} from '@/types/guide';

/**
 * What the panel sends is typed by a person and arrives as JSON, so it is
 * rebuilt field by field rather than trusted: unknown keys are dropped, long
 * text is cut, and anything that is not what it claims to be is left out.
 */
const MAX_TEXT = 4000;
const MAX_LINE = 300;
const MAX_STEPS = 30;
const MAX_CODES = 60;
const MAX_REVEAL_HOURS = 72;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const LOCAL_MOMENT = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function line(value: unknown, max = MAX_LINE): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function localized(value: unknown): LocalizedText {
  const out: LocalizedText = {};
  if (!value || typeof value !== 'object') return out;
  for (const locale of LOCALES) {
    const text = line((value as Record<string, unknown>)[locale], MAX_TEXT);
    if (text) out[locale] = text;
  }
  return out;
}

function time(value: unknown, fallback: string): string {
  return typeof value === 'string' && TIME.test(value) ? value : fallback;
}

function steps(value: unknown): GuideStep[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_STEPS).flatMap((raw, i): GuideStep[] => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as Record<string, unknown>;
    const photos = (Array.isArray(item.photos) ? item.photos : [])
      .map((photo) => line(photo, 1000))
      .filter((photo) => photo && isPhotoUrl(photo));
    const step: GuideStep = {
      id: line(item.id, 64) || `step-${i}`,
      text: localized(item.text),
    };
    if (item.stage === 'out') step.stage = 'out';
    if (photos.length) step.photos = [...new Set(photos)].slice(0, MAX_STEP_PHOTOS);
    if (isAccessCodeKind(item.codeKind)) step.codeKind = item.codeKind;
    // A step with nothing to show or say is a row the owner added and left.
    if (!step.photos && !Object.keys(step.text).length && !step.codeKind) return [];
    return [step];
  });
}

export function sanitizeGuide(apartmentId: string, raw: unknown): CheckInGuide {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const hours = Number(body.revealHours);

  return {
    apartmentId,
    address: line(body.address),
    checkInTime: time(body.checkInTime, DEFAULT_CHECK_IN_TIME),
    checkOutTime: time(body.checkOutTime, DEFAULT_CHECK_OUT_TIME),
    revealHours: Number.isFinite(hours)
      ? Math.min(MAX_REVEAL_HOURS, Math.max(0, Math.round(hours)))
      : DEFAULT_REVEAL_HOURS,
    wifiName: line(body.wifiName),
    wifiPassword: line(body.wifiPassword),
    steps: steps(body.steps),
    notes: localized(body.notes),
  };
}

export function sanitizeCodes(raw: unknown): AccessCode[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_CODES).flatMap((value, i): AccessCode[] => {
    if (!value || typeof value !== 'object') return [];
    const item = value as Record<string, unknown>;
    const code = line(item.code, 40);
    const validFrom = line(item.validFrom, 16);
    if (!code || !isAccessCodeKind(item.kind) || !LOCAL_MOMENT.test(validFrom)) return [];
    return [{ id: line(item.id, 64) || `code-${i}`, kind: item.kind, code, validFrom }];
  });
}

/**
 * The text in the reader's language, or the nearest thing to it: English, then
 * whatever the owner did write. An untranslated step is still a step — a blank
 * one in the middle of the way in would be worse than one in another language.
 */
export function pickText(text: LocalizedText | undefined, locale: Locale): string {
  if (!text) return '';
  const order: Locale[] = [locale, 'en', ...LOCALES];
  for (const l of order) {
    const value = text[l]?.trim();
    if (value) return value;
  }
  return '';
}
