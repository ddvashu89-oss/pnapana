'use client';
import { useState } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';
import styles from '../login/Login.module.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSending(true);
    try {
      const res = await fetch(getApiUrl('request_password_reset.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.status === 'success') setSent(true);
      else setError(data.message || 'Something went wrong.');
    } catch {
      setError('Failed to connect to the server.');
    } finally {
      setIsSending(false);
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
            <h1>{sent ? 'Check your email 🌿' : 'Forgot your password?'}</h1>
            <p>
              {sent
                ? 'If an account exists for that address, a reset link is on its way. It expires in one hour.'
                : 'Enter your email and we will send you a link to choose a new password.'}
            </p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {!sent && (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={isSending}>
                {isSending ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          )}

          {sent && (
            <div className={styles.toggleText}>
              Didn&apos;t get it? Check spam, or
              <span className={styles.toggleLink} onClick={() => setSent(false)}>try again</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
