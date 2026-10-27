'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import MarketingNav from '@/components/MarketingNav';
import ScrollProgress from '@/components/motion/ScrollProgress';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';
import VelocityMarquee from '@/components/motion/VelocityMarquee';
import { 
  Thermometer, 
  Lightbulb, 
  Droplets, 
  Calendar as CalendarIcon, 
  Sprout, 
  Search, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Scan,
  ShoppingBag,
  Heart,
  Sun,
  MessageCircle
} from 'lucide-react';
import { getPlantImageUrl, handlePlantImageError } from '@/lib/plantImages';
import { getApiUrl } from '@/lib/api';
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
    text: 'The Pnapana botanical database identified an obscure species in my balcony immediately. Truly incredible.',
    avatar: '👩🏻',
    name: 'Elena V.',
    role: 'Botanical Collector'
  }
];

const HERO_PHRASES_EN = ['Home Plants', 'Indoor Jungle', 'Green Sanctuary', 'Living Garden'];
const HERO_PHRASES_HI = ['घरेलू पौधे', 'इनडोर जंगल', 'हरा अभयारण्य', 'जीवंत बगीचा'];
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
  const { t } = useLanguage();
  const typedPhrase = useTypewriter(HERO_PHRASES_EN);
  const reduce = useReducedMotion();

  // Interactive Live Botanical Search State on Homepage
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('Mar');
  const [activeTab, setActiveTab] = useState<'new' | 'harvested'>('new');

  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });
  const contentY = useTransform(heroProgress, [0, 1], [0, -60]);
  const contentOpacity = useTransform(heroProgress, [0, 0.75], [1, 0.2]);

  useEffect(() => {
    if (localStorage.getItem('user')) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLiveSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q || q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(getApiUrl(`search_trefle.php?q=${encodeURIComponent(q.trim())}&limit=4`));
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.data)) {
        setSearchResults(data.data);
      }
    } catch {
      // Fallback sample results if offline
      setSearchResults([
        { id: 76921, common_name: 'Valley oak', scientific_name: 'Quercus lobata', family: 'Fagaceae', image_url: 'https://bs.plantnet.org/image/o/15e847c3894982fd3b10431a64c80dc365b47679' },
        { id: 62427, common_name: 'Swiss Cheese Plant', scientific_name: 'Monstera deliciosa', family: 'Araceae', image_url: 'https://bs.plantnet.org/image/o/a3a043c163463e4cf1941e473a134700ed327d84' }
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={styles.container}>
      <ScrollProgress />

      {/* Floating Pill Navigation */}
      <MarketingNav labels={{
        explore: 'Plants Market',
        about: 'About',
        careGuide: 'Care Calendar',
        contact: 'Contact',
        signIn: 'Sign In',
        getStarted: 'Get Started',
        dashboard: 'Dashboard',
      }} />

      {/* Hero Section */}
      <header className={styles.hero} ref={heroRef} style={{ paddingBottom: '3rem' }}>
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
                transition: { staggerChildren: 0.12, delayChildren: 0.1 }
              }
            }}
          >
            <motion.div
              className={styles.heroBadge}
              variants={{
                hidden: { opacity: 0, y: -20, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 20 } }
              }}
            >
              <Sparkles size={16} /> Botanical Intelligence &amp; Care
            </motion.div>

            <motion.h1
              className={styles.title}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
              }}
            >
              Manage Your{' '}
              <span className={styles.highlight}>
                {typedPhrase}
                <span className={styles.typeCursor} aria-hidden="true">|</span>
              </span>
            </motion.h1>

            <motion.p
              className={styles.subtitle}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
              }}
            >
              Cultivate thriving green spaces with real-time room environment tracking, visual watering calendars, and 400,000+ botanical species verified via Pnapana Botanical Intelligence.
            </motion.p>

            <motion.div
              className={styles.ctaGroup}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
              }}
            >
              <Link href={isLoggedIn ? "/dashboard" : "/login"} className={styles.primaryCta}>
                {isLoggedIn ? "Go To Dashboard" : "Start Growing Free"}
              </Link>
              <a href="#showcase" className={styles.secondaryCta}>
                Explore Live Demo
              </a>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* =========================================================================
            MOCKUP-INSPIRED HERO DEVICE SHOWCASE WITH FLOATING BENTO CARDS
            ========================================================================= */}
        <section id="showcase" className={styles.heroShowcaseWrapper}>
          
          {/* Orbiting Bento Pill 1 (Left): Live Room Sensor Metrics */}
          <div className={styles.orbitCardLeft}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              • Room Environment
            </div>
            <div className={styles.orbitMetricItem}>
              <div className={styles.orbitIconWrap} style={{ background: '#f4fbe4', color: '#65a30d' }}>
                <Thermometer size={18} />
              </div>
              <div className={styles.orbitMetricMeta}>
                <span className={styles.orbitMetricLabel}>Room Temp</span>
                <span className={styles.orbitMetricVal}>24°C</span>
              </div>
            </div>

            <div className={styles.orbitMetricItem}>
              <div className={styles.orbitIconWrap} style={{ background: '#eafaf0', color: '#16a34a' }}>
                <Lightbulb size={18} />
              </div>
              <div className={styles.orbitMetricMeta}>
                <span className={styles.orbitMetricLabel}>Room Light</span>
                <span className={styles.orbitMetricVal}>76% (Optimal)</span>
              </div>
            </div>

            <div className={styles.orbitMetricItem}>
              <div className={styles.orbitIconWrap} style={{ background: '#fef8e7', color: '#d97706' }}>
                <Droplets size={18} />
              </div>
              <div className={styles.orbitMetricMeta}>
                <span className={styles.orbitMetricLabel}>Room Humidity</span>
                <span className={styles.orbitMetricVal}>20% (Dry Alert)</span>
              </div>
            </div>
          </div>

          {/* Central Mobile Mockup Device (Matches Exact Reference Mockup) */}
          <div className={styles.deviceMockupFrame}>
            {/* Top Bar with Avatar, Theme & Message Buttons */}
            <div className={styles.deviceTopBar}>
              <div className={styles.deviceAvatarPill}>
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80"
                  alt="User"
                  className={styles.deviceAvatarImg}
                />
              </div>
              <div className={styles.deviceTopActions}>
                <div className={styles.deviceActionCircle}><MessageCircle size={15} /></div>
                <div className={styles.deviceActionCircle}><Sun size={15} /></div>
              </div>
            </div>

            {/* Heading */}
            <div className={styles.deviceMainHeading}>
              Manage Your
              <span>Home Plants</span>
            </div>

            {/* Featured Vibrant Lime-Green Banner Card */}
            <div className={styles.mockupLimeCard}>
              <img
                src="https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=350&q=80"
                alt="Succulent"
                className={styles.mockupLimeCardBgCutout}
              />
              <div className={styles.mockupLimeCardContent}>
                <div className={styles.mockupGlassBadge}>
                  <div className={styles.mockupGlassBadgeTitle}>Succulent</div>
                  <div className={styles.mockupGlassBadgeSub}>12 days ago planted</div>
                </div>

                <div className={styles.mockupPillBadge}>
                  <div className={styles.mockupPillIcon} style={{ background: '#f4fbe4', color: '#4d7c0f' }}>
                    <Thermometer size={13} />
                  </div>
                  <div className={styles.mockupPillText}>
                    <span>Room temp</span>
                    24°C
                  </div>
                </div>

                <div className={styles.mockupPillBadge}>
                  <div className={styles.mockupPillIcon} style={{ background: '#eafaf0', color: '#15803d' }}>
                    <Lightbulb size={13} />
                  </div>
                  <div className={styles.mockupPillText}>
                    <span>Room Light</span>
                    76%
                  </div>
                </div>
              </div>
            </div>

            {/* Segmented Tabs: New Plant • / Harvested */}
            <div className={styles.mockupTabsBar}>
              <div
                className={activeTab === 'new' ? styles.mockupTabItemActive : styles.mockupTabItemInactive}
                onClick={() => setActiveTab('new')}
              >
                New Plant {activeTab === 'new' && <span className={styles.mockupTabDot} />}
              </div>
              <div
                className={activeTab === 'harvested' ? styles.mockupTabItemActive : styles.mockupTabItemInactive}
                onClick={() => setActiveTab('harvested')}
              >
                Harvested {activeTab === 'harvested' && <span className={styles.mockupTabDot} />}
              </div>
            </div>

            {/* Mini Plant Cards Grid with Circular Donut Rings */}
            <div className={styles.mockupMiniGrid}>
              <div className={styles.mockupMiniCard}>
                <img
                  src="https://images.unsplash.com/photo-1572454591674-2739f30d8c40?w=200&q=80"
                  alt="Pink Gerbera"
                  className={styles.mockupMiniImg}
                  onError={handlePlantImageError}
                />
                <div className={styles.mockupMiniTitle}>Pink Gerbera</div>
                <div className={styles.mockupMiniSub}>
                  <span style={{ color: '#ec4899', fontWeight: 800 }}>●</span> 10 days until harvest
                </div>
              </div>

              <div className={styles.mockupMiniCard}>
                <img
                  src="https://images.unsplash.com/photo-1512428813834-c702c7702b78?w=200&q=80"
                  alt="Nest Fern"
                  className={styles.mockupMiniImg}
                  onError={handlePlantImageError}
                />
                <div className={styles.mockupMiniTitle}>Nest Fern</div>
                <div className={styles.mockupMiniSub}>
                  <span style={{ color: '#22c55e', fontWeight: 800 }}>●</span> 26 days until harvest
                </div>
              </div>

              <div className={styles.mockupMiniCard}>
                <img
                  src="https://images.unsplash.com/photo-1567689265664-1c48de61db0b?w=200&q=80"
                  alt="Young Banana"
                  className={styles.mockupMiniImg}
                  onError={handlePlantImageError}
                />
                <div className={styles.mockupMiniTitle}>Young Banana</div>
                <div className={styles.mockupMiniSub}>
                  <span style={{ color: '#16a34a', fontWeight: 800 }}>●</span> 27 days until harvest
                </div>
              </div>

              <div className={styles.mockupMiniCard}>
                <img
                  src="https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&q=80"
                  alt="Dahlia"
                  className={styles.mockupMiniImg}
                  onError={handlePlantImageError}
                />
                <div className={styles.mockupMiniTitle}>Dahlia</div>
                <div className={styles.mockupMiniSub}>
                  <span style={{ color: '#f59e0b', fontWeight: 800 }}>●</span> 8 days until harvest
                </div>
              </div>
            </div>

            {/* Mockup Floating Bottom Dock */}
            <div className={styles.mockupBottomDock}>
              <div className={styles.mockupDockBtnActive}><Sprout size={16} /></div>
              <div className={styles.mockupDockBtn}><CalendarIcon size={16} /></div>
              <div className={styles.mockupDockBtn}><ShoppingBag size={16} /></div>
              <div className={styles.mockupDockBtn}><Heart size={16} /></div>
            </div>
          </div>

          {/* Orbiting Bento Pill 2 (Right): Botanical Intelligence */}
          <div className={styles.orbitCardRight}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#15803d', fontWeight: 800, fontSize: '0.82rem' }}>
              <Sparkles size={16} />
              <span>Pnapana AI Verified</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#557061', lineHeight: '1.4' }}>
              Access over <strong>400,000+ scientific species</strong>, verified taxonomy &amp; custom watering formulas.
            </p>
            <div style={{ background: '#f4f8f5', borderRadius: '12px', padding: '0.6rem 0.8rem', border: '1px solid #dce8e0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#12281b' }}>🌿 Quercus lobata</div>
              <div style={{ fontSize: '0.68rem', color: '#637c6d' }}>Valley Oak • Family: Fagaceae</div>
            </div>
            <Link
              href="/explore"
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#15803d',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                textDecoration: 'none'
              }}
            >
              Browse Registry ↗
            </Link>
          </div>

        </section>
      </header>

      {/* =========================================================================
          FOUR PILLARS BENTO GRID (MATCHING THE 4 SCREENS IN REFERENCE MOCKUP)
          ========================================================================= */}
      <section className={styles.bentoSection}>
        <div className={styles.bentoHeader}>
          <div className={styles.bentoTag}>
            <Sparkles size={14} /> The Complete Botanical Suite
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#12281b', letterSpacing: '-0.02em', marginBottom: '0.8rem' }}>
            Built for Passionate Plant Parents
          </h2>
          <p style={{ color: '#557061', fontSize: '1.1rem', maxWidth: '620px', margin: '0 auto' }}>
            From real-time room microclimate diagnostics to automated watering schedules and curated botanical accessories.
          </p>
        </div>

        <div className={styles.bentoGrid}>
          
          {/* Card 1: Manage Your Home Plants (Span 8) */}
          <div className={styles.bentoCardSpan8}>
            <div>
              <div className={styles.bentoTag}>
                <Sprout size={14} /> Smart Plant Care
              </div>
              <h3 className={styles.bentoTitle}>Manage Every Room &amp; Species Seamlessly</h3>
              <p className={styles.bentoDesc}>
                Set tailored watering rhythms, track dormancy cycles, and log photo updates with precision harvest indicators.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ background: '#f4fbe4', borderRadius: '20px', padding: '1.2rem', border: '1px solid #e1f2c2' }}>
                <div style={{ color: '#4d7c0f', fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.2rem' }}>24°C</div>
                <div style={{ fontSize: '0.85rem', color: '#4d7c0f', fontWeight: 600 }}>Adaptive Temperature</div>
                <div style={{ fontSize: '0.76rem', color: '#65a30d', marginTop: '0.4rem' }}>Adjusts watering when heatwaves occur</div>
              </div>

              <div style={{ background: '#eafaf0', borderRadius: '20px', padding: '1.2rem', border: '1px solid #c8edd5' }}>
                <div style={{ color: '#15803d', fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.2rem' }}>76%</div>
                <div style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600 }}>Room Daylight Index</div>
                <div style={{ fontSize: '0.76rem', color: '#16a34a', marginTop: '0.4rem' }}>Calculates photosynthesis health</div>
              </div>

              <div style={{ background: '#fef8e7', borderRadius: '20px', padding: '1.2rem', border: '1px solid #feeac1' }}>
                <div style={{ color: '#b45309', fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.2rem' }}>10 Days</div>
                <div style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 600 }}>Optimal Watering Cycle</div>
                <div style={{ fontSize: '0.76rem', color: '#d97706', marginTop: '0.4rem' }}>Zero root rot guarantee</div>
              </div>
            </div>
          </div>

          {/* Card 2: Scan Your Plant (Span 4) */}
          <div className={styles.bentoCardSpan4}>
            <div>
              <div className={styles.bentoTag}>
                <Scan size={14} /> Instant Camera Scan
              </div>
              <h3 className={styles.bentoTitle}>Pnapana Lens</h3>
              <p className={styles.bentoDesc}>
                Take a quick snap with your smartphone camera. Our system cross-references 400,000+ species to give you scientific taxonomy and care advice in seconds.
              </p>
            </div>
            <div style={{ background: 'var(--grad-lime-banner)', borderRadius: '20px', padding: '1.2rem', color: '#ffffff', textAlign: 'center' }}>
              <Scan size={32} style={{ margin: '0 auto 0.6rem' }} />
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>Instant Botanical ID</div>
              <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>Zero guessing, 100% botanical accuracy</div>
            </div>
          </div>

          {/* Card 3: Your Plants Calendar (Span 4) */}
          <div className={styles.bentoCardSpan4}>
            <div>
              <div className={styles.bentoTag}>
                <CalendarIcon size={14} /> Watering Rituals
              </div>
              <h3 className={styles.bentoTitle}>Interactive Calendar</h3>
              <p className={styles.bentoDesc}>
                Never miss a drop. Visual calendar badges sync across all your devices so your plants get the right care at the exact moment they need it.
              </p>
            </div>

            {/* Interactive Month Selector */}
            <div style={{ background: '#f9fbf9', borderRadius: '20px', padding: '1rem', border: '1px solid #e1ece5' }}>
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    style={{
                      background: selectedMonth === m ? '#f5f042' : '#ffffff',
                      color: '#12281b',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      padding: '0.35rem 0.6rem',
                      borderRadius: '999px',
                      border: '1px solid #e1ece5'
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.72rem', color: '#637c6d' }}>
                <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((d) => (
                  <div
                    key={d}
                    style={{
                      padding: '0.35rem 0',
                      borderRadius: '8px',
                      background: [7, 8, 9, 13].includes(d) ? '#eaf7ee' : '#ffffff',
                      color: [7, 8, 9, 13].includes(d) ? '#15803d' : '#12281b',
                      fontWeight: [7, 8, 9, 13].includes(d) ? 800 : 500,
                      border: [7, 8, 9, 13].includes(d) ? '1px solid #86efac' : 'none'
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 4: Plants Market & Accessories (Span 8) */}
          <div className={styles.bentoCardSpan8}>
            <div>
              <div className={styles.bentoTag}>
                <ShoppingBag size={14} /> Curated Market
              </div>
              <h3 className={styles.bentoTitle}>Plants Market &amp; Designer Accessories</h3>
              <p className={styles.bentoDesc}>
                Explore trending houseplants like Yellow Rose, Echeveria, and Nest Ferns alongside minimalist Scandinavian ceramic pots and hanging planters.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ background: '#f9fbf9', border: '1px solid #e1ece5', borderRadius: '20px', padding: '0.8rem', textAlign: 'center' }}>
                <img
                  src="https://images.unsplash.com/photo-1545241047-6083a3684587?w=160&q=80"
                  alt="Yellow rose"
                  style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 0.4rem' }}
                />
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#12281b' }}>Yellow Rose</div>
                <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>$6.00 – $14.23</div>
              </div>

              <div style={{ background: '#f9fbf9', border: '1px solid #e1ece5', borderRadius: '20px', padding: '0.8rem', textAlign: 'center' }}>
                <img
                  src="https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=160&q=80"
                  alt="Echeveria"
                  style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 0.4rem' }}
                />
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#12281b' }}>Echeveria</div>
                <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>$23.00 – $50.23</div>
              </div>

              <div style={{ background: '#f9fbf9', border: '1px solid #e1ece5', borderRadius: '20px', padding: '0.8rem', textAlign: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: '#eaf3ed', margin: '0 auto 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                  🪴
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#12281b' }}>Vibes Fold Pot</div>
                <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>$9.59 – $14.23</div>
              </div>

              <div style={{ background: '#f9fbf9', border: '1px solid #e1ece5', borderRadius: '20px', padding: '0.8rem', textAlign: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: '#fef3e2', margin: '0 auto 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                  🏺
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#12281b' }}>Brussels Planter</div>
                <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>$2.69 – $8.00</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          LIVE BOTANICAL REGISTRY INTERACTIVE SEARCH ON HOMEPAGE
          ========================================================================= */}
      <section style={{ padding: '4rem 5%', background: '#ffffff', borderTop: '1px solid #e1ece5', borderBottom: '1px solid #e1ece5' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div className={styles.bentoTag} style={{ margin: '0 auto 1rem' }}>
            <Sparkles size={14} /> Real-Time Botanical API
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#12281b', marginBottom: '0.8rem' }}>
            Search 400,000+ Plant Species Live
          </h2>
          <p style={{ color: '#557061', fontSize: '1.05rem', marginBottom: '2rem' }}>
            Powered by Pnapana Botanical Intelligence. Type any plant genus, common name, or scientific specimen.
          </p>

          <div style={{ position: 'relative', maxWidth: '640px', margin: '0 auto 1.5rem' }}>
            <input
              type="text"
              placeholder="Try searching 'Quercus', 'Monstera', 'Rose', 'Ficus', 'Tulsi'..."
              value={searchQuery}
              onChange={(e) => handleLiveSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem 1.4rem',
                borderRadius: '999px',
                border: '2px solid #dce8e0',
                fontSize: '1rem',
                outline: 'none',
                boxShadow: '0 8px 30px rgba(18, 40, 27, 0.06)',
                color: '#12281b'
              }}
            />
            {isSearching && (
              <span style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.82rem', color: '#22c55e', fontWeight: 700 }}>
                Searching...
              </span>
            )}
          </div>

          {/* Instant Live Search Results */}
          {searchResults.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              textAlign: 'left',
              marginTop: '1.5rem'
            }}>
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: '#f9fbf9',
                    border: '1px solid #e1ece5',
                    borderRadius: '20px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem'
                  }}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.scientific_name}
                      onError={handlePlantImageError}
                      style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eaf7ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                      🌱
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#12281b' }}>
                      {item.common_name || item.scientific_name}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#557061', fontStyle: 'italic' }}>
                      {item.scientific_name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 600 }}>
                      Family: {item.family || 'Botanical'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          TESTIMONIALS SECTION
          ========================================================================= */}
      <section className={styles.testimonials}>
        <Reveal blur>
          <h2 className={styles.sectionTitle}>Loved by Plant Lovers Worldwide</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className={styles.sectionSubtitle}>
            Join thousands of enthusiastic indoor gardeners who keep their collections alive and thriving every day.
          </p>
        </Reveal>

        <Reveal amount={0.1} distance={24}>
          <VelocityMarquee baseVelocity={-2.0}>
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

      {/* =========================================================================
          VIBRANT FINAL LIME-EMERALD CTA BANNER
          ========================================================================= */}
      <section style={{ padding: '0 5% 5rem' }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          background: 'var(--grad-lime-banner)',
          borderRadius: '40px',
          padding: '5rem 3rem',
          textAlign: 'center',
          color: '#ffffff',
          boxShadow: '0 25px 60px -15px rgba(46, 179, 79, 0.45)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '1rem', color: '#ffffff' }}>
            Ready to Build Your Dream Garden?
          </h2>
          <p style={{ fontSize: 'clamp(0.95rem, 2vw, 1.2rem)', maxWidth: '600px', margin: '0 auto 2.5rem', opacity: 0.95 }}>
            Join over 12,000+ plant parents. Get started with 5 free plants, smart reminders, and instant botanical scans.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/login"
              style={{
                background: '#ffffff',
                color: '#15803d',
                fontWeight: 800,
                fontSize: '1.1rem',
                padding: '1.1rem 2.8rem',
                borderRadius: '999px',
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
              }}
            >
              Get Started Free →
            </Link>
            <Link
              href="/explore"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(12px)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1.1rem',
                padding: '1.1rem 2.5rem',
                borderRadius: '999px',
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.4)'
              }}
            >
              Browse Plants Market
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
