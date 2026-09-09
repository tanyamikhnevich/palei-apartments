import { Suspense } from 'react';
import type { Metadata } from 'next';
import AdminLogin from '@/components/admin/AdminLogin/AdminLogin';
import { GROUP_BRAND, serviceFor } from '@/lib/services';

export const metadata: Metadata = {
  title: 'Flower shop — sign in',
  robots: { index: false, follow: false },
};

/**
 * The shop's own door. The form behind it is the same one the owner uses —
 * one sign-in endpoint, one throttle, one set of rules about passwords — but
 * it lands where the account belongs rather than on someone else's dashboard.
 */
export default function FlowersAdminLoginPage() {
  /* The shop's own mark, taken from the same place the public header takes it,
     so a new logo file is swapped once and both doors follow. */
  const shop = serviceFor('/flowers');

  return (
    <Suspense fallback={null}>
      <AdminLogin
        home="/admin/flowers"
        title="Flower shop"
        sub="Sign in to manage the window and its orders."
        /* Square, unlike the group's — see the logo prop. */
        logo={{
          src: shop.logo ?? GROUP_BRAND.logo,
          alt: 'Palei Flowers',
          width: 200,
          height: 199,
        }}
        back={{ href: shop.href, label: 'Back to the shop' }}
      />
    </Suspense>
  );
}
