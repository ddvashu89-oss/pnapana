'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Explore.module.css';

export default function Explore() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  if (!user) return <div className={styles.container}><p style={{color: 'white', padding: '2rem'}}>Loading...</p></div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Explore</h1>
        <p className={styles.subtitle}>Discover new plants & inspiration</p>
        
        <div className={styles.searchBar}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" placeholder="Search plants, care guides..." />
        </div>
      </header>

      <main className={styles.content}>
        
        <div className={styles.categories}>
          <button className={`${styles.catBtn} ${styles.active}`}>All</button>
          <button className={styles.catBtn}>Low Light</button>
          <button className={styles.catBtn}>Pet Friendly</button>
          <button className={styles.catBtn}>Flowering</button>
        </div>

        <section className={styles.featured}>
          <div className={styles.featuredCard}>
            <img src="https://images.unsplash.com/photo-1485955900006-10f4d324d411?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Featured Plant" />
            <div className={styles.featuredContent}>
              <span className={styles.featuredTag}>Plant of the Day</span>
              <h2>Pothos</h2>
              <p>The ultimate beginner plant that thrives on neglect.</p>
            </div>
          </div>
        </section>

        <section className={styles.masonryGrid}>
          
          <div className={styles.gridItem}>
            <img src="https://images.unsplash.com/photo-1501004318641-b39e6451bec6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" alt="Plant" />
            <div className={styles.itemOverlay}>
              <p>Fiddle Leaf Fig</p>
            </div>
          </div>
          
          <div className={styles.gridItem}>
            <img src="https://images.unsplash.com/photo-1512428813834-c702c7702b78?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" alt="Plant" />
            <div className={styles.itemOverlay}>
              <p>Monstera</p>
            </div>
          </div>
          
          <div className={styles.gridItem}>
            <img src="https://images.unsplash.com/photo-1509423350716-97f9360b4e09?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" alt="Plant" />
            <div className={styles.itemOverlay}>
              <p>Succulents</p>
            </div>
          </div>
          
          <div className={styles.gridItem}>
            <img src="https://images.unsplash.com/photo-1416879598555-224424268e37?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" alt="Plant" />
            <div className={styles.itemOverlay}>
              <p>Aloe Vera</p>
            </div>
          </div>
          
        </section>

      </main>
    </div>
  );
}
