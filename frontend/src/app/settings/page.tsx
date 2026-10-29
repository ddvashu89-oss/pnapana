'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '@/lib/motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import { authFetch, getApiUrl } from '@/lib/api';
import styles from './Settings.module.css';

interface UserData {
  id: number;
  name: string;
  email: string;
  token?: string;
}

export default function Settings() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<UserData | null>(null);

  // App Preferences State
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Gemini API Key State
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeySuccess, setApiKeySuccess] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // Account Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    try {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      if (parsed.gemini_api_key) {
        setApiKey(parsed.gemini_api_key);
      }
    } catch {
      router.push('/login');
    }
  }, [router]);

  // Password strength helper
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'transparent', width: '0%' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: '#e74c3c', width: '25%' };
    if (score === 2) return { score: 2, label: 'Fair', color: '#f39c12', width: '50%' };
    if (score === 3) return { score: 3, label: 'Good', color: '#3498db', width: '75%' };
    return { score: 4, label: 'Strong', color: '#27ae60', width: '100%' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t('settings.enterAllFields'));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(t('settings.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.passwordMismatch'));
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await authFetch('change_password.php', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setPasswordSuccess(t('settings.passwordUpdated'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (data.token && user) {
          const updatedUser = { ...user, token: data.token };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
      } else {
        setPasswordError(data.message || 'Failed to update password.');
      }
    } catch {
      setPasswordError('Network error. Please make sure backend server is running.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiKeyError(null);
    setApiKeySuccess(null);
    setApiKeyLoading(true);

    try {
      const res = await authFetch('update_gemini_key.php', {
        method: 'POST',
        body: JSON.stringify({ gemini_api_key: apiKey.trim() })
      });
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setApiKeySuccess(t('settings.apiKeyUpdated'));
        if (user) {
          const updatedUser = { ...user, gemini_api_key: apiKey.trim() || null };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
      } else {
        setApiKeyError(data.message || 'Failed to update Gemini API key.');
      }
    } catch {
      setApiKeyError('Network error. Please try again.');
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm deletion.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await authFetch('delete_account.php', {
        method: 'POST',
        body: JSON.stringify({ password: deletePassword })
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        localStorage.removeItem('user');
        alert(t('settings.deleteRaised'));
        router.push('/login');
      } else {
        setDeleteError(data.message || 'Failed to delete account.');
      }
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!user) return <Loader fullScreen label={t('common.loading')} />;

  return (
    <div className={styles.container}>
      {/* Animated Mesh Background */}
      <div className={styles.meshBg}>
        <div className={styles.meshOrb1}></div>
        <div className={styles.meshOrb2}></div>
        <div className={styles.meshOrb3}></div>
      </div>

      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </Link>
        <h1>{t('settings.title')}</h1>
      </header>

      <motion.main className={styles.settingsContent} variants={staggerContainer} initial="hidden" animate="visible">

        {/* Profile Section */}
        <motion.section className={styles.settingsCard} variants={fadeInUp}>
          <div className={styles.profileHeader}>
            <div className={styles.profilePicLarge}>
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=307c46&color=fff&size=100`} alt="Profile" />
            </div>
            <div className={styles.profileInfo}>
              <h2>{user.name}</h2>
              <p>{user.email || t('settings.plantParentExtraordinaire')}</p>
            </div>
          </div>
        </motion.section>

        {/* Security & Privacy Section */}
        <motion.section className={styles.settingsCard} variants={fadeInUp}>
          <h3 className={styles.cardTitle}>{t('settings.securityAndPrivacy')}</h3>

          <div className={styles.securityBadge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>{t('settings.securityActive')} • {t('settings.tokenSession')}</span>
          </div>

          {/* Gemini API Key Section */}
          <form onSubmit={handleUpdateApiKey} className={styles.securityForm} style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t('settings.geminiApiKey')}</h4>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ fontSize: '0.8rem', color: 'var(--accent-green)', textDecoration: 'none', fontWeight: 600 }}
              >
                Get Free Key ↗
              </a>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: '0.8rem' }}>
              {t('settings.geminiApiKeyHelp')}
            </p>

            {apiKeySuccess && (
              <div className={`${styles.alertBox} ${styles.alertSuccess}`}>
                ✓ {apiKeySuccess}
              </div>
            )}
            {apiKeyError && (
              <div className={`${styles.alertBox} ${styles.alertError}`}>
                ⚠ {apiKeyError}
              </div>
            )}

            <div className={styles.inputGroup}>
              <div className={styles.passwordField}>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className={styles.passwordInput}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy... (leave blank to clear)"
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  className={styles.togglePasswordBtn}
                  onClick={() => setShowApiKey(!showApiKey)}
                  aria-label="Toggle API Key visibility"
                >
                  {showApiKey ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.updatePasswordBtn} disabled={apiKeyLoading} style={{ marginTop: '0.4rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              {apiKeyLoading ? t('settings.updatingApiKey') : t('settings.updateApiKeyBtn')}
            </button>
          </form>

          {/* Change Password Section */}
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.8rem' }}>{t('settings.changePassword')}</h4>
          <form onSubmit={handleChangePassword} className={styles.securityForm}>
            {passwordSuccess && (
              <div className={`${styles.alertBox} ${styles.alertSuccess}`}>
                ✓ {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className={`${styles.alertBox} ${styles.alertError}`}>
                ⚠ {passwordError}
              </div>
            )}

            <div className={styles.inputGroup}>
              <label>{t('settings.currentPassword')}</label>
              <div className={styles.passwordField}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className={styles.passwordInput}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.togglePasswordBtn}
                  onClick={() => setShowCurrent(!showCurrent)}
                  aria-label="Toggle password visibility"
                >
                  {showCurrent ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>{t('settings.newPassword')}</label>
              <div className={styles.passwordField}>
                <input
                  type={showNew ? 'text' : 'password'}
                  className={styles.passwordInput}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars with mix of letters & numbers"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.togglePasswordBtn}
                  onClick={() => setShowNew(!showNew)}
                  aria-label="Toggle password visibility"
                >
                  {showNew ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
              {newPassword && (
                <div className={styles.strengthContainer}>
                  <div className={styles.strengthBar}>
                    <div className={styles.strengthFill} style={{ width: strength.width, backgroundColor: strength.color }}></div>
                  </div>
                  <span className={styles.strengthLabel} style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label>{t('settings.confirmNewPassword')}</label>
              <div className={styles.passwordField}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className={styles.passwordInput}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.togglePasswordBtn}
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label="Toggle password visibility"
                >
                  {showConfirm ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.updatePasswordBtn} disabled={passwordLoading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              {passwordLoading ? t('settings.updatingPassword') : t('settings.updatePasswordBtn')}
            </button>
          </form>
        </motion.section>

        {/* App Preferences */}
        <motion.section className={styles.settingsCard} variants={fadeInUp}>
          <h3 className={styles.cardTitle}>{t('settings.appPreferences')}</h3>

          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <div className={styles.settingIcon} style={{ background: 'rgba(52, 152, 219, 0.1)', color: '#3498db' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              </div>
              <div>
                <h4>{t('settings.pushNotifications')}</h4>
                <p>{t('settings.pushNotificationsText')}</p>
              </div>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <div className={styles.settingIcon} style={{ background: 'rgba(155, 89, 182, 0.1)', color: '#9b59b6' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              </div>
              <div>
                <h4>{t('settings.darkMode')}</h4>
                <p>{t('settings.darkModeText')}</p>
              </div>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
              <span className={styles.slider}></span>
            </label>
          </div>
        </motion.section>

        {/* Plant Care Settings */}
        <motion.section className={styles.settingsCard} variants={fadeInUp}>
          <h3 className={styles.cardTitle}>{t('settings.plantCare')}</h3>

          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <div className={styles.settingIcon} style={{ background: 'rgba(211, 106, 50, 0.1)', color: 'var(--accent-orange)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div>
                <h4>{t('settings.dailyReminderTime')}</h4>
                <p>{t('settings.dailyReminderText')}</p>
              </div>
            </div>
            <input
              type="time"
              className={styles.timePicker}
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>
        </motion.section>

        {/* Account Actions */}
        <motion.section className={styles.settingsCard} variants={fadeInUp}>
          <h3 className={styles.cardTitle}>{t('settings.accountActions')}</h3>

          <div className={styles.actionGrid}>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              {t('settings.logOut')}
            </button>
            <button className={styles.deleteBtn} onClick={() => { setDeleteError(null); setDeletePassword(''); setShowDeleteModal(true); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              {t('settings.requestDeletion')}
            </button>
          </div>
        </motion.section>

        <p className={styles.appVersion}>{t('settings.appVersion')}</p>

      </motion.main>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className={styles.modalBackdrop} onClick={() => !deleteLoading && setShowDeleteModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>{t('settings.deleteAccountModalTitle')}</h3>
            <p>{t('settings.deleteAccountWarning')}</p>

            {deleteError && (
              <div className={`${styles.alertBox} ${styles.alertError}`}>
                ⚠ {deleteError}
              </div>
            )}

            <div className={styles.inputGroup}>
              <label>{t('settings.confirmPasswordToDelete')}</label>
              <input
                type="password"
                className={styles.passwordInput}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="••••••••"
                disabled={deleteLoading}
                autoFocus
              />
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                {t('settings.cancel')}
              </button>
              <button
                type="button"
                className={styles.modalConfirmBtn}
                onClick={handleConfirmDeleteAccount}
                disabled={deleteLoading || !deletePassword}
              >
                {deleteLoading ? t('settings.deletingAccount') : t('settings.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
