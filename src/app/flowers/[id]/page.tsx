import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import BouquetDetail from '@/components/BouquetDetail/BouquetDetail';
import { loadPublicBouquet } from '@/lib/server/bouquets';
import { bouquetCopy } from '@/lib/flowers';
import { isPhotoUrl } from '@/lib/apartmentMedia';
import { FLOWERS_BRAND, pageMetadata } from '@/lib/seo';
import { currentLocale } from '@/i18n/server';
import { t } from '@/i18n/getMessage';
import type { Locale } from '@/i18n/types';
import type { Bouquet } from '@/types/flower';
import JsonLd from '@/components/seo/JsonLd';
import { bouquetSchema, breadcrumbSchema } from '@/lib/structuredData';

export const dynamic = 'force-dynamic';

type BouquetPageProps = {
  params: { id: string };
  searchParams: { date?: string };
};

/**
 * The snippet under the title in a search result. The florist's note when
 * there is one — cut at a word, not mid-way through it — and otherwise what
 * the shop is and where it delivers, so no bouquet goes out with a blank line.
 */
function bouquetDescription(bouquet: Bouquet, locale: Locale): string {
  const note = bouquetCopy(bouquet, locale).note.replace(/\s+/g, ' ').trim();
  if (!note) return t(locale, 'seo.flowers.description');
  if (note.length <= 160) return note;
  const cut = note.slice(0, 157);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 100 ? cut.lastIndexOf(' ') : 157)}…`;
}

export async function generateMetadata({ params }: BouquetPageProps): Promise<Metadata> {
  const bouquet = await loadPublicBouquet(params.id);

  // Answered before the first byte, as on the apartment page: a 404 decided
  // later in the body would arrive after a 200 had already gone out.
  if (!bouquet) notFound();

  const locale = currentLocale();
  const copy = bouquetCopy(bouquet, locale);

  return pageMetadata({
    title: copy.name,
    description: bouquetDescription(bouquet, locale),
    path: `/flowers/${bouquet.id}`,
    locale,
    // The bouquet's own photo is the whole point of sharing the link.
    image: (bouquet.photos ?? []).find(isPhotoUrl),
    type: 'article',
  });
}

export default async function BouquetPage({ params, searchParams }: BouquetPageProps) {
  const bouquet = await loadPublicBouquet(params.id);
  if (!bouquet) notFound();

  /* A date can arrive from a booking — the arrival day — as in the shop. */
  const wanted = searchParams.date;
  const requestedDate = wanted && /^\d{4}-\d{2}-\d{2}$/.test(wanted) ? wanted : null;

  const locale = currentLocale();
  const copy = bouquetCopy(bouquet, locale);

  return (
    <>
      <JsonLd
        data={bouquetSchema(
          bouquet,
          copy,
          bouquetDescription(bouquet, locale),
          t(locale, `flowers.kinds.${bouquet.kind}`),
          locale
        )}
      />
      <JsonLd
        data={breadcrumbSchema(
          [
            { name: FLOWERS_BRAND, path: '/flowers' },
            { name: copy.name, path: `/flowers/${bouquet.id}` },
          ],
          locale
        )}
      />
      <Header />
      <main>
        <Suspense>
          <BouquetDetail bouquet={bouquet} requestedDate={requestedDate} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
