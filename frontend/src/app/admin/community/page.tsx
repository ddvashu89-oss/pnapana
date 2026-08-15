'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '@/components/Loader';
import { adminFetch, adminFetchJson } from '@/lib/adminApi';
import styles from '../Admin.module.css';

type Post = {
  id: number;
  caption: string;
  image_url: string | null;
  plant_name: string | null;
  likes_count: number;
  coins_earned: number;
  created_at: string;
  author_id: number;
  author_name: string;
  author_email: string;
};

export default function CommunityModeration() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  function load() {
    setIsLoading(true);
    setError('');
    adminFetchJson('http://127.0.0.1/pnapana/backend/api/admin_get_posts.php')
      .then(data => setPosts(data.posts))
      .catch(err => setError(err.message || 'Failed to load community posts.'))
      .finally(() => setIsLoading(false));
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this post from the community feed?')) return;
    try {
      const res = await adminFetch('http://127.0.0.1/pnapana/backend/api/admin_delete_post.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setPosts(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Community Moderation</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review and remove community posts.</p>
        </div>
      </div>

      <motion.div className={styles.tableContainer} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className={styles.tableHeader}>
          <h3>All Posts ({posts.length})</h3>
        </div>
        <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Author</th>
              <th>Caption</th>
              <th>Plant</th>
              <th>Likes</th>
              <th>Posted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}><Loader size="sm" /></td></tr>
            ) : error ? (
              <tr><td colSpan={6} className={styles.errorState}>
                <p className={styles.errorMessage}>{error}</p>
                <button className={styles.retryBtn} onClick={load}>Retry</button>
              </td></tr>
            ) : posts.map(post => (
              <tr key={post.id}>
                <td style={{ fontWeight: 500 }}>{post.author_name}<br /><span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.85rem' }}>{post.author_email}</span></td>
                <td style={{ maxWidth: '320px' }}>{post.caption}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{post.plant_name || '—'}</td>
                <td>❤️ {post.likes_count}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{new Date(post.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    title="Remove Post"
                    onClick={() => handleDelete(post.id)}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && !error && posts.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No community posts yet.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </motion.div>
    </div>
  );
}
