import type { Metadata } from 'next';
import '@/styles/globals.scss';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import BookCta from '@/components/BookCta/BookCta';
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo';
import { currentLocale } from '@/i18n/server';
import { isRtl } from '@/i18n/routing';

const DESCRIPTION =
  'Boutique short-term rentals near the Mediterranean — comfortable apartments in Bat Yam, hosted personally.';

export const metadata: Metadata = {
  // Makes every relative URL below — and in each page's own metadata —
  // resolve to a real address instead of being dropped.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — short-term rentals in Bat Yam`,
    /** Pages give their own name; the brand is appended once, here. */
    template: `%s — ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — short-term rentals in Bat Yam`,
    description: DESCRIPTION,
    images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE), width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — short-term rentals in Bat Yam`,
    description: DESCRIPTION,
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Let Google show a full-size preview and a long snippet rather than
      // guessing at a truncated one.
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Decided by the URL, in the middleware — so `lang` and `dir` are already
  // right in the HTML a crawler receives, rather than corrected a moment later
  // by a script it never runs.
  const locale = currentLocale();

  return (
    <html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body>
        <LanguageProvider locale={locale}>
          {children}
          <BookCta />
        </LanguageProvider>
      </body>
    </html>
  );
}
