import type { Metadata } from 'next';
import '@/styles/globals.scss';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import LocaleDocument from '@/i18n/LocaleDocument';
import BookCta from '@/components/BookCta/BookCta';

export const metadata: Metadata = {
  title: 'Palei Apartments — Bat Yam',
  description:
    'Boutique short-term rentals near the Mediterranean — comfortable apartments in Bat Yam.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LanguageProvider>
          <LocaleDocument />
          {children}
          <BookCta />
        </LanguageProvider>
      </body>
    </html>
  );
}
