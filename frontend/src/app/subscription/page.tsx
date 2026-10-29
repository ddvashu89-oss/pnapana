'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Loader from '@/components/Loader';
import { authFetch } from '@/lib/api';
import styles from './Subscription.module.css';

type Plan = {
  id: number;
  code: string;
  name: string;
  price_inr: number;
  billing_days: number;
  max_plants: number | null;
  ai_diagnosis: boolean;
  ai_chat: boolean;
  weather_care: boolean;
};

type Payment = {
  id: number;
  amount: number;
  reference: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  admin_note: string | null;
  submitted_at: string;
  plan_name: string;
};

type Data = {
  customer_id: string;
  current_plan: Plan & { expires_at?: string | null };
  plans: Plan[];
  payments: Payment[];
  plant_count: number;
  plant_limit: number | null;
  upi: { id: string; payee_name: string };
};

function planPerks(p: Plan) {
  return [
    p.max_plants === null ? 'Unlimited plants' : `Up to ${p.max_plants} plants`,
    'Plant identification',
    p.ai_diagnosis ? 'AI health diagnosis' : 'Basic care plans',
    p.ai_chat ? 'Context-aware plant chat' : 'Watering reminders',
    ...(p.weather_care ? ['Weather-based care'] : [])
  ];
}

export default function Subscription() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('user')) {
      router.push('/login');
      return;
    }
    load();
  }, [router]);

  // Release the preview object URL when it is replaced or the page unmounts.
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  function load() {
    setIsLoading(true);
    setError('');
    authFetch('get_subscription.php')
      .then(res => res.json())
      .then(d => {
        if (d.status === 'success') setData(d);
        else setError(d.message || 'Could not load your subscription.');
      })
      .catch(() => setError('Could not reach the server.'))
      .finally(() => setIsLoading(false));
  }

  function pickFile(f: File | null) {
    setFormError('');
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setFormError('Please choose a JPG, PNG, or WEBP image.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setFormError('That image is larger than 5 MB. Please choose a smaller one.');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent, plan: Plan) {
    e.preventDefault();
    if (!file) {
      setFormError('Attach a screenshot of your payment.');
      return;
    }
    setFormError('');
    setNotice('');
    setIsSubmitting(true);

    const body = new FormData();
    body.append('plan_id', String(plan.id));
    body.append('reference', reference.trim());
    body.append('screenshot', file);

    try {
      // Note: no Content-Type header — the browser must set the multipart boundary.
      const res = await authFetch('submit_payment.php', { method: 'POST', body });
      const d = await res.json();
      if (d.status === 'success') {
        setNotice(d.message);
        setFile(null);
        setReference('');
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        if (fileInput.current) fileInput.current.value = '';
        load();
      } else {
        setFormError(d.message || 'Could not submit your payment.');
      }
    } catch {
      setFormError('Could not reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <Loader fullScreen label="Loading your plan..." />;

  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <p>{error || 'Something went wrong.'}</p>
          <button className={styles.ghostBtn} onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  const premium = data.plans.find(p => p.price_inr > 0);
  const onPremium = data.current_plan.price_inr > 0;
  const pending = data.payments.find(p => p.status === 'PENDING');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>← Back to your garden</Link>
        <h1>Your plan</h1>
        <p className={styles.customerId}>Customer ID · {data.customer_id}</p>
      </header>

      <section className={styles.currentCard}>
        <div>
          <span className={styles.eyebrow}>Current plan</span>
          <h2>{data.current_plan.name}</h2>
          {onPremium && data.current_plan.expires_at && (
            <p className={styles.muted}>
              Renews on {new Date(data.current_plan.expires_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className={styles.usage}>
          <span className={styles.usageValue}>
            {data.plant_count}
            <span className={styles.usageLimit}>
              /{data.plant_limit === null ? '∞' : data.plant_limit}
            </span>
          </span>
          <span className={styles.eyebrow}>Plants</span>
        </div>
      </section>

      {notice && <div className={styles.success}>{notice}</div>}

      {pending && (
        <div className={styles.pendingBox}>
          <strong>Payment under review</strong>
          <p>
            We received your ₹{pending.amount} payment on{' '}
            {new Date(pending.submitted_at).toLocaleDateString()}. An admin will
            confirm it shortly — you&apos;ll move to Premium as soon as it&apos;s approved.
          </p>
        </div>
      )}

      {!onPremium && !pending && premium && (
        <>
          <section className={styles.planGrid}>
            {data.plans.map(plan => (
              <div
                key={plan.id}
                className={`${styles.planCard} ${plan.price_inr > 0 ? styles.planCardFeatured : ''}`}
              >
                <span className={styles.eyebrow}>{plan.name}</span>
                <div className={styles.price}>
                  ₹{plan.price_inr}
                  {plan.price_inr > 0 && <span className={styles.per}>/ month</span>}
                </div>
                <ul className={styles.perks}>
                  {planPerks(plan).map(perk => (
                    <li key={perk}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      {perk}
                    </li>
                  ))}
                </ul>
                {plan.code === data.current_plan.code && (
                  <span className={styles.currentTag}>Your plan</span>
                )}
              </div>
            ))}
          </section>

          <section className={styles.payCard}>
            <h2>Upgrade to {premium.name}</h2>

            <ol className={styles.steps}>
              <li>
                <span>Pay ₹{premium.price_inr} to this UPI ID</span>
                {data.upi.id ? (
                  <code className={styles.upi}>{data.upi.id}</code>
                ) : (
                  <em className={styles.warn}>
                    No UPI ID has been configured yet — please contact support before paying.
                  </em>
                )}
                {data.upi.id && <span className={styles.muted}>Payee: {data.upi.payee_name}</span>}
              </li>
              <li>Take a screenshot of the successful payment</li>
              <li>Upload it below — an admin verifies it manually</li>
            </ol>

            <form onSubmit={e => submit(e, premium)} className={styles.form}>
              <label className={styles.field}>
                <span>UPI transaction reference <em>(optional, speeds up review)</em></span>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="e.g. 431234567890"
                  maxLength={100}
                />
              </label>

              <label className={styles.field}>
                <span>Payment screenshot</span>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={e => pickFile(e.target.files?.[0] ?? null)}
                  required
                />
                <em className={styles.muted}>JPG, PNG, or WEBP · up to 5 MB</em>
              </label>

              {preview && (
                <div className={styles.previewWrap}>
                  <img src={preview} alt="Your payment screenshot" className={styles.preview} />
                </div>
              )}

              {formError && <div className={styles.formError}>{formError}</div>}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting || !data.upi.id}
              >
                {isSubmitting ? 'Submitting...' : `Submit payment of ₹${premium.price_inr}`}
              </button>
              <p className={styles.disclaimer}>
                Your screenshot is visible only to you and the admin reviewing it.
              </p>
            </form>
          </section>
        </>
      )}

      {data.payments.length > 0 && (
        <section className={styles.history}>
          <h2>Payment history</h2>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr><th>Date</th><th>Plan</th><th>Amount</th><th>Reference</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data.payments.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.submitted_at).toLocaleDateString()}</td>
                    <td>{p.plan_name}</td>
                    <td>₹{p.amount}</td>
                    <td className={styles.muted}>{p.reference || '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${styles['badge' + p.status]}`}>{p.status}</span>
                      {p.status === 'REJECTED' && p.admin_note && (
                        <div className={styles.rejectNote}>{p.admin_note}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
