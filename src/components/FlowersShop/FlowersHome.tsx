'use client';

import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { isPhotoUrl } from '@/lib/apartmentMedia';
import { isAvifImagePath } from '@/lib/imageUpload';
import { formatMoney } from '@/lib/money';
import { bouquetCurrency, bouquetsInCountry, displayPrice, FLOWER_COUNTRY, windowBouquets } from '@/lib/flowers';
import { inCategory, stockedCategories } from '@/lib/flowerCategories';
import type { Bouquet } from '@/types/flower';
import { useCarriedDate } from './useCarriedDate';
import styles from './FlowersShop.module.scss';

/**
 * The shop's front page: the aisles, one card each, and nothing else. The
 * whole window on one page was a scroll through forty items to find the wine;
 * a card per aisle is one tap to the shelf that was wanted.
 *
 * Each card wears a photo of something actually on that shelf and the price it
 * starts from.
 */
export default function FlowersHome({ window: all }: { window: Bouquet[] }) {
  const { locale, t, href } = useLanguage();
  const { withDate } = useCarriedDate();

  const shown = windowBouquets(bouquetsInCountry(all, FLOWER_COUNTRY));
  const cards = stockedCategories(shown).map((category) => {
    const items = shown.filter((b) => inCategory(b, category));
    // Not `items[0]`: the rose builder leads its shelf whatever it costs.
    const cheapest = items.reduce((a, b) => (displayPrice(b) < displayPrice(a) ? b : a));
    return {
      category,
      cover: items.flatMap((b) => b.photos ?? []).find(isPhotoUrl),
      from: formatMoney(displayPrice(cheapest), bouquetCurrency(cheapest), locale),
    };
  });

  return (
    <section className={styles.section} id="flowers">
      <div className="wrap">
        <div className={styles.header}>
          <div className="eyebrow">{t('flowers.eyebrow')}</div>
          <h1 className="section-title">{t('flowers.title')}</h1>
          <p className="section-sub">{t('flowers.sub')}</p>
        </div>

        {cards.length === 0 ? (
          <p className={styles.empty}>{t('flowers.empty')}</p>
        ) : (
          <nav className={styles.aisleCards} aria-label={t('shop.shelves')}>
            {cards.map(({ category, cover, from }) => (
              <Link
                key={category}
                href={withDate(href(`/flowers/${category}`))}
                className={styles.aisleCard}
              >
                <span className={styles.aisleMedia}>
                  {cover ? (
                    <Image
                      src={cover}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 360px"
                      className={styles.aisleImg}
                      unoptimized={isAvifImagePath(cover)}
                    />
                  ) : (
                    <Icon name="flower" size={40} />
                  )}
                </span>
                <span className={styles.aisleBody}>
                  <span className={styles.aisleName}>
                    {t(`shop.categories.${category}.label`)}
                  </span>
                  <span className={styles.aisleSub}>{t(`shop.categories.${category}.sub`)}</span>
                  <span className={styles.aisleFoot}>
                    <span className={styles.aisleFrom}>
                      {t('flowers.fromPrice').replace('{price}', from)}
                    </span>
                    <Icon name="arrow" size={18} className={styles.aisleGo} />
                  </span>
                </span>
              </Link>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}
