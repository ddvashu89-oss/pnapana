'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Loader from '@/components/Loader';
import styles from './Admin.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (!parsedUser.is_admin) {
      router.push('/dashboard');
      return;
    }
    setAdminName(parsedUser.name);
    setAuthorized(true);
  }, [router]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  if (!authorized) {
    return <Loader fullScreen label="Loading..." />;
  }

  return (
    <div className={styles.adminContainer}>
      <div className={styles.mobileTopBar}>
        <Link href="/" className={styles.logo}>
          <span>🌿</span> Admin
        </Link>
        <button
          className={styles.hamburger}
          onClick={() => setIsMenuOpen(prev => !prev)}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
        >
          <span className={isMenuOpen ? styles.hamburgerLineOpen1 : ''}></span>
          <span className={isMenuOpen ? styles.hamburgerLineOpen2 : ''}></span>
          <span className={isMenuOpen ? styles.hamburgerLineOpen3 : ''}></span>
        </button>
      </div>

      {isMenuOpen && <div className={styles.sidebarOverlay} onClick={() => setIsMenuOpen(false)}></div>}

      <aside className={`${styles.sidebar} ${isMenuOpen ? styles.sidebarOpen : ''}`}>
        <Link href="/" className={styles.logo}>
          <span>🌿</span> Admin
        </Link>

        <nav className={styles.navMenu}>
          <Link
            href="/admin"
            className={`${styles.navItem} ${pathname === '/admin' ? styles.active : ''}`}
          >
            📊 Overview
          </Link>
          <Link
            href="/admin/analytics"
            className={`${styles.navItem} ${pathname === '/admin/analytics' ? styles.active : ''}`}
          >
            📈 Analytics
          </Link>
          <Link
            href="/admin/users"
            className={`${styles.navItem} ${pathname === '/admin/users' ? styles.active : ''}`}
          >
            👥 Users
          </Link>
          <Link
            href="/admin/plants"
            className={`${styles.navItem} ${pathname === '/admin/plants' ? styles.active : ''}`}
          >
            🌱 Plants
          </Link>
          <Link
            href="/admin/payments"
            className={`${styles.navItem} ${pathname === '/admin/payments' ? styles.active : ''}`}
          >
            💳 Payments
          </Link>
          <Link
            href="/admin/community"
            className={`${styles.navItem} ${pathname === '/admin/community' ? styles.active : ''}`}
          >
            🌍 Community
          </Link>
          <Link
            href="/admin/messages"
            className={`${styles.navItem} ${pathname === '/admin/messages' ? styles.active : ''}`}
          >
            ✉️ Messages
          </Link>
          <Link
            href="/admin/care-guide"
            className={`${styles.navItem} ${pathname === '/admin/care-guide' ? styles.active : ''}`}
          >
            📖 Care Guide
          </Link>
          <Link
            href="/admin/settings"
            className={`${styles.navItem} ${pathname === '/admin/settings' ? styles.active : ''}`}
          >
            ⚙️ Settings
          </Link>
        </nav>

        <div className={styles.adminBadge}>Logged in as <strong>{adminName}</strong></div>
        <button className={styles.logoutBtn} onClick={() => router.push('/dashboard')}>
          🚪 Exit Admin
        </button>
      </aside>

      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
