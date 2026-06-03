import type { Locale } from '@/i18n/types';
import { t } from '@/i18n/getMessage';
import {
  validationMessageEn,
  type ValidationCode,
} from '@/lib/validation/contact';

/** Resolve validation copy for the current locale (falls back to English). */
export function resolveValidationMessage(locale: Locale, code: ValidationCode): string {
  const key = `validation.${code}`;
  const translated = t(locale, key);
  if (translated !== key) return translated;
  return validationMessageEn(code);
}
