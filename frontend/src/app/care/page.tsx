'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '@/lib/motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import { authFetch } from '@/lib/api';
import styles from './Care.module.css';

export default function CareSchedule() {
  const [user, setUser] = useState<{ id: number, name: string } | null>(null);
  const [plants, setPlants] = useState<any[]>([]);
  const router = useRouter();
  const [activeDayIndex, setActiveDayIndex] = useState(1);
  const { t } = useLanguage();

  const WEEK_DAYS = [
    { day: t('care.dayMon'), date: '12' },
    { day: t('care.dayTue'), date: '13' },
    { day: t('care.dayWed'), date: '14' },
    { day: t('care.dayThu'), date: '15' },
    { day: t('care.dayFri'), date: '16' },
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    
    authFetch('get_plants.php')
      .then(res => res.json())
      .then(data => { if(data.status === "success") setPlants(data.plants); })
      .catch(() => {});
  }, [router]);

  if (!user) return <Loader fullScreen label={t('common.loading')} />;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{t('care.title')}</h1>
        <p className={styles.subtitle}>{t('care.subtitle')}</p>
      </header>

      <main className={styles.content}>
        <div className={styles.dateSelector}>
          {WEEK_DAYS.map((d, i) => (
            <div
              key={d.day}
              className={`${styles.dateCard} ${activeDayIndex === i ? styles.active : ''}`}
              onClick={() => setActiveDayIndex(i)}
            >
              {activeDayIndex === i && (
                <motion.div layoutId="activeDatePill" className={styles.activePill} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} />
              )}
              <span className={styles.day}>{d.day}</span>
              <span className={styles.date}>{d.date}</span>
            </div>
          ))}
        </div>

        <section className={styles.taskSection}>
          <div className={styles.sectionHeader}>
            <h3>{t('care.today')}</h3>
            <button className={styles.markAllBtn}>{t('care.markAllDone')}</button>
          </div>

          <motion.div className={styles.taskList} variants={staggerContainer} initial="hidden" animate="visible">
            {plants.length === 0 ? (
              <p style={{color: 'var(--text-secondary)'}}>{t('care.noPlantsToday')}</p>
            ) : (
              plants.map(plant => (
                <motion.div key={plant.id} className={styles.taskCard} variants={fadeInUp}>
                  <div className={styles.taskIcon} style={{background: 'rgba(52, 152, 219, 0.2)', color: '#3498db'}}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg>
                  </div>
                  <div className={styles.taskInfo}>
                    <h4>{t('care.waterPlant', { name: plant.name })}</h4>
                    <p>{plant.water_requirement}</p>
                  </div>
                  <button className={styles.checkBtn}></button>
                </motion.div>
              ))
            )}
          </motion.div>
        </section>

      </main>
    </div>
  );
}
