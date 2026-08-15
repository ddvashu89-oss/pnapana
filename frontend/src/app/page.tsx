'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import MarketingNav from '@/components/MarketingNav';
import styles from './Landing.module.css';

const TESTIMONIALS = [
  {
    text: 'Before pnapana, I could not keep a cactus alive. Now my apartment looks like a jungle. The smart weather adjustments are a game-changer!',
    avatar: '👩🏽',
    name: 'Sarah M.',
    role: 'Monstera Enthusiast'
  },
  {
    text: 'The interface is gorgeous and it actually makes me excited to check on my plants every morning. Best app I’ve downloaded this year.',
    avatar: '👨🏻‍🦱',
    name: 'David K.',
    role: 'Proud Plant Dad of 12'
  },
  {
    text: 'My pothos has never looked better. The care reminders come at exactly the right time, every time.',
    avatar: '🧕🏽',
    name: 'Priya R.',
    role: 'Pothos Parent'
  },
  {
    text: 'I travel a lot for work and pnapana keeps my whole collection alive while I’m gone. Total peace of mind.',
    avatar: '🧔🏾',
    name: 'Marcus T.',
    role: 'Frequent Traveler'
  },
  {
    text: 'The AI plant doctor caught a pest problem before I even noticed it. Saved my fiddle leaf fig!',
    avatar: '👩🏻',
    name: 'Elena V.',
    role: 'Fiddle Leaf Fan'
  },
  {
    text: 'Finally an app that doesn’t feel like a chore. The whole experience feels calm and intentional.',
    avatar: '🧑🏽',
    name: 'Jordan P.',
    role: 'Mindful Gardener'
  },
  {
    text: 'Went from killing every plant I owned to having 30+ thriving ones. This app genuinely changed everything.',
    avatar: '👩🏿',
    name: 'Aisha K.',
    role: 'Recovering Plant Killer'
  },
  {
    text: 'The community explore feed gives me so much inspiration for my next plant purchase. Dangerously good.',
    avatar: '👨🏼',
    name: 'Tom W.',
    role: 'Plant Collector'
  },
  {
    text: 'Watching my streak grow every day is oddly addictive, in the best way. I have not missed a watering day in three weeks.',
    avatar: '👵🏽',
    name: 'Grace O.',
    role: '47-Day Streak Holder'
  },
  {
    text: 'I love scrolling the community feed on my coffee break. Seeing everyone’s plants thrive keeps me motivated to keep mine alive too.',
    avatar: '🧑🏾',
    name: 'Noah B.',
    role: 'Community Regular'
  },
  {
    text: 'Between work and two kids I never had time to research plant care. Now the app just tells me exactly what to do and when.',
    avatar: '👩🏼‍🦰',
    name: 'Mia S.',
    role: 'Busy Plant Mom'
  },
  {
    text: 'I was skeptical about an app for something as simple as watering plants. Six months in, every single plant I own is thriving.',
    avatar: '👴🏻',
    name: 'Robert H.',
    role: 'Skeptic Turned Believer'
  }
];

const HERO_PHRASES_EN = ['Plant Companion', 'Garden Guide', 'Growth Partner', 'Green Ally'];
const HERO_PHRASES_HI = ['साथी पौधा', 'बगीचे का गाइड', 'ग्रोथ पार्टनर', 'हरा सहयोगी'];
const TYPE_SPEED = 70;
const DELETE_SPEED = 40;
const PAUSE_AFTER_TYPE = 1800;
const PAUSE_AFTER_DELETE = 300;

