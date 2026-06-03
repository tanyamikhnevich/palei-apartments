'use client';

import { useState } from 'react';
import type { Apartment } from '@/types/apartment';
import ApartmentCover from '@/components/ApartmentCover/ApartmentCover';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import BookingModal from '@/components/BookingModal/BookingModal';
import { useLanguage } from '@/i18n/LanguageProvider';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { formatApartmentTags } from '@/lib/apartmentMedia';
import styles from './ApartmentCard.module.scss';

interface ApartmentCardProps {
  apt: Apartment;
}

export default function ApartmentCard({ apt }: ApartmentCardProps) {
  const { locale, t } = useLanguage();
  const copy = getApartmentCopy(apt, locale);
  const [fav, setFav] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const tagLine = formatApartmentTags(apt, locale, t);

  const bedLabel =
    apt.bedrooms === 1 ? t('apartments.bed') : t('apartments.beds');
  const bathLabel =
    apt.bathrooms === 1 ? t('apartments.bath') : t('apartments.baths');
  const guestLabel =
    apt.guests === 1 ? t('apartments.guest') : t('apartments.guests');

  return (
    <>
      <article className={styles.card}>
        <ApartmentCover apt={apt} alt={copy.title} className={styles.media} placeholderLabel={tagLine}>
          <button
            type="button"
            className={`${styles.fav} ${fav ? styles.favOn : ''}`}
            aria-label={fav ? t('apartments.unsave') : t('apartments.save')}
            onClick={() => setFav((f) => !f)}
          >
            <Icon
              name="heart"
              size={18}
              style={{ fill: fav ? 'currentColor' : 'none' }}
            />
          </button>
          <div className={styles.mediaBar}>
            {tagLine ? <span className={styles.featureTag}>{tagLine}</span> : <span />}
            <span className={styles.priceTag}>
              ₪{apt.price} <span>{t('apartments.perNight')}</span>
            </span>
          </div>
        </ApartmentCover>

        <div className={styles.body}>
          <div className={styles.top}>
            <div>
              <div className={styles.name}>{copy.title}</div>
              <div className={styles.loc}>
                <Icon name="pin" size={14} />
                {copy.location}
              </div>
            </div>
            <div className={styles.rating}>
              <Icon name="star" size={14} />
              {apt.rating.toFixed(1)}
            </div>
          </div>

          <p className={styles.desc}>{copy.description}</p>

          <div className={styles.specs}>
            <span className={styles.spec}>
              <Icon name="guest" size={16} />
              {apt.guests} {guestLabel}
            </span>
            <span className={styles.spec}>
              <Icon name="bed" size={16} />
              {apt.bedrooms} {bedLabel}
            </span>
            <span className={styles.spec}>
              <Icon name="bath" size={16} />
              {apt.bathrooms} {bathLabel}
            </span>
          </div>

          <div className={styles.foot}>
            <div className={styles.price}>
              <b>₪{apt.price}</b> <span>{t('apartments.perNight')}</span>
            </div>
            <Button variant="ghost" size="sm" iconRight="arrow" onClick={() => setBookingOpen(true)}>
              {t('apartments.viewDetails')}
            </Button>
          </div>
        </div>
      </article>

      {bookingOpen && <BookingModal apt={apt} onClose={() => setBookingOpen(false)} />}
    </>
  );
}
