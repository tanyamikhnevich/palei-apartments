import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StayGuide from '@/components/StayGuide/StayGuide';
import StayNotice from '@/components/StayGuide/StayNotice';
import { t } from '@/i18n/getMessage';
import { currentLocale } from '@/i18n/server';
import { isDbConfigured } from '@/lib/api/errors';
import { loadStay } from '@/lib/server/guides';

// Decided per request: what this page shows depends on the minute it is read.
export const dynamic = 'force-dynamic';

type StayPageProps = { params: { token: string } };

/**
 * Nothing about the stay goes into the metadata. A chat app fetches this page
 * to draw a link preview, and whatever is in the head ends up in that bubble.
 */
export function generateMetadata(): Metadata {
  return {
    title: t(currentLocale(), 'stay.metaTitle'),
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

export default async function StayPage({ params }: StayPageProps) {
  if (!isDbConfigured()) notFound();

  const locale = currentLocale();
  const lookup = await loadStay(params.token, locale);

  if (lookup.status === 'missing') notFound();
  if (lookup.status === 'revoked') return <StayNotice kind="revoked" />;
  if (lookup.view.phase === 'ended') {
    return <StayNotice kind="ended" apartmentId={lookup.view.apartmentId} />;
  }

  return <StayGuide view={lookup.view} token={params.token} />;
}
