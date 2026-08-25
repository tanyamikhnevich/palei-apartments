'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { scrollToHash } from '@/lib/scrollToHash';
import styles from './BookCta.module.scss';

/** Roughly the first tap of a scroll — enough to clear the hero's own buttons. */
const SHOW_AFTER = 200;

/**
 * The booking call to action that follows the scroll: a gradient pill pinned to
 * the bottom corner, so wherever a guest stops the next step is one tap away.
 * It stays out of the first screen — the hero has its own buttons there and the
 * pill would only cover them — and slides in once the page moves. On an
 * apartment page it jumps to that apartment's booking panel; everywhere else it
 * goes to the contact form.
 */
export default function BookCta() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShown(window.scrollY > SHOW_AFTER);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // The admin panel is a different product — no guest CTA there.
  if (pathname.startsWith('/admin')) return null;

  const onApartmentPage = /^\/apartments\/[^/]+$/.test(pathname);
  const href = onApartmentPage ? '#book' : pathname === '/contact' ? '#contact' : '/contact';

  return (
    <Link
      href={href}
      className={`${styles.cta} ${shown ? styles.ctaIn : ''} ${
        onApartmentPage ? styles.ctaOnApartment : ''
      }`}
      aria-label={t('nav.bookNow')}
      onClick={(e) => href.startsWith('#') && scrollToHash(e, href)}
      aria-hidden={shown ? undefined : true}
      tabIndex={shown ? undefined : -1}
    >
      <span className={styles.halo} aria-hidden="true" />
      <Icon name="calendar" size={18} />
      <span className={styles.label}>{t('nav.bookNow')}</span>
    </Link>
  );
}
