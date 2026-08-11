import type { Metadata } from 'next';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import AboutSection from '@/components/AboutSection/AboutSection';
import BenefitsSection from '@/components/BenefitsSection/BenefitsSection';

export const metadata: Metadata = {
  title: 'About — Palei Apartments',
  description:
    'A small family business renting our own carefully prepared apartments in Bat Yam.',
};

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