function useTypewriter(phrases: string[]) {
  const [text, setText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    let delay = isDeleting ? DELETE_SPEED : TYPE_SPEED;

    if (!isDeleting && text === currentPhrase) {
      delay = PAUSE_AFTER_TYPE;
    } else if (isDeleting && text === '') {
      delay = PAUSE_AFTER_DELETE;
    }

    const timer = setTimeout(() => {
      if (!isDeleting && text === currentPhrase) {
        setIsDeleting(true);
        return;
      }
      if (isDeleting && text === '') {
        setIsDeleting(false);
        setPhraseIndex((phraseIndex + 1) % phrases.length);
        return;
      }
      const nextLength = text.length + (isDeleting ? -1 : 1);
      setText(currentPhrase.slice(0, nextLength));
    }, delay);

    return () => clearTimeout(timer);
  }, [text, isDeleting, phraseIndex, phrases]);

  return text;
}

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [heroLoaded, setHeroLoaded] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { t, language } = useLanguage();
  const typedPhrase = useTypewriter(language === 'hi' ? HERO_PHRASES_HI : HERO_PHRASES_EN);

  useEffect(() => {
    // Check login status
    if (localStorage.getItem('user')) {
      setIsLoggedIn(true);
    }
    
    // Trigger hero animations shortly after mount
    setTimeout(() => {
      setHeroLoaded(true);
    }, 100);

    // Setup intersection observer for scroll animations
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles.animate);
          observerRef.current?.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    const animatedElements = document.querySelectorAll(`.${styles.animateOnScroll}`);

    if (window.location.hash) {
      // Landed directly on a deep link (e.g. /#how-it-works) — the browser's native
      // anchor-jump races with this observer's setup and can leave content stuck at
      // opacity:0. Scroll-reveal only makes sense when scrolling down from the top,
      // so just show everything immediately instead.
      animatedElements.forEach((el) => el.classList.add(styles.animate));
    } else {
      animatedElements.forEach((el) => observerRef.current?.observe(el));
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <MarketingNav labels={{
        explore: t('nav.explore'),
        about: t('nav.about'),
        careGuide: t('nav.careGuide'),
        contact: t('nav.contact'),
        signIn: t('nav.signIn'),
        getStarted: t('nav.getStarted'),
        dashboard: t('nav.dashboard'),
      }} />

      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.heroPhoto}>
          <img src="https://images.unsplash.com/photo-1503149779833-1de50ebe5f8a?w=1600&q=80" alt="" />
        </div>
        <motion.div
          className={styles.heroContent}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { 
              opacity: 1,
              transition: { staggerChildren: 0.15, delayChildren: 0.1 }
            }
          }}
        >
          <motion.div 
            className={`${styles.heroBadge}`}
            variants={{
              hidden: { opacity: 0, y: -20, scale: 0.95 },
              visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 20 } }
            }}
          >
            {t('landing.badge')}
          </motion.div>
          <motion.h1 
            className={`${styles.title}`}
            variants={{
              hidden: { opacity: 0, y: 40, filter: 'blur(10px)' },
              visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } }
            }}
          >
            {t('landing.titlePrefix')}{' '}
            <span className={styles.highlight}>
              {typedPhrase}
              <span className={styles.typeCursor} aria-hidden="true">|</span>
            </span>
          </motion.h1>
          <motion.p 
            className={`${styles.subtitle}`}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } }
            }}
          >
            {t('landing.subtitle')}
          </motion.p>
          <motion.div 
            className={`${styles.ctaGroup}`}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } }
            }}
          >
            <Link href={isLoggedIn ? "/dashboard" : "/login"} className={styles.primaryCta}>
              {isLoggedIn ? t('landing.ctaDashboard') : t('landing.ctaPrimary')}
            </Link>
            <a href="#how-it-works" className={styles.secondaryCta}>
              {t('landing.ctaSecondary')}
            </a>
          </motion.div>
        </motion.div>
        
        {/* Decorative elements */}
        <motion.div 
          className={styles.blob1}
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className={styles.blob2}
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, -90, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </header>

      {/* How It Works Section */}
      <section id="how-it-works" className={styles.howItWorks}>
        <h2 className={`${styles.sectionTitle} ${styles.animateOnScroll}`}>{t('landing.howItWorksTitle')}</h2>
        <p className={`${styles.sectionSubtitle} ${styles.animateOnScroll}`}>
          {t('landing.howItWorksSubtitle')}
        </p>

        <div className={styles.stepsContainer}>
          <div className={`${styles.step} ${styles.animateOnScroll}`}>
            <div className={styles.stepImage}>📸</div>
            <div className={styles.stepContent}>
              <div className={styles.stepNumber}>01</div>
              <h3>{t('landing.step1Title')}</h3>
              <p>{t('landing.step1Text')}</p>
            </div>
          </div>

          <div className={`${styles.step} ${styles.animateOnScroll}`}>
            <div className={styles.stepImage}>🌤️</div>
            <div className={styles.stepContent}>
              <div className={styles.stepNumber}>02</div>
              <h3>{t('landing.step2Title')}</h3>
              <p>{t('landing.step2Text')}</p>
            </div>
          </div>

          <div className={`${styles.step} ${styles.animateOnScroll}`}>
            <div className={styles.stepImage}>🌱</div>
            <div className={styles.stepContent}>
              <div className={styles.stepNumber}>03</div>
              <h3>{t('landing.step3Title')}</h3>
              <p>{t('landing.step3Text')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={`${styles.featureGrid} ${styles.animateOnScroll}`}>
          <div className={styles.featureCard}>
            <div className={styles.featureThumb}>
              <img src="https://images.unsplash.com/photo-1596018653491-d65730d20e2b?w=500&q=80" alt="" loading="lazy" />
            </div>
            <div className={styles.iconWrapper}>🔔</div>
            <h3>{t('landing.feature1Title')}</h3>
            <p>{t('landing.feature1Text')}</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureThumb}>
              <img src="https://images.unsplash.com/photo-1637226168180-0f275ed6ec57?w=500&q=80" alt="" loading="lazy" />
            </div>
            <div className={styles.iconWrapper}>🌧️</div>
            <h3>{t('landing.feature2Title')}</h3>
            <p>{t('landing.feature2Text')}</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureThumb}>
              <img src="https://images.unsplash.com/photo-1631536121875-28e737e31f78?w=500&q=80" alt="" loading="lazy" />
            </div>
            <div className={styles.iconWrapper}>📔</div>
            <h3>{t('landing.feature3Title')}</h3>
            <p>{t('landing.feature3Text')}</p>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className={styles.testimonials}>
        <h2 className={`${styles.sectionTitle} ${styles.animateOnScroll}`}>{t('landing.testimonialsTitle')}</h2>
        <p className={`${styles.sectionSubtitle} ${styles.animateOnScroll}`}>
          {t('landing.testimonialsSubtitle')}
        </p>
        
        <div className={`${styles.testimonialMarquee} ${styles.animateOnScroll}`}>
          <div className={styles.testimonialTrack}>
            {[...TESTIMONIALS, ...TESTIMONIALS].map((item, i) => (
              <div className={styles.testimonialCard} key={i}>
                <div className={styles.quoteMark}>&quot;</div>
                <p className={styles.testimonialText}>
                  &quot;{item.text}&quot;
                </p>
                <div className={styles.author}>
                  <div className={styles.authorAvatar}>{item.avatar}</div>
                  <div className={styles.authorInfo}>
                    <h4>{item.name}</h4>
                    <p>{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className={styles.finalCta}>
        <div className={`${styles.finalCtaContent} ${styles.animateOnScroll}`}>
          <h2>{t('landing.finalCtaTitle')}</h2>
          <p>{t('landing.finalCtaText')}</p>
          <Link href="/login" className={styles.finalCtaBtn}>
            {t('landing.finalCtaBtn')}
          </Link>
        </div>
      </section>

    </div>
  );
}
