'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import { authFetch } from '@/lib/api';
import styles from './You.module.css';
import { Bell, ChevronRight, CircleHelp, Compass, CreditCard, Droplets, Globe2, LogOut, MessageCircle, Sparkles, UserRound } from 'lucide-react';

type ProfileUser = { id: number; name: string; email: string; level?: number };
type ProfileStats = { plants: number; streak: number; rituals: number };

export default function You() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ plants: 0, streak: 0, rituals: 0 });
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.replace('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as ProfileUser;
      if (!parsedUser?.name || !parsedUser?.email) throw new Error('Invalid saved profile');
      setUser(parsedUser);
    } catch {
      localStorage.removeItem('user');
      router.replace('/login');
      return;
    }

    authFetch('get_gamification.php')
      .then(res => res.json())
      .then(data => {
        if (data.status !== 'success') return;
        setStats({
          plants: Number(data.stats?.total_plants) || 0,
          streak: Number(data.streak_days) || 0,
          rituals: Number(data.stats?.total_rituals) || 0,
        });
      })
      .catch(() => {});
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return <Loader fullScreen label={t('common.loading')} />;
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '🌿';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.profileInfo}>
          <span className={styles.avatar} role="img" aria-label={`${user.name} profile`}>{initials}</span>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
          <span className={styles.levelBadge}>🌿 {user.level ? `Plant Parent Lv ${user.level}` : 'Plant Parent'}</span>
        </div>
      </header>

      <main className={styles.content}>
        <section className={styles.statsGrid} aria-label="Your garden stats">
          <div className={styles.statCard}><span className={styles.statValue}>{stats.plants}</span><span className={styles.statLabel}>{t('you.plants')}</span></div>
          <div className={styles.statCard}><span className={styles.statValue}>{stats.streak}</span><span className={styles.statLabel}>{t('you.daysStreak')}</span></div>
          <div className={styles.statCard}><span className={styles.statValue}>{stats.rituals}</span><span className={styles.statLabel}>{t('you.rituals')}</span></div>
        </section>

        <div className={styles.menuList}>
          <section className={styles.menuGroup}>
            <h2>Plan &amp; billing</h2>
            <Link href="/subscription" className={styles.menuItem}>
              <span className={styles.menuIcon}><CreditCard size={20} /></span><span>Subscription &amp; payments</span><ChevronRight size={20} />
            </Link>
          </section>

          <section className={styles.menuGroup}>
            <h2>{language === 'hi' ? 'और जानें' : 'Keep growing'}</h2>
            {[
              { href: '/care', label: t('nav.care'), Icon: Droplets },
              { href: '/rituals', label: t('nav.rituals'), Icon: Sparkles },
              { href: '/explore', label: t('nav.explore'), Icon: Compass },
            ].map(({ href, label, Icon }) => <Link key={href} href={href} className={styles.menuItem}><span className={styles.menuIcon}><Icon size={20} /></span><span>{label}</span><ChevronRight size={20} /></Link>)}
          </section>

          <section className={styles.menuGroup}>
            <h2>{t('you.settings')}</h2>
            <Link href="/settings" className={styles.menuItem}><span className={styles.menuIcon}><UserRound size={20} /></span><span>{t('you.editProfile')}</span><ChevronRight size={20} /></Link>
            <Link href="/settings" className={styles.menuItem}><span className={styles.menuIcon}><Bell size={20} /></span><span>{t('you.notifications')}</span><ChevronRight size={20} /></Link>
            <div className={`${styles.menuItem} ${styles.languageRow}`}>
              <span className={styles.menuIcon}><Globe2 size={20} /></span><span>{t('you.language')}</span>
              <div className={styles.langToggle}>
                <button type="button" className={`${styles.langOption} ${language === 'en' ? styles.langOptionActive : ''}`} onClick={() => setLanguage('en')}>English</button>
                <button type="button" className={`${styles.langOption} ${language === 'hi' ? styles.langOptionActive : ''}`} onClick={() => setLanguage('hi')}>हिन्दी</button>
              </div>
            </div>
          </section>

          <section className={styles.menuGroup}>
            <h2>{t('you.support')}</h2>
            <Link href="/contact" className={styles.menuItem}><span className={styles.menuIcon}><CircleHelp size={20} /></span><span>{t('you.helpCenter')}</span><ChevronRight size={20} /></Link>
            <Link href="/contact?category=feedback" className={styles.menuItem}><span className={styles.menuIcon}><MessageCircle size={20} /></span><span>{t('you.feedback')}</span><ChevronRight size={20} /></Link>
          </section>
        </div>

        <button className={styles.logoutBtn} onClick={handleLogout}><LogOut size={19} />{t('you.logOut')}</button>
      </main>
    </div>
  );
}
