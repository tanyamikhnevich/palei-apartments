'use client';

import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/Button/Button';
import { AdminInput } from '@/components/admin/ui/AdminField';
import {
  changeAdminPassword,
  fetchAdminAccount,
  revokeOtherAdminSessions,
  type AdminAccount as Account,
} from '@/lib/api/client';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  checkPasswordStrength,
  passwordProblemMessage,
} from '@/lib/auth/passwordRules';
import styles from './AdminAccount.module.scss';

function whenText(iso: string): string {
  const then = new Date(iso).getTime();
  const minutes = Math.round((Date.now() - then) / 60_000);

  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AdminAccount() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchAdminAccount()
      .then(setAccount)
      .catch(() => setAccount(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(null);

    if (next !== confirm) {
      setError('The two new passwords do not match.');
      return;
    }
    const problem = checkPasswordStrength(next);
    if (problem) {
      setError(passwordProblemMessage(problem));
      return;
    }

    setBusy(true);
    try {
      await changeAdminPassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone('Password changed. Every other device has been signed out.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change the password');
    } finally {
      setBusy(false);
    }
  };

  const signOutOthers = async () => {
    setError(null);
    setDone(null);
    setBusy(true);
    try {
      await revokeOtherAdminSessions();
      setDone('The other devices have been signed out.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign the other devices out');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className={styles.desc}>Loading account…</p>;

  if (!account) {
    return (
      <div className={styles.panel}>
        <h3>Account</h3>
        <p className={styles.desc}>
          Could not load the account. The database may be unreachable.
        </p>
      </div>
    );
  }

  const others = account.sessions.filter((s) => !s.current).length;

  return (
    <>
      <div className={styles.panel}>
        <h3>Account</h3>
        <p className={styles.desc}>
          Your login and password live in the database, not in the deployment settings.
        </p>

        <dl className={styles.identity}>
          <dt>Login</dt>
          <dd>{account.login}</dd>
        </dl>

        {error && <p className={`${styles.alert} ${styles.error}`}>{error}</p>}
        {done && <p className={`${styles.alert} ${styles.ok}`}>{done}</p>}

        <form className={styles.stack} onSubmit={submit}>
          <AdminInput
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <AdminInput
            label={`New password (at least ${PASSWORD_MIN_LENGTH} characters)`}
            type="password"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <AdminInput
            label="Repeat the new password"
            type="password"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <div className={styles.foot}>
            <p className={styles.note}>Changing it signs out every other device.</p>
            <Button
              variant="primary"
              icon="check"
              disabled={busy || !current || !next || !confirm}
            >
              {busy ? 'Saving…' : 'Change password'}
            </Button>
          </div>
        </form>
      </div>

      <div className={styles.panel}>
        <h3>Signed-in devices</h3>
        <p className={styles.desc}>
          Each browser that signed in and has not been signed out or expired.
        </p>

        <ul className={styles.sessions}>
          {account.sessions.map((s) => (
            <li key={s.familyId} className={styles.session}>
              <div className={styles.sessionMain}>
                <div className={styles.sessionLabel}>{s.label ?? 'Unknown device'}</div>
                <div className={styles.sessionMeta}>
                  Signed in {whenText(s.createdAt)} · last used {whenText(s.lastUsedAt)}
                </div>
              </div>
              {s.current && <span className={styles.badge}>This device</span>}
            </li>
          ))}
        </ul>

        <div className={styles.foot}>
          <p className={styles.note}>
            {others === 0
              ? 'No other devices are signed in.'
              : `${others} other ${others === 1 ? 'device is' : 'devices are'} signed in.`}
          </p>
          <Button variant="ghost" icon="x" onClick={signOutOthers} disabled={busy || others === 0}>
            Sign out other devices
          </Button>
        </div>
      </div>
    </>
  );
}
