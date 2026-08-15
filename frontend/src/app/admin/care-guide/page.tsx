'use client';
import { motion } from 'framer-motion';
import styles from '../Admin.module.css';

const TOPICS = [
  { icon: '💧', title: 'Watering', text: "Most houseplants prefer to dry out between waterings. Check the top 2-3cm of soil — overwatering, not underwatering, is the most common way plants are lost." },
  { icon: '☀️', title: 'Light', text: "Bright indirect light suits most popular houseplants. Yellowing leaves often mean too much light; leggy growth usually means too little." },
  { icon: '💦', title: 'Humidity', text: "Tropical plants like Monstera and Calathea thrive at 50-70% humidity. Grouping plants or running a humidifier helps in dry indoor air." },
  { icon: '🌱', title: 'Soil & Repotting', text: "A well-draining mix prevents root rot. Repot when roots circle the pot or poke through drainage holes — typically every 12-18 months." },
  { icon: '🌡️', title: 'Temperature', text: "Most houseplants are happiest between 18-27°C and dislike cold drafts, hot radiators, or sudden swings." },
  { icon: '🧪', title: 'Fertilizing', text: "Feed during the growing season every 4-6 weeks with a balanced liquid fertilizer diluted to half strength. Hold off in winter." },
];

export default function AdminCareGuide() {
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Care Guide</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            The same reference content shown on the public site — useful when answering support messages.
          </p>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        {TOPICS.map((topic, i) => (
          <motion.div
            key={topic.title}
            className={styles.metricCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>{topic.icon}</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.6rem' }}>{topic.title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>{topic.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
