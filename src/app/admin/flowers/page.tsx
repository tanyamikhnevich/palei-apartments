import type { Metadata } from 'next';
import FlowersAdmin from '@/components/admin/FlowersAdmin/FlowersAdmin';

export const metadata: Metadata = {
  title: 'Flower shop — admin',
  robots: { index: false, follow: false },
};

export default function FlowersAdminPage() {
  return <FlowersAdmin />;
}
