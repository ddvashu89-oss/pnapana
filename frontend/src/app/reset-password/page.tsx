'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Loader from '@/components/Loader';
import { getApiUrl } from '@/lib/api';
import styles from '../login/Login.module.css';

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(getApiUrl('reset_password.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirm_password: confirm })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setDone(true);
        // Any old session is already invalid server-side; clear the stale copy.
        localStorage.removeItem('user');
        setTimeout(() => router.push('/login'), 2500);
      } else {
        setError(data.message || 'Could not reset your password.');
      }
    } catch {
      setError('Failed to connect to the server.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.photoPanel}>
        <img src="https://images.unsplash.com/photo-1509223197845-458d87318791?w=1200&q=80" alt="" />
        <div className={styles.photoQuote}>
          <p>&quot;Growing a garden, one drop at a time.&quot;</p>
          <span>Pnapana Plant Care</span>
        </div>
      </div>

      <div className={styles.formPanel}>
        <Link href="/login" className={styles.backLink}>← Back to sign in</Link>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1>{done ? 'Password changed 🌿' : 'Choose a new password'}</h1>
            <p>
              {done
                ? 'Taking you to the sign-in page...'
                : 'This also signs you out everywhere else.'}
            </p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {!token && !done && (
            <div className={styles.error}>
              This link is missing its reset code. Request a new one from the
              {' '}<Link href="/forgot-password" style={{ color: 'inherit', textDecoration: 'underline' }}>forgot password</Link> page.
            </div>
          )}

          {token && !done && (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label>New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Confirm new password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Set new password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<Loader fullScreen label="Loading..." />}>
      <ResetPasswordInner />
    </Suspense>
  );
}
