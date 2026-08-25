/** Validation for the site-wide contact form (name + contact required, message optional). */

import {
  validatePersonName,
  validatePhoneOrEmail,
  validationMessageEn,
  type ValidationCode,
} from './contact';

export const CONTACT_MESSAGE_MAX = 2000;

export type ContactMessageCode = ValidationCode | 'messageTooLong' | 'spam';

export interface ContactMessageInput {
  name: string;
  contact: string;
  message?: string;
  /** Hidden anti-bot field — must stay empty. */
  honeypot?: string;
}

export type ContactMessageValidation =
  | { ok: true; name: string; contact: string; message?: string }
  | { ok: false; code: ContactMessageCode };

export function validateContactMessage(input: ContactMessageInput): ContactMessageValidation {
  // Honeypot: real users never see this field, so anything in it is a bot.
  if (input.honeypot && input.honeypot.trim()) {
    return { ok: false, code: 'spam' };
  }

  const name = validatePersonName(input.name ?? '');
  if (!name.ok) return { ok: false, code: name.code };

  const contact = validatePhoneOrEmail(input.contact ?? '');
  if (!contact.ok) return { ok: false, code: contact.code };

  let message: string | undefined;
  if (input.message != null && input.message.trim()) {
    const trimmed = input.message.trim();
    if (trimmed.length > CONTACT_MESSAGE_MAX) return { ok: false, code: 'messageTooLong' };
    message = trimmed;
  }

  return { ok: true, name: name.normalized!, contact: contact.normalized!, message };
}

export function contactMessageValidationEn(code: ContactMessageCode): string {
  if (code === 'messageTooLong') {
    return `Message is too long (maximum ${CONTACT_MESSAGE_MAX} characters).`;
  }
  if (code === 'spam') return 'Rejected.';
  return validationMessageEn(code);
}
