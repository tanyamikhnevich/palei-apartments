import { Suspense } from 'react';
import type { Metadata } from 'next';
import { localizedPageMetadata } from '@/lib/seo';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import FlowersShop from '@/components/FlowersShop/FlowersShop';
import JsonLd from '@/components/seo/JsonLd';
import { loadPublicBouquets } from '@/lib/server/bouquets';
import { bouquetCopy, windowBouquets } from '@/lib/flowers';
import { bouquetListSchema, floristSchema, flowersWebsiteSchema } from '@/lib/structuredData';
import { currentLocale } from '@/i18n/server';
import { t } from '@/i18n/getMessage';

// The window is read per request: a bouquet taken off it should be gone from
// the page — and from what a crawler sees — straight away.
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return localizedPageMetadata('flowers', '/flowers');
}

export default async function FlowersPage() {
  const locale = currentLocale();
  const bouquets = await loadPublicBouquets();
  const listed = windowBouquets(bouquets).map((b) => ({ id: b.id, name: bouquetCopy(b, locale).name }));

  return (
    <>
      <JsonLd data={floristSchema(t(locale, 'seo.flowers.description'), locale)} />
      <JsonLd data={flowersWebsiteSchema()} />
      {listed.length > 0 && <JsonLd data={bouquetListSchema(listed, locale)} />}
      <Header />
      <main>
        <Suspense>
          <FlowersShop initial={bouquets} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
