/**
 * A brake on password guessing.
 *
 * It lives in the process, so a serverless deployment gets one counter per warm
 * instance rather than one globally. That is weaker than a shared store, and
 * deliberately so: the alternative is a database write on every sign-in
 * attempt, which is itself a way to hammer the database. Guessing a real
 * password through this is still hopeless.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const MAX_TRACKED = 1000;

type Entry = { count: number; resetAt: number };

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
}

function createThrottle(max: number, windowMs: number) {
  const entries = new Map<string, Entry>();

  const sweep = (now: number) => {
    if (entries.size <= MAX_TRACKED) return;
    for (const [key, entry] of entries) if (entry.resetAt < now) entries.delete(key);
  };

  return {
    check(request: Request): { allowed: boolean; retryAfterSeconds: number } {
      const entry = entries.get(clientKey(request));
      const now = Date.now();
      if (!entry || entry.resetAt < now || entry.count < max) {
        return { allowed: true, retryAfterSeconds: 0 };
      }
      return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
    },

    fail(request: Request): void {
      const key = clientKey(request);
      const now = Date.now();
      const entry = entries.get(key);

      if (!entry || entry.resetAt < now) {
        entries.set(key, { count: 1, resetAt: now + windowMs });
      } else {
        entry.count += 1;
      }
      sweep(now);
    },

    succeed(request: Request): void {
      entries.delete(clientKey(request));
    },
  };
}

/** Sign-in attempts. */
export const throttle = createThrottle(MAX_ATTEMPTS, WINDOW_MS);

/** Password changes — the old password is guessable the same way. */
export const passwordChangeThrottle = createThrottle(5, WINDOW_MS);
