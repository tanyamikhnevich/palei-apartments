'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fetchBouquets } from '@/lib/api/client';
import { isPhotoUrl } from '@/lib/apartmentMedia';
import { isAvifImagePath } from '@/lib/imageUpload';
import { addOnsFor } from '@/lib/flowerCategories';
import { bouquetCopy, bouquetCurrency } from '@/lib/flowers';
import { formatMoney } from '@/lib/money';
import type { Bouquet } from '@/types/flower';
import styles from './FlowersShop.module.scss';

/**
 * A bottle or a balloon set to go with what is being bought — the shop's
 * stand-in for a basket. Reads the window itself, so it can sit anywhere: in
 * the order sheet, where `onAdd` turns a pick into the next order for the same
 * delivery, or on a bouquet's page, where each pick is simply a link.
 */
export default function AddOnSuggestions({
  bought,
  title,
  sub,
  onAdd,
}: {
  bought: Bouquet;
  title: string;
  sub?: string;
  onAdd?: (item: Bouquet) => void;
}) {
  const { locale, t, href } = useLanguage();
  const [picks, setPicks] = useState<Bouquet[]>([]);

  useEffect(() => {
    let live = true;
    fetchBouquets()
      .then(({ bouquets }) => live && setPicks(addOnsFor(bought, bouquets)))
      .catch(() => live && setPicks([]));
    return () => {
      live = false;
    };
  }, [bought]);

  // Nothing to offer is no reason to show an empty box.
  if (!picks.length) return null;

  return (
    <div className={styles.addOns}>
      <div className={styles.addOnsHead}>
        <b>{title}</b>
        {sub && <span>{sub}</span>}
      </div>
      <div className={styles.addOnsList}>
        {picks.map((item) => {
          const copy = bouquetCopy(item, locale);
          const photo = (item.photos ?? []).find(isPhotoUrl);
          const body = (
            <>
              <span className={styles.addOnMedia}>
                {photo ? (
                  <Image
                    src={photo}
                    alt=""
                    fill
                    sizes="72px"
                    className={item.kind === 'wine' ? styles.addOnImgContain : styles.addOnImg}
                    unoptimized={isAvifImagePath(photo)}
                  />
                ) : (
                  <Icon name="flower" size={22} />
                )}
              </span>
              <span className={styles.addOnText}>
                <span className={styles.addOnKind}>{t(`flowers.kinds.${item.kind}`)}</span>
                <span className={styles.addOnName}>{copy.name}</span>
                <b>{formatMoney(item.price, bouquetCurrency(item), locale)}</b>
              </span>
            </>
          );

          return onAdd ? (
            <div key={item.id} className={styles.addOn}>
              {body}
              <Button variant="ghost" size="sm" icon="plus" onClick={() => onAdd(item)}>
                {t('flowers.addOn.add')}
              </Button>
            </div>
          ) : (
            <Link key={item.id} href={href(`/flowers/${item.id}`)} className={styles.addOn}>
              {body}
              <Icon name="arrow" size={16} className={styles.addOnGo} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
