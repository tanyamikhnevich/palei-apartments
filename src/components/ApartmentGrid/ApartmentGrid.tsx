import ApartmentGridFull from '@/components/ApartmentGrid/ApartmentGridFull';
import ApartmentGridPreview from '@/components/ApartmentGrid/ApartmentGridPreview';

type ApartmentGridProps = {
  variant?: 'preview' | 'full';
};

export default function ApartmentGrid({ variant = 'full' }: ApartmentGridProps) {
  if (variant === 'preview') return <ApartmentGridPreview />;
  return <ApartmentGridFull />;
}
