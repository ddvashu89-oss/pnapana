'use client';

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import styles from './TiltCard.module.css';

const SPRING = { stiffness: 260, damping: 24, mass: 0.6 };

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees at the card's corners. */
  max?: number;
  /** Render a soft highlight that follows the cursor. */
  glare?: boolean;
};

/**
 * Pointer-driven 3D tilt. The parent must set a `perspective` for the rotation to
 * read as depth rather than skew.
 *
 * Only genuine mouse input tilts the card — touch pointers are ignored so that
 * scrolling a finger across a card on a phone doesn't leave it stuck at an angle.
 */
export default function TiltCard({ children, className, max = 9, glare = true }: TiltCardProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Normalised pointer position within the card, 0..1 on each axis. Centre = 0.5.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), SPRING);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), SPRING);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse') return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width);
    py.set((event.clientY - rect.top) / rect.height);
  }

  function handleLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={`${styles.tilt} ${className ?? ''}`}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{ rotateX, rotateY }}
      whileHover={{ scale: 1.02 }}
      transition={{ scale: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
    >
      {children}
      {glare && (
        <motion.span
          className={styles.glare}
          aria-hidden="true"
          style={{ '--glare-x': glareX, '--glare-y': glareY } as unknown as CSSProperties}
        />
      )}
    </motion.div>
  );
}
