import type { Metadata } from 'next';
import { localizedPageMetadata } from '@/lib/seo';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import AboutSection from '@/components/AboutSection/AboutSection';
import BenefitsSection from '@/components/BenefitsSection/BenefitsSection';

export function generateMetadata(): Metadata {
  return localizedPageMetadata('about', '/about');
}

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        <AboutSection />
        <BenefitsSection />
      </main>
      <Footer />
    </>
  );
}
