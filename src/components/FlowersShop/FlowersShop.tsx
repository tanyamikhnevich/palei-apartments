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
import { isBuilder } from '@/lib/roseBuilder';
import {
  bouquetCopy,
  bouquetCurrency,
  bouquetsInCountry,
  FLOWER_COUNTRY,
  bouquetsOfKind,
  CATEGORIES,
  displayPrice,
  KIND_FILTERS,
  sizeLabelKey,
  windowBouquets,
  windowMixesKinds,
  windowSections,
  type KindFilter,
  type PriceOrder,
} from '@/lib/flowers';
import type { Bouquet, BouquetCategory } from '@/types/flower';
import styles from './FlowersShop.module.scss';

/**
 * The shop window and the order that follows it. No cart on purpose: one
 * bouquet goes to one address, so a basket would only add a step between
 * choosing and asking where to send it.
 */
/** Enough to fill the first screen without pretending to know the real count. */
const SKELETON_COUNT = 6;

export default function FlowersShop({ initial }: { initial?: Bouquet[] }) {
  const { locale, t, href } = useLanguage();
  const params = useSearchParams();

  /* A date can arrive from an apartment booking — the arrival day. */
  const wantedDate = params.get('date');
  const requestedDate = wantedDate && /^\d{4}-\d{2}-\d{2}$/.test(wantedDate) ? wantedDate : null;
  /* Rendered on the server when the page could read the window itself — so
     the bouquets, and the links to their pages, are in the HTML a search
     engine receives rather than arriving after a script it may never run. */
  const [list, setList] = useState<Bouquet[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial);
  const [kind, setKind] = useState<KindFilter>('all');
  const [priceOrder, setPriceOrder] = useState<PriceOrder>('asc');
  const [wineType, setWineType] = useState<BouquetCategory | 'all'>('all');
  const [ordering, setOrdering] = useState<Bouquet | null>(null);

  useEffect(() => {
    if (initial) return;
    fetchBouquets()
      .then(({ bouquets }) => setList(bouquets))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [initial]);

  const shown = useMemo(
    () => windowBouquets(bouquetsInCountry(list, FLOWER_COUNTRY), priceOrder),
    [list, priceOrder]
  );
  const splitKinds = useMemo(() => windowMixesKinds(shown), [shown]);
  const filtered = useMemo(() => bouquetsOfKind(shown, kind), [shown, kind]);
  const sections = useMemo(() => windowSections(filtered), [filtered]);
  /*
    Wine is the one section big enough to want splitting: someone after
    champagne should not scroll past the reds. Only types actually on offer
    get a chip, in the order the admin form lists them.
  */
  const wineTypes = useMemo(() => {
    const present = new Set(shown.filter((b) => b.kind === 'wine').map((b) => b.category));
    return CATEGORIES.wine.filter((c) => present.has(c));
  }, [shown]);
  const shownWineType = wineTypes.includes(wineType as BouquetCategory) ? wineType : 'all';
  const visibleSections = useMemo(
    () =>
      sections.map((s) =>
        s.kind === 'wine' && shownWineType !== 'all'
          ? { ...s, items: s.items.filter((b) => b.category === shownWineType) }
          : s
      ),
    [sections, shownWineType]
  );
  /* A heading over a single section only repeats the filter above it. */
  const titled = sections.length > 1;

  return (
    <section className={styles.section} id="flowers">
      <div className="wrap">
        <div className={styles.header}>
          <div className="eyebrow">{t('flowers.eyebrow')}</div>
          <h1 className="section-title">{t('flowers.title')}</h1>
          <p className="section-sub">{t('flowers.sub')}</p>
        </div>

        <div className={styles.toolbar}>
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

          {/* Sorts inside each section — flowers still come before wine. */}
          <select
            className={`select ${styles.sort}`}
            value={priceOrder}
            onChange={(e) => setPriceOrder(e.target.value as PriceOrder)}
          >
            <option value="asc">{t('flowers.cheapFirst')}</option>
            <option value="desc">{t('flowers.priceyFirst')}</option>
          </select>
        </div>

        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <BouquetCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className={styles.empty}>{t('flowers.empty')}</p>
        ) : (
          visibleSections.map((section) => (
            <div className={styles.group} key={section.kind}>
              {titled && (
                <h2 className={styles.groupTitle}>{t(`flowers.kinds.${section.kind}`)}</h2>
              )}
              {section.kind === 'wine' && wineTypes.length > 1 && (
                <div className={styles.subKinds} role="group">
                  {(['all', ...wineTypes] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.subKind} ${shownWineType === c ? styles.subKindOn : ''}`}
                      onClick={() => setWineType(c)}
                      aria-pressed={shownWineType === c}
                    >
                      {c === 'all' ? t('flowers.all') : t(`flowers.categories.${c}`)}
                    </button>
                  ))}
                </div>
              )}
              <div className={styles.grid}>
                {section.items.map((bouquet) => {
                  const copy = bouquetCopy(bouquet, locale);
                  return (
                    <article className={styles.card} key={bouquet.id}>
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
            </div>
          ))
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
