import type { Metadata } from 'next';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import LocationSection from '@/components/LocationSection/LocationSection';

export const metadata: Metadata = {
  title: 'Location — Palei Apartments',
  description: 'Bat Yam — a relaxed seaside town with the beach, cafés and markets minutes away.',
};

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
