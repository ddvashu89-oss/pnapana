'use client';
import styles from './Loader.module.css';

type LoaderProps = {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  fullScreen?: boolean;
};

const DIMENSIONS: Record<NonNullable<LoaderProps['size']>, number> = {
  sm: 24,
  md: 44,
  lg: 64,
};

export default function Loader({ size = 'md', label, fullScreen = false }: LoaderProps) {
  const dimension = DIMENSIONS[size];

  const content = (
    <div className={styles.wrap}>
      <div
        className={styles.ring}
        style={{ width: dimension, height: dimension, borderWidth: Math.max(3, dimension / 12) }}
      >
        <span className={styles.sprout} style={{ fontSize: dimension * 0.45 }}>🌱</span>
      </div>
      {label && <p className={styles.label}>{label}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className={styles.fullScreen}>{content}</div>;
  }

  return content;
}
