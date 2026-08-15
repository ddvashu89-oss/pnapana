'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '@/lib/motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import styles from './Rituals.module.css';

const STREAK_DAYS = 3;
const STREAK_GOAL = 7;

export default function Rituals() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { t } = useLanguage();

  const [activeRitual, setActiveRitual] = useState<string | null>(null);
  const [completedRituals, setCompletedRituals] = useState<string[]>([]);
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const handleStartRitual = (ritualName: string) => {
    if (completedRituals.includes(ritualName) || activeRitual === ritualName) return;
    
    setActiveRitual(ritualName);
    
    // Simulate a ritual being performed
    setTimeout(() => {
      setActiveRitual(null);
      setCompletedRituals(prev => [...prev, ritualName]);
    }, 2500);
  };

  if (!user) return <Loader fullScreen label={t('common.loading')} />;

  const isMorningComplete = completedRituals.includes('morning');

  return (
    <div className={styles.container}>
      {/* Background Orbs */}
      <div className={styles.orb1}></div>
      <div className={styles.orb2}></div>
      <div className={styles.orb3}></div>

      <header className={styles.header}>
        <div>
          <h1>{t('rituals.title')}</h1>
          <p className={styles.subtitle}>{t('rituals.subtitle')}</p>
        </div>
        <div className={styles.zenTracker}>
          <div className={styles.ringWrapper}>
            <svg className={styles.ringSvg} viewBox="0 0 44 44">
              <circle className={styles.ringBg} cx="22" cy="22" r="19" />
              <motion.circle
                className={styles.ringProgress}
                cx="22" cy="22" r="19"
                strokeDasharray={2 * Math.PI * 19}
                initial={{ strokeDashoffset: 2 * Math.PI * 19 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 19 * (1 - STREAK_DAYS / STREAK_GOAL) }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </svg>
            <span className={styles.fireIcon}>🔥</span>
          </div>
          <div className={styles.zenStats}>
            <strong>{t('rituals.dayStreak', { days: STREAK_DAYS })}</strong>
            <span>{t('rituals.keepItUp')}</span>
          </div>
        </div>
      </header>

      <motion.main className={styles.content} variants={staggerContainer} initial="hidden" animate="visible">

        {/* HERO SECTION: Next Ritual */}
        <motion.section className={`${styles.heroCard} ${isMorningComplete ? styles.completedHero : ''}`} variants={fadeInUp}>
          <div className={styles.heroContent}>
            <span className={styles.heroTag}>{t('rituals.morningRoutine')}</span>
            <h2>{t('rituals.suryaNamaskar')}</h2>
            <p>{t('rituals.suryaText')}</p>

            <button
              className={`${styles.startBtn} ${styles.heroBtn}`}
              onClick={() => handleStartRitual('morning')}
              disabled={activeRitual === 'morning' || isMorningComplete}
            >
              {isMorningComplete ? t('rituals.ritualComplete') : activeRitual === 'morning' ? t('rituals.immersing') : t('rituals.beginJourney')}
            </button>
          </div>
          <div className={styles.heroVisual}>
            <div className={`${styles.glowingOrb} ${activeRitual === 'morning' ? styles.activeOrb : ''}`}></div>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>
          </div>
        </motion.section>

        <h3 className={styles.sectionTitle}>{t('rituals.upcomingRituals')}</h3>

        <div className={styles.staggeredGrid}>
          {/* Evening Card */}
          <motion.div className={`${styles.gridCard} ${styles.eveningCard}`} variants={fadeInUp}>
            <div className={styles.gridThumb}>
              <img src="https://images.unsplash.com/photo-1637226168180-0f275ed6ec57?w=500&q=80" alt="" loading="lazy" />
            </div>
            <div className={styles.cardTop}>
              <span className={styles.gridTag}>{t('rituals.evening')}</span>
              <div className={styles.gridIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg>
              </div>
            </div>
            <h4>{t('rituals.amritRitual')}</h4>
            <p>{t('rituals.amritText')}</p>
            <button
              className={`${styles.gridBtn} ${styles.eveningBtn}`}
              onClick={() => handleStartRitual('evening')}
              disabled={activeRitual === 'evening' || completedRituals.includes('evening')}
            >
              {completedRituals.includes('evening') ? t('rituals.doneCheck') : t('rituals.startBtn')}
            </button>
          </motion.div>

          {/* Weekly Card */}
          <motion.div className={`${styles.gridCard} ${styles.weeklyCard}`} variants={fadeInUp}>
            <div className={styles.gridThumb}>
              <img src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500&q=80" alt="" loading="lazy" />
            </div>
            <div className={styles.cardTop}>
              <span className={styles.gridTag}>{t('rituals.weekly')}</span>
              <div className={styles.gridIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
            </div>
            <h4>{t('rituals.dhartiPooja')}</h4>
            <p>{t('rituals.dhartiText')}</p>
            <button
              className={`${styles.gridBtn} ${styles.weeklyBtn}`}
              onClick={() => handleStartRitual('weekly')}
              disabled={activeRitual === 'weekly' || completedRituals.includes('weekly')}
            >
              {completedRituals.includes('weekly') ? t('rituals.doneCheck') : t('rituals.startBtn')}
            </button>
          </motion.div>
        </div>

      </motion.main>
    </div>
  );
}
