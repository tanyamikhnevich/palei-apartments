export const LOCALES = ['en', 'ru', 'he', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'EN',
  ru: 'RU',
  he: 'HE',
  fr: 'FR',
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
