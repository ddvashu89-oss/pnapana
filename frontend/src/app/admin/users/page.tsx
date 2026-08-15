'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '@/components/Loader';
import { adminFetch, adminFetchJson } from '@/lib/adminApi';
import styles from '../Admin.module.css';

type User = {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  coins: number;
  plant_count: number;
  created_at: string;
};

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  function fetchUsers() {
    setIsLoading(true);
    setError('');
    adminFetchJson('http://127.0.0.1/pnapana/backend/api/admin_get_users.php')
      .then(data => setUsers(data.users))
      .catch(err => setError(err.message || 'Failed to load users.'))
      .finally(() => setIsLoading(false));
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this user and everything they own (plants, posts)? This cannot be undone.')) return;
    setActionError('');
    try {
      const res = await adminFetch('http://127.0.0.1/pnapana/backend/api/admin_delete_user.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setUsers(prev => prev.filter(u => u.id !== id));
      } else {
        setActionError(data.message || 'Failed to delete user.');
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to delete user.');
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>User Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage accounts and access permissions.</p>
        </div>
      </div>

      {actionError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
          {actionError}
        </div>
      )}

      <motion.div className={styles.tableContainer} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className={styles.tableHeader}>
          <h3>All Users</h3>
        </div>
        <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Plants</th>
              <th>Coins</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}><Loader size="sm" /></td></tr>
            ) : error ? (
              <tr><td colSpan={7} className={styles.errorState}>
                <p className={styles.errorMessage}>{error}</p>
                <button className={styles.retryBtn} onClick={fetchUsers}>Retry</button>
              </td></tr>
            ) : users.map(user => (
              <tr key={user.id}>
                <td style={{ fontWeight: 500 }}>{user.name}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                <td>
                  <span className={`${styles.badge} ${user.is_admin ? styles.active : styles.inactive}`}>
                    {user.is_admin ? 'Admin' : 'User'}
                  </span>
                </td>
                <td>{user.plant_count}</td>
                <td>🪙 {user.coins}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    title="Delete User"
                    onClick={() => handleDelete(user.id)}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && !error && users.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </motion.div>
    </div>
  );
}
