/**
 * Response headers the site had none of.
 *
 * `frame-ancestors`/`X-Frame-Options` is the one that mattered most here: the
 * admin panel was framable, so a page could load it invisibly and collect
 * clicks from an owner who is already signed in.
 *
 * The script policy still allows inline scripts, because Next injects its own
 * hydration payload inline and a nonce-based policy needs the nonce threaded
 * through middleware into every render. It is a real weakening, and it is
 * written down rather than hidden: what the policy still buys is that injected
 * markup cannot pull a script in from somewhere else, which is how an XSS
 * usually turns into a data leak. Tightening this with a nonce is the next
 * step, not a finished job.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // Apartment photos live in Vercel Blob; the map draws OpenStreetMap tiles.
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self' https://*.tile.openstreetmap.org",
  "media-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Nothing here needs a camera, a microphone or a location.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  {
    // Only meaningful over HTTPS, which is everywhere but local development.
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The version of Next in use is not something a visitor needs to know.
  poweredByHeader: false,
  sassOptions: {
    includePaths: ['./src/styles'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Photos uploaded to Vercel Blob are served from a per-store subdomain.
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
