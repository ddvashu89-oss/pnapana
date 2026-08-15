'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '@/components/Loader';
import { adminFetch, adminFetchJson } from '@/lib/adminApi';
import styles from '../Admin.module.css';

export default function AdminSettings() {
  const [siteName, setSiteName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [allowSignups, setAllowSignups] = useState(true);
  const [aiScanningEnabled, setAiScanningEnabled] = useState(true);
  const [communityEnabled, setCommunityEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setIsLoading(true);
    setError('');
    adminFetchJson('http://127.0.0.1/pnapana/backend/api/admin_get_settings.php')
      .then(data => {
        const s = data.settings;
        setSiteName(s.site_name);
        setSupportEmail(s.support_email);
        setAllowSignups(s.allow_signups);
        setAiScanningEnabled(s.ai_scanning_enabled);
        setCommunityEnabled(s.community_enabled);
        setMaintenanceMode(s.maintenance_mode);
      })
      .catch(err => setError(err.message || 'Failed to load settings.'))
      .finally(() => setIsLoading(false));
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await adminFetch('http://127.0.0.1/pnapana/backend/api/admin_update_settings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_name: siteName,
          support_email: supportEmail,
          allow_signups: allowSignups,
          ai_scanning_enabled: aiScanningEnabled,
          community_enabled: communityEnabled,
          maintenance_mode: maintenanceMode
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Settings</h1>
          </div>
        </div>
        <Loader label="Loading..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Settings</h1>
          </div>
        </div>
        <div className={styles.errorState}>
          <p className={styles.errorMessage}>{error}</p>
          <button className={styles.retryBtn} onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Platform-wide configuration and feature toggles.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className={styles.settingsGrid}>
        <motion.div className={styles.settingsCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <h3 className={styles.settingsCardTitle}>General</h3>
          <div className={styles.formGroup}>
            <label>Site Name</label>
            <input type="text" value={siteName} onChange={e => setSiteName(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>Support Email</label>
            <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} />
          </div>
        </motion.div>

        <motion.div className={styles.settingsCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <h3 className={styles.settingsCardTitle}>Feature Flags</h3>

          <div className={styles.settingRow}>
            <div>
              <h4>Allow New Signups</h4>
              <p>Let new users register for an account.</p>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={allowSignups} onChange={e => setAllowSignups(e.target.checked)} />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.settingRow}>
            <div>
              <h4>AI Plant Scanning</h4>
              <p>Enable Gemini-powered identification and health checks.</p>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={aiScanningEnabled} onChange={e => setAiScanningEnabled(e.target.checked)} />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.settingRow}>
            <div>
              <h4>Community Posts</h4>
              <p>Allow users to share plants and earn coins.</p>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={communityEnabled} onChange={e => setCommunityEnabled(e.target.checked)} />
              <span className={styles.slider}></span>
            </label>
          </div>
        </motion.div>

        <motion.div className={`${styles.settingsCard} ${styles.dangerZone}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <h3 className={styles.settingsCardTitle}>Danger Zone</h3>
          <div className={styles.settingRow}>
            <div>
              <h4>Maintenance Mode</h4>
              <p>Show a maintenance screen to everyone except admins while you work on the site.</p>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={maintenanceMode} onChange={e => setMaintenanceMode(e.target.checked)} />
              <span className={styles.slider}></span>
            </label>
          </div>
        </motion.div>

        <div className={styles.settingsActions}>
          <button type="submit" className={styles.saveBtn} disabled={isSaving}>
            {isSaving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
