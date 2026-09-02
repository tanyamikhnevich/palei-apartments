'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/i18n/LanguageProvider';
import { GROUP_BRAND, liveServices } from '@/lib/services';
import type { Locale } from '@/i18n/types';
import styles from './Footer.module.scss';

const NAV = [
  { key: 'nav.apartments', href: '/apartments' },
  { key: 'nav.about', href: '/about' },
  { key: 'nav.location', href: '/location' },
  { key: 'nav.contact', href: '/contact' },
] as const;

const LANG_LINKS: { locale: Locale; key: string }[] = [
  { locale: 'en', key: 'footer.langEn' },
  { locale: 'ru', key: 'footer.langRu' },
  { locale: 'he', key: 'footer.langHe' },
  { locale: 'fr', key: 'footer.langFr' },
];

export default function Footer() {
  const { t, setLocale, href: localeHref } = useLanguage();

  return (
    <footer className={styles.footer}>
      <div className="wrap">
        <div className={styles.top}>
          <div className={styles.logoWrap}>
            {/* The footer speaks for the group, whichever section you came from. */}
            <Image src={GROUP_BRAND.logo} alt={GROUP_BRAND.alt} width={200} height={210} />
            <p>{t('footer.tagline')}</p>
          </div>

          <div className={styles.col}>
            <h5>{t('footer.explore')}</h5>
            <ul>
              {NAV.map(({ key, href }) => (
                <li key={key}>
                  <Link href={localeHref(href)}>{t(key)}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.col}>
            <h5>{t('footer.contact')}</h5>
            <ul>
              <li>
                <a href="tel:+97250000000">+972 50 000 0000</a>
              </li>
              <li>
                <a href="#">Bat Yam, Israel</a>
              </li>
            </ul>
          </div>

          {/* Phones switch language from the bar at the top; a second set here
              only lengthens an already tall footer. */}
          {/*
            The group, on every page. The footer is where a visitor looks when
            they are done with the page in front of them, which is exactly when
            "there is also a florist" is welcome rather than an interruption.
          */}
          <div className={styles.col}>
            <h5>{t('footer.group')}</h5>
            <ul>
              {liveServices().map((service) => (
                <li key={service.href}>
                  <Link href={localeHref(service.href)}>{t(`group.services.${service.key}.label`)}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${styles.col} ${styles.colLang}`}>
            <h5>{t('footer.language')}</h5>
            <ul>
              {LANG_LINKS.map(({ locale, key }) => (
                <li key={locale}>
                  <button type="button" className={styles.langBtn} onClick={() => setLocale(locale)}>
                    {t(key)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Privacy and terms will come back here once the pages behind them
            exist; links to "#" only teach visitors that ours do not work. */}
        <div className={styles.bottom}>
          <span>{t('footer.copyright')}</span>
        </div>
      </div>
    </footer>
  );
}
