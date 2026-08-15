'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Login.module.css';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function Login() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [showOtp, setShowOtp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const url = isLogin 
      ? 'http://127.0.0.1/pnapana/backend/api/login.php' 
      : 'http://127.0.0.1/pnapana/backend/api/signup.php';
    
    const body = isLogin ? { email, password } : { name, email, password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        localStorage.setItem('user', JSON.stringify(data.user));
        // Instead of redirecting immediately, show the OTP screen
        setShowOtp(true);
      } else {
        setError(data.message || data.error || t('login.genericError'));
      }
    } catch (err) {
      console.error(err);
      setError(t('login.connectionError'));
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Dummy OTP validation (accepts any non-empty OTP)
    if (otp.length > 0) {
      router.push('/dashboard');
    } else {
      setError(t('login.otpInvalid'));
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
          <h1>
            {showOtp
              ? t('login.titleOtp')
              : isLogin ? t('login.titleWelcomeBack') : t('login.titleJoin')}
          </h1>
          <p>
            {showOtp
              ? t('login.subtitleOtp')
              : isLogin ? t('login.subtitleSignIn') : t('login.subtitleSignUp')}
          </p>
        </div>
        
        {error && <div className={styles.error}>{error}</div>}

        {!showOtp ? (
          <>
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

              <button type="submit" className={styles.submitBtn}>
                {isLogin ? t('login.signIn') : t('login.signUp')}
              </button>
            </form>

            <div className={styles.toggleText}>
              {isLogin ? t('login.noAccount') : t('login.hasAccount')}
              <span onClick={() => setIsLogin(!isLogin)} className={styles.toggleLink}>
                {isLogin ? t('login.toggleToSignUp') : t('login.toggleToSignIn')}
              </span>
            </div>
          </>
        ) : (
          <form onSubmit={handleOtpSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>{t('login.otpLabel')}</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                required
                maxLength={6}
                className={styles.otpInput}
              />
            </div>
            <button type="submit" className={styles.submitBtn}>
              {t('login.verifyAndProceed')}
            </button>
          </form>
        )}
      </div>
      </div>
    </div>
  );
}
