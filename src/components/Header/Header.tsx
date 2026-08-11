'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { LOCALES, LOCALE_LABELS } from '@/i18n/types';
import styles from './Header.module.scss';

const NAV = [
  { key: 'nav.apartments', href: '/apartments' },
  { key: 'nav.about', href: '/about' },
  { key: 'nav.location', href: '/location' },
  { key: 'nav.contact', href: '/contact' },
] as const;

function LangSwitch() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className={styles.lang} role="group" aria-label={t('nav.language')}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          className={`${styles.langBtn} ${locale === l ? styles.langOn : ''}`}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}

export default function Header() {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [stuck, setStuck] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const goHome = useCallback(() => {
    setMenuOpen(false);
    if (pathname === '/') {
      window.history.replaceState(null, '', '/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    router.push('/');
  }, [pathname, router]);

  useEffect(() => {
    const handleScroll = () => setStuck(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`${styles.hdr} ${stuck ? styles.stuck : ''}`}>
      <div className={`wrap ${styles.bar}`}>
        <button type="button" className={styles.logoLink} onClick={goHome} aria-label={t('brand')}>
          <Image
            src="/palei-logo.png"
            alt=""
            width={120}
            height={38}
            className={styles.logo}
            priority
          />
        </button>

        <nav className={styles.nav} aria-label="Main navigation">
          {NAV.map(({ key, href }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={key}
                className={`${styles.link} ${active ? styles.linkOn : ''}`}
                href={href}
                aria-current={active ? 'page' : undefined}
              >
                {t(key)}
              </Link>
            );
          })}
        </nav>

        <div className={styles.right}>
          <div className={styles.langDesktop}>
            <LangSwitch />
          </div>
          <Button
            variant="navy"
            size="sm"
            as="a"
            href="/contact"
            className={styles.bookDesktop}
          >
            {t('nav.bookNow')}
          </Button>
          <button
            className={styles.burger}
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      <div className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerPanel}>
          {NAV.map(({ key, href }) => (
            <Link key={key} href={href} onClick={() => setMenuOpen(false)}>
              {t(key)}
            </Link>
          ))}
          <div className={styles.drawerBottom}>
            <LangSwitch />
            <Button
              variant="primary"
              size="sm"
              as="a"
              href="/contact"
              onClick={() => setMenuOpen(false)}
            >
              {t('nav.bookNow')}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
