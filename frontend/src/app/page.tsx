'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import MarketingNav from '@/components/MarketingNav';
import ScrollProgress from '@/components/motion/ScrollProgress';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';
import TiltCard from '@/components/motion/TiltCard';
import CountUp from '@/components/motion/CountUp';
import VelocityMarquee from '@/components/motion/VelocityMarquee';
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

const STEPS = [
  { emoji: '📸', number: '01', titleKey: 'landing.step1Title', textKey: 'landing.step1Text' },
  { emoji: '🌤️', number: '02', titleKey: 'landing.step2Title', textKey: 'landing.step2Text' },
  { emoji: '🌱', number: '03', titleKey: 'landing.step3Title', textKey: 'landing.step3Text' }
];

const FEATURES = [
  {
    image: 'https://images.unsplash.com/photo-1596018653491-d65730d20e2b?w=500&q=80',
    icon: '🔔',
    titleKey: 'landing.feature1Title',
    textKey: 'landing.feature1Text'
  },
  {
    image: 'https://images.unsplash.com/photo-1637226168180-0f275ed6ec57?w=500&q=80',
    icon: '🌧️',
    titleKey: 'landing.feature2Title',
    textKey: 'landing.feature2Text'
  },
  {
    image: 'https://images.unsplash.com/photo-1631536121875-28e737e31f78?w=500&q=80',
    icon: '📔',
    titleKey: 'landing.feature3Title',
    textKey: 'landing.feature3Text'
  }
];

/**
 * PLACEHOLDER marketing figures — these are invented for the count-up animation and
 * are NOT real product metrics. Replace them with real numbers (or delete the band)
 * before this page is shown to actual visitors.
 */
const STATS = [
  { value: 48000, suffix: '+', labelKey: 'landing.statPlants' },
  { value: 12500, suffix: '+', labelKey: 'landing.statParents' },
  { value: 320000, suffix: '+', labelKey: 'landing.statReminders' },
  { value: 47, suffix: '', labelKey: 'landing.statStreak' }
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
  const { t, language } = useLanguage();
  const typedPhrase = useTypewriter(language === 'hi' ? HERO_PHRASES_HI : HERO_PHRASES_EN);
  const reduce = useReducedMotion();

  const heroRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  // Hero parallax: tracked from the page sitting at the top until the hero has
  // fully scrolled past the top of the viewport.
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });
  const photoY = useTransform(heroProgress, [0, 1], ['0%', '18%']);
  const photoScale = useTransform(heroProgress, [0, 1], [1, 1.18]);
  const contentY = useTransform(heroProgress, [0, 1], [0, -90]);
  const contentOpacity = useTransform(heroProgress, [0, 0.65], [1, 0]);
  const cueOpacity = useTransform(heroProgress, [0, 0.12], [1, 0]);

  // Rail that fills as the three steps pass through the middle of the viewport.
  const { scrollYProgress: stepsProgress } = useScroll({
    target: stepsRef,
    offset: ['start 0.85', 'end 0.55']
  });
  const railScaleY = useSpring(stepsProgress, { stiffness: 90, damping: 26, restDelta: 0.001 });

  useEffect(() => {
    if (localStorage.getItem('user')) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div className={styles.container}>
      <ScrollProgress />

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
      <header className={styles.hero} ref={heroRef}>
        <motion.div
          className={styles.heroPhoto}
          style={reduce ? undefined : { y: photoY, scale: photoScale }}
        >
          <img src="https://images.unsplash.com/photo-1503149779833-1de50ebe5f8a?w=1600&q=80" alt="" />
        </motion.div>

        {/* Outer layer owns the scroll-linked drift; the inner one owns the entrance
            cascade, so the two never fight over the same transform/opacity. */}
        <motion.div
          className={styles.heroParallax}
          style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}
        >
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
        </motion.div>

        {/* Scroll affordance — fades out as soon as the visitor starts scrolling. */}
        <motion.a
          href="#how-it-works"
          className={styles.scrollCue}
          style={reduce ? undefined : { opacity: cueOpacity }}
          aria-label={t('landing.ctaSecondary')}
        >
          <span className={styles.scrollCueMouse}>
            <motion.span
              className={styles.scrollCueDot}
              animate={reduce ? undefined : { y: [0, 12, 0], opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
        </motion.a>

        {/* Decorative elements */}
        <motion.div
          className={styles.blob1}
          animate={reduce ? undefined : { scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className={styles.blob2}
          animate={reduce ? undefined : { scale: [1, 1.2, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </header>

      {/* How It Works Section */}
      <section id="how-it-works" className={styles.howItWorks}>
        <Reveal blur>
          <h2 className={styles.sectionTitle}>{t('landing.howItWorksTitle')}</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className={styles.sectionSubtitle}>{t('landing.howItWorksSubtitle')}</p>
        </Reveal>

        <div className={styles.stepsContainer} ref={stepsRef}>
          <div className={styles.railTrack} aria-hidden="true">
            <motion.div
              className={styles.railFill}
              style={reduce ? { scaleY: 1 } : { scaleY: railScaleY }}
            />
          </div>

          {STEPS.map((step, index) => (
            <Reveal
              key={step.number}
              className={styles.step}
              direction={index % 2 === 0 ? 'right' : 'left'}
              distance={60}
              amount={0.3}
            >
              <div className={styles.stepImage}>{step.emoji}</div>
              <div className={styles.stepContent}>
                <div className={styles.stepNumber}>{step.number}</div>
                <h3>{t(step.titleKey)}</h3>
                <p>{t(step.textKey)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Stats Band */}
      <section className={styles.statsBand}>
        <Stagger className={styles.statsGrid} stagger={0.1} amount={0.3}>
          {STATS.map((stat) => (
            <StaggerItem key={stat.labelKey} className={styles.statCard}>
              <div className={styles.statValue}>
                <CountUp to={stat.value} />
                {stat.suffix}
              </div>
              <div className={styles.statLabel}>{t(stat.labelKey)}</div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <Stagger className={styles.featureGrid} stagger={0.14}>
          {FEATURES.map((feature) => (
            <StaggerItem key={feature.titleKey} className={styles.featureCell}>
              <TiltCard className={styles.featureCard}>
                <div className={styles.featureThumb}>
                  <img src={feature.image} alt="" loading="lazy" />
                </div>
                <div className={styles.iconWrapper}>{feature.icon}</div>
                <h3>{t(feature.titleKey)}</h3>
                <p>{t(feature.textKey)}</p>
              </TiltCard>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Testimonials Section */}
      <section className={styles.testimonials}>
        <Reveal blur>
          <h2 className={styles.sectionTitle}>{t('landing.testimonialsTitle')}</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className={styles.sectionSubtitle}>{t('landing.testimonialsSubtitle')}</p>
        </Reveal>

        <Reveal amount={0.1} distance={24}>
          <VelocityMarquee baseVelocity={-2.2}>
            {TESTIMONIALS.map((item, i) => (
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
          </VelocityMarquee>
        </Reveal>
      </section>

      {/* Final CTA Section */}
      <section className={styles.finalCta}>
        <Reveal className={styles.finalCtaContent} blur distance={50}>
          <h2>{t('landing.finalCtaTitle')}</h2>
          <p>{t('landing.finalCtaText')}</p>
          <Link href="/login" className={styles.finalCtaBtn}>
            {t('landing.finalCtaBtn')}
          </Link>
        </Reveal>
      </section>

    </div>
  );
}
