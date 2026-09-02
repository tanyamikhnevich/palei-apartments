import type { Metadata } from 'next';
import AdminDashboard from '@/components/admin/AdminDashboard/AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin — Palei Apartments',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
