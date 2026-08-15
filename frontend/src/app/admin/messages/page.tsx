'use client';
import { Fragment, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '@/components/Loader';
import { adminFetch, adminFetchJson } from '@/lib/adminApi';
import styles from '../Admin.module.css';

type Message = {
  id: number;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  created_at: string;
};

export default function MessagesInbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setIsLoading(true);
    setError('');
    adminFetchJson('http://127.0.0.1/pnapana/backend/api/admin_get_messages.php')
      .then(data => setMessages(data.messages))
      .catch(err => setError(err.message || 'Failed to load messages.'))
      .finally(() => setIsLoading(false));
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this message?')) return;
    try {
      const res = await adminFetch('http://127.0.0.1/pnapana/backend/api/admin_delete_message.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMessages(prev => prev.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Messages</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Contact form submissions from your users.</p>
        </div>
      </div>

      <motion.div className={styles.tableContainer} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className={styles.tableHeader}>
          <h3>Inbox ({messages.length})</h3>
        </div>
        <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>From</th>
              <th>Category</th>
              <th>Subject</th>
              <th>Received</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}><Loader size="sm" /></td></tr>
            ) : error ? (
              <tr><td colSpan={5} className={styles.errorState}>
                <p className={styles.errorMessage}>{error}</p>
                <button className={styles.retryBtn} onClick={load}>Retry</button>
              </td></tr>
            ) : messages.map(msg => (
              <Fragment key={msg.id}>
                <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}>
                  <td style={{ fontWeight: 500 }}>{msg.name}<br /><span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.85rem' }}>{msg.email}</span></td>
                  <td><span className={styles.badge + ' ' + styles.inactive}>{msg.category}</span></td>
                  <td>{msg.subject || '(no subject)'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{new Date(msg.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      title="Delete Message"
                      onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
                {expandedId === msg.id && (
                  <tr>
                    <td colSpan={5} style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {msg.message}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!isLoading && !error && messages.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No messages yet.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </motion.div>
    </div>
  );
}
