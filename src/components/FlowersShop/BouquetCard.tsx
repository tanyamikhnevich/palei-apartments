'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import PhotoGallery from '@/components/PhotoGallery/PhotoGallery';
import ExpandableText from '@/components/ui/ExpandableText/ExpandableText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatMoney } from '@/lib/money';
import { isBuilder } from '@/lib/roseBuilder';
import { bouquetCopy, bouquetCurrency, displayPrice, sizeLabelKey } from '@/lib/flowers';
import type { Bouquet } from '@/types/flower';
import { useCarriedDate } from './useCarriedDate';
import styles from './FlowersShop.module.scss';

/** One item on a shelf: photos, what it is, what it costs, and the way to order it. */
export default function BouquetCard({
  bouquet,
  onOrder,
}: {
  bouquet: Bouquet;
  onOrder: (bouquet: Bouquet) => void;
}) {
  const { locale, t, href } = useLanguage();
  const { withDate } = useCarriedDate();
  const copy = bouquetCopy(bouquet, locale);
  const page = withDate(href(`/flowers/${bouquet.id}`));

  return (
    <article className={styles.card}>
      <PhotoGallery
        photos={bouquet.photos ?? []}
        alt={copy.name}
        className={styles.media}
        placeholderLabel={copy.name}
        sizes="(max-width: 900px) 100vw, 320px"
        fit={bouquet.kind === 'wine' ? 'contain' : 'cover'}
      />
      <div className={styles.body}>
        <h3 className={styles.name}>
          <Link href={page} className={styles.nameLink}>
            {copy.name}
          </Link>
        </h3>

        {/*
          Notes run from one line to a paragraph. Three lines keeps the cards
          level with each other; the rest is a tap away.
        */}
        <ExpandableText
          text={copy.note}
          className={styles.note}
          moreLabel={t('flowers.showMore')}
          lessLabel={t('flowers.showLess')}
        />

        <div className={styles.tags}>
          {bouquet.kind !== 'flowers' && (
            <span className={styles.tag}>{t(`flowers.kinds.${bouquet.kind}`)}</span>
          )}
          {bouquet.stems && (
            <span className={styles.tag}>
              {t(sizeLabelKey(bouquet.kind)).replace('{n}', String(bouquet.stems))}
            </span>
          )}
          <span className={`${styles.tag} ${bouquet.sameDay ? styles.tagFast : ''}`}>
            <Icon name={bouquet.sameDay ? 'check' : 'calendar'} size={13} />
            {bouquet.sameDay ? t('flowers.sameDay') : t('flowers.nextDay')}
          </span>
        </div>

        <div className={styles.foot}>
          <b className={styles.price}>
            {isBuilder(bouquet)
              ? t('flowers.fromPrice').replace(
                  '{price}',
                  formatMoney(displayPrice(bouquet), bouquetCurrency(bouquet), locale)
                )
              : formatMoney(bouquet.price, bouquetCurrency(bouquet), locale)}
          </b>
          <Button
            variant="primary"
            size="sm"
            className={styles.orderBtn}
            onClick={() => onOrder(bouquet)}
          >
            {t('flowers.order')}
          </Button>
        </div>
      </div>

      {/*
        Makes the whole card open the bouquet without wrapping the gallery
        controls or the order button in an anchor. Hidden from assistive tech
        and from the tab order — the name above is the real link.
      */}
      <Link
        href={page}
        className={styles.cardLink}
        aria-hidden="true"
        tabIndex={-1}
      />
    </article>
  );
}
