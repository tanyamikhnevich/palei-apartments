/**
 * Where the business already exists elsewhere.
 *
 * Two jobs from one list. A visitor gets somewhere to check we are real —
 * a profile with photos and reviews says more than any page we write about
 * ourselves. Google gets `sameAs`, which is how a domain nobody has linked to
 * yet is tied to accounts that have been around for years.
 *
 * Tracking parameters are stripped: the address is what the profile *is*, not
 * how one visitor happened to arrive at it.
 */
export const SOCIAL_LINKS = [
  {
    key: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/palei_apartaments/',
  },
  {
    key: 'airbnb',
    label: 'Airbnb',
    href: 'https://www.airbnb.ie/users/profile/1469388765487957446',
  },
] as const;

/** Just the addresses — what structured data asks for. */
export const SOCIAL_URLS: string[] = SOCIAL_LINKS.map((link) => link.href);
