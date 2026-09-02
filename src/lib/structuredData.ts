import type { Apartment } from '@/types/apartment';
import { SITE_NAME, SITE_URL, absoluteUrl, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { getApartmentPhotos } from '@/lib/apartmentMedia';
import { currencyOf } from '@/lib/regions';
import { localePath } from '@/i18n/routing';
import { DEFAULT_LOCALE } from '@/i18n/routing';
import type { Locale } from '@/i18n/types';

/**
 * The business itself.
 *
 * The address stops at the city on purpose: the site does not publish house
 * numbers, and structured data is published more loudly than anything else on
 * the page. `areaServed` carries the local-search signal instead.
 */
export function organizationSchema(description: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    '@id': `${SITE_URL}/#business`,
    name: SITE_NAME,
    url: SITE_URL,
    description,
    logo: absoluteUrl('/palei-apartments-logo.png'),
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bat Yam',
      addressCountry: 'IL',
    },
    areaServed: [
      { '@type': 'City', name: 'Bat Yam' },
      { '@type': 'City', name: 'Tel Aviv' },
    ],
  };
}

export function websiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    publisher: { '@id': `${SITE_URL}/#business` },
  };
}

export function breadcrumbSchema(
  trail: { name: string; path: string }[],
  locale: Locale = DEFAULT_LOCALE
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: absoluteUrl(localePath(step.path, locale)),
    })),
  };
}

/**
 * One apartment.
 *
 * Typed as both `Apartment` and `Product`: the first is what it actually is,
 * the second is what carries a price and a rating into a search result. Only
 * apartments that really have reviews get `aggregateRating` — inventing one is
 * both dishonest and, when Google notices, actively harmful.
 */
export function apartmentSchema(
  apt: Apartment,
  copy: { title: string; description: string; location: string },
  locale: Locale = DEFAULT_LOCALE
): Record<string, unknown> {
  const url = absoluteUrl(localePath(`/apartments/${apt.id}`, locale));
  const photos = getApartmentPhotos(apt).map(absoluteUrl);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['Apartment', 'Product'],
    '@id': `${url}#apartment`,
    name: copy.title,
    description: copy.description.replace(/\s+/g, ' ').trim(),
    url,
    image: photos.length ? photos.slice(0, 8) : [absoluteUrl(DEFAULT_OG_IMAGE)],
    numberOfBedrooms: apt.bedrooms,
    numberOfBathroomsTotal: apt.bathrooms,
    occupancy: { '@type': 'QuantitativeValue', maxValue: apt.guests, unitCode: 'C62' },
    address: {
      '@type': 'PostalAddress',
      // Street without the number, exactly as the page shows it.
      streetAddress: copy.location,
      addressLocality: apt.area,
      addressCountry: apt.area === 'Bat Yam' ? 'IL' : 'CY',
    },
    offers: {
      '@type': 'Offer',
      url,
      price: apt.price,
      priceCurrency: currencyOf(apt),
      availability:
        apt.status === 'Available'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      // A nightly rate, not a one-off product price.
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: apt.price,
        priceCurrency: currencyOf(apt),
        unitCode: 'DAY',
      },
    },
  };

  if (apt.reviews > 0 && apt.rating > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: apt.rating,
      reviewCount: apt.reviews,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}

/** The listing page, so the crawler sees the set rather than ten loose pages. */
export function apartmentListSchema(apartments: Apartment[], path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    url: absoluteUrl(path),
    numberOfItems: apartments.length,
    itemListElement: apartments.map((apt, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(`/apartments/${apt.id}`),
    })),
  };
}
