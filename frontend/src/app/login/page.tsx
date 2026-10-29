'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getApiUrl } from '@/lib/api';
import styles from './Login.module.css';

export default function Login() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const url = isLogin 
      ? getApiUrl('login.php') 
      : getApiUrl('signup.php');
    
    const body = isLogin 
      ? { email, password } 
      : { name, email, password, gemini_api_key: geminiApiKey.trim() };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        localStorage.setItem('user', JSON.stringify(data.user));
        // Admins belong in the control panel, not the plant-owner app.
        router.push(data.user.is_admin ? '/admin' : '/dashboard');
      } else {
        setError(data.message || data.error || t('login.genericError'));
      }
    } catch (err) {
      console.error(err);
      setError(t('login.connectionError'));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.photoPanel}>
        <img src="https://images.unsplash.com/photo-1509223197845-458d87318791?w=1200&q=80" alt="" />
        <div className={styles.photoQuote}>
          <p>{t('login.quote')}</p>
          <span>{t('login.quoteBrand')}</span>
        </div>
      </div>
      <div className={styles.formPanel}>
      <Link href="/" className={styles.backLink}>{t('login.backToHome')}</Link>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>{isLogin ? t('login.titleWelcomeBack') : t('login.titleJoin')}</h1>
          <p>{isLogin ? t('login.subtitleSignIn') : t('login.subtitleSignUp')}</p>
        </div>
        
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {!isLogin && (
            <div className={styles.inputGroup}>
              <label>{t('login.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label>{t('login.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label>{t('login.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <div className={styles.inputGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>{t('login.geminiApiKey')}</label>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.78rem', color: 'var(--accent-green)', textDecoration: 'none', fontWeight: 600 }}
                >
                  Get Free Key ↗
                </a>
              </div>
              <input
                type="text"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder={t('login.geminiApiKeyPlaceholder')}
                autoComplete="off"
                spellCheck="false"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '-0.2rem', lineHeight: '1.3' }}>
                {t('login.geminiApiKeyHelp')}
              </span>
            </div>
          )}

          <button type="submit" className={styles.submitBtn}>
            {isLogin ? t('login.signIn') : t('login.signUp')}
          </button>
        </form>

        {isLogin && (
          <div className={styles.toggleText}>
            <Link href="/forgot-password" className={styles.toggleLink} style={{ marginLeft: 0 }}>
              Forgot your password?
            </Link>
          </div>
        )}

        <div className={styles.toggleText}>
          {isLogin ? t('login.noAccount') : t('login.hasAccount')}
          <span onClick={() => setIsLogin(!isLogin)} className={styles.toggleLink}>
            {isLogin ? t('login.toggleToSignUp') : t('login.toggleToSignIn')}
          </span>
        </div>
      </div>
      </div>
    </div>
  );
}
