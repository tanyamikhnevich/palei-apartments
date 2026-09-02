import type { Metadata } from 'next';
import { localizedPageMetadata } from '@/lib/seo';
import Header from '@/components/Header/Header';
import Hero from '@/components/Hero/Hero';
import ApartmentCarousel from '@/components/ApartmentCarousel/ApartmentCarousel';
import AboutSection from '@/components/AboutSection/AboutSection';
import BenefitsSection from '@/components/BenefitsSection/BenefitsSection';
import LocationSection from '@/components/LocationSection/LocationSection';
import GroupSection from '@/components/GroupSection/GroupSection';
import ContactSection from '@/components/ContactSection/ContactSection';
import Footer from '@/components/Footer/Footer';
import Reveal from '@/components/ui/Reveal/Reveal';
import JsonLd from '@/components/seo/JsonLd';
import { organizationSchema, websiteSchema } from '@/lib/structuredData';

export function generateMetadata(): Metadata {
  return localizedPageMetadata('home', '/');
}

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={organizationSchema(
          'Boutique short-term rentals near the Mediterranean — comfortable apartments in Bat Yam, hosted personally.'
        )}
      />
      <JsonLd data={websiteSchema()} />
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
          <GroupSection />
        </Reveal>
        <Reveal>
          <ContactSection />
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
