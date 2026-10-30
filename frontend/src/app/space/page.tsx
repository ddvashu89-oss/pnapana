'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bath, BedDouble, CookingPot, Flower2, House, PawPrint, Sun, SunMedium, Trees, BriefcaseBusiness, Droplets, Sprout } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import styles from './Space.module.css';

type SpaceId = 'nursery' | 'living' | 'bedroom' | 'balcony' | 'kitchen' | 'bathroom' | 'office';
type LightId = 'direct' | 'bright' | 'low';

const spaces: { id: SpaceId; label: string; icon: typeof House; note: string }[] = [
  { id: 'nursery', label: 'Nursery', icon: Flower2, note: 'Gentler light, easy care, and a clear view of pet safety.' },
  { id: 'living', label: 'Living room', icon: House, note: 'Flexible foliage for shared, high-visibility spaces.' },
  { id: 'bedroom', label: 'Bedroom', icon: BedDouble, note: 'Compact, low-fuss plants for a restful corner.' },
  { id: 'balcony', label: 'Balcony', icon: Trees, note: 'Sun-loving choices; shelter plants from harsh heat and cold.' },
  { id: 'kitchen', label: 'Kitchen', icon: CookingPot, note: 'Useful herbs and plants that suit changing kitchen light.' },
  { id: 'bathroom', label: 'Bathroom', icon: Bath, note: 'Humidity-tolerant plants for a bright bathroom.' },
  { id: 'office', label: 'Study / office', icon: BriefcaseBusiness, note: 'Resilient plants for desks and work corners.' },
];

const lights: { id: LightId; label: string; description: string; icon: typeof Sun }[] = [
  { id: 'direct', label: 'Direct sun', description: 'Several hours of sun reaches the plant.', icon: Sun },
  { id: 'bright', label: 'Bright, indirect', description: 'Near a bright window, out of strong direct sun.', icon: SunMedium },
  { id: 'low', label: 'Low light', description: 'Far from windows or shaded for most of the day.', icon: House },
];

const plantOptions = [
  { name: 'Tulsi (Holy basil)', scientific: 'Ocimum tenuiflorum', spaces: ['balcony', 'kitchen', 'living', 'nursery'], light: ['direct', 'bright'], petSafe: true, water: 'Keep lightly moist; water when the top soil begins to dry.', summary: 'A fragrant herb that does best with strong light and regular trimming.' },
  { name: 'Spider plant', scientific: 'Chlorophytum comosum', spaces: ['nursery', 'living', 'bedroom', 'kitchen', 'office'], light: ['bright', 'low'], petSafe: true, water: 'Water when the top 2–3 cm of soil feels dry.', summary: 'Easy to grow, adaptable, and considered non-toxic to cats and dogs.' },
  { name: 'Areca palm', scientific: 'Dypsis lutescens', spaces: ['nursery', 'living', 'bedroom'], light: ['bright'], petSafe: true, water: 'Water when the top layer dries; avoid leaving the pot soggy.', summary: 'A pet-friendly floor plant for a warm, bright room.' },
  { name: 'Boston fern', scientific: 'Nephrolepis exaltata', spaces: ['nursery', 'bathroom', 'bedroom', 'living'], light: ['bright', 'low'], petSafe: true, water: 'Keep the mix evenly moist, with good drainage.', summary: 'Likes humidity and indirect light; keep it away from drying heat.' },
  { name: 'Money plant (Pothos)', scientific: 'Epipremnum aureum', spaces: ['living', 'bedroom', 'kitchen', 'bathroom', 'office'], light: ['bright', 'low'], petSafe: false, water: 'Water when the top 2–3 cm of soil is dry.', summary: 'A forgiving trailing plant. Keep it out of reach of pets because it is toxic if chewed.' },
  { name: 'Snake plant', scientific: 'Dracaena trifasciata', spaces: ['living', 'bedroom', 'office', 'kitchen'], light: ['bright', 'low'], petSafe: false, water: 'Let the soil dry fully before watering again.', summary: 'Handles lower light and missed waterings; keep away from pets that may chew leaves.' },
  { name: 'Aloe vera', scientific: 'Aloe vera', spaces: ['balcony', 'kitchen', 'living'], light: ['direct', 'bright'], petSafe: false, water: 'Let the potting mix dry completely between waterings.', summary: 'A sun-loving succulent for a bright sill; its sap can be harmful to pets.' },
  { name: 'Basil', scientific: 'Ocimum basilicum', spaces: ['kitchen', 'balcony'], light: ['direct', 'bright'], petSafe: true, water: 'Keep lightly moist and use a pot with drainage.', summary: 'A useful kitchen herb that needs several hours of bright light.' },
  { name: 'Peace lily', scientific: 'Spathiphyllum', spaces: ['living', 'bedroom', 'bathroom', 'office'], light: ['bright', 'low'], petSafe: false, water: 'Water when the top soil starts to dry; do not let it sit in water.', summary: 'Tolerates indirect light and humidity. Toxic to cats and dogs if eaten.' },
  { name: 'Jade plant', scientific: 'Crassula ovata', spaces: ['balcony', 'living', 'office'], light: ['direct', 'bright'], petSafe: false, water: 'Water deeply, then let the soil dry before watering again.', summary: 'A compact succulent for a sunny spot; keep away from pets.' },
  { name: 'ZZ plant', scientific: 'Zamioculcas zamiifolia', spaces: ['living', 'bedroom', 'office'], light: ['bright', 'low'], petSafe: false, water: 'Allow the potting mix to dry between waterings.', summary: 'Very tolerant of low light and irregular watering; toxic if chewed.' },
  { name: 'Rosemary', scientific: 'Salvia rosmarinus', spaces: ['balcony', 'kitchen'], light: ['direct'], petSafe: true, water: 'Water when the top soil dries; provide excellent drainage.', summary: 'A culinary herb that needs direct sun and airflow.' },
];

