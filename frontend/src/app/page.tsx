'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import styles from './Landing.module.css';

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

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
    animatedElements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          <span>🌿</span> pnapana
        </Link>
        <div className={styles.navLinks}>
          {isLoggedIn ? (
            <Link href="/dashboard" className={styles.signupBtn}>Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className={styles.loginBtn}>Sign In</Link>
              <Link href="/login" className={styles.signupBtn}>Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={`${styles.heroBadge} ${heroLoaded ? styles.animate : ''}`}>
            ✨ New: Live Plant Recognition
          </div>
          <h1 className={`${styles.title} ${heroLoaded ? styles.animate : ''}`}>
            Your Intelligent <span className={styles.highlight}>Plant Companion</span>
          </h1>
          <p className={`${styles.subtitle} ${heroLoaded ? styles.animate : ''}`}>
            Never forget to water your plants again. Pnapana uses intelligent tracking, live weather insights, and a beautiful dashboard to help your green family thrive.
          </p>
          <div className={`${styles.ctaGroup} ${heroLoaded ? styles.animate : ''}`}>
            <Link href={isLoggedIn ? "/dashboard" : "/login"} className={styles.primaryCta}>
              {isLoggedIn ? "Go to Dashboard" : "Build Your Garden"}
            </Link>
            <a href="#how-it-works" className={styles.secondaryCta}>
              See How It Works
            </a>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className={styles.blob1}></div>
        <div className={styles.blob2}></div>
      </header>

      {/* How It Works Section */}
      <section id="how-it-works" className={styles.howItWorks}>
        <h2 className={`${styles.sectionTitle} ${styles.animateOnScroll}`}>From Seedling to Jungle</h2>
        <p className={`${styles.sectionSubtitle} ${styles.animateOnScroll}`}>
          Growing healthy plants has never been easier. Here is how pnapana makes you a better plant parent.
        </p>
        
        <div className={styles.stepsContainer}>
          <div className={`${styles.step} ${styles.animateOnScroll}`}>
            <div className={styles.stepImage}>📸</div>
            <div className={styles.stepContent}>
              <div className={styles.stepNumber}>01</div>
              <h3>Snap & Add</h3>
              <p>Add your plants to your digital garden in seconds. Just snap a photo or search our database. Pnapana automatically recognizes the species and sets up the perfect care profile.</p>
            </div>
          </div>
          
          <div className={`${styles.step} ${styles.animateOnScroll}`}>
            <div className={styles.stepImage}>🌤️</div>
            <div className={styles.stepContent}>
              <div className={styles.stepNumber}>02</div>
              <h3>Track & Learn</h3>
              <p>We pull in live local weather data to adjust your watering schedules. Is it a hot week? Pnapana knows and will remind you earlier so your plants never dry out.</p>
            </div>
          </div>
          
          <div className={`${styles.step} ${styles.animateOnScroll}`}>
            <div className={styles.stepImage}>🌱</div>
            <div className={styles.stepContent}>
              <div className={styles.stepNumber}>03</div>
              <h3>Thrive</h3>
              <p>Watch your digital and real-life garden flourish. Keep a visual diary of growth, get timely notifications, and never second-guess your plant care again.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={`${styles.featureGrid} ${styles.animateOnScroll}`}>
          <div className={styles.featureCard}>
            <div className={styles.iconWrapper}>🔔</div>
            <h3>Smart Notifications</h3>
            <p>Get gentle reminders exactly when your plants need water based on their unique schedules.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.iconWrapper}>🌧️</div>
            <h3>Weather Adaptive</h3>
            <p>Keep track of real-time local temperature and humidity to ensure optimal growing conditions.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.iconWrapper}>📔</div>
            <h3>Growth Journal</h3>
            <p>Document your plant's journey with photos and notes. See their progress over time.</p>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className={styles.testimonials}>
        <h2 className={`${styles.sectionTitle} ${styles.animateOnScroll}`}>Plant Parents Love Us</h2>
        <p className={`${styles.sectionSubtitle} ${styles.animateOnScroll}`}>
          Join thousands of happy users who have transformed their homes into thriving green spaces.
        </p>
        
        <div className={`${styles.testimonialGrid} ${styles.animateOnScroll}`}>
          <div className={styles.testimonialCard}>
            <div className={styles.quoteMark}>"</div>
            <p className={styles.testimonialText}>
              "Before pnapana, I could not keep a cactus alive. Now my apartment looks like a jungle. The smart weather adjustments are a game-changer!"
            </p>
            <div className={styles.author}>
              <div className={styles.authorAvatar}>👩🏽</div>
              <div className={styles.authorInfo}>
                <h4>Sarah M.</h4>
                <p>Monstera Enthusiast</p>
              </div>
            </div>
          </div>
          
          <div className={styles.testimonialCard}>
            <div className={styles.quoteMark}>"</div>
            <p className={styles.testimonialText}>
              "The interface is gorgeous and it actually makes me excited to check on my plants every morning. Best app I've downloaded this year."
            </p>
            <div className={styles.author}>
              <div className={styles.authorAvatar}>👨🏻‍🦱</div>
              <div className={styles.authorInfo}>
                <h4>David K.</h4>
                <p>Proud Plant Dad of 12</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className={styles.finalCta}>
        <div className={`${styles.finalCtaContent} ${styles.animateOnScroll}`}>
          <h2>Ready to start your digital garden?</h2>
          <p>Join today and give your plants the care they deserve.</p>
          <Link href="/login" className={styles.finalCtaBtn}>
            Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <Link href="/" className={`${styles.logo} ${styles.footerLogo}`}>
              <span>🌿</span> pnapana
            </Link>
            <p>Your intelligent companion for a thriving, beautiful green home.</p>
          </div>
          
          <div className={styles.footerLinks}>
            <h4>Product</h4>
            <ul>
              <li><Link href="#how-it-works">Features</Link></li>
              <li><Link href="/login">Sign In</Link></li>
            </ul>
          </div>
          
          <div className={styles.footerLinks}>
            <h4>Company</h4>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        
        <div className={styles.footerBottom}>
          <p>© {new Date().getFullYear()} pnapana. Designed with love for plant parents. 🌿</p>
        </div>
      </footer>
    </div>
  );
}
