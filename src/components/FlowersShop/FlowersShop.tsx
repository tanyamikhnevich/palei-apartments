'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import PhotoGallery from '@/components/PhotoGallery/PhotoGallery';
import ExpandableText from '@/components/ui/ExpandableText/ExpandableText';
import BouquetCardSkeleton from './BouquetCardSkeleton';
import FlowerOrderForm from './FlowerOrderForm';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatMoney } from '@/lib/money';
import { fetchBouquets } from '@/lib/api/client';
import {
  bouquetCopy,
  bouquetCurrency,
  bouquetsInCountry,
  FLOWER_COUNTRY,
  bouquetsOfKind,
  KIND_FILTERS,
  windowBouquets,
  windowMixesKinds,
  type KindFilter,
} from '@/lib/flowers';
import type { Bouquet } from '@/types/flower';
import styles from './FlowersShop.module.scss';

/**
 * The shop window and the order that follows it. No cart on purpose: one
 * bouquet goes to one address, so a basket would only add a step between
 * choosing and asking where to send it.
 */
/** Enough to fill the first screen without pretending to know the real count. */
const SKELETON_COUNT = 6;

export default function FlowersShop() {
  const { locale, t, href } = useLanguage();
  const params = useSearchParams();

  /* A date can arrive from an apartment booking — the arrival day. */
  const wantedDate = params.get('date');
  const requestedDate = wantedDate && /^\d{4}-\d{2}-\d{2}$/.test(wantedDate) ? wantedDate : null;
  const [list, setList] = useState<Bouquet[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<KindFilter>('all');
  const [ordering, setOrdering] = useState<Bouquet | null>(null);

  useEffect(() => {
    fetchBouquets()
      .then(({ bouquets }) => setList(bouquets))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(
    () => windowBouquets(bouquetsInCountry(list, FLOWER_COUNTRY)),
    [list]
  );
  const splitKinds = useMemo(() => windowMixesKinds(shown), [shown]);
  const filtered = useMemo(() => bouquetsOfKind(shown, kind), [shown, kind]);

  return (
    <section className={styles.section} id="flowers">
      <div className="wrap">
        <div className={styles.header}>
          <div className="eyebrow">{t('flowers.eyebrow')}</div>
          <h1 className="section-title">{t('flowers.title')}</h1>
          <p className="section-sub">{t('flowers.sub')}</p>
        </div>

        {splitKinds && (
          <div className={styles.kinds} role="group">
            {KIND_FILTERS.map((k) => (
              <button
                key={k}
                type="button"
                className={`${styles.kindBtn} ${kind === k ? styles.kindOn : ''}`}
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
              >
                {k === 'all' ? t('flowers.all') : t(`flowers.kinds.${k}`)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <BouquetCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className={styles.empty}>{t('flowers.empty')}</p>
        ) : (
          <div className={styles.grid}>
            {filtered.map((bouquet) => {
              const copy = bouquetCopy(bouquet, locale);
              return (
                <article className={styles.card} key={bouquet.id}>
                  <PhotoGallery
                    photos={bouquet.photos ?? []}
                    alt={copy.name}
                    className={styles.media}
                    placeholderLabel={copy.name}
                    sizes="(max-width: 900px) 100vw, 320px"
                  />
                  <div className={styles.body}>
                    <h3 className={styles.name}>
                      <Link href={href(`/flowers/${bouquet.id}`)} className={styles.nameLink}>
                        {copy.name}
                      </Link>
                    </h3>

                    {/*
                      Notes run from one line to a paragraph. Three lines keeps
                      the cards level with each other; the rest is a tap away.
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
                          {t(bouquet.kind === 'balloons' ? 'flowers.pieces' : 'flowers.stems')
                            .replace('{n}', String(bouquet.stems))}
                        </span>
                      )}
                      <span className={`${styles.tag} ${bouquet.sameDay ? styles.tagFast : ''}`}>
                        <Icon name={bouquet.sameDay ? 'check' : 'calendar'} size={13} />
                        {bouquet.sameDay ? t('flowers.sameDay') : t('flowers.nextDay')}
                      </span>
                    </div>

                    <div className={styles.foot}>
                      <b className={styles.price}>
                        {formatMoney(bouquet.price, bouquetCurrency(bouquet), locale)}
                      </b>
                      <Button
                        variant="primary"
                        size="sm"
                        className={styles.orderBtn}
                        onClick={() => setOrdering(bouquet)}
                      >
                        {t('flowers.order')}
                      </Button>
                    </div>
                  </div>

                  {/*
                    Makes the whole card open the bouquet without wrapping the
                    gallery controls or the order button in an anchor. Hidden
                    from assistive tech and from the tab order — the name above
                    is the real link.
                  */}
                  <Link
                    href={href(`/flowers/${bouquet.id}`)}
                    className={styles.cardLink}
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                </article>
              );
            })}
          </div>
        )}
      </div>

      {ordering && (
        <FlowerOrderForm
          bouquet={ordering}
          requestedDate={requestedDate}
          onClose={() => setOrdering(null)}
        />
      )}
    </section>
  );
}
