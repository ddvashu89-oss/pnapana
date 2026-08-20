'use client';

import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';

type CountUpProps = {
  /** Final value to count to. */
  to: number;
  duration?: number;
  decimals?: number;
  className?: string;
};

/**
 * Counts from 0 up to `to` the first time it scrolls into view.
 *
 * The tween drives a MotionValue rather than React state, so the digits update on
 * the animation frame without re-rendering the component tree each tick.
 */
export default function CountUp({ to, duration = 2, decimals = 0, className }: CountUpProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  const count = useMotionValue(0);
  const text = useTransform(count, (value) =>
    value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );

  useEffect(() => {
    if (!inView) return;

    // Reduced motion still gets the number — it just arrives instead of ticking up.
    if (reduce) {
      count.set(to);
      return;
    }

    const controls = animate(count, to, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, to, duration, reduce, count]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}
