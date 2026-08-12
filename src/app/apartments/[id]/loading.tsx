import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import ApartmentDetailSkeleton from '@/components/ApartmentDetail/ApartmentDetailSkeleton';

export default function ApartmentLoading() {
  return (
    <>
      <Header />
      <main>
        <ApartmentDetailSkeleton />
      </main>
      <Footer />
    </>
  );
}
