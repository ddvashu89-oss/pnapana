'use client';
import { motion } from 'framer-motion';
import MarketingNav from '@/components/MarketingNav';
import styles from '../Landing.module.css';

export default function PrivacyPolicy() {
  return (
    <div className={styles.container}>
      {/* Navigation */}
      <MarketingNav />

      {/* Hero */}
      <header className={styles.hero} style={{ minHeight: '40vh', paddingBottom: '2rem', paddingTop: '6rem' }}>
        <div className={styles.heroPhoto}>
          <img src="https://images.unsplash.com/photo-1459156212016-c812468e2115?w=1600&q=80" alt="" />
        </div>
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className={styles.title} style={{ fontSize: '3.5rem' }}>Privacy <span className={styles.highlight}>Policy</span></h1>
          <p className={styles.subtitle} style={{ marginBottom: '1rem' }}>
            Last updated: August 14, 2026
          </p>
        </motion.div>
      </header>

      {/* Content */}
      <main style={{ padding: '0 5% 8rem', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--glass-bg)', padding: '4rem', borderRadius: '32px', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)', backdropFilter: 'var(--glass-blur)' }}>
          
          <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '1rem' }}>1. Introduction</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '2rem' }}>
            Welcome to Pnapana. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and use our application.
          </p>

          <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '1rem' }}>2. Data We Collect</h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '2rem' }}>
            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
            <ul style={{ paddingLeft: '1.5rem', marginTop: '1rem' }}>
              <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
              <li><strong>Contact Data</strong> includes email address.</li>
              <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location.</li>
              <li><strong>Usage Data</strong> includes information about how you use our website, app, and services (such as your plant logs and watering schedules).</li>
            </ul>
          </div>

          <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '1rem' }}>3. How We Use Your Data</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '2rem' }}>
            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data to provide you with the services you requested, such as sending you plant watering notifications and maintaining your digital garden.
          </p>

          <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '1rem' }}>4. Data Security</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '2rem' }}>
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed.
          </p>
        </div>
      </main>
    </div>
  );
}
