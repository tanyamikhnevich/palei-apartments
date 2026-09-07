import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import BouquetDetail from '@/components/BouquetDetail/BouquetDetail';
import { loadPublicBouquet } from '@/lib/server/bouquets';
import { bouquetCopy } from '@/lib/flowers';
import { isPhotoUrl } from '@/lib/apartmentMedia';
import { pageMetadata } from '@/lib/seo';
import { currentLocale } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type BouquetPageProps = {
  params: { id: string };
  searchParams: { date?: string };
};

export async function generateMetadata({ params }: BouquetPageProps): Promise<Metadata> {
  const bouquet = await loadPublicBouquet(params.id);

  // Answered before the first byte, as on the apartment page: a 404 decided
  // later in the body would arrive after a 200 had already gone out.
  if (!bouquet) notFound();

  const locale = currentLocale();
  const copy = bouquetCopy(bouquet, locale);

  return pageMetadata({
    title: copy.name,
    description: copy.note.slice(0, 300),
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

  return (
    <>
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
