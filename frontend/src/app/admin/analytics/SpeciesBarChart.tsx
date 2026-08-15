'use client';
import styles from './Analytics.module.css';

type Species = { species: string; c: number };

export default function SpeciesBarChart({ data }: { data: Species[] }) {
  const maxVal = Math.max(...data.map(d => d.c), 1);

  return (
    <div className={styles.barList}>
      {data.map((d) => (
        <div key={d.species} className={styles.barRow}>
          <span className={styles.barLabel} title={d.species}>{d.species}</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${(d.c / maxVal) * 100}%` }} />
          </div>
          <span className={styles.barValue}>{d.c}</span>
        </div>
      ))}
      {data.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No plants yet.</p>
      )}
    </div>
  );
}
