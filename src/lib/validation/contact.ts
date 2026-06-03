/** Shared contact / name validation (Israeli E.164 phones, guest & business names). */

export const PERSON_NAME_MIN = 2;
export const PERSON_NAME_MAX = 50;
export const BUSINESS_NAME_MIN = 2;
export const BUSINESS_NAME_MAX = 80;

/** Max characters in the input (with spaces/dashes). */
export const PHONE_INPUT_MAX_LENGTH = 18;

/** Israeli numbers: 10 digits local (05…) or 12 digits with country code (972…). */
export const PHONE_DIGITS_MIN = 9;
export const PHONE_DIGITS_MAX = 12;

const PERSON_NAME_RE = /^[\p{L}\p{M}'\s.\-]+$/u;
const BUSINESS_NAME_RE = /^[\p{L}\p{M}0-9'\s.\-&]+$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

/** +972 5XXXXXXXX (mobile) or +972 [23489]XXXXXXX(X) (landline). */
const ISRAEL_E164_RE = /^\+972(5\d{8}|[23489]\d{7,8})$/;

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
 * Normalize to Israeli E.164 (+972…).
 * Accepts: 05X-XXXXXXX, 0X-XXXXXXX, 972…, +972…, 00 972…
 */
export function normalizePhone(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;

  s = s.replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;

  if (s.startsWith('+')) {
    const digits = s.slice(1).replace(/\D/g, '');
    if (!digits.startsWith('972')) return null;
    const e164 = `+${digits}`;
    return ISRAEL_E164_RE.test(e164) ? e164 : null;
  }

  const digits = digitsOnly(s);

  // Local mobile: 05X-XXXXXXX (exactly 10 digits)
  if (/^05\d{8}$/.test(digits)) {
    return `+972${digits.slice(1)}`;
  }

  // Intl without +: 9725XXXXXXXX (exactly 12 digits)
  if (/^9725\d{8}$/.test(digits)) {
    return `+${digits}`;
  }

  // Local landline: 0[23489] + 7–8 digits (9–10 digits total)
  if (/^0[23489]\d{7,8}$/.test(digits)) {
    return `+972${digits.slice(1)}`;
  }

  // Intl landline: 972[23489]… (11–12 digits)
  if (/^972[23489]\d{7,8}$/.test(digits)) {
    return `+${digits}`;
  }

  return null;
}

function isValidIsraeliE164(e164: string): boolean {
  return ISRAEL_E164_RE.test(e164);
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
  if (!normalized || !isValidIsraeliE164(normalized)) {
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
  phoneTooShort: 'Phone number is too short (Israeli mobile: 10 digits, e.g. 050-1234567).',
  phoneTooLong: 'Phone number is too long (max 12 digits with country code).',
  phoneInvalid: 'Use Israeli format: 05X-XXX-XXXX or +972 5X XXX XXXX.',
  emailRequired: 'Please enter an email address.',
  emailInvalid: 'Enter a valid email address.',
  contactRequired: 'Please enter a phone number or email.',
  contactInvalid: 'Enter a valid Israeli phone or email address.',
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
