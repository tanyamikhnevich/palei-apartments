import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import CarDetail from '@/components/CarDetail/CarDetail';
import { cars } from '@/data/cars';
import { isSectionLive } from '@/lib/services';

type CarPageProps = { params: { id: string } };

export function generateStaticParams() {
  // Nothing to pre-render while the section is parked.
  return isSectionLive('/cars') ? cars.map((car) => ({ id: car.id })) : [];
}

export function generateMetadata({ params }: CarPageProps): Metadata {
  const car = cars.find((c) => c.id === params.id);
  if (!car) return { title: 'Palei Cars' };
  return {
    title: `${car.make} ${car.model} — Palei Cars`,
    description: `Rent a ${car.make} ${car.model} ${car.year} for your stay. Insurance and unlimited mileage included.`,
  };
}

export default function CarPage({ params }: CarPageProps) {
  if (!isSectionLive('/cars')) notFound();

  const car = cars.find((c) => c.id === params.id);
  if (!car) notFound();

  return (
    <>
      <Header />
      <main>
        <CarDetail car={car} />
      </main>
      <Footer />
    </>
  );
}
