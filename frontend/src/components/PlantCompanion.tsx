'use client';
import { useState } from 'react';
import { Sparkles, Flame, Droplets, Heart, MessageCircle, X } from 'lucide-react';
import styles from './PlantCompanion.module.css';

export type CompanionMood = 'happy' | 'ecstatic' | 'sad' | 'thirsty';

interface PlantCompanionProps {
  mood?: CompanionMood;
  streakDays?: number;
  initialMessage?: string;
  initialMessageHi?: string;
  mode?: 'hero' | 'floating';
  thirstyCount?: number;
  onPlantClick?: () => void;
}

const FUN_TIPS_EN = [
  "Tap my pot anytime for plant tips! 🌱",
  "Did you know? Talking to your plants actually encourages growth! 🎶",
  "Morning sunlight is the sweetest energy for indoor leaves! ☀️",
  "Always check the top 2 inches of soil before watering! 💧",
  "Dusty leaves reduce photosynthesis—give them a gentle wipe! 🍃",
  "Happy roots mean flourishing shoots! 🌿"
];

export default function PlantCompanion({
  mood = 'happy',
  streakDays = 1,
  initialMessage,
  initialMessageHi,
  mode = 'hero',
  thirstyCount = 0,
  onPlantClick
}: PlantCompanionProps) {
  const [tipIndex, setTipIndex] = useState<number | null>(null);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);

  // Active dialogue resolver (Always English)
  const defaultMsg = initialMessage || 'Welcome back! Happy to see you today! 🌱✨';

  const currentMessage = tipIndex !== null 
    ? FUN_TIPS_EN[tipIndex % FUN_TIPS_EN.length]
    : defaultMsg;

  const cycleTip = () => {
    setTipIndex((prev) => (prev === null ? 0 : prev + 1));
    if (onPlantClick) onPlantClick();
  };

  // SVGs for the dynamic facial expressions
  const renderMascotSvg = () => {
    const isSad = mood === 'sad';
    const isEcstatic = mood === 'ecstatic';
    const isThirsty = mood === 'thirsty';

    return (
      <svg
        viewBox="0 0 100 100"
        className={`${styles.mascotSvg} ${
          isSad ? styles.moodSad : isEcstatic ? styles.moodEcstatic : isThirsty ? styles.moodThirsty : styles.moodHappy
        }`}
      >
        <defs>
          <linearGradient id="potGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e07a5f" />
            <stop offset="100%" stopColor="#c85a32" />
          </linearGradient>
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isSad ? "#8ca078" : "#4ade80"} />
            <stop offset="100%" stopColor={isSad ? "#607250" : "#16a34a"} />
          </linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* --- LEAVES (Animated via CSS) --- */}
        <g className={styles.leafGroup} filter="url(#softShadow)">
          {isSad ? (
            // Drooping, wilted leaves hanging downward
            <>
              {/* Center droopy leaf */}
              <path
                d="M 50 48 Q 50 25 35 32 Q 40 45 50 48 Z"
                fill="url(#leafGrad)"
              />
              {/* Left wilted leaf */}
              <path
                d="M 44 48 Q 28 35 18 48 Q 28 58 44 48 Z"
                fill="url(#leafGrad)"
              />
              {/* Right wilted leaf */}
              <path
                d="M 56 48 Q 72 35 82 48 Q 72 58 56 48 Z"
                fill="url(#leafGrad)"
              />
            </>
          ) : (
            // Upright, perky, healthy leaves
            <>
              {/* Center upright leaf */}
              <path
                d="M 50 50 Q 32 20 50 6 Q 68 20 50 50 Z"
                fill="url(#leafGrad)"
              />
              {/* Left cheerful leaf */}
              <path
                d="M 46 50 Q 20 32 24 16 Q 44 26 46 50 Z"
                fill="url(#leafGrad)"
              />
              {/* Right cheerful leaf */}
              <path
                d="M 54 50 Q 80 32 76 16 Q 56 26 54 50 Z"
                fill="url(#leafGrad)"
              />
              {/* Sparkles for Ecstatic state */}
              {isEcstatic && (
                <>
                  <path d="M 18 12 L 20 18 L 26 20 L 20 22 L 18 28 L 16 22 L 10 20 L 16 18 Z" fill="#fbbf24" />
                  <path d="M 82 12 L 84 18 L 90 20 L 84 22 L 82 28 L 80 22 L 74 20 L 80 18 Z" fill="#fbbf24" />
                </>
              )}
            </>
          )}
        </g>

        {/* --- TERRACOTTA PLANTER POT --- */}
        <g filter="url(#softShadow)">
          {/* Pot Rim */}
          <rect x="26" y="48" width="48" height="9" rx="4.5" fill="#f49778" stroke="#b24928" strokeWidth="1.2" />
          {/* Pot Body */}
          <path
            d="M 30 57 L 35 88 Q 36 91 40 91 L 60 91 Q 64 91 65 88 L 70 57 Z"
            fill="url(#potGrad)"
            stroke="#b24928"
            strokeWidth="1.2"
          />
        </g>

        {/* --- EYES & EXPRESSION --- */}
        {isSad ? (
          // Sad droopy eyes with teardrop
          <>
            {/* Left sad curved eye */}
            <path d="M 40 68 Q 44 63 48 67" stroke="#4a180d" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Right sad curved eye */}
            <path d="M 52 67 Q 56 63 60 68" stroke="#4a180d" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Teardrop falling */}
            <path d="M 37 72 C 35 75 35 78 37 79 C 39 79 39 75 37 72 Z" fill="#60a5fa" />
            {/* Downward sad mouth */}
            <path d="M 43 78 Q 50 72 57 78" stroke="#4a180d" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </>
        ) : isEcstatic ? (
          // Star eyes & wide joyous laugh
          <>
            {/* Left star eye */}
            <text x="39" y="69" fontSize="11" fill="#4a180d" textAnchor="middle" fontWeight="bold">★</text>
            {/* Right star eye */}
            <text x="61" y="69" fontSize="11" fill="#4a180d" textAnchor="middle" fontWeight="bold">★</text>
            {/* Blushing cheeks */}
            <circle cx="34" cy="72" r="4.5" fill="#ff8da1" opacity="0.65" />
            <circle cx="66" cy="72" r="4.5" fill="#ff8da1" opacity="0.65" />
            {/* Big smiling mouth */}
            <path d="M 42 71 Q 50 84 58 71 Z" fill="#b91c1c" stroke="#4a180d" strokeWidth="1.5" />
            {/* Little tongue */}
            <path d="M 46 76 Q 50 82 54 76" fill="#fca5a5" />
          </>
        ) : isThirsty ? (
          // Pouting face with water drop badge
          <>
            <circle cx="42" cy="67" r="3.2" fill="#4a180d" />
            <circle cx="58" cy="67" r="3.2" fill="#4a180d" />
            {/* Eye highlights */}
            <circle cx="43" cy="65.5" r="1.1" fill="#ffffff" />
            <circle cx="59" cy="65.5" r="1.1" fill="#ffffff" />
            {/* Small 'o' mouth */}
            <ellipse cx="50" cy="75" rx="3" ry="3.5" fill="#4a180d" />
          </>
        ) : (
          // Happy cheerful face
          <>
            {/* Cheerful curved eye arches */}
            <path d="M 38 67 Q 43 60 48 67" stroke="#4a180d" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <path d="M 52 67 Q 57 60 62 67" stroke="#4a180d" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            {/* Blushing rosy cheeks */}
            <circle cx="34" cy="71" r="3.5" fill="#ff8da1" opacity="0.5" />
            <circle cx="66" cy="71" r="3.5" fill="#ff8da1" opacity="0.5" />
            {/* Gentle warm smile */}
            <path d="M 44 73 Q 50 79 56 73" stroke="#4a180d" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </>
        )}
      </svg>
    );
  };

  // --- MODE 1: HERO GREETING BANNER ON DASHBOARD ---
  if (mode === 'hero') {
    const isSad = mood === 'sad';
    const isEcstatic = mood === 'ecstatic';

    return (
      <div className={styles.heroCompanionContainer}>
        {/* Animated Mascot */}
        <div 
          className={styles.plantAvatarWrapper} 
          onClick={cycleTip}
          title="Click Pana for care advice!"
        >
          {renderMascotSvg()}
        </div>

        {/* Speech Bubble */}
        <div className={styles.speechBubble}>
          <div className={styles.speechHeader}>
            <div className={`${styles.mascotBadge} ${isSad ? styles.mascotBadgeSad : isEcstatic ? styles.mascotBadgeEcstatic : ''}`}>
              <Sparkles size={12} />
              <span>Pana • {isSad ? 'Feeling Lonely' : isEcstatic ? 'Super Happy' : 'Living Companion'}</span>
            </div>

            {/* Streak Counter Badge */}
            <div className={styles.streakBadgeSmall}>
              <Flame size={13} fill="#ea580c" />
              <span>Day {streakDays} Streak</span>
            </div>
          </div>

          <p className={styles.speechText}>
            {currentMessage}
          </p>

          <div className={styles.speechHint} onClick={cycleTip}>
            <MessageCircle size={12} />
            <span>Tap Pana to hear more plant thoughts ✨</span>
          </div>
        </div>
      </div>
    );
  }

  // --- MODE 2: FLOATING BUDDY IN CORNER ---
  return (
    <div className={styles.floatingBuddyContainer}>
      {isFloatingOpen && (
        <div className={styles.floatingBubble}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Sparkles size={11} /> Pana says:
            </span>
            <button
              onClick={() => setIsFloatingOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>
          <p style={{ fontSize: '0.84rem', fontWeight: 600, color: '#12281b', margin: 0, lineHeight: '1.35' }}>
            {currentMessage}
          </p>
          <div 
            onClick={cycleTip}
            style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '6px', cursor: 'pointer', fontWeight: 700 }}
          >
            Tap for another tip ➔
          </div>
        </div>
      )}

      <button
        type="button"
        className={styles.floatingBuddyBtn}
        onClick={() => {
          setIsFloatingOpen(!isFloatingOpen);
          cycleTip();
        }}
        title="Chat with Pana!"
        aria-label="Plant companion Pana"
      >
        <div style={{ width: '42px', height: '42px' }}>
          {renderMascotSvg()}
        </div>
        <span className={styles.floatingStreakBadge}>
          <Flame size={9} fill="#ffffff" /> {streakDays}
        </span>
      </button>
    </div>
  );
}
