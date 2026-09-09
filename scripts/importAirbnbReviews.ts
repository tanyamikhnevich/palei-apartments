/**
 * Pull the public reviews off an Airbnb listing and file them under the
 * matching apartment.
 *
 *   npx tsx scripts/importAirbnbReviews.ts                     # every mapped listing
 *   npx tsx scripts/importAirbnbReviews.ts sadeh-three-room-deluxe
 *   npx tsx scripts/importAirbnbReviews.ts --dry-run
 *
 * Airbnb has already moderated everything it publishes, so the rows land as
 * `approved` and appear on the site straight away. Each row carries the Airbnb
 * review id, so a second run updates what is there instead of duplicating it.
 *
 * Guests write in their own language and that is how the review is stored —
 * the site shows it as written, the same as Airbnb does.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config();
import { and, eq, notInArray } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { recomputeApartmentRating } from '@/db/reviewsAggregate';

/**
 * Which Airbnb listing belongs to which apartment. The number is the `/rooms/…`
 * segment of the listing URL; the string is the apartment id (its slug).
 */
export const AIRBNB_LISTINGS: Record<string, string> = {
  '37206950': 'sadeh-three-room-deluxe',
  '42045059': 'sadeh-golden-balcony',
  '644232953185993653': 'kukis-sunny-suite',
  '909106956451584224': 'independence-magenta-studio',
  '925866300518144234': 'independence-blue-suite',
  '927466238566441319': 'boulevard-suite-109',
  '1144186820349301132': 'boulevard-nightfall-216',
  '1218220982557748220': 'boulevard-bright-219',
  '1420962964855689473': 'sunset-sea-view-101',
  '1492187357424500085': 'sky26-pool-penthouse',
};

/**
 * The reviews are not in the listing HTML — they come from a persisted GraphQL
 * query, and Airbnb rotates its hash every few months. When this starts coming
 * back empty: open a listing, press "Show all N reviews", and copy the
 * `sha256Hash` out of the StaysPdpReviewsQuery request in the network tab.
 */
const REVIEWS_QUERY_HASH =
  'cfdc3ffbe997a618795fc5a8f9a9b484054ce9be68c8788cd2ffda999934c5ae';
/** Airbnb's public web key — the same one their own site sends. */
const AIRBNB_API_KEY = 'd306zoyjsyarp7ifhu67rjxn52tv0t20';
const PAGE_SIZE = 50;

interface AirbnbReview {
  id: string;
  comments: string | null;
  rating: number;
  createdAt: string;
  language: string | null;
  reviewer: { firstName: string | null; deleted: boolean } | null;
}

function reviewsUrl(listingId: string, offset: number): string {
  const variables = {
    id: Buffer.from(`StayListing:${listingId}`).toString('base64'),
    pdpReviewsRequest: {
      fieldSelector: 'for_p3_translation_only',
      forPreview: false,
      limit: PAGE_SIZE,
      offset: String(offset),
      showingTranslationButton: false,
      first: PAGE_SIZE,
      sortingPreference: 'BEST_QUALITY',
      numberOfAdults: '1',
      numberOfChildren: '0',
      numberOfInfants: '0',
      numberOfPets: 0,
      amenityFilters: null,
    },
  };
  const params = new URLSearchParams({
    operationName: 'StaysPdpReviewsQuery',
    locale: 'en',
    currency: 'EUR',
    variables: JSON.stringify(variables),
    extensions: JSON.stringify({
      persistedQuery: { version: 1, sha256Hash: REVIEWS_QUERY_HASH },
    }),
  });
  return `https://www.airbnb.ie/api/v3/StaysPdpReviewsQuery/${REVIEWS_QUERY_HASH}?${params}`;
}

