import type { Apartment } from '@/types/apartment';
import { FLOWERS_BRAND, SITE_NAME, SITE_URL, absoluteUrl, DEFAULT_OG_IMAGE } from '@/lib/seo';
import type { Bouquet, BouquetCopy } from '@/types/flower';
import { bouquetCurrency, displayPrice } from '@/lib/flowers';
import { isBuilder } from '@/lib/roseBuilder';
import { isPhotoUrl } from '@/lib/apartmentMedia';
import { SOCIAL_URLS } from '@/lib/social';
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
    // The profiles Google already knows about, claimed as ours. Without this
    // the new domain and the years-old accounts are three unrelated things.
    sameAs: SOCIAL_URLS,
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

/** Stable across languages: one shop, whichever translation is being read. */
const FLORIST_ID = () => `${absoluteUrl('/flowers')}#florist`;

/**
 * The flower shop as a business of its own — a `Florist`, which is what local
 * search matches "flower delivery Bat Yam" against. The same care with the
 * address as for the apartments: the city, never a street.
 */
export function floristSchema(description: string, locale: Locale = DEFAULT_LOCALE) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Florist',
    '@id': FLORIST_ID(),
    name: FLOWERS_BRAND,
    url: absoluteUrl(localePath('/flowers', locale)),
    description,
    logo: absoluteUrl('/palei-flowers-logo.png'),
    image: absoluteUrl('/og-flowers.png'),
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bat Yam',
      addressCountry: 'IL',
    },
    areaServed: { '@type': 'City', name: 'Bat Yam' },
    // Same family as the apartments — the link that tells a search engine the
    // two sites are one business rather than a stranger borrowing the name.
    parentOrganization: { '@id': `${SITE_URL}/#business` },
  };
}

/** The shop's own domain, named as a site in its own right. */
export function flowersWebsiteSchema() {
  const url = absoluteUrl('/flowers');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${url}#website`,
    url,
    name: FLOWERS_BRAND,
    publisher: { '@id': FLORIST_ID() },
  };
}

/** The window as a list, so every bouquet page is one hop from the shop. */
export function bouquetListSchema(
  bouquets: { id: string; name: string }[],
  locale: Locale = DEFAULT_LOCALE
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    url: absoluteUrl(localePath('/flowers', locale)),
    numberOfItems: bouquets.length,
    itemListElement: bouquets.map((b, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: b.name,
      url: absoluteUrl(localePath(`/flowers/${b.id}`, locale)),
    })),
  };
}

/**
 * One bouquet as a `Product` with an offer — what puts a price and a photo
 * next to it in a search result.
 *
 * The rose builder has no single price, only a cheapest one, so it is offered
 * as a range starting there rather than claiming a price nobody would pay.
 */
export function bouquetSchema(
  bouquet: Bouquet,
  copy: BouquetCopy,
  description: string,
  category: string,
  locale: Locale = DEFAULT_LOCALE
) {
  const url = absoluteUrl(localePath(`/flowers/${bouquet.id}`, locale));
  const photos = (bouquet.photos ?? []).filter(isPhotoUrl).map(absoluteUrl);
  const currency = bouquetCurrency(bouquet);
  const seller = { '@id': FLORIST_ID() };
  const availability = 'https://schema.org/InStock';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: copy.name,
    description,
    url,
    sku: bouquet.id,
    category,
    image: photos.length ? photos.slice(0, 8) : [absoluteUrl('/og-flowers.png')],
    brand: { '@type': 'Brand', name: FLOWERS_BRAND },
    offers: isBuilder(bouquet)
      ? {
          '@type': 'AggregateOffer',
          url,
          lowPrice: displayPrice(bouquet),
          priceCurrency: currency,
          offerCount: 1,
          availability,
          seller,
        }
      : {
          '@type': 'Offer',
          url,
          price: bouquet.price,
          priceCurrency: currency,
          itemCondition: 'https://schema.org/NewCondition',
          availability,
          seller,
        },
  };
}
