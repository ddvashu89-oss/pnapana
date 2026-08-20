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

const emptyDraft = { name: '', email: '', password: '', is_admin: false };

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  function fetchUsers() {
    setIsLoading(true);
    setError('');
    adminFetchJson('admin_get_users.php')
      .then(data => setUsers(data.users))
      .catch(err => setError(err.message || 'Failed to load users.'))
      .finally(() => setIsLoading(false));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setActionError('');
    setNotice('');
    setIsSaving(true);
    try {
      const res = await adminFetch('admin_create_user.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setUsers(prev => [data.user, ...prev]);
        setDraft(emptyDraft);
        setShowForm(false);
        setNotice('Created ' + data.user.email + '.');
      } else {
        setActionError(data.message || 'Failed to create user.');
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to create user.');
    } finally {
      setIsSaving(false);
    }
  }

  async function patchUser(id: number, payload: Record<string, unknown>, successMsg: string) {
    setActionError('');
    setNotice('');
    setBusyId(id);
    try {
      const res = await adminFetch('admin_update_user.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setUsers(prev => prev.map(u => (u.id === id ? data.user : u)));
        setNotice(successMsg);
      } else {
        setActionError(data.message || 'Failed to update user.');
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to update user.');
    } finally {
      setBusyId(null);
    }
  }

  function handleToggleRole(user: User) {
    const next = !user.is_admin;
    const verb = next ? 'Promote' : 'Demote';
    const target = next ? 'to admin' : 'to a regular user';
    if (!confirm(verb + ' ' + user.email + ' ' + target + '?')) return;
    patchUser(
      user.id,
      { is_admin: next },
      user.email + ' is now ' + (next ? 'an admin' : 'a regular user') + '.'
    );
  }

  function handleResetPassword(user: User) {
    const pw = prompt('Set a new password for ' + user.email + ' (minimum 8 characters). This signs them out of any active session.');
    if (pw === null) return;
    if (pw.length < 8) {
      setActionError('Password must be at least 8 characters long.');
      return;
    }
    patchUser(user.id, { password: pw }, 'Password reset for ' + user.email + '.');
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this user and everything they own (plants, posts)? This cannot be undone.')) return;
    setActionError('');
    setNotice('');
    setBusyId(id);
    try {
      const res = await adminFetch('admin_delete_user.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setUsers(prev => prev.filter(u => u.id !== id));
        setNotice('User deleted.');
      } else {
        setActionError(data.message || 'Failed to delete user.');
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to delete user.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>User Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage accounts and access permissions.</p>
        </div>
        <button
          className={styles.retryBtn}
          onClick={() => { setShowForm(v => !v); setActionError(''); }}
        >
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
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

      {showForm && (
        <motion.div
          className={styles.settingsCard}
          style={{ marginBottom: '1.5rem' }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className={styles.settingsCardTitle}>Create a new account</h3>
          <form onSubmit={handleCreate}>
            <div className={styles.formGroup}>
              <label>Name</label>
              <input
                type="text"
                value={draft.name}
                onChange={e => setDraft({ ...draft, name: e.target.value })}
                required
                maxLength={100}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                value={draft.email}
                onChange={e => setDraft({ ...draft, email: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Password (minimum 8 characters)</label>
              <input
                type="password"
                value={draft.password}
                onChange={e => setDraft({ ...draft, password: e.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className={styles.settingRow}>
              <div>
                <h4>Grant admin access</h4>
                <p>Admins can manage every user, plant, post, and setting.</p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={draft.is_admin}
                  onChange={e => setDraft({ ...draft, is_admin: e.target.checked })}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
            <button type="submit" className={styles.retryBtn} disabled={isSaving} style={{ marginTop: '1rem' }}>
              {isSaving ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </motion.div>
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
                    className={styles.actionBtn}
                    title={user.is_admin ? 'Demote to regular user' : 'Promote to admin'}
                    disabled={busyId === user.id}
                    onClick={() => handleToggleRole(user)}
                  >
                    {user.is_admin ? '⬇️' : '⬆️'}
                  </button>
                  <button
                    className={styles.actionBtn}
                    title="Reset password"
                    disabled={busyId === user.id}
                    onClick={() => handleResetPassword(user)}
                  >
                    🔑
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    title="Delete User"
                    disabled={busyId === user.id}
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
