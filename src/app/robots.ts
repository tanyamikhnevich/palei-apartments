import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { originForHost } from '@/lib/sites';

/**
 * The panel and the API are already `noindex` by header, but a crawler has to
 * fetch a page to read a header. Saying so here keeps them out of the crawl
 * budget entirely — and out of the logs.
 */
export default function robots(): MetadataRoute.Robots {
  // Every domain points at its own sitemap, which lists only its own pages.
  const origin = originForHost(headers().get('host'));
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
