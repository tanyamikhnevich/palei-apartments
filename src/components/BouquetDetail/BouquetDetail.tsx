'use client';

import { useState } from 'react';
import Link from 'next/link';
import PhotoGallery from '@/components/PhotoGallery/PhotoGallery';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import FlowerOrderForm from '@/components/FlowersShop/FlowerOrderForm';
import { useLanguage } from '@/i18n/LanguageProvider';
import { bouquetCopy, bouquetCurrency } from '@/lib/flowers';
import { formatMoney } from '@/lib/money';
import type { Bouquet } from '@/types/flower';
import styles from './BouquetDetail.module.scss';

/**
 * One bouquet on a page of its own — the address that can be copied into a
 * message. The window shows everything at once, which is right for browsing
 * and useless for "look at this one".
 *
 * The note is not clamped here: this page exists to show the whole thing.
 */
export default function BouquetDetail({
  bouquet,
  requestedDate,
}: {
  bouquet: Bouquet;
  requestedDate?: string | null;
}) {
  const { locale, t, href } = useLanguage();
  const [ordering, setOrdering] = useState(false);
  const copy = bouquetCopy(bouquet, locale);

  return (
    <section className={styles.section}>
      <div className="wrap">
        <Link href={href('/flowers')} className={styles.back}>
          <Icon name="chevron" size={15} className={styles.backIcon} />
          {t('flowers.backToShop')}
        </Link>

        <div className={styles.layout}>
          <PhotoGallery
            photos={bouquet.photos ?? []}
            alt={copy.name}
            className={styles.media}
            placeholderLabel={copy.name}
            sizes="(max-width: 900px) 100vw, 520px"
          />

          <div className={styles.info}>
            <div className="eyebrow">{t('flowers.eyebrow')}</div>
            <h1 className={styles.name}>{copy.name}</h1>

            <div className={styles.tags}>
              {bouquet.kind !== 'flowers' && (
                <span className={styles.tag}>{t(`flowers.kinds.${bouquet.kind}`)}</span>
              )}
              {bouquet.stems && (
                <span className={styles.tag}>
                  {t(bouquet.kind === 'balloons' ? 'flowers.pieces' : 'flowers.stems').replace(
                    '{n}',
                    String(bouquet.stems)
                  )}
                </span>
              )}
              <span className={`${styles.tag} ${bouquet.sameDay ? styles.tagFast : ''}`}>
                <Icon name={bouquet.sameDay ? 'check' : 'calendar'} size={13} />
                {bouquet.sameDay ? t('flowers.sameDay') : t('flowers.nextDay')}
              </span>
            </div>

            <p className={styles.note}>{copy.note}</p>

            <div className={styles.foot}>
              <b className={styles.price}>
                {formatMoney(bouquet.price, bouquetCurrency(bouquet), locale)}
              </b>
              <Button variant="primary" onClick={() => setOrdering(true)}>
                {t('flowers.order')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {ordering && (
        <FlowerOrderForm
          bouquet={bouquet}
          requestedDate={requestedDate}
          onClose={() => setOrdering(false)}
        />
      )}
    </section>
  );
}
