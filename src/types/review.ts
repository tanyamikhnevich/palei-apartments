export type ReviewStatus = 'pending' | 'approved' | 'rejected';

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
  /** ISO timestamp of submission. */
  createdAt: string;
}
