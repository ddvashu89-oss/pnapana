'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeContext';
import CareGuideLink from './CareGuideLink';
import styles from '@/app/Landing.module.css';

type Labels = {
  explore?: string;
  about?: string;
  careGuide?: string;
  contact?: string;
  signIn?: string;
  getStarted?: string;
  dashboard?: string;
};

const DEFAULT_LABELS: Required<Labels> = {
  explore: 'Explore',
  about: 'About',
  careGuide: 'Care Guide',
  contact: 'Contact',
  signIn: 'Sign In',
  getStarted: 'Get Started',
  dashboard: 'Dashboard',
};

export default function MarketingNav({ labels }: { labels?: Labels }) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const { isDark, toggleTheme } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('user')) setIsLoggedIn(true);
  }, []);

  const close = () => setIsOpen(false);

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        <div className={styles.logoBadge}>🌱</div>
        <span>pnapana</span>
      </Link>

      <button
        className={styles.hamburger}
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        <span className={isOpen ? styles.hamburgerLineOpen1 : ''}></span>
        <span className={isOpen ? styles.hamburgerLineOpen2 : ''}></span>
        <span className={isOpen ? styles.hamburgerLineOpen3 : ''}></span>
      </button>

      {isOpen && <div className={styles.navOverlay} onClick={close}></div>}

      <div className={`${styles.navLinks} ${isOpen ? styles.navLinksOpen : ''}`}>
        <Link href={isLoggedIn ? "/explore" : "/login"} className={styles.navLink} onClick={close}>{l.explore}</Link>
        <Link href="/about" className={styles.navLink} onClick={close}>{l.about}</Link>
        <CareGuideLink className={styles.navLink}>{l.careGuide}</CareGuideLink>
        <Link href="/contact" className={styles.navLink} onClick={close}>{l.contact}</Link>
        {isLoggedIn ? (
          <Link href="/dashboard" className={styles.signupBtn} onClick={close}>{l.dashboard}</Link>
        ) : (
          <>
            <Link href="/login" className={styles.loginBtn} onClick={close}>{l.signIn}</Link>
            <Link href="/login" className={styles.signupBtn} onClick={close}>{l.getStarted}</Link>
          </>
        )}
        <button
          onClick={toggleTheme}
          style={{
            background: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '999px',
            width: '36px',
            height: '36px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginLeft: '0.4rem',
            color: isDark ? '#f59e0b' : '#15803d',
            transition: 'all 0.2s ease'
          }}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </nav>
  );
}
