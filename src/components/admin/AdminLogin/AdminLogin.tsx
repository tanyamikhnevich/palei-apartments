'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button/Button';
import styles from './AdminLogin.module.scss';

export default function AdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

      // The cookie is set by the response; the server has to re-evaluate the route.
      router.replace(searchParams.get('next') || '/admin');
      router.refresh();
    } catch {
      setError('Could not reach the server');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={submit}>
        <Image
          src="/palei-logo.png"
          alt="Palei Apartments"
          width={135}
          height={40}
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
