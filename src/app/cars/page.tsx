import { Suspense } from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import CarsGrid from '@/components/CarsGrid/CarsGrid';

export const metadata: Metadata = {
  title: 'Car rental — Palei Cars',
  description:
    'Rent a car for your stay in Israel. Our own fleet, handed over in Bat Yam or at Ben Gurion airport.',
};

export default function CarsPage() {
  return (
    <>
      <Header />
      <main>
        <Suspense>
          <CarsGrid />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
