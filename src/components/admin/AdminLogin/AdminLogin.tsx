'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button/Button';
import { GROUP_BRAND } from '@/lib/services';
import styles from './AdminLogin.module.scss';

/**
 * Where to land after signing in. Only a path back into the panel is honoured —
 * `?next=https://elsewhere` would turn the login screen into an open redirect.
 *
 * `home` is the fallback, and the server picks it from the account's role: a
 * florist who signs in here goes to the shop, not to a dashboard that would
 * only bounce them back.
 */
function safeNext(next: string | null, home: string): string {
  if (!next) return home;
  if (!next.startsWith('/admin')) return home;
  // `//host` and `/\host` are protocol-relative, not local paths.
  if (next.startsWith('//') || next.startsWith('/\\')) return home;
  return next;
}

interface AdminLoginProps {
  /**
   * Where to go when the URL does not say — and, until the server answers,
   * which panel this screen is the door to.
   */
  home?: string;
  title?: string;
  sub?: string;
  /**
   * The mark above the form. Width and height travel with it because the logos
   * are not the same shape — the group's is taller than it is wide, the shop's
   * is square — and one ratio applied to both squashes whichever it was not
   * measured from.
   */
  logo?: { src: string; alt: string; width: number; height: number };
  /** Where "back" goes. A florist should land in the shop, not on the group. */
  back?: { href: string; label: string };
}

const GROUP_LOGO = { src: GROUP_BRAND.logo, alt: GROUP_BRAND.alt, width: 200, height: 210 };

export default function AdminLogin({
  home = '/admin',
  title = 'Admin panel',
  sub = 'Sign in to manage apartments and bookings.',
  logo = GROUP_LOGO,
  back = { href: '/', label: 'Back to website' },
}: AdminLoginProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Held until the silent renewal below has had its turn. */
  const [checking, setChecking] = useState(true);
  const tried = useRef(false);

  /**
   * Landing here after an access token quietly expired is the common case, not
   * a sign-out: the refresh token in the cookie is usually still good. Spend it
   * before showing the form, and most of the time the panel simply reappears.
   */
  useEffect(() => {
    if (tried.current) return;
    tried.current = true;

    fetch('/api/admin/session/refresh', { method: 'POST', cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          setChecking(false);
          return;
        }
        // The renewed session says which panel it belongs to; trust that over
        // the screen the browser happened to be looking at.
        const data = (await res.json().catch(() => ({}))) as { home?: string };
        router.replace(safeNext(searchParams.get('next'), data.home ?? home));
        router.refresh();
      })
      .catch(() => setChecking(false));
  }, [router, searchParams, home]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; home?: string };

      if (!res.ok) {
        setError(data.error ?? 'Could not sign in');
        return;
      }

      // The cookies are set by the response; the server has to re-evaluate the route.
      router.replace(safeNext(searchParams.get('next'), data.home ?? home));
      router.refresh();
    } catch {
      setError('Could not reach the server');
    } finally {
      setBusy(false);
    }
  };

  if (checking) return <div className={styles.screen} aria-busy="true" />;

  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={submit}>
        <Image
          src={logo.src}
          alt={logo.alt}
          width={logo.width}
          height={logo.height}
          className={styles.logo}
          priority
        />
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.sub}>{sub}</p>

        {error && <p className={styles.alert}>{error}</p>}

        <label className={styles.field}>
          <span>Login</span>
          <input
            className="input"
            value={login}
            autoComplete="username"
            autoFocus
            onChange={(e) => setLogin(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Password</span>
          <input
            className="input"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <Button variant="primary" block disabled={busy || !login || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>

        <Link href={back.href} className={styles.back}>
          {back.label}
        </Link>
      </form>
    </div>
  );
}
