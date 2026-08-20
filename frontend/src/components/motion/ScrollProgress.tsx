'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import styles from './ScrollProgress.module.css';

/**
 * Thin gradient bar pinned to the top of the viewport that tracks read progress.
 *
 * Deliberately still shown under prefers-reduced-motion: it only ever moves in
 * direct response to the visitor's own scrolling, which is the one kind of motion
 * that setting isn't trying to suppress. The spring only smooths the value.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });

  return <motion.div className={styles.bar} style={{ scaleX }} aria-hidden="true" />;
}
