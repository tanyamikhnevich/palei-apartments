import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * The panel and the API are already `noindex` by header, but a crawler has to
 * fetch a page to read a header. Saying so here keeps them out of the crawl
 * budget entirely — and out of the logs.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
