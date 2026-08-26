/** Validation for guest-submitted reviews (stars required, text optional). */

import {
  validatePersonName,
  validatePhone,
  validationMessageEn,
  type ValidationCode,
} from './contact';

export const REVIEW_TEXT_MAX = 1000;
export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;

export type ReviewValidationCode =
  | ValidationCode
  | 'ratingRequired'
  | 'ratingInvalid'
  | 'textTooLong'
  | 'spam';

export interface ReviewInput {
  guestName: string;
  rating: number;
  text?: string;
  contact?: string;
  /** Hidden anti-bot field — must stay empty. */
  honeypot?: string;
}

export type ReviewValidation =
  | { ok: true; guestName: string; rating: number; text?: string; contact?: string }
  | { ok: false; code: ReviewValidationCode };

export function validateReview(input: ReviewInput): ReviewValidation {
  // Honeypot: real users never fill this; a value means a bot.
  if (input.honeypot && input.honeypot.trim()) {
    return { ok: false, code: 'spam' };
  }

  const name = validatePersonName(input.guestName ?? '');
  if (!name.ok) return { ok: false, code: name.code };

  if (input.rating == null || Number.isNaN(input.rating)) {
    return { ok: false, code: 'ratingRequired' };
  }
  if (
    !Number.isInteger(input.rating) ||
    input.rating < REVIEW_RATING_MIN ||
    input.rating > REVIEW_RATING_MAX
  ) {
    return { ok: false, code: 'ratingInvalid' };
  }

  let text: string | undefined;
  if (input.text != null && input.text.trim()) {
    const trimmed = input.text.trim();
    if (trimmed.length > REVIEW_TEXT_MAX) return { ok: false, code: 'textTooLong' };
    text = trimmed;
  }

  let contact: string | undefined;
  if (input.contact != null && input.contact.trim()) {
    const result = validatePhone(input.contact);
    if (!result.ok) return { ok: false, code: result.code };
    contact = result.normalized;
  }

  return { ok: true, guestName: name.normalized!, rating: input.rating, text, contact };
}

const REVIEW_MESSAGES_EN: Record<'ratingRequired' | 'ratingInvalid' | 'textTooLong' | 'spam', string> = {
  ratingRequired: 'Please pick a star rating.',
  ratingInvalid: 'Rating must be between 1 and 5 stars.',
  textTooLong: `Review is too long (maximum ${REVIEW_TEXT_MAX} characters).`,
  spam: 'Your review could not be submitted.',
};

/** English message for API error responses. */
export function reviewValidationMessageEn(code: ReviewValidationCode): string {
  if (code in REVIEW_MESSAGES_EN) {
    return REVIEW_MESSAGES_EN[code as keyof typeof REVIEW_MESSAGES_EN];
  }
  // Reuse the shared contact/name messages for the borrowed codes.
  return validationMessageEn(code as ValidationCode);
}
