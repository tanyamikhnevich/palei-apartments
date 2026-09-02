'use client';

import Link from 'next/link';
import type { Apartment } from '@/types/apartment';
import FormattedDescription from '@/components/FormattedDescription/FormattedDescription';
import PhotoGallery from '@/components/PhotoGallery/PhotoGallery';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import SpecStat from '@/components/ui/SpecStat/SpecStat';
import { useLanguage } from '@/i18n/LanguageProvider';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { formatApartmentTags, getApartmentPhotos } from '@/lib/apartmentMedia';
import { getPrimaryTagLabel } from '@/lib/apartmentTags';
import { hasPriceTiers, priceFrom } from '@/lib/pricing';
import styles from './ApartmentCard.module.scss';
import { formatMoney } from '@/lib/money';
import { currencyOf } from '@/lib/regions';

interface ApartmentCardProps {
  apt: Apartment;
}

export default function ApartmentCard({ apt }: ApartmentCardProps) {
  const { locale, t, href } = useLanguage();
  const copy = getApartmentCopy(apt, locale);
  const photos = getApartmentPhotos(apt);
  const tagLine = formatApartmentTags(apt, locale, t);
  // With long-stay rates the headline number is the cheapest one on offer.
  const fromPrice = priceFrom(apt);
  const showFrom = hasPriceTiers(apt);
  const placeholderCaption = getPrimaryTagLabel(apt, locale, t);

  return (
    <article className={styles.card}>
      <PhotoGallery
        photos={photos}
        alt={copy.title}
        className={styles.media}
        placeholderLabel={placeholderCaption}
      >
        <div className={styles.mediaBar}>
          {tagLine ? <span className={styles.featureTag}>{tagLine}</span> : <span />}
          <span className={styles.priceTag}>
            {showFrom && <span>{t('apartments.from')} </span>}
            {formatMoney(fromPrice, currencyOf(apt), locale)}{' '}
            <span>{t('apartments.perNight')}</span>
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
          {apt.reviews > 0 ? (
            <div className={styles.rating}>
              <Icon name="star" size={14} />
              {apt.rating.toFixed(1)}
            </div>
          ) : (
            <div className={`${styles.rating} ${styles.ratingNew}`}>{t('reviews.newBadge')}</div>
          )}
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
            {showFrom && <span>{t('apartments.from')} </span>}
            <b>{formatMoney(fromPrice, currencyOf(apt), locale)}</b>{' '}
            <span>{t('apartments.perNight')}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconRight="arrow"
            as="a"
            href={href(`/apartments/${apt.id}`)}
            className={styles.detailsBtn}
          >
            {t('apartments.viewDetails')}
          </Button>
        </div>
      </div>

      {/*
        Makes the whole card clickable without wrapping the gallery controls in
        an anchor. Hidden from assistive tech and from the tab order — the
        "view details" button above is the real link.
      */}
      <Link
        href={href(`/apartments/${apt.id}`)}
        className={styles.cardLink}
        aria-hidden="true"
        tabIndex={-1}
      />
    </article>
  );
}
