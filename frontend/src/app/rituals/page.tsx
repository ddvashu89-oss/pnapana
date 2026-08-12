'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Rituals.module.css';

export default function Rituals() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

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
    }, 2000);
  };

  if (!user) return <div className={styles.container}><p style={{color: 'white', padding: '2rem'}}>Loading...</p></div>;

  return (
    <div className={styles.container}>
      {/* Background Orbs */}
      <div className={styles.orb1}></div>
      <div className={styles.orb2}></div>
      <div className={styles.orb3}></div>

      <header className={styles.header}>
        <h1>Rituals</h1>
        <p className={styles.subtitle}>Mindful moments with nature</p>
      </header>

      <main className={styles.content}>
        
        <div className={`${styles.ritualCard} ${styles.morningCard}`}>
          <div className={styles.ritualHeader}>
            <div>
              <span className={`${styles.tag} ${styles.morningTag}`}>Morning</span>
              <h2>Surya Namaskar</h2>
              <p>Sunlight & pruning session</p>
            </div>
            <div className={`${styles.iconCircle} ${styles.morningIcon}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>
            </div>
          </div>
          <button 
            className={`${styles.startBtn} ${styles.morningBtn}`}
            onClick={() => handleStartRitual('morning')}
            style={completedRituals.includes('morning') ? { background: '#2ecc71', color: 'white' } : {}}
            disabled={activeRitual === 'morning' || completedRituals.includes('morning')}
          >
            {completedRituals.includes('morning') ? 'Completed ✓' : activeRitual === 'morning' ? 'In Progress...' : 'Begin Ritual'}
          </button>
        </div>

        <div className={`${styles.ritualCard} ${styles.eveningCard}`}>
          <div className={styles.ritualHeader}>
            <div>
              <span className={`${styles.tag} ${styles.eveningTag}`}>Evening</span>
              <h2>Amrit Ritual</h2>
              <p>Misting & gratitude time</p>
            </div>
            <div className={`${styles.iconCircle} ${styles.eveningIcon}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg>
            </div>
          </div>
          <button 
            className={`${styles.startBtn} ${styles.eveningBtn}`}
            onClick={() => handleStartRitual('evening')}
            style={completedRituals.includes('evening') ? { background: '#2ecc71', color: 'white' } : {}}
            disabled={activeRitual === 'evening' || completedRituals.includes('evening')}
          >
            {completedRituals.includes('evening') ? 'Completed ✓' : activeRitual === 'evening' ? 'In Progress...' : 'Begin Ritual'}
          </button>
        </div>

        <div className={`${styles.ritualCard} ${styles.weeklyCard}`}>
          <div className={styles.ritualHeader}>
            <div>
              <span className={`${styles.tag} ${styles.weeklyTag}`}>Weekly</span>
              <h2>Dharti Pooja</h2>
              <p>Soil aeration & fertilization</p>
            </div>
            <div className={`${styles.iconCircle} ${styles.weeklyIcon}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <button 
            className={`${styles.startBtn} ${styles.weeklyBtn}`}
            onClick={() => handleStartRitual('weekly')}
            style={completedRituals.includes('weekly') ? { background: '#2ecc71', color: 'white' } : {}}
            disabled={activeRitual === 'weekly' || completedRituals.includes('weekly')}
          >
            {completedRituals.includes('weekly') ? 'Completed ✓' : activeRitual === 'weekly' ? 'In Progress...' : 'Begin Ritual'}
          </button>
        </div>

        <section className={styles.meditationBox}>
          <h3>Plant Meditation</h3>
          <p>5-minute guided mindfulness with your green friend.</p>
          <div className={styles.playControls}>
            <button className={styles.playBtn}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </button>
            <div className={styles.progressTrack}>
              <div className={styles.progressBar}></div>
            </div>
            <span className={styles.time}>5:00</span>
          </div>
        </section>

      </main>
    </div>
  );
}
