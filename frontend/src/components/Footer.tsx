'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isPublicMarketingRoute } from '@/lib/routePolicy';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import styles from './Footer.module.css';

export default function Footer() {
  const pathname = usePathname();
  const { t } = useLanguage();

  // Only show the marketing footer on public marketing routes
  if (!isPublicMarketingRoute(pathname)) {
    return null;
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerBrand}>
          <h2>Pnapana</h2>
          <p>{t('footer.tagline')}</p>
        </div>

        <div className={styles.footerLinks}>
          <div className={styles.linkColumn}>
            <h4>{t('footer.company')}</h4>
            <Link href="/about">{t('footer.aboutUs')}</Link>
            <Link href="/contact">{t('footer.contact')}</Link>
          </div>
          <div className={styles.linkColumn}>
            <h4>{t('footer.legal')}</h4>
            <Link href="/privacy-policy">{t('footer.privacyPolicy')}</Link>
            <Link href="/terms-of-service">{t('footer.termsOfService')}</Link>
          </div>
          <div className={styles.linkColumn}>
            <h4>{t('footer.social')}</h4>
            <Link href="#">Twitter</Link>
            <Link href="#">Instagram</Link>
          </div>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
