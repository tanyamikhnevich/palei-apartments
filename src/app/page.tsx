import Header from '@/components/Header/Header';
import Hero from '@/components/Hero/Hero';
import ApartmentGrid from '@/components/ApartmentGrid/ApartmentGrid';
import AboutSection from '@/components/AboutSection/AboutSection';
import BenefitsSection from '@/components/BenefitsSection/BenefitsSection';
import LocationSection from '@/components/LocationSection/LocationSection';
import ContactSection from '@/components/ContactSection/ContactSection';
import Footer from '@/components/Footer/Footer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ApartmentGrid variant="preview" />
        <AboutSection />
        <BenefitsSection />
        <LocationSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
