import type { Locale } from '@/i18n/types';

export type CurrencyCode = 'ILS' | 'USD' | 'EUR';

export interface BusinessSettings {
  businessName: string;
  contactPhone: string;
  contactEmail: string;
  whatsappNumber: string;
  defaultLanguage: Locale;
  currency: CurrencyCode;
}

export const CURRENCY_OPTIONS: { code: CurrencyCode; label: string }[] = [
  { code: 'ILS', label: '₪ Shekel (ILS)' },
  { code: 'USD', label: '$ Dollar (USD)' },
  { code: 'EUR', label: '€ Euro (EUR)' },
];

export const LANGUAGE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'he', label: 'עברית' },
];

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: 'Palei Apartments',
  contactPhone: '+972 50 000 0000',
  contactEmail: 'hello@paleiapartments.com',
  whatsappNumber: '+972 50 000 0000',
  defaultLanguage: 'en',
  currency: 'ILS',
};
