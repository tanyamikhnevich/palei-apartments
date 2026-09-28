'use client';

import { useEffect, useMemo, useState } from 'react';
import BouquetCard from './BouquetCard';
import BouquetCardSkeleton, { SKELETON_COUNT } from './BouquetCardSkeleton';
import FlowerOrderForm from './FlowerOrderForm';
import { useCarriedDate } from './useCarriedDate';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fetchBouquets } from '@/lib/api/client';
import {
  bouquetsInCountry,
  FLOWER_COUNTRY,
  windowBouquets,
  type PriceOrder,
} from '@/lib/flowers';
import { inCategory, SUB_FILTERS, type ShopCategory } from '@/lib/flowerCategories';
import type { Bouquet, BouquetCategory } from '@/types/flower';
import styles from './FlowersShop.module.scss';

/**
 * One aisle of the shop, and the order that follows it. No cart on purpose:
 * one bouquet goes to one address, so a basket would only add a step between
 * choosing and asking where to send it.
 */
export default function FlowersShop({
  initial,
  category,
}: {
  initial?: Bouquet[];
  category: ShopCategory;
}) {
  const { t } = useLanguage();
  const { date: requestedDate } = useCarriedDate();

  /* Rendered on the server when the page could read the window itself — so
     the bouquets, and the links to their pages, are in the HTML a search
     engine receives rather than arriving after a script it may never run. */
  const [list, setList] = useState<Bouquet[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial);
  const [priceOrder, setPriceOrder] = useState<PriceOrder>('asc');
  const [sub, setSub] = useState<BouquetCategory | 'all'>('all');
  const [ordering, setOrdering] = useState<Bouquet | null>(null);

  useEffect(() => {
    if (initial) return;
    fetchBouquets()
      .then(({ bouquets }) => setList(bouquets))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [initial]);

  const inAisle = useMemo(
    () =>
      windowBouquets(bouquetsInCountry(list, FLOWER_COUNTRY), priceOrder).filter((b) =>
        inCategory(b, category)
      ),
    [list, priceOrder, category]
  );
  /* Only splits actually on offer get a chip, and one alone is no choice. */
  const subs = useMemo(() => {
    const options = SUB_FILTERS[category];
    if (!options) return [];
    const present = new Set(inAisle.map((b) => b.category));
    const offered = options.filter((c) => present.has(c));
    return offered.length > 1 ? offered : [];
  }, [inAisle, category]);
  const shownSub = subs.includes(sub as BouquetCategory) ? sub : 'all';
  const items = shownSub === 'all' ? inAisle : inAisle.filter((b) => b.category === shownSub);

  return (
    <section className={styles.section} id="flowers">
      <div className="wrap">
        <div className={styles.header}>
          <div className="eyebrow">{t('flowers.eyebrow')}</div>
          <h1 className="section-title">{t(`shop.categories.${category}.label`)}</h1>
          <p className="section-sub">{t(`shop.categories.${category}.sub`)}</p>
        </div>

        <div className={styles.toolbar}>
          {subs.length > 0 && (
            <div className={styles.kinds} role="group">
              {(['all', ...subs] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.kindBtn} ${shownSub === c ? styles.kindOn : ''}`}
                  onClick={() => setSub(c)}
                  aria-pressed={shownSub === c}
                >
                  {c === 'all' ? t('flowers.all') : t(`flowers.categories.${c}`)}
                </button>
              ))}
            </div>
          )}
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
        ) : items.length === 0 ? (
          <p className={styles.empty}>{t('flowers.empty')}</p>
        ) : (
          <div className={styles.grid}>
            {items.map((bouquet) => (
              <BouquetCard key={bouquet.id} bouquet={bouquet} onOrder={setOrdering} />
            ))}
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