export default function SpaceFinder() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [ready, setReady] = useState(false);
  const [space, setSpace] = useState<SpaceId>('nursery');
  const [light, setLight] = useState<LightId>('bright');
  const [petSafeOnly, setPetSafeOnly] = useState(false);
  const hi = language === 'hi';

  useEffect(() => {
    if (!localStorage.getItem('user')) {
      router.push('/login');
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem('pnapana-space-profile') || '{}');
      if (spaces.some(option => option.id === saved.space)) setSpace(saved.space);
      if (lights.some(option => option.id === saved.light)) setLight(saved.light);
      setPetSafeOnly(Boolean(saved.petSafeOnly));
    } catch { /* Start with the defaults if saved preferences are malformed. */ }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (ready) localStorage.setItem('pnapana-space-profile', JSON.stringify({ space, light, petSafeOnly }));
  }, [ready, space, light, petSafeOnly]);

  const recommendations = useMemo(() => plantOptions.filter(plant =>
    plant.spaces.includes(space) && plant.light.includes(light) && (!petSafeOnly || plant.petSafe)
  ), [space, light, petSafeOnly]);

  if (!ready) return <Loader fullScreen label={t('common.loading')} />;
  const selectedSpace = spaces.find(option => option.id === space)!;
  const SelectedIcon = selectedSpace.icon;

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>{hi ? 'आपकी जगह के लिए पौधे' : 'PLANTS FOR YOUR SPACE'}</span>
        <h1>{hi ? 'आपका स्पेस, आपकी हरियाली' : 'Find the right plant for your space'}</h1>
        <p>{hi ? 'कमरा, रोशनी और पालतू जानवरों के हिसाब से पौधे चुनें।' : 'Choose a room and its natural light. We’ll match plants to the conditions you have.'}</p>
      </header>

      <section className={styles.panel} aria-labelledby="space-picker-title">
        <h2 id="space-picker-title">{hi ? 'कहाँ रखना है?' : 'Where will it live?'}</h2>
        <div className={styles.spaceGrid} role="tablist" aria-label="Choose a space">
          {spaces.map(option => {
            const Icon = option.icon;
            const selected = space === option.id;
            return <button key={option.id} type="button" role="tab" aria-selected={selected} className={`${styles.spaceOption} ${selected ? styles.selected : ''}`} onClick={() => setSpace(option.id)}>
              <Icon size={20} aria-hidden="true" /><span>{hi ? ({ nursery: 'नर्सरी', living: 'लिविंग रूम', bedroom: 'बेडरूम', balcony: 'बालकनी', kitchen: 'रसोई', bathroom: 'बाथरूम', office: 'स्टडी / ऑफिस' } as Record<SpaceId, string>)[option.id] : option.label}</span>
            </button>;
          })}
        </div>

        <div className={styles.selectionIntro}>
          <span className={styles.selectionIcon}><SelectedIcon size={22} /></span>
          <div><h3>{selectedSpace.label}</h3><p>{selectedSpace.note}</p></div>
        </div>

        <h2 className={styles.lightHeading}>{hi ? 'दिन में यहाँ कितनी रोशनी आती है?' : 'How much daylight does it get?'}</h2>
        <div className={styles.lightGrid} role="radiogroup" aria-label="Choose the light level">
          {lights.map(option => {
            const Icon = option.icon;
            const selected = light === option.id;
            return <button key={option.id} type="button" role="radio" aria-checked={selected} className={`${styles.lightOption} ${selected ? styles.lightSelected : ''}`} onClick={() => setLight(option.id)}>
              <Icon size={20} aria-hidden="true" /><span><strong>{hi ? ({ direct: 'सीधी धूप', bright: 'तेज अप्रत्यक्ष', low: 'कम रोशनी' } as Record<LightId, string>)[option.id] : option.label}</strong><small>{option.description}</small></span>
            </button>;
          })}
        </div>

        <label className={styles.petToggle}>
          <span className={styles.petIcon}><PawPrint size={19} /></span>
          <span><strong>{hi ? 'पालतू जानवरों के लिए सुरक्षित' : 'Pet-safe plants only'}</strong><small>{hi ? 'विषैले पौधे सुझावों से हटाएँ' : 'Hide plants known to be harmful if chewed'}</small></span>
          <input type="checkbox" checked={petSafeOnly} onChange={event => setPetSafeOnly(event.target.checked)} />
        </label>
      </section>

      <section className={styles.results} aria-live="polite">
        <div className={styles.resultsHeading}>
          <div><span className={styles.eyebrow}>{hi ? 'आपके लिए चुने गए' : 'MATCHED TO YOUR SETUP'}</span><h2>{hi ? `${selectedSpace.label} के लिए पौधे` : `Plants for your ${selectedSpace.label.toLowerCase()}`}</h2></div>
          <span className={styles.count}>{recommendations.length} {hi ? 'विकल्प' : recommendations.length === 1 ? 'match' : 'matches'}</span>
        </div>
        {recommendations.length ? <div className={styles.plantGrid}>
          {recommendations.map((plant, index) => <motion.article key={plant.name} className={styles.plantCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
            <div className={styles.plantIcon}><Sprout size={25} /></div>
            <div className={styles.plantTitle}><h3>{plant.name}</h3><em>{plant.scientific}</em></div>
            <p>{plant.summary}</p>
            <div className={styles.plantFacts}><span><Sun size={15} />{light === 'direct' ? 'Direct sun' : light === 'bright' ? 'Bright indirect' : 'Low light'}</span><span><Droplets size={15} />{plant.water}</span><span className={plant.petSafe ? styles.safe : styles.caution}><PawPrint size={15} />{plant.petSafe ? 'Pet-safe' : 'Keep from pets'}</span></div>
          </motion.article>)}
        </div> : <div className={styles.empty}><Sprout size={28} /><h3>{hi ? 'अभी कोई मेल नहीं मिला' : 'No exact matches for this setup'}</h3><p>{hi ? 'रोशनी का विकल्प बदलें या पालतू-सुरक्षित फ़िल्टर हटाएँ।' : 'Try a different light level or turn off the pet-safe filter to see more plants for this space.'}</p></div>}
        <Link href="/rituals" className={styles.ritualLink}>{hi ? 'पौधों की देखभाल के रूटीन देखें' : 'Explore plant care rituals'} <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
