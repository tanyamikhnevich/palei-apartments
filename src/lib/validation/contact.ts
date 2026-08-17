/** Shared contact / name validation (Israeli E.164 phones, guest & business names). */

export const PERSON_NAME_MIN = 2;
export const PERSON_NAME_MAX = 50;
export const BUSINESS_NAME_MIN = 2;
export const BUSINESS_NAME_MAX = 80;

/** Max characters in the input (with spaces/dashes). */
export const PHONE_INPUT_MAX_LENGTH = 20;

/** International E.164: 8–15 digits total (incl. country code). */
export const PHONE_DIGITS_MIN = 8;
export const PHONE_DIGITS_MAX = 15;

const PERSON_NAME_RE = /^[\p{L}\p{M}'\s.\-]+$/u;
const BUSINESS_NAME_RE = /^[\p{L}\p{M}0-9'\s.\-&]+$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

/** General E.164: leading +, country code (1–9), 8–15 digits total. */
const E164_RE = /^\+[1-9]\d{7,14}$/;

export type ValidationCode =
  | 'nameRequired'
  | 'nameTooShort'
  | 'nameTooLong'
  | 'nameInvalidChars'
  | 'businessNameRequired'
  | 'businessNameTooShort'
  | 'businessNameTooLong'
  | 'businessNameInvalidChars'
  | 'phoneRequired'
  | 'phoneTooShort'
  | 'phoneTooLong'
  | 'phoneInvalid'
  | 'emailRequired'
  | 'emailInvalid'
  | 'contactRequired'
  | 'contactInvalid';

export type ValidationResult =
  | { ok: true; normalized?: string }
  | { ok: false; code: ValidationCode };

export function countPhoneDigits(raw: string): number {
  return raw.replace(/\D/g, '').length;
}

/** Strip to digits for length checks (keeps leading 0 for local numbers). */
function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Normalize to E.164 (+<country><number>).
 * Local Israeli numbers (05X…, 0X…) are assumed +972 for convenience;
 * any other number must include its country code with a leading + (or 00).
 */
export function normalizePhone(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;

  s = s.replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;

  // International: already carries a country code.
  if (s.startsWith('+')) {
    const e164 = `+${s.slice(1).replace(/\D/g, '')}`;
    return E164_RE.test(e164) ? e164 : null;
  }

  const digits = digitsOnly(s);

  // Local Israeli mobile: 05X-XXXXXXX (exactly 10 digits)
  if (/^05\d{8}$/.test(digits)) {
    return `+972${digits.slice(1)}`;
  }

  // Local Israeli landline: 0[23489] + 7–8 digits
  if (/^0[23489]\d{7,8}$/.test(digits)) {
    return `+972${digits.slice(1)}`;
  }

  // Israeli intl digits without +: 972…
  if (/^972\d{8,9}$/.test(digits)) {
    return `+${digits}`;
  }

  // Any other bare number without a country code — ambiguous, reject.
  return null;
}

function isValidE164(e164: string): boolean {
  return E164_RE.test(e164);
}

export function validatePhone(raw: string): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, code: 'phoneRequired' };

  const digitCount = countPhoneDigits(trimmed);
  if (digitCount < PHONE_DIGITS_MIN) {
    return { ok: false, code: 'phoneTooShort' };
  }
  if (digitCount > PHONE_DIGITS_MAX) {
    return { ok: false, code: 'phoneTooLong' };
  }

  const normalized = normalizePhone(trimmed);
  if (!normalized || !isValidE164(normalized)) {
    return { ok: false, code: 'phoneInvalid' };
  }

  return { ok: true, normalized };
}

/** Restrict typing: digits, +, and common separators only. */
export function sanitizePhoneInput(value: string): string {
  const cleaned = value.replace(/[^\d+\s().-]/g, '');
  if (cleaned.length <= PHONE_INPUT_MAX_LENGTH) return cleaned;
  return cleaned.slice(0, PHONE_INPUT_MAX_LENGTH);
}

/** Max characters of an email address. */
export const EMAIL_INPUT_MAX_LENGTH = 254;

/** The guest is typing an email, not a phone — letters count, `@` comes later. */
export function looksLikeEmailInput(value: string): boolean {
  return /[a-z@]/i.test(value);
}

/**
 * A "phone or email" field accepts both, so phone characters may only be
 * clamped while the value still looks like a phone — otherwise the letters of
 * an email get eaten one by one before the `@` is ever typed.
 */
export function sanitizeContactInput(value: string): string {
  if (looksLikeEmailInput(value)) return value.slice(0, EMAIL_INPUT_MAX_LENGTH);
  return sanitizePhoneInput(value);
}