async function fetchReviews(listingId: string): Promise<AirbnbReview[]> {
  const all: AirbnbReview[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const res = await fetch(reviewsUrl(listingId, offset), {
      headers: {
        'X-Airbnb-API-Key': AIRBNB_API_KEY,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Airbnb answered ${res.status} for listing ${listingId}`);
    }
    const body = (await res.json()) as {
      data?: { presentation?: { stayProductDetailPage?: { reviews?: { reviews?: AirbnbReview[] } } } };
    };
    const page = body.data?.presentation?.stayProductDetailPage?.reviews?.reviews;
    if (!page) {
      throw new Error(
        `No reviews in the answer for listing ${listingId} — the query hash has probably rotated.`
      );
    }
    all.push(...page);
    if (page.length < PAGE_SIZE) return all;
  }
}

/** Airbnb keeps line breaks as literal `<br/>`; the site renders plain text. */
function plainText(comments: string | null): string | null {
  if (!comments) return null;
  const text = comments
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
}

function guestName(review: AirbnbReview): string {
  const name = review.reviewer?.deleted ? null : review.reviewer?.firstName?.trim();
  return name || 'Airbnb guest';
}

async function importListing(
  db: ReturnType<typeof getDb>,
  listingId: string,
  apartmentId: string,
  dryRun: boolean
): Promise<void> {
  const [apartment] = await db
    .select({ id: schema.apartments.id })
    .from(schema.apartments)
    .where(eq(schema.apartments.id, apartmentId))
    .limit(1);
  if (!apartment) {
    console.warn(`  skipped: no apartment "${apartmentId}" in the database`);
    return;
  }

  const reviews = await fetchReviews(listingId);
  console.log(`  ${reviews.length} reviews on Airbnb`);

  for (const review of reviews) {
    const row = {
      id: `airbnb-${review.id}`,
      apartmentId,
      guestName: guestName(review),
      rating: review.rating,
      text: plainText(review.comments),
      contact: null,
      status: 'approved' as const,
      source: 'airbnb' as const,
      createdAt: new Date(review.createdAt),
      updatedAt: new Date(),
    };
    if (dryRun) {
      console.log(
        `  · ${row.createdAt.toISOString().slice(0, 10)} ${row.guestName} ${row.rating}★ ${
          row.text?.slice(0, 60) ?? '(stars only)'
        }`
      );
      continue;
    }
    await db
      .insert(schema.reviews)
      .values(row)
      .onConflictDoUpdate({
        target: schema.reviews.id,
        set: {
          apartmentId: row.apartmentId,
          guestName: row.guestName,
          rating: row.rating,
          text: row.text,
          status: row.status,
          source: row.source,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
  }

  if (!dryRun) {
    // A review pulled from Airbnb — or filed here against the wrong flat — has
    // no other way out of the table, so the listing stays the authority: what
    // it no longer shows stops being ours to show either.
    const keep = reviews.map((review) => `airbnb-${review.id}`);
    const stale = await db
      .delete(schema.reviews)
      .where(
        and(
          eq(schema.reviews.apartmentId, apartmentId),
          eq(schema.reviews.source, 'airbnb'),
          keep.length ? notInArray(schema.reviews.id, keep) : undefined
        )
      )
      .returning({ id: schema.reviews.id });
    if (stale.length) console.log(`  removed ${stale.length} no longer on the listing`);

    await recomputeApartmentRating(db, apartmentId);
    const [after] = await db
      .select({ rating: schema.apartments.rating, reviews: schema.apartments.reviews })
      .from(schema.apartments)
      .where(eq(schema.apartments.id, apartmentId))
      .limit(1);
    console.log(`  stored — apartment now ${after?.rating} from ${after?.reviews} reviews`);
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));

  const entries = Object.entries(AIRBNB_LISTINGS).filter(
    ([listingId, apartmentId]) =>
      !wanted.length || wanted.includes(listingId) || wanted.includes(apartmentId)
  );
  if (!entries.length) {
    console.error(`Nothing matches ${wanted.join(', ')} in AIRBNB_LISTINGS.`);
    process.exitCode = 1;
    return;
  }

  const db = getDb();
  for (const [listingId, apartmentId] of entries) {
    console.log(`${apartmentId} ← airbnb.com/rooms/${listingId}${dryRun ? ' (dry run)' : ''}`);
    await importListing(db, listingId, apartmentId, dryRun);
  }
}

void main();
