'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/Icon/Icon';
import { LangSwitch } from '@/components/Header/Header';
import { useBusiness } from '@/components/BusinessProvider/BusinessProvider';
import { useLanguage } from '@/i18n/LanguageProvider';
import { splitLocale } from '@/i18n/routing';
import { displayPhone, telLink } from '@/lib/phone';
import type { ShopCategory } from '@/lib/flowerCategories';
import styles from './FlowersHeader.module.scss';

/**
 * The flower shop's own header. On its own domain the shop is a shop, not a
 * section of an apartment site: the bar carries its logo and its aisles, and
 * nothing that leads back to booking a flat — that link lives in the footer,
 * where someone who is done choosing flowers looks for what else there is.
 *
 * `aisles` is only the ones with something on them, decided by the layout.
 */
export default function FlowersHeader({ aisles }: { aisles: ShopCategory[] }) {
  const { t, href } = useLanguage();
  const { contactPhone } = useBusiness();
  const pathname = usePathname();
  const [stuck, setStuck] = useState(false);
  const activeRef = useRef<HTMLAnchorElement>(null);

  const { pathname: bare } = splitLocale(pathname);

  const items = [
    { path: '/flowers', label: t('shop.all') },
    ...aisles.map((c) => ({
      path: `/flowers/${c}`,
      label: t(`shop.categories.${c}.label`),
    })),
  ];

  useEffect(() => {
    const handleScroll = () => setStuck(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* On a phone the aisles scroll sideways; the one being read should be in view. */
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [bare]);

  return (
    <header className={`${styles.hdr} ${stuck ? styles.stuck : ''}`}>
      <div className={`wrap ${styles.bar}`}>
        <Link href={href('/flowers')} className={styles.logoLink} aria-label="Palei Flowers">
          <Image
            src="/palei-flowers-logo.png"
            alt=""
            width={200}
            height={60}
            className={styles.logo}
            priority
          />
        </Link>

        <div className={styles.right}>
          {contactPhone && (
            <a href={telLink(contactPhone)} className={styles.call} aria-label={t('shop.call')}>
              <Icon name="phone" size={16} />
              {/* Numbers read left to right in every language. */}
              <span className={styles.callNumber} dir="ltr">
                {displayPhone(contactPhone)}
              </span>
            </a>
          )}
          <LangSwitch />
        </div>
      </div>

      <nav className={styles.aisles} aria-label={t('shop.nav')}>
        <div className={`wrap ${styles.aislesRow}`}>
          {items.map(({ path, label }) => {
            const active = bare === path;
            return (
              <Link
                key={path}
                ref={active ? activeRef : undefined}
                href={href(path)}
                className={`${styles.aisle} ${active ? styles.aisleOn : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
