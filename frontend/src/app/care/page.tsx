'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Care.module.css';

export default function Care() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [plants, setPlants] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    
    fetch(`http://localhost/pnapana/backend/api/get_plants.php?user_id=${parsedUser.id}`)
      .then(res => res.json())
      .then(data => { if(data.status === "success") setPlants(data.plants); });
  }, [router]);

  if (!user) return <div className={styles.container}><p style={{color: 'white', padding: '2rem'}}>Loading...</p></div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Care Schedule</h1>
        <p className={styles.subtitle}>Your plant maintenance tasks</p>
      </header>

      <main className={styles.content}>
        <div className={styles.dateSelector}>
          <div className={styles.dateCard}>
            <span className={styles.day}>Mon</span>
            <span className={styles.date}>12</span>
          </div>
          <div className={`${styles.dateCard} ${styles.active}`}>
            <span className={styles.day}>Tue</span>
            <span className={styles.date}>13</span>
          </div>
          <div className={styles.dateCard}>
            <span className={styles.day}>Wed</span>
            <span className={styles.date}>14</span>
          </div>
          <div className={styles.dateCard}>
            <span className={styles.day}>Thu</span>
            <span className={styles.date}>15</span>
          </div>
          <div className={styles.dateCard}>
            <span className={styles.day}>Fri</span>
            <span className={styles.date}>16</span>
          </div>
        </div>

        <section className={styles.taskSection}>
          <div className={styles.sectionHeader}>
            <h3>Today</h3>
            <button className={styles.markAllBtn}>Mark all done</button>
          </div>

          <div className={styles.taskList}>
            {plants.length === 0 ? (
              <p style={{color: 'var(--text-secondary)'}}>No plants to care for today.</p>
            ) : (
              plants.map(plant => (
                <div key={plant.id} className={styles.taskCard}>
                  <div className={styles.taskIcon} style={{background: 'rgba(52, 152, 219, 0.2)', color: '#3498db'}}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg>
                  </div>
                  <div className={styles.taskInfo}>
                    <h4>Water {plant.name}</h4>
                    <p>{plant.water_requirement}</p>
                  </div>
                  <button className={styles.checkBtn}></button>
                </div>
              ))
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
