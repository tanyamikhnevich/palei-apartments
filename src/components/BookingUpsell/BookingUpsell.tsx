'use client';

import Link from 'next/link';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { isSectionLive, serviceFor } from '@/lib/services';
import styles from './BookingUpsell.module.scss';

/**
 * Shown only after the booking request is in — never before it.
 *
 * The moment is the whole point: the guest has just decided where they are
 * staying, so "how do we get around" and "let's make the arrival nice" are the
 * next questions they actually have. Offering the same two things a screen
 * earlier would just be noise between them and the booking.
 *
 * The dates travel with the links, so neither page asks again for something we
 * already know.
 */
export default function BookingUpsell({
  checkIn,
  checkOut,
}: {
  checkIn: string | null;
  checkOut: string | null;
}) {
  const { t, href } = useLanguage();

  const cars = serviceFor('/cars');
  const flowers = serviceFor('/flowers');

  const carsHref = checkIn && checkOut ? `/cars?from=${checkIn}&to=${checkOut}` : '/cars';
  /* Flowers are for the day you arrive, so check-in is the delivery date. */
  const flowersHref = checkIn ? `/flowers?date=${checkIn}` : '/flowers';

  // A parked section is not offered here either — the card would lead to a 404
  // straight after the guest has just trusted us with a booking.
  const cards = [
    isSectionLive('/cars') && {
      href: carsHref,
      accent: cars.accent,
      icon: 'car' as const,
      title: t('group.services.cars.label'),
      note: t('booking.upsellCars'),
    },
    isSectionLive('/flowers') && {
      href: flowersHref,
      accent: flowers.accent,
      icon: 'flower' as const,
      title: t('group.services.flowers.label'),
      note: t('booking.upsellFlowers'),
    },
  ].filter((card): card is Exclude<typeof card, false> => card !== false);

  if (!cards.length) return null;

  return (
    <section className={styles.upsell}>
      <h3 className={styles.title}>{t('booking.upsellTitle')}</h3>
      <p className={styles.sub}>{t('booking.upsellSub')}</p>

      <div className={styles.cards}>
        {cards.map((card) => (
          <Link
            key={card.href}
            href={href(card.href)}
            className={styles.card}
            style={{ ['--svc' as string]: card.accent }}
          >
            <span className={styles.icon}>
              <Icon name={card.icon} size={18} />
            </span>
            <span className={styles.text}>
              <b>{card.title}</b>
              <span>{card.note}</span>
            </span>
            <span className={styles.go} aria-hidden="true">
              <Icon name="arrow" size={16} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
