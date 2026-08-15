'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '@/lib/motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import styles from './Explore.module.css';

export default function Explore() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [plants, setPlants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    
    // Fetch all community plants
    fetch('http://127.0.0.1/pnapana/backend/api/get_all_plants.php')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.plants) {
          // Only show plants that have images uploaded
          const withImages = data.plants.filter((p: any) => p.image_url && p.image_url.trim() !== '');
          setPlants(withImages);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch explore plants', err);
        setIsLoading(false);
      });
  }, [router]);

  if (!user) return <Loader fullScreen label={t('common.loading')} />;

  const featuredPlant = plants.length > 0 ? plants[0] : null;
  const gridPlants = plants.length > 1 ? plants.slice(1) : [];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{t('explore.title')}</h1>
        <p className={styles.subtitle}>{t('explore.subtitle')}</p>

        <div className={styles.searchBar}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" placeholder={t('explore.searchPlaceholder')} />
        </div>
      </header>

      <main className={styles.content}>

        <div className={styles.categories}>
          <button className={`${styles.catBtn} ${styles.active}`}>{t('explore.allUploads')}</button>
        </div>

        {isLoading ? (
          <div style={{ marginTop: '3rem' }}><Loader label={t('explore.loading')} /></div>
        ) : plants.length === 0 ? (
          <div className={styles.emptyState}>
            <p>{t('explore.emptyLine1')}</p>
            <p>{t('explore.emptyLine2')}</p>
          </div>
        ) : (
          <>
            {featuredPlant && (
              <motion.section
                className={styles.featured}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className={styles.featuredCard}>
                  <img src={featuredPlant.image_url} alt={featuredPlant.name} />
                  <div className={styles.featuredContent}>
                    <span className={styles.featuredTag}>{t('explore.plantOfTheDay')}</span>
                    <h2>{featuredPlant.name}</h2>
                    <p>{featuredPlant.species || t('explore.beautifulPlant')}</p>
                  </div>
                </div>
              </motion.section>
            )}

            {gridPlants.length > 0 && (
              <motion.section
                className={styles.masonryGrid}
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {gridPlants.map((plant: any) => (
                  <motion.div key={plant.id} className={styles.gridItem} variants={fadeInUp}>
                    <img src={plant.image_url} alt={plant.name} />
                    <div className={styles.itemOverlay}>
                      <p>{plant.name}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
