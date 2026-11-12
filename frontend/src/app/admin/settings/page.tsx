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
  const [upiId, setUpiId] = useState('');
  const [upiPayeeName, setUpiPayeeName] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiKeyConfigured, setGeminiKeyConfigured] = useState(false);
  const [geminiKeySource, setGeminiKeySource] = useState<'dashboard' | 'server' | 'none'>('none');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiKeySaving, setGeminiKeySaving] = useState(false);
  const [geminiKeyMessage, setGeminiKeyMessage] = useState('');
  const [geminiKeyError, setGeminiKeyError] = useState('');
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
    adminFetchJson('admin_get_settings.php')
      .then(data => {
        const s = data.settings;
        setSiteName(s.site_name);
        setSupportEmail(s.support_email);
        setAllowSignups(s.allow_signups);
        setAiScanningEnabled(s.ai_scanning_enabled);
        setCommunityEnabled(s.community_enabled);
        setMaintenanceMode(s.maintenance_mode);
        setUpiId(s.upi_id ?? '');
        setUpiPayeeName(s.upi_payee_name ?? '');
        setGeminiKeyConfigured(Boolean(s.gemini_api_key_configured));
        setGeminiKeySource(s.gemini_api_key_source ?? 'none');
      })
      .catch(err => setError(err.message || 'Failed to load settings.'))
      .finally(() => setIsLoading(false));
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await adminFetch('admin_update_settings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_name: siteName,
          support_email: supportEmail,
          allow_signups: allowSignups,
          ai_scanning_enabled: aiScanningEnabled,
          community_enabled: communityEnabled,
          maintenance_mode: maintenanceMode,
          upi_id: upiId,
          upi_payee_name: upiPayeeName
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

  const saveGeminiKey = async () => {
    const key = geminiApiKey.trim();
    setGeminiKeyMessage('');
    setGeminiKeyError('');
    if (!key) {
      setGeminiKeyError('Enter a Gemini API key.');
      return;
    }
    setGeminiKeySaving(true);
    try {
      const res = await adminFetch('admin_update_gemini_key.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemini_api_key: key })
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') throw new Error(data.message || 'Could not save the shared key.');
      setGeminiApiKey('');
      setGeminiKeyConfigured(true);
      setGeminiKeySource('dashboard');
      setGeminiKeyMessage('Shared Gemini key saved. Customers will use this key automatically.');
    } catch (err) {
      setGeminiKeyError(err instanceof Error ? err.message : 'Could not save the shared key.');
    } finally {
      setGeminiKeySaving(false);
    }
  };

  const clearGeminiKey = async () => {
    if (!window.confirm('Remove the dashboard Gemini key? The server environment key will be used if one is configured.')) return;
    setGeminiKeyMessage('');
    setGeminiKeyError('');
    setGeminiKeySaving(true);
    try {
      const res = await adminFetch('admin_update_gemini_key.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear_gemini_api_key: true })
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') throw new Error(data.message || 'Could not remove the dashboard key.');
      setGeminiApiKey('');
      setGeminiKeyConfigured(false);
      setGeminiKeySource('none');
      setGeminiKeyMessage('Dashboard Gemini key removed.');
      load();
    } catch (err) {
      setGeminiKeyError(err instanceof Error ? err.message : 'Could not remove the dashboard key.');
    } finally {
      setGeminiKeySaving(false);
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

        <motion.div className={styles.settingsCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
          <h3 className={styles.settingsCardTitle}>Payments</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '-0.4rem', marginBottom: '1.2rem', lineHeight: 1.6 }}>
            Shown to customers on the subscription page. Until a UPI ID is set here, they cannot submit a payment.
          </p>
          <div className={styles.formGroup}>
            <label>UPI ID</label>
            <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@bank" autoComplete="off" spellCheck="false" />
          </div>
          <div className={styles.formGroup}>
            <label>Payee Name</label>
            <input type="text" value={upiPayeeName} onChange={e => setUpiPayeeName(e.target.value)} placeholder="Pnapana" />
          </div>
        </motion.div>

        <motion.div className={styles.settingsCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18 }}>
          <h3 className={styles.settingsCardTitle}>Shared Gemini AI</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '-0.4rem', marginBottom: '1.2rem', lineHeight: 1.6 }}>
            One server-side key powers Gemini features for every customer. The saved key is never returned to the browser.
          </p>
          <div className={styles.formGroup}>
            <label>Gemini API Key</label>
            <input
              type={showGeminiKey ? 'text' : 'password'}
              value={geminiApiKey}
              onChange={e => setGeminiApiKey(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveGeminiKey();
                }
              }}
              placeholder={geminiKeyConfigured ? 'Enter a new key to replace the configured key' : 'Enter the shared Gemini API key'}
              autoComplete="new-password"
              spellCheck="false"
            />
          </div>
          <label style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            <input type="checkbox" checked={showGeminiKey} onChange={e => setShowGeminiKey(e.target.checked)} />
            Show key while typing
          </label>
          <p style={{ color: geminiKeyConfigured ? 'var(--accent-green)' : 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {geminiKeyConfigured ? `Configured from ${geminiKeySource === 'dashboard' ? 'Admin Dashboard' : 'server environment'}.` : 'No shared Gemini key is configured.'}
          </p>
          {geminiKeyMessage && <p style={{ color: 'var(--accent-green)', fontSize: '0.85rem', marginBottom: '0.8rem' }}>{geminiKeyMessage}</p>}
          {geminiKeyError && <p className={styles.errorMessage}>{geminiKeyError}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" className={styles.saveBtn} disabled={geminiKeySaving} onClick={saveGeminiKey}>
              {geminiKeySaving ? 'Saving...' : geminiKeyConfigured ? 'Replace Shared Key' : 'Save Shared Key'}
            </button>
            {geminiKeySource === 'dashboard' && <button type="button" className={styles.retryBtn} disabled={geminiKeySaving} onClick={clearGeminiKey}>Remove Dashboard Key</button>}
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
