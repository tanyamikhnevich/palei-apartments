import type { Metadata } from 'next';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import ContactSection from '@/components/ContactSection/ContactSection';

export const metadata: Metadata = {
  title: 'Contact — Palei Apartments',
  description: 'Tell us your dates and we will help you choose the right apartment in Bat Yam.',
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main>
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
