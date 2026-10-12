import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StayGuide from '@/components/StayGuide/StayGuide';
import { t } from '@/i18n/getMessage';
import { currentLocale } from '@/i18n/server';
import { isDbConfigured } from '@/lib/api/errors';
import { loadHouse } from '@/lib/server/guides';

// The owner edits the Wi-Fi and the notes; a sticker must never show stale ones.
export const dynamic = 'force-dynamic';

type HousePageProps = { params: { token: string } };

export function generateMetadata(): Metadata {
  return {
    title: t(currentLocale(), 'stay.stickerGuide'),
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

/**
 * Where the sticker inside an apartment leads: Wi-Fi, house notes and how to
 * leave. The same page a guest's own link opens, minus everything that belongs
 * to one stay — and it never carries a door code.
 */
export default async function HousePage({ params }: HousePageProps) {
  if (!isDbConfigured()) notFound();

  const view = await loadHouse(params.token, currentLocale());
  if (!view) notFound();

  return <StayGuide view={view} />;
}
