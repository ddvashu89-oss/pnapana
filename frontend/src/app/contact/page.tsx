'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import MarketingNav from '@/components/MarketingNav';
import styles from '../Landing.module.css';

const CATEGORIES = [
  { id: 'general', label: 'General Inquiry' },
  { id: 'support', label: 'Support' },
  { id: 'feedback', label: 'Feedback' },
];

export default function Contact() {
  const [category, setCategory] = useState('general');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: 'success' | 'error', message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('http://127.0.0.1/pnapana/backend/api/submit_contact.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, category, subject, message })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setResult({ status: 'success', message: data.message });
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        setResult({ status: 'error', message: data.message || 'Something went wrong. Please try again.' });
      }
    } catch (err) {
      console.error(err);
      setResult({ status: 'error', message: 'Failed to connect to the server. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <MarketingNav />

      {/* Hero */}
      <header className={styles.hero} style={{ minHeight: '50vh', paddingBottom: '4rem' }}>
        <div className={styles.heroPhoto}>
          <img src="https://images.unsplash.com/photo-1603912699214-92627f304eb6?w=1600&q=80" alt="" />
        </div>
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className={styles.title} style={{ fontSize: '4.5rem' }}>Get in <span className={styles.highlight}>Touch</span></h1>
          <p className={styles.subtitle}>
            Have questions about your plants or the app? We're here to help.
          </p>
        </motion.div>

        {/* Decorative elements */}
        <div className={styles.blob2} style={{ bottom: '10%', opacity: 0.2 }} />
      </header>

      {/* Content */}
      <main style={{ padding: '0 5% 8rem', position: 'relative', zIndex: 2 }}>
        <div className={styles.contactGrid}>

          {/* Form */}
          <motion.div
            className={styles.contactFormCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className={styles.categoryTabs}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.categoryTab} ${category === cat.id ? styles.categoryTabActive : ''}`}
                  onClick={() => setCategory(cat.id)}
                >
                  {category === cat.id && (
                    <motion.div layoutId="contactCategoryPill" className={styles.categoryTabPill} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} />
                  )}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {result && (
              <div className={`${styles.contactFormMessage} ${result.status === 'success' ? styles.contactFormSuccess : styles.contactFormError}`}>
                {result.status === 'success' ? '✅ ' : '⚠️ '}{result.message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={styles.contactFormRow}>
                <div className={styles.contactFormGroup}>
                  <label>Name</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div className={styles.contactFormGroup}>
                  <label>Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
              </div>

              <div className={styles.contactFormGroup}>
                <label>Subject</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="What's this about?" />
              </div>

              <div className={styles.contactFormGroup}>
                <label>Message</label>
                <textarea required rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us more..." />
              </div>

              <button type="submit" className={styles.contactSubmitBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </motion.div>

          {/* Sidebar */}
          <div className={styles.contactSidebar}>
            <motion.div
              style={{ background: 'var(--glass-bg)', padding: '2.5rem 2rem', borderRadius: '32px', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)', backdropFilter: 'var(--glass-blur)', textAlign: 'center' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>Email Us</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>support@pnapana.com</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>We typically respond within 24 hours.</p>
            </motion.div>

            <motion.div
              style={{ background: 'var(--glass-bg)', padding: '2.5rem 2rem', borderRadius: '32px', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)', backdropFilter: 'var(--glass-blur)', textAlign: 'center' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>Social Media</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>@pnapana_app</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>Follow us on Instagram for daily plant tips.</p>
            </motion.div>
          </div>

        </div>
      </main>
    </div>
  );
}
