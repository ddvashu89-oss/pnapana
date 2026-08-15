'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '@/components/Loader';
import { adminFetchJson } from '@/lib/adminApi';
import styles from './Admin.module.css';

type Stats = {
  total_users: number;
  total_plants: number;
  thriving_plants: number;
  needs_water_plants: number;
  total_posts: number;
  open_messages: number;
  system_health: number;
};

type Activity = { type: string; message: string; created_at: string; status: string };

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setIsLoading(true);
    setError('');
    adminFetchJson('http://127.0.0.1/pnapana/backend/api/admin_get_stats.php')
      .then(data => {
        setStats(data.stats);
        setActivity(data.activity);
      })
      .catch(err => setError(err.message || 'Failed to load dashboard stats.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Real-time snapshot of the whole platform.</p>
        </div>
      </div>

      {isLoading ? (
        <Loader label="Loading..." />
      ) : error ? (
        <div className={styles.errorState}>
          <p className={styles.errorMessage}>{error}</p>
          <button className={styles.retryBtn} onClick={load}>Retry</button>
        </div>
      ) : stats && (
        <>
          <div className={styles.metricsGrid}>
            <motion.div className={styles.metricCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <div className={styles.metricLabel}>Total Users</div>
              <div className={styles.metricValue}>{stats.total_users}</div>
            </motion.div>

            <motion.div className={styles.metricCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <div className={styles.metricLabel}>Total Plants</div>
              <div className={styles.metricValue}>{stats.total_plants}</div>
            </motion.div>

            <motion.div className={styles.metricCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
              <div className={styles.metricLabel}>Collection Health</div>
              <div className={styles.metricValue} style={{ color: 'var(--accent-green)', background: 'none' }}>{stats.system_health}%</div>
            </motion.div>

            <motion.div className={styles.metricCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
              <div className={styles.metricLabel}>Community Posts</div>
              <div className={styles.metricValue}>{stats.total_posts}</div>
            </motion.div>

            <motion.div className={styles.metricCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
              <div className={styles.metricLabel}>Needs Water</div>
              <div className={styles.metricValue} style={{ color: 'var(--accent-orange)', background: 'none' }}>{stats.needs_water_plants}</div>
            </motion.div>

            <motion.div className={styles.metricCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
              <div className={styles.metricLabel}>Unread Messages</div>
              <div className={styles.metricValue}>{stats.open_messages}</div>
            </motion.div>
          </div>

          <motion.div className={styles.tableContainer} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}>
            <div className={styles.tableHeader}>
              <h3>Recent Activity</h3>
            </div>
            <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((a, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(a.created_at).toLocaleString()}</td>
                    <td>{a.type}</td>
                    <td>{a.message}</td>
                    <td><span className={`${styles.badge} ${a.status === 'Success' ? styles.active : styles.inactive}`}>{a.status}</span></td>
                  </tr>
                ))}
                {activity.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No recent activity.</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
