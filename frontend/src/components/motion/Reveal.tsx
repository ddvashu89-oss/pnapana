'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Scroll-reveal primitives.
 *
 * These replace the hand-rolled IntersectionObserver + CSS class toggle that used
 * to live in the landing page. framer-motion's `whileInView` does the same job but
 * survives deep-links (an element scrolled past simply reveals when you scroll back
 * to it), so the old "if there's a hash, reveal everything immediately" workaround
 * is no longer needed.
 *
 * Every export degrades to a plain, fully-visible element when the visitor has
 * prefers-reduced-motion set.
 */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

function offsetFor(direction: Direction, distance: number) {
  switch (direction) {
    case 'up':
      return { y: distance };
    case 'down':
      return { y: -distance };
    case 'left':
      return { x: distance };
    case 'right':
      return { x: -distance };
    default:
      return {};
  }
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  direction?: Direction;
  distance?: number;
  delay?: number;
  duration?: number;
  /** Adds a blur-to-sharp pass. Costs more to composite — use on headlines, not lists. */
  blur?: boolean;
  /** Fraction of the element that must be visible before it reveals. */
  amount?: number;
};

export function Reveal({
  children,
  className,
  id,
  direction = 'up',
  distance = 40,
  delay = 0,
  duration = 0.9,
  blur = false,
  amount = 0.2,
}: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={className} id={id}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      id={id}
      initial={{ opacity: 0, ...offsetFor(direction, distance), ...(blur ? { filter: 'blur(10px)' } : {}) }}
      whileInView={{ opacity: 1, x: 0, y: 0, ...(blur ? { filter: 'blur(0px)' } : {}) }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
  /** Gap between each child's start, in seconds. */
  stagger?: number;
  delayChildren?: number;
  amount?: number;
};

/** Parent for a group of <StaggerItem> children that should cascade in. */
export function Stagger({
  children,
  className,
  stagger = 0.12,
  delayChildren = 0,
  amount = 0.2,
}: StaggerProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren } },
      }}
    >
      {children}
    </motion.div>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  className?: string;
  direction?: Direction;
  distance?: number;
  duration?: number;
};

export function StaggerItem({
  children,
  className,
  direction = 'up',
  distance = 36,
  duration = 0.8,
}: StaggerItemProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, ...offsetFor(direction, distance) },
        visible: { opacity: 1, x: 0, y: 0, transition: { duration, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}
