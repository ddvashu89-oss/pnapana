'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Sprout,
  Sparkles,
  Bell,
  CloudSun,
  Award,
  CreditCard,
  Settings,
  Camera,
  User
} from 'lucide-react';
import { isAppShellRoute } from '@/lib/routePolicy';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
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

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
    { label: 'My Plants', href: '/dashboard#plants', icon: Sprout },
    { label: 'AI Analysis', href: '/dashboard#scan', icon: Sparkles },
    { label: 'Reminders', href: '/care', icon: Bell },
    { label: 'Weather & Environment', href: '/rituals', icon: CloudSun },
    { label: 'Streak & Rewards', href: '/you', icon: Award },
    { label: 'Subscription', href: '/subscription', icon: CreditCard },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const isCurrentActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    if (href.includes('#')) {
      return pathname === href.split('#')[0] && (typeof window !== 'undefined' && window.location.hash === '#' + href.split('#')[1]);
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <Link href="/dashboard" className={styles.brandLink}>
            <div className={styles.logoBadge}>
              <Sprout size={22} color="#ffffff" strokeWidth={2.4} />
            </div>
            <div className={styles.brandMeta}>
              <h2 className={styles.brandName}>Pnapana</h2>
              <span className={styles.brandTagline}>Your Plant · Our AI</span>
            </div>
          </Link>
        </div>

        <nav className={styles.navGroup}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isCurrentActive(item.href, item.exact);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.active : ''}`}
              >
                <span className={styles.navIconWrapper}>
                  <Icon size={19} strokeWidth={active ? 2.4 : 1.9} />
                </span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Promo / Mission Card */}
        <div className={styles.sidebarFooter}>
          <div className={styles.promoCard}>
            <div className={styles.promoHeader}>
              <div className={styles.promoBadge}>
                <Sprout size={16} color="#34d399" />
              </div>
              <div className={styles.promoText}>
                <h4>Greener Spaces</h4>
                <p>Healthier You</p>
              </div>
            </div>
            <div className={styles.promoAction}>
              <span>Let&apos;s grow together 🌱</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <div className={styles.mobileTabBar}>
        <Link
          href="/dashboard"
          className={`${styles.tabItem} ${pathname === '/dashboard' ? styles.tabActive : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Home</span>
        </Link>

        <Link
          href="/dashboard#plants"
          className={`${styles.tabItem} ${pathname === '/dashboard' ? styles.tabActive : ''}`}
        >
          <Sprout size={20} />
          <span>Plants</span>
        </Link>

        {/* Floating Scan Action in Center */}
        <Link href="/dashboard#scan" className={styles.scanFloatingBtn} title="Scan Plant">
          <Camera size={22} color="#ffffff" />
        </Link>

        <Link
          href="/care"
          className={`${styles.tabItem} ${pathname === '/care' ? styles.tabActive : ''}`}
        >
          <Bell size={20} />
          <span>Reminders</span>
        </Link>

        <Link
          href="/settings"
          className={`${styles.tabItem} ${pathname === '/settings' ? styles.tabActive : ''}`}
        >
          <User size={20} />
          <span>Profile</span>
        </Link>
      </div>
    </>
  );
}
