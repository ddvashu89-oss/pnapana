'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarCheck2, Droplets, Leaf, Sprout, UserRound } from 'lucide-react';
import MarketingNav from '@/components/MarketingNav';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import styles from './LandingRefresh.module.css';

export default function LandingPage() {
  const { language, t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => setIsLoggedIn(Boolean(localStorage.getItem('user'))), []);
  const hi = language === 'hi';
  const startHref = isLoggedIn ? '/dashboard' : '/login?mode=signup';
  const steps = [
    { icon: UserRound, title: hi ? 'खाता बनाएँ' : 'Create your account', text: hi ? 'अपने पौधों के लिए एक जगह बनाएँ।' : 'A home for all your plants.' },
    { icon: Leaf, title: hi ? 'पहला पौधा जोड़ें' : 'Add your first plant', text: hi ? 'नाम, जगह और चाहें तो फोटो जोड़ें।' : 'Give it a name, a place, and an optional photo.' },
    { icon: Droplets, title: hi ? 'आज की देखभाल देखें' : 'See today’s care', text: hi ? 'अगला आसान कदम देखें और देखभाल दर्ज करें।' : 'See its next useful step and record what you do.' },
  ];

  return (
    <div className={styles.page}>
      <MarketingNav labels={{ explore: t('nav.explore'), about: t('nav.about'), careGuide: t('nav.careGuide'), contact: t('nav.contact'), signIn: t('nav.signIn'), getStarted: hi ? 'शुरू करें' : 'Get Started', dashboard: t('nav.dashboard') }} />
      <main>
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}><Sprout size={16} /> {hi ? 'आपके पौधे, आसान देखभाल' : 'YOUR PLANTS, SIMPLIFIED'}</span>
              <h1 id="landing-title">{hi ? <>पौधों की देखभाल,<br /><em>हर दिन आसान।</em></> : <>Care for your plants,<br /><em>one day at a time.</em></>}</h1>
              <p>{hi ? 'अपना पहला पौधा जोड़ें, उसकी जगह चुनें और देखें कि आज उसे क्या चाहिए। Pnapana आपकी देखभाल और बढ़त को एक जगह रखता है।' : 'Add your first plant, choose where it lives, and see what it needs today. Pnapana keeps its care and progress together in one calm place.'}</p>
              <Link href={startHref} className={styles.primaryCta}>{isLoggedIn ? (hi ? 'अपने बगीचे में जाएँ' : 'Go to my garden') : (hi ? 'पहला पौधा जोड़ें' : 'Get started')} <ArrowRight size={19} /></Link>
              <a href="#first-steps" className={styles.textLink}>{hi ? 'देखें यह कैसे काम करता है' : 'See how it works'}</a>
            </div>
            <div className={styles.heroArt} aria-hidden="true"><img src="/landing/first-plant.webp" alt="" /></div>
          </div>
        </section>

        <section id="first-steps" className={styles.steps} aria-labelledby="steps-title">
          <div className={styles.stepsHeading}><span>{hi ? 'एक आसान शुरुआत' : 'A SIMPLE START'}</span><h2 id="steps-title">{hi ? 'पहले पौधे से रोज़ की देखभाल तक' : 'From your first plant to daily care'}</h2><p>{hi ? 'हर कदम उसी पौधे से जुड़ा रहता है।' : 'Every step stays connected to the plant you care about.'}</p></div>
          <div className={styles.stepGrid}>{steps.map(({ icon: Icon, title, text }, index) => <div className={styles.step} key={title}><span className={styles.stepIcon}><Icon size={26} strokeWidth={1.8} /></span><small>{String(index + 1).padStart(2, '0')}</small><h3>{title}</h3><p>{text}</p></div>)}</div>
        </section>

        <section className={styles.promise} aria-labelledby="promise-title">
          <div className={styles.promiseMark}><CalendarCheck2 size={31} /></div>
          <div><span>{hi ? 'पौधे के साथ बने रहें' : 'GROW TOGETHER'}</span><h2 id="promise-title">{hi ? 'एक पौधा। एक जगह। अगला सही कदम।' : 'One plant. One place. A clear next step.'}</h2><p>{hi ? 'मिट्टी की जाँच, देखभाल का इतिहास, मौसम और पौधे की बढ़त—सब उसकी अपनी कहानी का हिस्सा हैं।' : 'Soil checks, care history, local weather, and growth notes stay with each plant, so you can pick up where you left off.'}</p></div>
          <Link href={startHref}>{hi ? 'अपना बगीचा शुरू करें' : 'Start your garden'} <ArrowRight size={18} /></Link>
        </section>
      </main>
    </div>
  );
}
