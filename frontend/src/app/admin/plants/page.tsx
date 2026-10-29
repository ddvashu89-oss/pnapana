'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '@/components/Loader';
import { adminFetch, adminFetchJson } from '@/lib/adminApi';
import styles from '../Admin.module.css';

type Plant = {
  id: number;
  name: string;
  species: string;
  status: string;
  status_color: string;
  image_url: string;
  owner_id: number;
  owner_name: string;
  created_at: string;
};

export default function PlantsManagement() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  function load() {
    setIsLoading(true);
    setError('');
    adminFetchJson('admin_get_plants.php')
      .then(data => setPlants(data.plants))
      .catch(err => setError(err.message || 'Failed to load plants.'))
      .finally(() => setIsLoading(false));
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this plant from the collection?')) return;
    try {
      const res = await adminFetch('admin_delete_plant.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setPlants(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  const thrivingCount = plants.filter(p => p.status_color === 'green').length;
  const needsWaterCount = plants.length - thrivingCount;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Plant Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Browse and moderate every plant across the platform.</p>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <motion.div className={styles.metricCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <div className={styles.metricLabel}>Total Plants</div>
          <div className={styles.metricValue}>{plants.length}</div>
        </motion.div>
        <motion.div className={styles.metricCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className={styles.metricLabel}>Needs Water</div>
          <div className={styles.metricValue} style={{ color: 'var(--accent-orange)', background: 'none' }}>{needsWaterCount}</div>
        </motion.div>
        <motion.div className={styles.metricCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <div className={styles.metricLabel}>Thriving</div>
          <div className={styles.metricValue} style={{ color: 'var(--accent-green)', background: 'none' }}>{thrivingCount}</div>
        </motion.div>
      </div>

      <motion.div className={styles.tableContainer} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
        <div className={styles.tableHeader}>
          <h3>All Plants</h3>
        </div>
        <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Plant</th>
              <th>Species</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Added</th>
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
            ) : plants.map(plant => (
              <tr key={plant.id}>
                <td style={{ fontWeight: 500 }}>🌿 {plant.name}</td>
                <td style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{plant.species}</td>
                <td>{plant.owner_name}</td>
                <td>
                  <span className={`${styles.badge} ${plant.status_color === 'green' ? styles.active : styles.warning}`}>
                    {plant.status}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{new Date(plant.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    title="Remove Plant"
                    onClick={() => handleDelete(plant.id)}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && !error && plants.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No plants found.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </motion.div>
    </div>
  );
}
