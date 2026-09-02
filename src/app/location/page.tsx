import type { Metadata } from 'next';
import { localizedPageMetadata } from '@/lib/seo';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import LocationSection from '@/components/LocationSection/LocationSection';

export function generateMetadata(): Metadata {
  return localizedPageMetadata('location', '/location');
}

export default function LocationPage() {
  return (
    <>
      <Header />
      <main>
        <LocationSection />
      </main>
      <Footer />
    </>
  );
}
