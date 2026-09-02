import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import ApartmentDetail from '@/components/ApartmentDetail/ApartmentDetail';
import JsonLd from '@/components/seo/JsonLd';
import { loadPublicApartment } from '@/lib/server/apartments';
import { getCoverPhoto } from '@/lib/apartmentMedia';
import { apartmentSchema, breadcrumbSchema } from '@/lib/structuredData';
import { pageMetadata } from '@/lib/seo';
import { currentLocale } from '@/i18n/server';
import { getApartmentCopy } from '@/i18n/apartmentLocale';

export const dynamic = 'force-dynamic';

type ApartmentPageProps = { params: { id: string } };

export async function generateMetadata({ params }: ApartmentPageProps): Promise<Metadata> {
  const apt = await loadPublicApartment(params.id);

  // Deliberately here rather than only in the component below. `loading.tsx`
  // puts this route behind a streaming boundary, so by the time the body runs
  // the 200 has already gone out and `notFound()` can no longer change it —
  // an apartment that does not exist would answer "200, not found", which is
  // the soft 404 search engines punish. Metadata runs before the first byte.
  if (!apt) notFound();

  // Each apartment is already written in all four languages in the database,
  // so its search snippet is a real translation rather than a machine's guess.
  const locale = currentLocale();
  const copy = getApartmentCopy(apt, locale);

  return pageMetadata({
    // Kept short on purpose: the layout's template appends the brand, and a
    // result page shows roughly 60 characters before it cuts. The town earns
    // its place — "Bat Yam" is what people actually search for.
    title: `${copy.title} — ${apt.area}`,
    description: copy.description.slice(0, 300),
    path: `/apartments/${apt.id}`,
    locale,
    // The listing's own cover photo makes a far better preview card than the
    // generic one, and it is what a guest expects to see when a link is shared.
    image: getCoverPhoto(apt),
    type: 'article',
  });
}

export default async function ApartmentPage({ params }: ApartmentPageProps) {
  const apt = await loadPublicApartment(params.id);
  if (!apt) notFound();

  const locale = currentLocale();
  const copy = getApartmentCopy(apt, locale);

  return (
    <>
      <JsonLd data={apartmentSchema(apt, copy, locale)} />
      <JsonLd
        data={breadcrumbSchema(
          [
            { name: 'Home', path: '/' },
            { name: 'Apartments', path: '/apartments' },
            { name: copy.title, path: `/apartments/${apt.id}` },
          ],
          locale
        )}
      />
      <Header />
      <main>
        <ApartmentDetail apt={apt} />
      </main>
      <Footer />
    </>
  );
}
