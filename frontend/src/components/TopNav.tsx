'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './TopNav.module.css';

export default function TopNav() {
  const pathname = usePathname();

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('user')) {
      setIsLoggedIn(true);
    }
  }, [pathname]);

  // Do not show top nav on login or landing page, or if logged in (as requested)
  if (pathname === '/login' || pathname === '/' || isLoggedIn) return null;

  return (
    <nav className={styles.topNav}>
      <Link href="/dashboard" className={styles.logo}>pnapana 🌿</Link>
      <div className={styles.navLinks}>
        <Link href="/dashboard" className={`${styles.navItem} ${pathname === '/dashboard' ? styles.active : ''}`}>Home</Link>
        <Link href="/care" className={`${styles.navItem} ${pathname === '/care' ? styles.active : ''}`}>Care</Link>
        <Link href="/rituals" className={`${styles.navItem} ${pathname === '/rituals' ? styles.active : ''}`}>Rituals</Link>
        <Link href="/explore" className={`${styles.navItem} ${pathname === '/explore' ? styles.active : ''}`}>Explore</Link>
        <Link href="/you" className={`${styles.navItem} ${pathname === '/you' ? styles.active : ''}`}>You</Link>
      </div>
    </nav>
  );
}
