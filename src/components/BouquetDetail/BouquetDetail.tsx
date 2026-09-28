'use client';

import { useState } from 'react';
import Link from 'next/link';
import PhotoGallery from '@/components/PhotoGallery/PhotoGallery';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import FlowerOrderForm from '@/components/FlowersShop/FlowerOrderForm';
import AddOnSuggestions from '@/components/FlowersShop/AddOnSuggestions';
import { useLanguage } from '@/i18n/LanguageProvider';
import { bouquetCopy, bouquetCurrency, displayPrice, sizeLabelKey } from '@/lib/flowers';
import { formatMoney } from '@/lib/money';
import { isBuilder } from '@/lib/roseBuilder';
import { primaryCategory } from '@/lib/flowerCategories';
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
  const aisle = primaryCategory(bouquet);

  return (
    <section className={styles.section}>
      <div className="wrap">
        {/* Back to the aisle it was found in, not to the front of the shop. */}
        <Link href={href(`/flowers/${aisle}`)} className={styles.back}>
          <Icon name="chevron" size={15} className={styles.backIcon} />
          {t('shop.backTo').replace('{category}', t(`shop.categories.${aisle}.label`))}
        </Link>

        <div className={styles.layout}>
          <PhotoGallery
            photos={bouquet.photos ?? []}
            alt={copy.name}
            className={styles.media}
            placeholderLabel={copy.name}
            sizes="(max-width: 900px) 100vw, 520px"
            fit={bouquet.kind === 'wine' ? 'contain' : 'cover'}
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
                  {t(sizeLabelKey(bouquet.kind)).replace(
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
                {isBuilder(bouquet)
                  ? t('flowers.fromPrice').replace(
                      '{price}',
                      formatMoney(displayPrice(bouquet), bouquetCurrency(bouquet), locale)
                    )
                  : formatMoney(bouquet.price, bouquetCurrency(bouquet), locale)}
              </b>
              <Button variant="primary" onClick={() => setOrdering(true)}>
                {t('flowers.order')}
              </Button>
            </div>

            {/* What goes with it — each a link to its own page for now. */}
            <AddOnSuggestions bought={bouquet} title={t('flowers.addOn.detailTitle')} />
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
