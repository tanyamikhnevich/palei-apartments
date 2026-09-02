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
 */
function safeNext(next: string | null): string {
  if (!next) return '/admin';
  if (!next.startsWith('/admin')) return '/admin';
  // `//host` and `/\host` are protocol-relative, not local paths.
  if (next.startsWith('//') || next.startsWith('/\\')) return '/admin';
  return next;
}

export default function AdminLogin() {
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
      .then((res) => {
        if (!res.ok) {
          setChecking(false);
          return;
        }
        router.replace(safeNext(searchParams.get('next')));
        router.refresh();
      })
      .catch(() => setChecking(false));
  }, [router, searchParams]);

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

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Could not sign in');
        return;
      }

      // The cookies are set by the response; the server has to re-evaluate the route.
      router.replace(safeNext(searchParams.get('next')));
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
          src={GROUP_BRAND.logo}
          alt={GROUP_BRAND.alt}
          width={200}
          height={210}
          className={styles.logo}
          priority
        />
        <h1 className={styles.title}>Admin panel</h1>
        <p className={styles.sub}>Sign in to manage apartments and bookings.</p>

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

        <Link href="/" className={styles.back}>
          Back to website
        </Link>
      </form>
    </div>
  );
}
