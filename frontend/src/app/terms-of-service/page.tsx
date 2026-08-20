'use client';
import { motion } from 'framer-motion';
import MarketingNav from '@/components/MarketingNav';
import styles from '../Landing.module.css';

export default function TermsOfService() {
  return (
    <div className={styles.container}>
      {/* Navigation */}
      <MarketingNav />

      {/* Hero */}
      <header className={styles.hero} style={{ minHeight: '40vh', paddingBottom: '2rem', paddingTop: '6rem' }}>
        <div className={styles.heroPhoto}>
          <img src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&q=80" alt="" />
        </div>
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className={styles.title} style={{ fontSize: '3.5rem' }}>Terms of <span className={styles.highlight}>Service</span></h1>
          <p className={styles.subtitle} style={{ marginBottom: '1rem' }}>
            Last updated: August 14, 2026
          </p>
        </motion.div>
      </header>

      {/* Content */}
      <main style={{ padding: '0 5% 8rem', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--glass-bg)', padding: '4rem', borderRadius: '32px', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)', backdropFilter: 'var(--glass-blur)' }}>
          
          <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '1rem' }}>1. Agreement to Terms</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '2rem' }}>
            By accessing or using Pnapana, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
          </p>

          <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '1rem' }}>2. Use License</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '2rem' }}>
            Permission is granted to temporarily download one copy of the materials (information or software) on Pnapana&apos;s website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
          </p>

          <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '1rem' }}>3. User Accounts</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '2rem' }}>
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
          </p>

          <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '1rem' }}>4. Disclaimer</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '2rem' }}>
            The materials on Pnapana&apos;s website are provided on an &lsquo;as is&rsquo; basis. Pnapana makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights. We do not guarantee your plants will survive, although we try our best to help!
          </p>
        </div>
      </main>
    </div>
  );
}
