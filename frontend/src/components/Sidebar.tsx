'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isAppShellRoute } from '@/lib/routePolicy';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('user')) {
        setIsLoggedIn(true);
      }
      
      // Manage body class for layout spacing
      if (isAppShellRoute(pathname)) {
        document.body.classList.add('has-sidebar');
      } else {
        document.body.classList.remove('has-sidebar');
      }
    }
  }, [pathname]);

  // Only show the app sidebar on logged-in app-shell routes
  if (!isAppShellRoute(pathname)) return null;

  return (
    <nav className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <Link href="/dashboard" className={styles.logo}>pnapana 🌿</Link>
      </div>
      
      <div className={styles.navLinks}>
        <Link href="/dashboard" className={`${styles.navItem} ${pathname === '/dashboard' ? styles.active : ''}`}>
          <span className={styles.icon}>🏠</span>
          <span className={styles.label}>{t('nav.home')}</span>
        </Link>
        <Link href="/care" className={`${styles.navItem} ${pathname === '/care' ? styles.active : ''}`}>
          <span className={styles.icon}>💧</span>
          <span className={styles.label}>{t('nav.care')}</span>
        </Link>
        <Link href="/rituals" className={`${styles.navItem} ${pathname === '/rituals' ? styles.active : ''}`}>
          <span className={styles.icon}>✨</span>
          <span className={styles.label}>{t('nav.rituals')}</span>
        </Link>
        <Link href="/explore" className={`${styles.navItem} ${pathname === '/explore' ? styles.active : ''}`}>
          <span className={styles.icon}>🔍</span>
          <span className={styles.label}>{t('nav.explore')}</span>
        </Link>
        <Link href="/community" className={`${styles.navItem} ${pathname === '/community' ? styles.active : ''}`}>
          <span className={styles.icon}>🌍</span>
          <span className={styles.label}>{t('nav.community')}</span>
        </Link>
        <Link href="/you" className={`${styles.navItem} ${pathname === '/you' ? styles.active : ''}`}>
          <span className={styles.icon}>👤</span>
          <span className={styles.label}>{t('nav.you')}</span>
        </Link>
      </div>
    </nav>
  );
}
