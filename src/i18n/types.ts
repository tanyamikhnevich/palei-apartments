export const LOCALES = ['en', 'ru', 'he'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'EN',
  ru: 'RU',
  he: 'HE',
};
