'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import PhotoGallery from '@/components/PhotoGallery/PhotoGallery';
import FlowerOrderForm from './FlowerOrderForm';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatMoney } from '@/lib/money';
import { fetchBouquets } from '@/lib/api/client';
import {
  bouquetCopy,
  bouquetCurrency,
  bouquetsInCategory,
  bouquetsInCountry,
  collectCategories,
  windowBouquets,
} from '@/lib/flowers';
import type { Bouquet } from '@/types/flower';
import styles from './FlowersShop.module.scss';

/**
 * The shop window and the order that follows it. No cart on purpose: one
 * bouquet goes to one address, so a basket would only add a step between
 * choosing and asking where to send it.
 */
export default function FlowersShop() {
  const { locale, t } = useLanguage();
  const params = useSearchParams();

  /* A date can arrive from an apartment booking — the arrival day. */
  const wantedDate = params.get('date');
  const requestedDate = wantedDate && /^\d{4}-\d{2}-\d{2}$/.test(wantedDate) ? wantedDate : null;
  const [list, setList] = useState<Bouquet[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  const [ordering, setOrdering] = useState<Bouquet | null>(null);

  useEffect(() => {
    fetchBouquets()
      .then(({ bouquets }) => setList(bouquets))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(
    () => windowBouquets(bouquetsInCountry(list, 'IL')),
    [list]
  );
  const categories = useMemo(() => collectCategories(shown), [shown]);
  const filtered = bouquetsInCategory(shown, category);

  return (
    <section className={styles.section} id="flowers">
      <div className="wrap">
        <div className={styles.header}>
          <div className="eyebrow">{t('flowers.eyebrow')}</div>
          <h1 className="section-title">{t('flowers.title')}</h1>
          <p className="section-sub">{t('flowers.sub')}</p>
        </div>

        {categories.length > 1 && (
          <div className={styles.filters} role="group">
            <button
              type="button"
              className={`${styles.chip} ${category === null ? styles.chipOn : ''}`}
              onClick={() => setCategory(null)}
            >
              {t('flowers.all')}
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.chip} ${category === c ? styles.chipOn : ''}`}
                onClick={() => setCategory(c)}
              >
                {t(`flowers.categories.${c}`)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className={styles.empty}>…</p>
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
                    <h3 className={styles.name}>{copy.name}</h3>
                    <p className={styles.note}>{copy.note}</p>

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
                      <Button variant="primary" size="sm" onClick={() => setOrdering(bouquet)}>
                        {t('flowers.order')}
                      </Button>
                    </div>
                  </div>
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
