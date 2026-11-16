'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getApiUrl } from '@/lib/api';
import styles from './Login.module.css';

export default function Login() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'signup') setIsLogin(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    const url = isLogin 
      ? getApiUrl('login.php') 
      : getApiUrl('signup.php');
    
    const body = isLogin 
      ? { email, password } 
      : { name, email, password };

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
    } finally {
      setBusy(false);
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
        
        {error && <div className={styles.error} role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {!isLogin && (
            <div className={styles.inputGroup}>
              <label htmlFor="signup-name">{t('login.name')}</label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className={styles.inputGroup}>
              <label htmlFor="login-email">{t('login.email')}</label>
            <input
                id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              required
            />
          </div>

          <div className={styles.inputGroup}>
              <label htmlFor="login-password">{t('login.password')}</label>
            <input
                id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={busy}>
            {busy ? (language === 'hi' ? 'कृपया रुकें…' : 'Please wait…') : isLogin ? t('login.signIn') : t('login.signUp')}
          </button>
        </form>

        {isLogin && (
          <div className={styles.toggleText}>
            <Link href="/forgot-password" className={styles.toggleLink} style={{ marginLeft: 0 }}>
              {language === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot your password?'}
            </Link>
          </div>
        )}

        <div className={styles.toggleText}>
          {isLogin ? t('login.noAccount') : t('login.hasAccount')}
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className={styles.toggleLink}>
            {isLogin ? t('login.toggleToSignUp') : t('login.toggleToSignIn')}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
