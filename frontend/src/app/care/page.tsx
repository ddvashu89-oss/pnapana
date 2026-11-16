'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/api';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import styles from './Care.module.css';

type WaterReminder = { id: number; name: string };
type CareReminder = { plant_id: number; name: string; type: string; title: string; message: string };

export default function CareSchedule() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [water, setWater] = useState<WaterReminder[]>([]);
  const [other, setOther] = useState<CareReminder[]>([]);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const response = await authFetch('get_notifications.php');
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || 'Could not load care reminders.');
      setWater(data.notifications || []);
      setOther(data.care_reminders || []);
      setError('');
    } catch {
      setError(language === 'hi' ? 'देखभाल के काम लोड नहीं हो सके। फिर से कोशिश करें।' : 'Could not load care tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    if (!localStorage.getItem('user')) {
      router.replace('/login');
      return;
    }
    setReady(true);
    void refresh();
  }, [router, refresh]);

  async function markWatered(id: number) {
    setWorkingId(id);
    try {
      const response = await authFetch('water_plant.php', { method: 'POST', body: JSON.stringify({ id }) });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || 'Could not save watering.');
      await refresh();
      window.dispatchEvent(new Event('plantUpdated'));
    } catch {
      setError(language === 'hi' ? 'पानी देने की जानकारी सेव नहीं हुई। फिर से कोशिश करें।' : 'Watering was not saved. Please try again.');
    } finally {
      setWorkingId(null);
    }
  }

  if (!ready || loading) return <Loader fullScreen label={t('common.loading')} />;

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>{language === 'hi' ? 'आपका बगीचा' : 'YOUR GARDEN'}</span>
        <h1>{language === 'hi' ? 'आज की देखभाल' : 'Today’s care'}</h1>
        <p>{language === 'hi' ? 'हर पौधे के लिए अगला आसान कदम देखें। पानी देने से पहले मिट्टी जाँचें।' : 'One clear next step for each plant. Check the soil before watering.'}</p>
      </header>

      {error && <div className={styles.error} role="alert">{error} <button type="button" onClick={() => void refresh()}>{language === 'hi' ? 'फिर से कोशिश करें' : 'Retry'}</button></div>}

      <section className={styles.content} aria-labelledby="care-tasks-title">
        <div className={styles.sectionHeader}>
          <h2 id="care-tasks-title">{language === 'hi' ? 'आपके काम' : 'Your tasks'}</h2>
          <span>{water.length + other.length}</span>
        </div>
        {water.length === 0 && other.length === 0 ? (
          <div className={styles.empty}>
            <h3>{language === 'hi' ? 'अभी कोई काम बाकी नहीं है' : 'You’re caught up for now'}</h3>
            <p>{language === 'hi' ? 'अपने पौधों को देखें या बाद में लौटें।' : 'Visit your garden or check back later.'}</p>
            <Link href="/dashboard#garden">{language === 'hi' ? 'बगीचा देखें' : 'View your garden'}</Link>
          </div>
        ) : (
          <div className={styles.taskList}>
            {water.map(plant => (
              <article className={styles.taskCard} key={`water-${plant.id}`}>
                <span className={styles.taskIcon} aria-hidden="true">💧</span>
                <div className={styles.taskInfo}>
                  <h3>{language === 'hi' ? `${plant.name} की मिट्टी जाँचें` : `Check ${plant.name}’s soil`}</h3>
                  <p>{language === 'hi' ? 'पानी देने का अनुमानित समय आ गया है। मिट्टी सूखी हो तो पानी दें।' : 'It may be time to water. Water only if the soil feels dry.'}</p>
                  <Link href={`/plant?id=${plant.id}`}>{language === 'hi' ? 'पौधा देखें' : 'View plant'}</Link>
                </div>
                <button type="button" className={styles.doneButton} disabled={workingId === plant.id} onClick={() => void markWatered(Number(plant.id))}>
                  {workingId === plant.id ? t('common.loading') : language === 'hi' ? 'पानी दिया' : 'I watered it'}
                </button>
              </article>
            ))}
            {other.map((reminder, index) => (
              <article className={styles.taskCard} key={`${reminder.type}-${reminder.plant_id}-${index}`}>
                <span className={styles.taskIcon} aria-hidden="true">🌿</span>
                <div className={styles.taskInfo}>
                  <h3>{reminder.name}: {reminder.title}</h3>
                  <p>{reminder.message}</p>
                </div>
                <Link className={styles.viewButton} href={`/plant?id=${reminder.plant_id}`}>{language === 'hi' ? 'विवरण देखें' : 'View details'}</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
