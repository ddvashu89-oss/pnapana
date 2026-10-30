'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Award, Camera, Flame, Sprout, Trophy } from 'lucide-react';
import Loader from '@/components/Loader';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { authFetch } from '@/lib/api';
import styles from './Rewards.module.css';

type Badge = { id: string; label: string; icon: string; description: string; unlocked: boolean; progress: string };
type Gamification = { coins: number; streak_days: number; photo_streak: number; badges: Badge[] };

export default function Rewards() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Gamification>({ coins: 0, streak_days: 0, photo_streak: 0, badges: [] });
  const [loadError, setLoadError] = useState(false);
  const hi = language === 'hi';

  const refresh = useCallback(async () => {
    try {
      const [gamificationResponse, plantsResponse] = await Promise.all([
        authFetch('get_gamification.php').then(response => response.json()),
        authFetch('get_plants.php').then(response => response.json())
      ]);
      if (gamificationResponse.status !== 'success') throw new Error('Rewards unavailable');

      let photoStreak = 0;
      const plants = plantsResponse.status === 'success' && Array.isArray(plantsResponse.plants) ? plantsResponse.plants : [];
      if (plants.length) {
        const histories = await Promise.all(plants.map((plant: { id: number }) =>
          authFetch(`get_plant_scans.php?plant_id=${plant.id}`).then(response => response.json()).catch(() => null)
        ));
        const dayKeys = new Set<string>();
        histories.forEach(history => {
          if (history?.status !== 'success' || !Array.isArray(history.scans)) return;
          history.scans.forEach((scan: { created_at?: string }) => {
            if (!scan.created_at) return;
            const date = new Date(scan.created_at.replace(' ', 'T'));
            if (!Number.isNaN(date.getTime())) dayKeys.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
          });
        });
        const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const cursor = new Date();
        if (!dayKeys.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
        while (dayKeys.has(dayKey(cursor))) {
          photoStreak += 1;
          cursor.setDate(cursor.getDate() - 1);
        }
      }

      setData({ coins: Number(gamificationResponse.coins) || 0, streak_days: Number(gamificationResponse.streak_days) || 0, photo_streak: photoStreak, badges: Array.isArray(gamificationResponse.badges) ? gamificationResponse.badges : [] });
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('user')) {
      router.push('/login');
      return;
    }
    setReady(true);
    refresh();
    window.addEventListener('pnapana:rewards', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('pnapana:rewards', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [router, refresh]);

  if (!ready) return <Loader fullScreen label={t('common.loading')} />;
  const unlocked = data.badges.filter(badge => badge.unlocked).length;

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>{hi ? 'आपकी देखभाल के इनाम' : 'YOUR PLANT CARE REWARDS'}</span>
        <h1>{hi ? 'आपके रिवॉर्ड्स' : 'Rewards'}</h1>
        <p>{hi ? 'पौधों की देखभाल करते रहें और कॉइन्स व उपलब्धियाँ पाएँ।' : 'Keep caring for your plants to collect coins and unlock achievements.'}</p>
      </header>

      <section className={styles.summary} aria-label={hi ? 'इनाम सारांश' : 'Rewards summary'}>
        <article className={styles.coinCard}>
          <span className={styles.coinIcon}><Sprout size={26} /></span>
          <div><span>{hi ? 'आपके कॉइन्स' : 'COIN BALANCE'}</span><strong>{data.coins}</strong><small>{hi ? 'आपकी देखभाल से कमाए गए' : 'Earned through your care'}</small></div>
        </article>
        <article className={styles.streakCard}>
          <span className={styles.streakIcon}><Flame size={27} fill="currentColor" /></span>
          <div><span>{hi ? 'पानी देने की स्ट्रीक' : 'WATERING STREAK'}</span><strong>{data.streak_days} {data.streak_days === 1 ? (hi ? 'दिन' : 'day') : (hi ? 'दिन' : 'days')}</strong><small>{data.streak_days > 0 ? (hi ? 'बहुत बढ़िया, ऐसे ही जारी रखें!' : 'Great care. Keep it going!') : (hi ? 'आज से अपनी स्ट्रीक शुरू करें' : 'Start your streak with today’s care')}</small></div>
        </article>
        <article className={styles.photoCard}>
          <span className={styles.photoIcon}><Camera size={25} /></span>
          <div><span>{hi ? 'फोटो स्ट्रीक' : 'PHOTO STREAK'}</span><strong>{data.photo_streak} {data.photo_streak === 1 ? (hi ? 'दिन' : 'day') : (hi ? 'दिन' : 'days')}</strong><small>{hi ? 'पौधे की रोज़ एक फोटो लें' : 'Take a daily photo to track growth'}</small></div>
        </article>
      </section>

      <section className={styles.achievements}>
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>{hi ? 'आपकी प्रगति' : 'YOUR PROGRESS'}</span><h2>{t('dashboard.achievements')}</h2></div>
          <span className={styles.progress}><Trophy size={17} /> {unlocked}/{data.badges.length} {hi ? 'अनलॉक' : 'unlocked'}</span>
        </div>

        {loadError && <p className={styles.error} role="status">{hi ? 'इनाम लोड नहीं हो पाए। फिर से कोशिश करें।' : 'Rewards could not be loaded. Refresh to try again.'}</p>}
        {data.badges.length ? <div className={styles.badgeGrid}>
          {data.badges.map((badge, index) => <motion.article key={badge.id} className={`${styles.badge} ${badge.unlocked ? styles.unlocked : styles.locked}`} title={t(`badges.${badge.id}.description`)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .035 }}>
            <span className={styles.badgeIcon}>{badge.icon || <Award size={25} />}{badge.unlocked && <i aria-label="Unlocked">✓</i>}</span>
            <strong>{t(`badges.${badge.id}.label`)}</strong>
            {!badge.unlocked && <small>{badge.progress}</small>}
          </motion.article>)}
        </div> : !loadError ? <div className={styles.empty}><Award size={30} /><p>{hi ? 'अभी उपलब्धियाँ नहीं हैं। देखभाल जारी रखें!' : 'Your achievements will appear here as you care for your plants.'}</p></div> : null}
      </section>
    </main>
  );
}
