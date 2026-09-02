'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import PhotoGallery from '@/components/PhotoGallery/PhotoGallery';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatMoney } from '@/lib/money';
import { carCurrency, cheapestRate, hasRateTiers } from '@/lib/cars';
import type { Car } from '@/types/car';
import styles from './CarCard.module.scss';

export default function CarCard({ car }: { car: Car }) {
  const { locale, t, href } = useLanguage();
  const name = `${car.make} ${car.model}`;
  const from = cheapestRate(car);

  return (
    <article className={styles.card}>
      <PhotoGallery
        photos={car.photos ?? []}
        alt={name}
        className={styles.media}
        placeholderLabel={name}
        sizes="(max-width: 900px) 100vw, 380px"
      />

      <div className={styles.body}>
        <div className={styles.head}>
          <h3 className={styles.title}>{name}</h3>
          <span className={styles.year}>{car.year}</span>
        </div>

        <p className={styles.meta}>
          {t(`cars.classes.${car.carClass}`)} ·{' '}
          {car.transmission === 'automatic' ? t('cars.automatic') : t('cars.manual')}
        </p>

        <div className={styles.specs}>
          <span>
            <Icon name="guest" size={15} /> {car.seats} {t('cars.seats')}
          </span>
          <span>
            <Icon name="home" size={15} /> {car.bags} {t('cars.bags')}
          </span>
        </div>

        <div className={styles.foot}>
          <div className={styles.price}>
            {hasRateTiers(car) && <span>{t('cars.from')} </span>}
            <b>{formatMoney(from, carCurrency(car), locale)}</b>{' '}
            <span>{t('cars.perDay')}</span>
          </div>
          <Button variant="ghost" size="sm" as="a" href={href(`/cars/${car.id}`)} iconRight="arrow">
            {t('cars.details')}
          </Button>
        </div>
      </div>

      {/* The whole card is the link; the button above just shows where it goes. */}
      <Link href={href(`/cars/${car.id}`)} className={styles.cover} aria-label={name} />
    </article>
  );
}
