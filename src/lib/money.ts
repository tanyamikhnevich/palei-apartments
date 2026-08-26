import type { CurrencyCode } from '@/types/settings';
import type { Locale } from '@/i18n/types';

/**
 * Prices, in the currency of the thing being priced and the reader's language.
 *
 * `Intl` is doing the work that a hard-coded `₪` prefix could not: it knows the
 * symbol goes before the number in English and after it in Russian, and it gets
 * Hebrew's direction right. Nothing here charges fractions of a shekel, so the
 * decimals are dropped.
 */
export function formatMoney(
  amount: number,
  currency: CurrencyCode,
  locale: Locale
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // A locale or currency Intl does not know: better a plain number than a crash.
    return `${CURRENCY_SYMBOL[currency] ?? ''}${amount}`;
  }
}

/** Bare symbol, for form labels like "Price per night (₪)". */
export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  ILS: '₪',
  EUR: '€',
  USD: '$',
};
