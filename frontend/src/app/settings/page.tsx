'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '@/lib/motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import styles from './Settings.module.css';

export default function Settings() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<{ id: number, name: string } | null>(null);
  
  // Mock Settings State
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [deleteRequestPending, setDeleteRequestPending] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleDeleteAccount = () => {
    if (confirm(t('settings.deleteConfirm'))) {
      setDeleteRequestPending(true);
      alert(t('settings.deleteRaised'));
    }
  };

  if (!user) return <Loader fullScreen label={t('common.loading')} />;

  return (
    <div className={styles.container}>
      {/* Animated Mesh Background */}
      <div className={styles.meshBg}>
        <div className={styles.meshOrb1}></div>
        <div className={styles.meshOrb2}></div>
        <div className={styles.meshOrb3}></div>
      </div>

      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </Link>
        <h1>{t('settings.title')}</h1>
      </header>

      <motion.main className={styles.settingsContent} variants={staggerContainer} initial="hidden" animate="visible">

        {/* Profile Section */}
        <motion.section className={styles.settingsCard} variants={fadeInUp}>
          <div className={styles.profileHeader}>
            <div className={styles.profilePicLarge}>
              <img src={`https://ui-avatars.com/api/?name=${user.name}&background=307c46&color=fff&size=100`} alt="Profile" />
            </div>
            <div className={styles.profileInfo}>
              <h2>{user.name}</h2>
              <p>{t('settings.plantParentExtraordinaire')}</p>
            </div>
            <button className={styles.editBtn}>{t('settings.editProfile')}</button>
          </div>
        </motion.section>

        {/* App Preferences */}
        <motion.section className={styles.settingsCard} variants={fadeInUp}>
          <h3 className={styles.cardTitle}>{t('settings.appPreferences')}</h3>

          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <div className={styles.settingIcon} style={{ background: 'rgba(52, 152, 219, 0.1)', color: '#3498db' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              </div>
              <div>
                <h4>{t('settings.pushNotifications')}</h4>
                <p>{t('settings.pushNotificationsText')}</p>
              </div>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <div className={styles.settingIcon} style={{ background: 'rgba(155, 89, 182, 0.1)', color: '#9b59b6' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              </div>
              <div>
                <h4>{t('settings.darkMode')}</h4>
                <p>{t('settings.darkModeText')}</p>
              </div>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
              <span className={styles.slider}></span>
            </label>
          </div>
        </motion.section>

        {/* Plant Care Settings */}
        <motion.section className={styles.settingsCard} variants={fadeInUp}>
          <h3 className={styles.cardTitle}>{t('settings.plantCare')}</h3>

          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <div className={styles.settingIcon} style={{ background: 'rgba(211, 106, 50, 0.1)', color: 'var(--accent-orange)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div>
                <h4>{t('settings.dailyReminderTime')}</h4>
                <p>{t('settings.dailyReminderText')}</p>
              </div>
            </div>
            <input
              type="time"
              className={styles.timePicker}
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>
        </motion.section>

        {/* Account Actions */}
        <motion.section className={styles.settingsCard} variants={fadeInUp}>
          <h3 className={styles.cardTitle}>{t('settings.accountActions')}</h3>

          <div className={styles.actionGrid}>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              {t('settings.logOut')}
            </button>
            <button className={styles.deleteBtn} onClick={handleDeleteAccount} disabled={deleteRequestPending} style={{ opacity: deleteRequestPending ? 0.6 : 1, cursor: deleteRequestPending ? 'not-allowed' : 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              {deleteRequestPending ? t('settings.deletionPending') : t('settings.requestDeletion')}
            </button>
          </div>
        </motion.section>

        <p className={styles.appVersion}>{t('settings.appVersion')}</p>

      </motion.main>
    </div>
  );
}
