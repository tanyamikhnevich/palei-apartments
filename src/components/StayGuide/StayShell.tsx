'use client';

import { useBusiness } from '@/components/BusinessProvider/BusinessProvider';
import { useLanguage } from '@/i18n/LanguageProvider';
import { LOCALES, type Locale } from '@/i18n/types';
import styles from './StayGuide.module.scss';

const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  he: 'עברית',
  fr: 'Français',
};

/**
 * The frame every guide screen sits in: the name of who is hosting, and the
 * language. A native select on purpose — on a phone it opens the system
 * picker, which is easier to hit at a doorstep than four small buttons.
 */
export default function StayShell({ children }: { children: React.ReactNode }) {
  const { locale, setLocale, t } = useLanguage();
  const { businessName } = useBusiness();

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <span className={styles.brand}>{businessName}</span>
        <select
          className={styles.language}
          aria-label={t('stay.language')}
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LANGUAGE_NAMES[l]}
            </option>
          ))}
        </select>
      </header>
      <main className={styles.column}>{children}</main>
    </div>
  );
}
