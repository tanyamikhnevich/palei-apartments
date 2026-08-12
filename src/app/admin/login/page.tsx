import { Suspense } from 'react';
import type { Metadata } from 'next';
import AdminLogin from '@/components/admin/AdminLogin/AdminLogin';

export const metadata: Metadata = {
  title: 'Admin — Palei Apartments',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLogin />
    </Suspense>
  );
}
