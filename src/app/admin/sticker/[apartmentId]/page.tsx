import type { Metadata } from 'next';
import GuideSticker from '@/components/admin/AdminGuide/GuideSticker';

export const metadata: Metadata = {
  title: 'Apartment sticker — Palei Apartments',
  robots: { index: false, follow: false },
};

export default function StickerPage({ params }: { params: { apartmentId: string } }) {
  return <GuideSticker apartmentId={params.apartmentId} />;
}
