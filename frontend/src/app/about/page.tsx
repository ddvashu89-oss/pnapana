'use client';
import { motion } from 'framer-motion';
import MarketingNav from '@/components/MarketingNav';
import styles from '../Landing.module.css';

export default function About() {
  return (
    <div className={styles.container}>
      {/* Navigation */}
      <MarketingNav />

      {/* Hero */}
      <header className={styles.hero} style={{ minHeight: '50vh', paddingBottom: '4rem' }}>
        <div className={styles.heroPhoto}>
          <img src="https://images.unsplash.com/photo-1525033842647-a956848705f0?w=1600&q=80" alt="" />
        </div>
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className={styles.title} style={{ fontSize: '4.5rem' }}>Our <span className={styles.highlight}>Story</span></h1>
          <p className={styles.subtitle}>
            We believe that anyone can be a plant parent with the right tools.
          </p>
        </motion.div>
        
        {/* Decorative elements */}
        <div className={styles.blob1} style={{ top: '-30%', opacity: 0.2 }} />
      </header>

      {/* Content */}
      <main style={{ padding: '0 5% 8rem', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--glass-bg)', padding: '4rem', borderRadius: '32px', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)', backdropFilter: 'var(--glass-blur)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '2rem' }}>
            Pnapana started as a simple idea: what if you could have a pocket botanist that tells you exactly when to water, how much light to give, and what&apos;s wrong with your yellowing leaves?
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '2rem' }}>
            Today, we are building the ultimate premium platform for plant care. Our AI-driven diagnostic tools, hyper-local weather tracking, and community-driven explore feed are all designed to give you confidence in your indoor jungle.
          </p>
          <p style={{ color: 'var(--text-primary)', fontSize: '1.4rem', fontWeight: 600, fontStyle: 'italic', fontFamily: 'var(--font-serif)', textAlign: 'center', marginTop: '3rem' }}>
            Whether you have a single resilient Pothos or a sprawling greenhouse, Pnapana is here to help you grow.
          </p>
        </div>
      </main>
    </div>
  );
}
