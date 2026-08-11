import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import ApartmentDetail from '@/components/ApartmentDetail/ApartmentDetail';
import { loadPublicApartment } from '@/lib/server/apartments';

export const dynamic = 'force-dynamic';

type ApartmentPageProps = { params: { id: string } };

export async function generateMetadata({ params }: ApartmentPageProps): Promise<Metadata> {
  const apt = await loadPublicApartment(params.id);
  if (!apt) return { title: 'Palei Apartments' };

  const copy = apt.locales.en;
  return {
    title: `${copy.title} — Palei Apartments`,
    description: copy.description.replace(/\s+/g, ' ').trim().slice(0, 160),
  };
}

export default async function ApartmentPage({ params }: ApartmentPageProps) {
  const apt = await loadPublicApartment(params.id);
  if (!apt) notFound();

  return (
    <>
      <Header />
      <main>
        <ApartmentDetail apt={apt} />
      </main>
      <Footer />
    </>
  );
}
