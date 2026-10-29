'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('user')) setIsLoggedIn(true);
  }, []);

  const close = () => setIsOpen(false);

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        <span>🌿</span> pnapana
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
        <Link href="/explore" className={styles.navLink} onClick={close}>{l.explore}</Link>
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
      </div>
    </nav>
  );
}
