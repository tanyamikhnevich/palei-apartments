'use client';

import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
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
];

export default function Footer() {
  const { t, setLocale } = useLanguage();

  return (
    <footer className={styles.footer}>
      <div className="wrap">
        <div className={styles.top}>
          <div className={styles.logoWrap}>
            <Image src="/palei-logo.png" alt={t('brand')} width={120} height={36} />
            <p>{t('footer.tagline')}</p>
            <div className={styles.social}>
              <a href="#" aria-label={t('footer.instagram')}>
                <Icon name="sparkle" size={17} />
              </a>
              <a href="#" aria-label={t('footer.email')}>
                <Icon name="mail" size={17} />
              </a>
              <a href="#" aria-label={t('footer.whatsapp')}>
                <Icon name="phone" size={17} />
              </a>
            </div>
          </div>

          <div className={styles.col}>
            <h5>{t('footer.explore')}</h5>
            <ul>
              {NAV.map(({ key, href }) => (
                <li key={key}>
                  <Link href={href}>{t(key)}</Link>
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
                <a href="mailto:hello@paleiapartments.com">hello@paleiapartments.com</a>
              </li>
              <li>
                <a href="#">Bat Yam, Israel</a>
              </li>
            </ul>
          </div>

          <div className={styles.col}>
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

        <div className={styles.bottom}>
          <span>{t('footer.copyright')}</span>
          <div className={styles.bottomLinks}>
            <a href="#">{t('footer.privacy')}</a>
            <a href="#">{t('footer.terms')}</a>
            <a href="/admin">{t('footer.admin')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