export function validateEmail(raw: string): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, code: 'emailRequired' };
  if (!EMAIL_RE.test(trimmed) || trimmed.length > 254) {
    return { ok: false, code: 'emailInvalid' };
  }
  return { ok: true, normalized: trimmed.toLowerCase() };
}

/** Booking contact field: Israeli phone or email. */
export function validatePhoneOrEmail(raw: string): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, code: 'contactRequired' };
  if (trimmed.includes('@')) {
    const email = validateEmail(trimmed);
    if (!email.ok) return { ok: false, code: 'contactInvalid' };
    return email;
  }
  // Letters but no `@` — a half-typed email, not a phone worth diagnosing.
  if (/[a-z]/i.test(trimmed)) return { ok: false, code: 'contactInvalid' };
  const phone = validatePhone(trimmed);
  if (!phone.ok) return phone;
  return phone;
}

export function validatePersonName(raw: string): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, code: 'nameRequired' };
  if (trimmed.length < PERSON_NAME_MIN) return { ok: false, code: 'nameTooShort' };
  if (trimmed.length > PERSON_NAME_MAX) return { ok: false, code: 'nameTooLong' };
  if (!PERSON_NAME_RE.test(trimmed)) return { ok: false, code: 'nameInvalidChars' };
  return { ok: true, normalized: trimmed };
}

export function validateBusinessName(raw: string): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, code: 'businessNameRequired' };
  if (trimmed.length < BUSINESS_NAME_MIN) return { ok: false, code: 'businessNameTooShort' };
  if (trimmed.length > BUSINESS_NAME_MAX) return { ok: false, code: 'businessNameTooLong' };
  if (!BUSINESS_NAME_RE.test(trimmed)) return { ok: false, code: 'businessNameInvalidChars' };
  return { ok: true, normalized: trimmed };
}

/** English messages for admin UI and API errors. */
export const VALIDATION_MESSAGES_EN: Record<ValidationCode, string> = {
  nameRequired: 'Please enter your name.',
  nameTooShort: 'Name is too short (minimum 2 characters).',
  nameTooLong: 'Name is too long (maximum 50 characters).',
  nameInvalidChars: 'Name can only contain letters, spaces, hyphens and apostrophes.',
  businessNameRequired: 'Please enter a business name.',
  businessNameTooShort: 'Business name is too short (minimum 2 characters).',
  businessNameTooLong: 'Business name is too long (maximum 80 characters).',
  businessNameInvalidChars: 'Business name contains invalid characters.',
  phoneRequired: 'Please enter a phone number.',
  phoneTooShort: 'Phone number is too short.',
  phoneTooLong: 'Phone number is too long (max 15 digits).',
  phoneInvalid: 'Enter a valid number with country code, e.g. +972 50 123 4567 or +1 202 555 0100 (Israeli 05X… also works).',
  emailRequired: 'Please enter an email address.',
  emailInvalid: 'Enter a valid email address.',
  contactRequired: 'Please enter a phone number or email.',
  contactInvalid: 'Enter a valid phone number or email address.',
};

export function validationMessageEn(code: ValidationCode): string {
  return VALIDATION_MESSAGES_EN[code];
}

export type GuestValidation =
  | { ok: false; code: ValidationCode }
  | { ok: true; guest: string; guestContact?: string };

export function validateBookingGuest(
  guest: string,
  guestContact: string | undefined,
  options: { requireContact?: boolean; draft?: boolean } = {}
): GuestValidation {
  if (!options.draft) {
    const name = validatePersonName(guest);
    if (!name.ok) return name;
    if (options.requireContact || guestContact?.trim()) {
      if (!guestContact?.trim()) return { ok: false, code: 'contactRequired' };
      const contact = validatePhoneOrEmail(guestContact);
      if (!contact.ok) return { ok: false, code: contact.code };
      return {
        ok: true,
        guest: name.normalized!,
        guestContact: contact.normalized,
      };
    }
    return { ok: true, guest: name.normalized! };
  }

  let normalizedGuest = guest.trim();
  if (normalizedGuest) {
    const name = validatePersonName(normalizedGuest);
    if (!name.ok) return name;
    normalizedGuest = name.normalized!;
  }

  let normalizedContact: string | undefined;
  if (guestContact?.trim()) {
    const contact = validatePhoneOrEmail(guestContact);
    if (!contact.ok) return { ok: false, code: contact.code === 'contactInvalid' ? 'contactInvalid' : contact.code };
    normalizedContact = contact.normalized;
  }

  return { ok: true, guest: normalizedGuest, guestContact: normalizedContact };
}
