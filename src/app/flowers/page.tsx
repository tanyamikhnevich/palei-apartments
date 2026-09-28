import { Suspense } from 'react';
import type { Metadata } from 'next';
import { localizedPageMetadata } from '@/lib/seo';
import FlowersHome from '@/components/FlowersShop/FlowersHome';
import GroupSection from '@/components/GroupSection/GroupSection';
import JsonLd from '@/components/seo/JsonLd';
import { loadPublicBouquets } from '@/lib/server/bouquets';
import { floristSchema, flowersWebsiteSchema } from '@/lib/structuredData';
import { currentLocale } from '@/i18n/server';
import { t } from '@/i18n/getMessage';

// The window is read per request: an aisle emptied in admin should be gone
// from the front page — and from what a crawler sees — straight away.
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return localizedPageMetadata('flowers', '/flowers');
}

/**
 * The front of the shop: the aisles as cards. The bouquets themselves — and
 * their list for search engines — live one click in, on each aisle's page.
 */
export default async function FlowersPage() {
  const locale = currentLocale();
  const bouquets = await loadPublicBouquets();

  return (
    <>
      <JsonLd data={floristSchema(t(locale, 'seo.flowers.description'), locale)} />
      <JsonLd data={flowersWebsiteSchema()} />
      <main>
        {/* The cards read the delivery date from the address, to carry it on. */}
        <Suspense>
          <FlowersHome window={bouquets} />
        </Suspense>
        {/* The rest of the family, once the shop has had its say. */}
        <GroupSection except="/flowers" titleKey="shop.group.title" subKey="shop.group.sub" />
      </main>
    </>
  );
}
