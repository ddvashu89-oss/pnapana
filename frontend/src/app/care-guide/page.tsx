'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import MarketingNav from '@/components/MarketingNav';
import styles from '../Landing.module.css';

const TOPICS = [
  {
    icon: '💧',
    title: 'Watering',
    text: "Most houseplants prefer to dry out between waterings. Check the top 2-3cm of soil with a finger — if it's dry, it's time to water. Overwatering, not underwatering, is the most common way plants are lost."
  },
  {
    icon: '☀️',
    title: 'Light',
    text: "Bright indirect light suits the majority of popular houseplants — near a window but out of direct midday sun. Yellowing leaves often mean too much light; leggy, sparse growth usually means too little."
  },
  {
    icon: '💦',
    title: 'Humidity',
    text: "Tropical plants like Monstera and Calathea thrive at 50-70% humidity. Grouping plants together, using a pebble tray, or running a small humidifier all help in dry indoor air."
  },
  {
    icon: '🌱',
    title: 'Soil & Repotting',
    text: "A well-draining potting mix prevents root rot. Repot when roots start circling the bottom of the pot or poking through drainage holes — typically every 12-18 months for actively growing plants."
  },
  {
    icon: '🌡️',
    title: 'Temperature',
    text: "Most houseplants are happiest between 18-27°C and dislike cold drafts, hot radiators, or sudden swings. Keep plants away from exterior doors and AC vents."
  },
  {
    icon: '🧪',
    title: 'Fertilizing',
    text: "Feed during the growing season (spring-summer) every 4-6 weeks with a balanced liquid fertilizer diluted to half strength. Hold off in winter, when most plants rest."
  },
];

export default function CareGuide() {
  return (
    <div className={styles.container}>
      <MarketingNav />

      <header className={styles.hero} style={{ minHeight: '50vh', paddingBottom: '4rem' }}>
        <div className={styles.heroPhoto}>
          <img src="https://images.unsplash.com/photo-1463320726281-696a485928c7?w=1600&q=80" alt="" />
        </div>
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className={styles.title} style={{ fontSize: '4.5rem' }}>Plant Care <span className={styles.highlight}>Guide</span></h1>
          <p className={styles.subtitle}>
            The essentials every plant parent should know — no account required.
          </p>
        </motion.div>

        <div className={styles.blob1} style={{ top: '-30%', opacity: 0.2 }} />
      </header>

      <main style={{ padding: '0 5% 8rem', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {TOPICS.map((topic, i) => (
            <motion.div
              key={topic.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              style={{
                background: 'var(--glass-bg)', padding: '2.5rem', borderRadius: '28px',
                border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)', backdropFilter: 'var(--glass-blur)'
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{topic.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.8rem' }}>{topic.title}</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>{topic.text}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ maxWidth: '700px', margin: '4rem auto 0', textAlign: 'center' }}
        >
          <p style={{ color: 'var(--text-primary)', fontSize: '1.3rem', fontWeight: 600, fontStyle: 'italic', fontFamily: 'var(--font-serif)', marginBottom: '2rem' }}>
            Want a care plan personalized to your exact plants, with reminders and AI diagnostics?
          </p>
          <Link href="/login" className={styles.primaryCta}>Get Started for Free</Link>
        </motion.div>
      </main>
    </div>
  );
}
