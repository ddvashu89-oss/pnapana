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
type ProductMetrics = { scan_attempts_30d: number; scan_success_rate: number; setup_completion_rate: number; inactive_users_30d: number; journal_entries_30d: number; open_disease_followups: number; pending_deletions: number; estimated_ai_cost_usd_30d: number; identification_confirmations_30d: number; identification_correction_rate: number; multi_angle_scan_rate: number };
type AiUsage = { operation: string; provider: string; requests: number; successes: number; estimated_cost_usd: number };

export default function AdminAnalytics() {
  const [metrics, setMetrics] = useState<Record<string, Metric> | null>(null);
  const [topSpecies, setTopSpecies] = useState<Species[]>([]);
  const [product, setProduct] = useState<ProductMetrics | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setIsLoading(true);
    setError('');
    adminFetchJson('admin_get_analytics.php')
      .then(data => {
        setMetrics(data.metrics);
        setTopSpecies(data.top_species);
        setProduct(data.product_metrics);
        setAiUsage(data.ai_usage || []);
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
          {product && <section className={styles.kpiGrid} aria-label="Product health metrics">
            <Kpi label="Scan success" value={`${product.scan_success_rate}%`} detail={`${product.scan_attempts_30d} attempts in 30 days`} />
            <Kpi label="Setup completion" value={`${product.setup_completion_rate}%`} detail="Plants with compulsory setup" />
            <Kpi label="Inactive users" value={product.inactive_users_30d} detail="No activity for 30 days" />
            <Kpi label="AI cost" value={`$${Number(product.estimated_ai_cost_usd_30d).toFixed(4)}`} detail="Estimated last 30 days" />
            <Kpi label="ID correction rate" value={`${product.identification_correction_rate}%`} detail={`${product.identification_confirmations_30d} confirmed scans`} />
            <Kpi label="Multi-angle scans" value={`${product.multi_angle_scan_rate}%`} detail="Scans with 3 or more photos" />
            <Kpi label="Journal updates" value={product.journal_entries_30d} detail="Last 30 days" />
            <Kpi label="Open recoveries" value={product.open_disease_followups} detail="Disease follow-ups" />
            <Kpi label="Pending deletions" value={product.pending_deletions} detail="30-day recovery window" />
          </section>}
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
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.4rem', marginBottom: '1.5rem' }}>Top Plant Species</h3>
            <SpeciesBarChart data={topSpecies} />
          </motion.div>

          <motion.div className={adminStyles.tableContainer} style={{ marginTop: '2rem', padding: '2rem' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.4rem', marginBottom: '1.5rem' }}>AI usage & estimated cost</h3>
            {!aiUsage.length ? <p style={{ color: 'var(--text-secondary)' }}>No tracked AI requests yet. Add provider cost values to the server environment to calculate spend.</p> : <div className={styles.usageTable}><div className={styles.usageHead}><span>Operation</span><span>Provider</span><span>Success</span><span>Requests</span><span>Cost</span></div>{aiUsage.map(row => <div key={`${row.operation}-${row.provider}`}><span>{row.operation}</span><span>{row.provider}</span><span>{row.requests ? Math.round(row.successes * 100 / row.requests) : 0}%</span><span>{row.requests}</span><span>${Number(row.estimated_cost_usd).toFixed(4)}</span></div>)}</div>}
          </motion.div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <article className={styles.kpi}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}
