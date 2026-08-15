'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './MaintenanceGate.module.css';

// Routes that must stay reachable during maintenance no matter what: an admin
// needs to be able to log in to turn maintenance mode back off.
const ALWAYS_ALLOWED = ['/login'];

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<{ active: boolean; siteName: string; supportEmail: string } | null>(null);

  useEffect(() => {
    fetch('http://127.0.0.1/pnapana/backend/api/get_site_status.php')
      .then(res => res.json())
      .then(data => {
        if (data.status !== 'success') return;
        const s = data.settings;

        if (!s.maintenance_mode) {
          setStatus({ active: false, siteName: s.site_name, supportEmail: s.support_email });
          return;
        }

        const storedUser = localStorage.getItem('user');
        const isAdmin = storedUser ? !!JSON.parse(storedUser).is_admin : false;

        setStatus({ active: !isAdmin, siteName: s.site_name, supportEmail: s.support_email });
      })
      .catch(() => setStatus({ active: false, siteName: 'Pnapana', supportEmail: '' }));
  }, []);

  if (status?.active && !ALWAYS_ALLOWED.includes(pathname)) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.sprout}>🌱</div>
          <h1>{status.siteName} is taking a little break</h1>
          <p>We&apos;re doing some care and maintenance behind the scenes. Please check back soon.</p>
          {status.supportEmail && (
            <p className={styles.contact}>
              Need something urgently? <a href={`mailto:${status.supportEmail}`}>{status.supportEmail}</a>
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
