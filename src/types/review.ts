export type ReviewStatus = 'pending' | 'approved' | 'rejected';

/**
 * Where the review came from. `site` is the form on our own pages; anything
 * else was written on that platform and imported, and is labelled as such so a
 * reader knows we did not collect it ourselves.
 */
export type ReviewSource = 'site' | 'airbnb';

export interface Review {
  id: string;
  apartmentId: string;
  /** Public signature shown under the review. */
  guestName: string;
  /** Whole number 1–5. */
  rating: number;
  /** Optional free text — a review can be stars only. */
  text?: string;
  /** Optional phone number, never exposed publicly — admin moderation only. */
  contact?: string;
  status: ReviewStatus;
  source: ReviewSource;
  /** ISO timestamp of submission. */
  createdAt: string;
}
