'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon/Icon';
import Placeholder from '@/components/ui/Placeholder/Placeholder';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import { useLanguage } from '@/i18n/LanguageProvider';
import { isPhotoUrl } from '@/lib/apartmentMedia';
import { fetchBouquets } from '@/lib/api/client';
import { bouquetCopy, bouquetCurrency, bouquetsInCountry, windowBouquets } from '@/lib/flowers';
import { formatMoney } from '@/lib/money';
import type { Bouquet } from '@/types/flower';
import styles from './FlowersPromoModal.module.scss';

/** How long the pitch holds the screen before it takes the guest to the shop. */
const REDIRECT_SECONDS = 10;

/** Enough to show the window is real, few enough to stay one glance. */
const SHOWCASE = 3;

const POINTS = ['fresh', 'nextDay', 'inside'] as const;

interface FlowersPromoModalProps {
  /** Check-in day — the flowers should be inside when the guest walks in. */
  checkIn: string | null;
  onClose: () => void;
}

/**
 * The one moment the shop is worth putting on screen: the request has just
 * gone in, the guest is picturing the arrival, and nothing else is competing
 * for attention. It runs itself out after ten seconds and leaves for the shop.
 *
 * The countdown can always be stopped — Escape, the close button or "not now".
 * A timer a guest cannot get out of is a trap, and this one fires right after
 * they trusted us with a booking.
 */
export default function FlowersPromoModal({ checkIn, onClose }: FlowersPromoModalProps) {
  const { locale, t, href } = useLanguage();
  const router = useRouter();
  const [left, setLeft] = useState(REDIRECT_SECONDS);
  const [picks, setPicks] = useState<Bouquet[]>([]);
  const [picksLoading, setPicksLoading] = useState(true);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  /* The check-in day travels along, so the shop does not ask for it again. */
  const target = href(checkIn ? `/flowers?date=${checkIn}` : '/flowers');

  /*
    Real stock, not stock photos: three of the cheapest things actually in the
    window. A guest who recognises them on the next screen believes the offer.
  */
  useEffect(() => {
    let alive = true;
    fetchBouquets()
      .then(({ bouquets }) => {
        if (alive) setPicks(windowBouquets(bouquetsInCountry(bouquets, 'IL')).slice(0, SHOWCASE));
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setPicksLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (left > 0) return;
    router.push(target);
  }, [left, router, target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* Focus lands on the way forward, not on the dismiss. */
  useEffect(() => {
    ctaRef.current?.focus();
  }, []);

  const cards = useMemo(
    () =>
      picks.map((bouquet) => ({
        id: bouquet.id,
        name: bouquetCopy(bouquet, locale).name,
        price: formatMoney(bouquet.price, bouquetCurrency(bouquet), locale),
        photo: (bouquet.photos ?? []).find(isPhotoUrl),
      })),
    [picks, locale]
  );

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="flowers-promo-title"
    >
      <div className={styles.card}>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label={t('nav.closeMenu')}
        >
          <Icon name="x" size={18} />
        </button>

        <p className={styles.status}>
          <span className={styles.spinner} aria-hidden="true" />
          {t('flowers.promo.status')}
        </p>

        <div className={styles.head}>
          <div className="eyebrow">{t('flowers.eyebrow')}</div>
          <h2 id="flowers-promo-title" className={styles.title}>
            {t('flowers.promo.title')}
          </h2>
          <p className={styles.sub}>{t('flowers.promo.sub')}</p>
        </div>

{/*
          The row keeps its height from the first frame. The bouquets arrive
          over the network a moment after the modal opens, and a card that
          grows under a countdown moves the button the guest is reaching for.
        */}
        {picksLoading ? (
          <div className={styles.picks}>
            {Array.from({ length: SHOWCASE }, (_, i) => (
              <span className={styles.pick} key={i}>
                {/* Same classes as the real card, so the two states measure alike. */}
                <Skeleton className={styles.pickMedia} height="auto" />
                <span className={styles.pickName}>
                  <Skeleton width="80%" height={12} />
                </span>
                <span className={styles.pickPrice}>
                  <Skeleton width="45%" height={12} />
                </span>
              </span>
            ))}
          </div>
        ) : cards.length > 0 ? (
          <Link href={target} className={styles.picks} tabIndex={-1} aria-hidden="true">
            {cards.map((card) => (
              <span className={styles.pick} key={card.id}>
                <span className={styles.pickMedia}>
                  {card.photo ? (
                    <Image
                      src={card.photo}
                      alt=""
                      fill
                      sizes="150px"
                      className={styles.pickImg}
                      unoptimized
                    />
                  ) : (
                    <Placeholder className={styles.pickImg} />
                  )}
                </span>
                <span className={styles.pickName}>{card.name}</span>
                <span className={styles.pickPrice}>{card.price}</span>
              </span>
            ))}
          </Link>
        ) : null}

        <ul className={styles.points}>
          {POINTS.map((point) => (
            <li key={point}>
              <Icon name="check" size={15} />
              {t(`flowers.promo.points.${point}`)}
            </li>
          ))}
        </ul>

        <Link ref={ctaRef} href={target} className={styles.cta}>
          {t('flowers.promo.cta')}
          <Icon name="arrow" size={17} />
        </Link>

        <div className={styles.timer}>
          {/* The bar is the countdown made visible; the text says it in words. */}
          <span className={styles.bar}>
            <span className={styles.fill} style={{ animationDuration: `${REDIRECT_SECONDS}s` }} />
          </span>
          <span className={styles.timerText}>
            {t('flowers.promo.countdown').replace('{n}', String(Math.max(left, 0)))}
          </span>
        </div>

        <button type="button" className={styles.stay} onClick={onClose}>
          {t('flowers.promo.stay')}
        </button>
      </div>
    </div>
  );
}
