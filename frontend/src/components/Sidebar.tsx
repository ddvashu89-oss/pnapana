'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sprout, ScanLine, Users, Leaf, UserRound, Compass, Droplets, Sparkles, Settings, Trophy, Bot, Plane } from 'lucide-react';
import { isAppShellRoute } from '@/lib/routePolicy';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { authFetch } from '@/lib/api';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname().replace(/\/+$/, '') || '/';
  const { language, t } = useLanguage();
  const [hash, setHash] = useState('');
  const [rewards, setRewards] = useState({ streak_days: 0, coins: 0 });
  const inApp = isAppShellRoute(pathname);

  useEffect(() => {
    document.body.classList.toggle('has-sidebar', inApp);
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [pathname, inApp]);

  useEffect(() => {
    if (!inApp || !localStorage.getItem('user')) return;
    const refresh = () => authFetch('get_gamification.php').then(r => r.json()).then(data => {
      if (data.status === 'success') setRewards(data);
    }).catch(() => {});
    refresh();
    window.addEventListener('pnapana:rewards', refresh);
    return () => window.removeEventListener('pnapana:rewards', refresh);
  }, [inApp]);

  if (!inApp) return null;
  const hi = language === 'hi';
  const links = [
    { href: '/dashboard', label: hi ? 'आज' : 'Today', icon: Home, active: pathname === '/dashboard' && !hash },
    { href: '/dashboard#garden', label: hi ? 'बगीचा' : 'Garden', icon: Sprout, active: pathname === '/plant' || (pathname === '/dashboard' && hash === '#garden') },
    { href: '/dashboard?action=scan', label: hi ? 'स्कैन' : 'Scan', icon: ScanLine, active: false, scan: true },
    { href: '/rewards', label: hi ? 'इनाम' : 'Rewards', icon: Trophy, active: pathname === '/rewards', mobileOnly: true },
    { href: '/community', label: t('nav.community'), icon: Users, active: pathname === '/community' },
  ];

  return (
    <>
      <header className={styles.topbar}>
        <Link href="/dashboard" className={styles.brand} aria-label="Pnapana home">
          <span className={styles.brandMark}><Leaf size={24} strokeWidth={1.6} /></span>
          <span>Pnapana</span>
        </Link>
        <div className={styles.headerActions}>
          <Link href="/rewards" className={styles.streak} aria-label={`${rewards.streak_days} day watering streak`}><span className={styles.flameEmoji} aria-hidden="true">🔥</span> {rewards.streak_days}</Link>
          <Link href="/rewards" className={styles.coins} aria-label={`${rewards.coins} coins and rewards`}><span className={styles.coinEmblem} aria-hidden="true"><Sprout size={13} strokeWidth={2.2} /></span> {rewards.coins}</Link>
          <Link href="/you" className={styles.profile} aria-label={t('nav.you')}><UserRound size={23} strokeWidth={1.6} /></Link>
        </div>
      </header>
      <nav className={styles.sidebar} aria-label="Main navigation">
        <Link href="/dashboard" className={styles.desktopBrand}><span className={styles.brandMark}><Leaf size={24} strokeWidth={1.6} /></span>Pnapana</Link>
        <div className={styles.navLinks}>
          {links.map(({ href, label, icon: Icon, active, scan, mobileOnly }) => (
            <Link key={label} href={href} onClick={(event) => { setHash(href.includes('#') ? '#' + href.split('#')[1] : ''); if (scan && pathname === '/dashboard') { event.preventDefault(); window.history.replaceState(null, '', href); window.dispatchEvent(new Event('pnapana:scan')); } }} className={`${styles.navItem} ${active ? styles.active : ''} ${scan ? styles.scan : ''} ${mobileOnly ? styles.mobileOnly : ''}`} aria-current={active ? 'page' : undefined}>
              <span className={styles.icon}><Icon size={23} strokeWidth={1.6} /></span>
              <span className={styles.label}>{label}</span>
            </Link>
          ))}
        </div>
        <div className={styles.secondaryLinks}>
          <span className={styles.navCaption}>{hi ? 'और जानें' : 'KEEP GROWING'}</span>
          <Link href="/care"><Droplets size={19} />{t('nav.care')}</Link>
          <Link href="/garden-manager"><Bot size={19} />Plant Manager</Link>
          <Link href="/buddies"><Users size={19} />Plant Buddy</Link>
          <Link href="/vacation"><Plane size={19} />Vacation Mode</Link>
          <Link href="/rituals"><Sparkles size={19} />{t('nav.rituals')}</Link>
          <Link href="/explore"><Compass size={19} />{t('nav.explore')}</Link>
          <Link href="/settings"><Settings size={19} />{hi ? 'सेटिंग्स' : 'Settings'}</Link>
        </div>
        <div className={styles.sidebarNote}><Sprout size={23} /><p>A little care.<br />A greener every day.</p></div>
      </nav>
    </>
  );
}
