import Header from '@/components/Header/Header';
import Hero from '@/components/Hero/Hero';
import ApartmentCarousel from '@/components/ApartmentCarousel/ApartmentCarousel';
import AboutSection from '@/components/AboutSection/AboutSection';
import BenefitsSection from '@/components/BenefitsSection/BenefitsSection';
import LocationSection from '@/components/LocationSection/LocationSection';
import ContactSection from '@/components/ContactSection/ContactSection';
import Footer from '@/components/Footer/Footer';
import Reveal from '@/components/ui/Reveal/Reveal';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ApartmentCarousel />
        <Reveal>
          <AboutSection />
        </Reveal>
        <Reveal>
          <BenefitsSection />
        </Reveal>
        <Reveal>
          <LocationSection />
        </Reveal>
        <Reveal>
          <ContactSection />
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
