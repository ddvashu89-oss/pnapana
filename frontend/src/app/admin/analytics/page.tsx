'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '@/components/Loader';
import { adminFetchJson } from '@/lib/adminApi';
import adminStyles from '../Admin.module.css';
import styles from './Analytics.module.css';
import TrendChart from './TrendChart';
import SpeciesBarChart from './SpeciesBarChart';

type Point = { date: string; value: number };
type Metric = { series: Point[]; total: number; delta_pct: number };
type Species = { species: string; c: number };

export default function AdminAnalytics() {
  const [metrics, setMetrics] = useState<Record<string, Metric> | null>(null);
  const [topSpecies, setTopSpecies] = useState<Species[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setIsLoading(true);
    setError('');
    adminFetchJson('admin_get_analytics.php')
      .then(data => {
        setMetrics(data.metrics);
        setTopSpecies(data.top_species);
      })
      .catch(err => setError(err.message || 'Failed to load analytics.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  return (
    <div>
      <div className={adminStyles.pageHeader}>
        <div>
          <h1 className={adminStyles.pageTitle}>Analytics</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Trends over the last 30 days.</p>
        </div>
      </div>

      {isLoading ? (
        <Loader label="Loading..." />
      ) : error ? (
        <div className={adminStyles.errorState}>
          <p className={adminStyles.errorMessage}>{error}</p>
          <button className={adminStyles.retryBtn} onClick={load}>Retry</button>
        </div>
      ) : metrics && (
        <>
          <div className={styles.grid}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <TrendChart title="New Users" series={metrics.users.series} total={metrics.users.total} deltaPct={metrics.users.delta_pct} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <TrendChart title="New Plants" series={metrics.plants.series} total={metrics.plants.total} deltaPct={metrics.plants.delta_pct} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
              <TrendChart title="Watering Activity" series={metrics.waterings.series} total={metrics.waterings.total} deltaPct={metrics.waterings.delta_pct} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
              <TrendChart title="Community Posts" series={metrics.posts.series} total={metrics.posts.total} deltaPct={metrics.posts.delta_pct} />
            </motion.div>
          </div>

          <motion.div
            className={adminStyles.tableContainer}
            style={{ marginTop: '2rem', padding: '2rem' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: '1.5rem' }}>Top Plant Species</h3>
            <SpeciesBarChart data={topSpecies} />
          </motion.div>
        </>
      )}
    </div>
  );
}
