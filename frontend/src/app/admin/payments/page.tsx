'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '@/components/Loader';
import { adminFetch, adminFetchJson } from '@/lib/adminApi';
import { getApiUrl } from '@/lib/api';
import styles from '../Admin.module.css';

type Payment = {
  id: number;
  amount: number;
  reference: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  admin_note: string | null;
  submitted_at: string;
  verified_at: string | null;
  user_id: number;
  customer_id: string;
  user_name: string;
  user_email: string;
  plan_code: string;
  plan_name: string;
  verified_by_name: string | null;
};

type Summary = { pending: number; approved: number; rejected: number; revenue: number };

const STATUS_FILTERS = ['PENDING', 'APPROVED', 'REJECTED', ''] as const;

function statusClass(status: Payment['status']) {
  if (status === 'APPROVED') return styles.active;
  if (status === 'PENDING') return styles.warning;
  return styles.inactive;
}

export default function PaymentsManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary>({ pending: 0, approved: 0, rejected: 0, revenue: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofFor, setProofFor] = useState<Payment | null>(null);

  const fetchPayments = useCallback(() => {
    setIsLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());
    const qs = params.toString();
    adminFetchJson('admin_get_payments.php' + (qs ? `?${qs}` : ''))
      .then(data => {
        setPayments(data.payments);
        setSummary(data.summary);
      })
      .catch(err => setError(err.message || 'Failed to load payments.'))
      .finally(() => setIsLoading(false));
  }, [statusFilter, search]);

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // The screenshot endpoint requires a bearer token, so it cannot be used as a
  // plain <img src>. Fetch it as a blob and hand the object URL to the viewer.
  async function viewProof(payment: Payment) {
    setActionError('');
    setBusyId(payment.id);
    try {
      const res = await adminFetch(getApiUrl(`get_payment_screenshot.php?id=${payment.id}`));
      if (!res.ok) throw new Error('Could not load that screenshot.');
      const blob = await res.blob();
      if (proofUrl) URL.revokeObjectURL(proofUrl);
      setProofUrl(URL.createObjectURL(blob));
      setProofFor(payment);
    } catch (err: any) {
      setActionError(err.message || 'Could not load that screenshot.');
    } finally {
      setBusyId(null);
    }
  }

  function closeProof() {
    if (proofUrl) URL.revokeObjectURL(proofUrl);
    setProofUrl(null);
    setProofFor(null);
  }

  useEffect(() => {
    // Release the last blob when the page unmounts.
    return () => { if (proofUrl) URL.revokeObjectURL(proofUrl); };
  }, [proofUrl]);

  async function review(payment: Payment, decision: 'APPROVED' | 'REJECTED') {
    const verb = decision === 'APPROVED' ? 'Approve' : 'Reject';
    const note = prompt(
      `${verb} ${payment.plan_name} payment of Rs${payment.amount} from ${payment.customer_id}?\n\nOptional note for the record:`
    );
    if (note === null) return;

    setActionError('');
    setNotice('');
    setBusyId(payment.id);
    try {
      const res = await adminFetch('admin_review_payment.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payment.id, decision, note })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotice(data.message);
        closeProof();
        fetchPayments();
      } else {
        setActionError(data.message || 'Could not review the payment.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Could not review the payment.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Payments</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Verify UPI transfers and activate subscriptions.</p>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Pending Review</div>
          <div className={styles.metricValue}>{summary.pending}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Approved</div>
          <div className={styles.metricValue}>{summary.approved}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Rejected</div>
          <div className={styles.metricValue}>{summary.rejected}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Revenue</div>
          <div className={styles.metricValue}>₹{summary.revenue.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {actionError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
          {actionError}
        </div>
      )}
      {notice && (
        <div style={{ background: 'rgba(82, 191, 120, 0.12)', color: 'var(--accent-green)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
          {notice}
        </div>
      )}

      {proofFor && proofUrl && (
        <motion.div
          className={styles.settingsCard}
          style={{ marginBottom: '1.5rem' }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className={styles.settingsCardTitle}>
            Proof for {proofFor.customer_id} — ₹{proofFor.amount} {proofFor.plan_name}
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {proofFor.user_name} ({proofFor.user_email})
            {proofFor.reference ? ` · UPI ref ${proofFor.reference}` : ' · no reference supplied'}
          </p>
          <img
            src={proofUrl}
            alt="Payment screenshot"
            style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {proofFor.status === 'PENDING' && (
              <>
                <button className={styles.retryBtn} disabled={busyId === proofFor.id} onClick={() => review(proofFor, 'APPROVED')}>
                  ✓ Approve &amp; Activate
                </button>
                <button className={styles.retryBtn} disabled={busyId === proofFor.id} onClick={() => review(proofFor, 'REJECTED')}>
                  ✕ Reject
                </button>
              </>
            )}
            <button className={styles.retryBtn} onClick={closeProof}>Close</button>
          </div>
        </motion.div>
      )}

      <motion.div className={styles.tableContainer} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className={styles.tableHeader}>
          <h3>Payment Requests</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <form
              onSubmit={e => { e.preventDefault(); fetchPayments(); }}
              style={{ display: 'flex', gap: '0.5rem' }}
            >
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Customer ID, name, email, UPI ref"
                style={{
                  padding: '0.5rem 0.75rem', borderRadius: '8px', minWidth: '230px',
                  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-primary)'
                }}
              />
              <button type="submit" className={styles.retryBtn}>Search</button>
            </form>
            {STATUS_FILTERS.map(s => (
              <button
                key={s || 'ALL'}
                className={styles.retryBtn}
                style={{ opacity: statusFilter === s ? 1 : 0.55 }}
                onClick={() => setStatusFilter(s)}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>User</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>UPI Ref</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}><Loader size="sm" /></td></tr>
              ) : error ? (
                <tr><td colSpan={8} className={styles.errorState}>
                  <p className={styles.errorMessage}>{error}</p>
                  <button className={styles.retryBtn} onClick={fetchPayments}>Retry</button>
                </td></tr>
              ) : payments.map(p => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.customer_id}</td>
                  <td>
                    {p.user_name}
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{p.user_email}</div>
                  </td>
                  <td>{p.plan_name}</td>
                  <td style={{ fontWeight: 600 }}>₹{p.amount}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.reference || '—'}</td>
                  <td><span className={`${styles.badge} ${statusClass(p.status)}`}>{p.status}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{new Date(p.submitted_at).toLocaleString()}</td>
                  <td>
                    <button
                      className={styles.actionBtn}
                      title="View payment screenshot"
                      disabled={busyId === p.id}
                      onClick={() => viewProof(p)}
                    >
                      🧾
                    </button>
                    {p.status === 'PENDING' && (
                      <>
                        <button
                          className={styles.actionBtn}
                          title="Approve and activate subscription"
                          disabled={busyId === p.id}
                          onClick={() => review(p, 'APPROVED')}
                        >
                          ✅
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          title="Reject payment"
                          disabled={busyId === p.id}
                          onClick={() => review(p, 'REJECTED')}
                        >
                          ❌
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && !error && payments.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No payment requests{statusFilter ? ` with status ${statusFilter}` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
