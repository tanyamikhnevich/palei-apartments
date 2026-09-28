import { Suspense } from 'react';
import type { Metadata } from 'next';
import FlowersShop from '@/components/FlowersShop/FlowersShop';
import JsonLd from '@/components/seo/JsonLd';
import { loadPublicBouquets } from '@/lib/server/bouquets';
import { bouquetCopy, windowBouquets } from '@/lib/flowers';
import { inCategory, type ShopCategory } from '@/lib/flowerCategories';
import { FLOWERS_BRAND, pageMetadata } from '@/lib/seo';
import { bouquetListSchema, breadcrumbSchema } from '@/lib/structuredData';
import { currentLocale } from '@/i18n/server';
import { t } from '@/i18n/getMessage';

/**
 * One aisle of the shop — `/flowers/roses` and the rest.
 *
 * Each has a route folder of its own rather than sharing `[id]` with the
 * bouquets: a page per aisle, with its own title, is what a search for "roses
 * Bat Yam" lands on, and a static folder always wins over the bouquet route,
 * so the two never argue over an address. The folders only name the aisle;
 * everything else is here.
 */
export async function categoryMetadata(category: ShopCategory): Promise<Metadata> {
  const locale = currentLocale();
  // An aisle with nothing on it stays reachable but out of the index — it is
  // off the header and the sitemap too, and comes back with its first bouquet.
  const empty = !(await loadPublicBouquets()).some((b) => inCategory(b, category));
  return pageMetadata({
    title: t(locale, `shop.categories.${category}.seoTitle`),
    description: t(locale, `shop.categories.${category}.seoDescription`),
    path: `/flowers/${category}`,
    locale,
    noIndex: empty,
  });
}

export default async function CategoryPage({ category }: { category: ShopCategory }) {
  const locale = currentLocale();
  const bouquets = await loadPublicBouquets();
  const listed = windowBouquets(bouquets)
    .filter((b) => inCategory(b, category))
    .map((b) => ({ id: b.id, name: bouquetCopy(b, locale).name }));
  const path = `/flowers/${category}`;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema(
          [
            { name: FLOWERS_BRAND, path: '/flowers' },
            { name: t(locale, `shop.categories.${category}.label`), path },
          ],
          locale
        )}
      />
      {listed.length > 0 && <JsonLd data={bouquetListSchema(listed, locale, path)} />}
      <main>
        <Suspense>
          <FlowersShop initial={bouquets} category={category} />
        </Suspense>
      </main>
    </>
  );
}
