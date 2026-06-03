'use client';

import { useState } from 'react';
import type { Apartment } from '@/types/apartment';
import FormattedDescription from '@/components/FormattedDescription/FormattedDescription';
import PhotoGallery from '@/components/PhotoGallery/PhotoGallery';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import SpecStat from '@/components/ui/SpecStat/SpecStat';
import BookingModal from '@/components/BookingModal/BookingModal';
import { useLanguage } from '@/i18n/LanguageProvider';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { formatApartmentTags, getApartmentPhotos } from '@/lib/apartmentMedia';
import { getPrimaryTagLabel } from '@/lib/apartmentTags';
import styles from './ApartmentCard.module.scss';

interface ApartmentCardProps {
  apt: Apartment;
}

export default function ApartmentCard({ apt }: ApartmentCardProps) {
  const { locale, t } = useLanguage();
  const copy = getApartmentCopy(apt, locale);
  const photos = getApartmentPhotos(apt);
  const [fav, setFav] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const tagLine = formatApartmentTags(apt, locale, t);
  const placeholderCaption = getPrimaryTagLabel(apt, locale, t);

  return (
    <>
      <article className={styles.card}>
        <PhotoGallery
          photos={photos}
          alt={copy.title}
          className={styles.media}
          placeholderLabel={placeholderCaption}
        >
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
        </PhotoGallery>

        <div className={styles.body}>
          <div className={styles.top}>
            <div className={styles.titleBlock}>
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

          <FormattedDescription text={copy.description} clamp className={styles.desc} />

          <div className={styles.specs}>
            <SpecStat icon="guest" value={apt.guests} label={t('apartments.guests')} />
            <SpecStat
              icon="home"
              value={apt.bedrooms}
              label={apt.bedrooms === 1 ? t('apartments.bedroom') : t('apartments.bedrooms')}
            />
            <SpecStat
              icon="bed"
              value={apt.beds}
              label={apt.beds === 1 ? t('apartments.bed') : t('apartments.beds')}
            />
            <SpecStat
              icon="bath"
              value={apt.bathrooms}
              label={apt.bathrooms === 1 ? t('apartments.bath') : t('apartments.baths')}
            />
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
