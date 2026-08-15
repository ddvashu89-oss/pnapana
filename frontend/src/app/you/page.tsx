'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import styles from './You.module.css';

export default function You() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [plantsCount, setPlantsCount] = useState<number>(0);
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    fetch(`http://127.0.0.1/pnapana/backend/api/get_plants.php?user_id=${parsedUser.id}`)
      .then(res => res.json())
      .then(data => { if(data.status === "success") setPlantsCount(data.plants.length); });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return <Loader fullScreen label={t('common.loading')} />;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.profileInfo}>
          <img src={`https://ui-avatars.com/api/?name=${user.name}&background=2a693c&color=fff&size=100`} alt="Profile" className={styles.avatar} />
          <h1>{user.name}</h1>
          <p>{user.email}</p>
          <span className={styles.levelBadge}>{t('you.plantParentLevel')}</span>
        </div>
      </header>

      <main className={styles.content}>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{plantsCount}</span>
            <span className={styles.statLabel}>{t('you.plants')}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>45</span>
            <span className={styles.statLabel}>{t('you.daysStreak')}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>8</span>
            <span className={styles.statLabel}>{t('you.rituals')}</span>
          </div>
        </div>

        <div className={styles.menuList}>

          <div className={styles.menuGroup}>
            <h3>{t('you.settings')}</h3>
            <button className={styles.menuItem}>
              <div className={styles.menuIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
              <span>{t('you.editProfile')}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button className={styles.menuItem}>
              <div className={styles.menuIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></div>
              <span>{t('you.notifications')}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <div className={styles.menuItem} style={{ cursor: 'default' }}>
              <div className={styles.menuIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
              <span>{t('you.language')}</span>
              <div className={styles.langToggle}>
                <button
                  type="button"
                  className={`${styles.langOption} ${language === 'en' ? styles.langOptionActive : ''}`}
                  onClick={() => setLanguage('en')}
                >
                  English
                </button>
                <button
                  type="button"
                  className={`${styles.langOption} ${language === 'hi' ? styles.langOptionActive : ''}`}
                  onClick={() => setLanguage('hi')}
                >
                  हिन्दी
                </button>
              </div>
            </div>
          </div>

          <div className={styles.menuGroup}>
            <h3>{t('you.support')}</h3>
            <button className={styles.menuItem}>
              <div className={styles.menuIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg></div>
              <span>{t('you.helpCenter')}</span>
            </button>
            <button className={styles.menuItem}>
              <div className={styles.menuIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
              <span>{t('you.feedback')}</span>
            </button>
          </div>

        </div>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          {t('you.logOut')}
        </button>

      </main>
    </div>
  );
}
