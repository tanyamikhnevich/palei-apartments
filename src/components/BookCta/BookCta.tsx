'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import styles from './BookCta.module.scss';

/**
 * The booking call to action that never leaves the screen: a gradient pill
 * pinned to the bottom corner, so wherever a guest stops scrolling the next
 * step is one tap away. On an apartment page it jumps to that apartment's
 * booking panel; everywhere else it goes to the contact form.
 */
export default function BookCta() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 350);
    return () => clearTimeout(id);
  }, []);

  // The admin panel is a different product — no guest CTA there.
  if (pathname.startsWith('/admin')) return null;

  const onApartmentPage = /^\/apartments\/[^/]+$/.test(pathname);
  const href = onApartmentPage ? '#book' : pathname === '/contact' ? '#contact' : '/contact';

  return (
    <Link
      href={href}
      className={`${styles.cta} ${mounted ? styles.ctaIn : ''}`}
      aria-label={t('nav.bookNow')}
    >
      <span className={styles.halo} aria-hidden="true" />
      <Icon name="calendar" size={18} />
      <span className={styles.label}>{t('nav.bookNow')}</span>
    </Link>
  );
}
