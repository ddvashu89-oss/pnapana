'use client';
import { useState } from 'react';
import styles from './Analytics.module.css';

type Point = { date: string; value: number };

const W = 600;
const H = 160;
const PAD_X = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

function formatDate(d: string) {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TrendChart({
  title,
  series,
  total,
  deltaPct
}: {
  title: string;
  series: Point[];
  total: number;
  deltaPct: number;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const values = series.map(p => p.value);
  const maxVal = Math.max(...values, 1);
  const yMax = maxVal * 1.2;

  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const xAt = (i: number) => PAD_X + (i / (series.length - 1)) * plotW;
  const yAt = (v: number) => PAD_TOP + plotH - (v / yMax) * plotH;

  const linePath = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)},${yAt(p.value)}`).join(' ');
  const areaPath = `${linePath} L ${xAt(series.length - 1)},${PAD_TOP + plotH} L ${xAt(0)},${PAD_TOP + plotH} Z`;

  const gridLines = [0, 0.5, 1].map(f => PAD_TOP + plotH * f);

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(relX * (series.length - 1));
    setHoverIndex(Math.max(0, Math.min(series.length - 1, idx)));
  };

  const hovered = hoverIndex !== null ? series[hoverIndex] : null;
  const isUp = deltaPct >= 0;

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h4>{title}</h4>
        <div className={styles.chartStat}>
          <span className={styles.chartValue}>{total.toLocaleString()}</span>
          <span className={`${styles.chartDelta} ${isUp ? styles.deltaUp : styles.deltaDown}`}>
            {isUp ? '▲' : '▼'} {Math.abs(deltaPct)}%
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chartSvg} preserveAspectRatio="none">
        {gridLines.map((y, i) => (
          <line key={i} x1={PAD_X} y1={y} x2={W - PAD_X} y2={y} className={styles.gridLine} />
        ))}

        <path d={areaPath} className={styles.areaFill} />
        <path d={linePath} className={styles.trendLine} />

        {hovered && (
          <>
            <line
              x1={xAt(hoverIndex!)} y1={PAD_TOP}
              x2={xAt(hoverIndex!)} y2={PAD_TOP + plotH}
              className={styles.crosshair}
            />
            <circle cx={xAt(hoverIndex!)} cy={yAt(hovered.value)} r="5" className={styles.hoverDot} />
          </>
        )}

        {/* end marker + label, always visible so the headline value isn't hover-gated */}
        <circle
          cx={xAt(series.length - 1)}
          cy={yAt(series[series.length - 1].value)}
          r="4"
          className={styles.endDot}
        />

        {/* invisible hit layer for hover */}
        <rect
          x={0} y={0} width={W} height={H}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        />

        {hovered && (
          <g transform={`translate(${Math.min(Math.max(xAt(hoverIndex!), 55), W - 55)}, ${PAD_TOP + 4})`}>
            <rect x={-45} y={0} width={90} height={34} rx={8} className={styles.tooltipBox} />
            <text x={0} y={14} textAnchor="middle" className={styles.tooltipValue}>{hovered.value}</text>
            <text x={0} y={27} textAnchor="middle" className={styles.tooltipDate}>{formatDate(hovered.date)}</text>
          </g>
        )}
      </svg>
    </div>
  );
}
