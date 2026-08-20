'use client';

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import styles from './VelocityMarquee.module.css';

/** Wraps a value into the [min, max) range, staying correct for negative input. */
function wrap(min: number, max: number, value: number) {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

type VelocityMarqueeProps = {
  children: ReactNode;
  /** Idle drift in % of a single copy per second. Negative drifts left. */
  baseVelocity?: number;
  className?: string;
};

/**
 * A marquee whose speed is coupled to scroll velocity — scrolling down drives it
 * faster, scrolling up drags it the other way, and it settles back to a slow drift
 * when the page is still.
 *
 * `children` is rendered twice so the strip can wrap seamlessly; the duplicate is
 * hidden from assistive tech so the testimonials aren't announced twice.
 *
 * Under prefers-reduced-motion nothing animates at all: it becomes an ordinary
 * horizontally-scrollable row with a single copy of the content.
 */
export default function VelocityMarquee({
  children,
  baseVelocity = -2.2,
  className,
}: VelocityMarqueeProps) {
  const reduce = useReducedMotion();

  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  // clamp:false lets fast flicks push past the mapped range for a real sense of throw.
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 4], { clamp: false });

  // Each copy is 50% of the track, so wrapping over [-50, 0] is one full cycle.
  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`);

  const directionFactor = useRef(1);
  const isPaused = useRef(false);

  useAnimationFrame((_, delta) => {
    if (reduce || isPaused.current) return;

    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

    // Flip travel direction to match the direction the visitor is scrolling.
    if (velocityFactor.get() < 0) {
      directionFactor.current = -1;
    } else if (velocityFactor.get() > 0) {
      directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  if (reduce) {
    return (
      <div className={`${styles.viewport} ${styles.scrollable} ${className ?? ''}`}>
        <div className={styles.group}>{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.viewport} ${className ?? ''}`}
      onPointerEnter={() => {
        isPaused.current = true;
      }}
      onPointerLeave={() => {
        isPaused.current = false;
      }}
    >
      <motion.div className={styles.track} style={{ x }}>
        <div className={styles.group}>{children}</div>
        <div className={styles.group} aria-hidden="true">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
