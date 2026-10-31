'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, Bath, BedDouble, CheckCircle2, CookingPot, House, PawPrint, Sun, SunMedium, Trees, BriefcaseBusiness, Camera, Droplets, Sprout, Upload, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { authFetch } from '@/lib/api';
import Loader from '@/components/Loader';
import styles from './Space.module.css';

type SpaceId = 'living' | 'bedroom' | 'balcony' | 'kitchen' | 'bathroom' | 'office';
type LightId = 'direct' | 'bright' | 'low';
type PlantOption = { name: string; scientific: string; spaces: SpaceId[]; light: LightId[]; petSafe: boolean; water: string; summary: string; minSun?: number; shelterSensitive?: boolean };
type Assessment = { plant_name: string; verdict: 'buy' | 'conditional' | 'skip' | 'unknown'; fit_score: number; summary: string; good_fit: string[]; watch_out: string[]; nursery_checks: string[]; care_level: string; garden_context_used: boolean };

const spaces: { id: SpaceId; label: string; icon: typeof House; note: string }[] = [
  { id: 'living', label: 'Living room', icon: House, note: 'Flexible foliage for shared, high-visibility spaces.' },
  { id: 'bedroom', label: 'Bedroom', icon: BedDouble, note: 'Compact, low-fuss plants for a restful corner.' },
  { id: 'balcony', label: 'Balcony', icon: Trees, note: 'Choose plants for your direct-sun hours, wind exposure, and available space.' },
  { id: 'kitchen', label: 'Kitchen', icon: CookingPot, note: 'Useful herbs and plants that suit changing kitchen light.' },
  { id: 'bathroom', label: 'Bathroom', icon: Bath, note: 'Humidity-tolerant plants for a bright bathroom.' },
  { id: 'office', label: 'Study / office', icon: BriefcaseBusiness, note: 'Resilient plants for desks and work corners.' },
];

const lights: { id: LightId; label: string; description: string; icon: typeof Sun }[] = [
  { id: 'direct', label: 'Direct sun', description: 'Several hours of sun reaches the plant.', icon: Sun },
  { id: 'bright', label: 'Bright, indirect', description: 'Near a bright window, out of strong direct sun.', icon: SunMedium },
  { id: 'low', label: 'Low light', description: 'Far from windows or shaded for most of the day.', icon: House },
];

const plantOptions: PlantOption[] = [
  { name: 'Tulsi (Holy basil)', scientific: 'Ocimum tenuiflorum', spaces: ['balcony', 'kitchen', 'living'], light: ['direct', 'bright'], petSafe: true, water: 'Keep lightly moist; water when the top soil begins to dry.', summary: 'A fragrant herb that does best with strong light and regular trimming.', minSun: 3 },
  { name: 'Spider plant', scientific: 'Chlorophytum comosum', spaces: ['living', 'bedroom', 'kitchen', 'office'], light: ['bright', 'low'], petSafe: true, water: 'Water when the top 2–3 cm of soil feels dry.', summary: 'Easy to grow, adaptable, and considered non-toxic to cats and dogs.' },
  { name: 'Areca palm', scientific: 'Dypsis lutescens', spaces: ['living', 'bedroom'], light: ['bright'], petSafe: true, water: 'Water when the top layer dries; avoid leaving the pot soggy.', summary: 'A pet-friendly floor plant for a warm, bright room.' },
  { name: 'Boston fern', scientific: 'Nephrolepis exaltata', spaces: ['bathroom', 'bedroom', 'living'], light: ['bright', 'low'], petSafe: true, water: 'Keep the mix evenly moist, with good drainage.', summary: 'Likes humidity and indirect light; keep it away from drying heat.' },
  { name: 'Money plant (Pothos)', scientific: 'Epipremnum aureum', spaces: ['living', 'bedroom', 'kitchen', 'bathroom', 'office'], light: ['bright', 'low'], petSafe: false, water: 'Water when the top 2–3 cm of soil is dry.', summary: 'A forgiving trailing plant. Keep it out of reach of pets because it is toxic if chewed.' },
  { name: 'Snake plant', scientific: 'Dracaena trifasciata', spaces: ['living', 'bedroom', 'office', 'kitchen'], light: ['bright', 'low'], petSafe: false, water: 'Let the soil dry fully before watering again.', summary: 'Handles lower light and missed waterings; keep away from pets that may chew leaves.' },
  { name: 'Aloe vera', scientific: 'Aloe vera', spaces: ['balcony', 'kitchen', 'living'], light: ['direct', 'bright'], petSafe: false, water: 'Let the potting mix dry completely between waterings.', summary: 'A sun-loving succulent for a bright sill; its sap can be harmful to pets.', minSun: 3 },
  { name: 'Basil', scientific: 'Ocimum basilicum', spaces: ['kitchen', 'balcony'], light: ['direct', 'bright'], petSafe: true, water: 'Keep lightly moist and use a pot with drainage.', summary: 'A useful kitchen herb that needs several hours of bright light.', minSun: 3 },
  { name: 'Peace lily', scientific: 'Spathiphyllum', spaces: ['living', 'bedroom', 'bathroom', 'office'], light: ['bright', 'low'], petSafe: false, water: 'Water when the top soil starts to dry; do not let it sit in water.', summary: 'Tolerates indirect light and humidity. Toxic to cats and dogs if eaten.' },
  { name: 'Jade plant', scientific: 'Crassula ovata', spaces: ['balcony', 'living', 'office'], light: ['direct', 'bright'], petSafe: false, water: 'Water deeply, then let the soil dry before watering again.', summary: 'A compact succulent for a sunny spot; keep away from pets.', minSun: 3 },
  { name: 'ZZ plant', scientific: 'Zamioculcas zamiifolia', spaces: ['living', 'bedroom', 'office'], light: ['bright', 'low'], petSafe: false, water: 'Allow the potting mix to dry between waterings.', summary: 'Very tolerant of low light and irregular watering; toxic if chewed.' },
  { name: 'Rosemary', scientific: 'Salvia rosmarinus', spaces: ['balcony', 'kitchen'], light: ['direct'], petSafe: true, water: 'Water when the top soil dries; provide excellent drainage.', summary: 'A culinary herb that needs direct sun and airflow.', minSun: 6 },
  { name: 'Marigold (Genda)', scientific: 'Tagetes erecta', spaces: ['balcony'], light: ['direct'], petSafe: true, water: 'Water when the top soil feels dry; avoid waterlogging.', summary: 'A cheerful seasonal flower for a warm, sunny balcony.', minSun: 5 },
  { name: 'Hibiscus (Gudhal)', scientific: 'Hibiscus rosa-sinensis', spaces: ['balcony'], light: ['direct'], petSafe: true, water: 'Keep evenly moist in hot weather and feed during active growth.', summary: 'A flowering shrub that rewards several hours of direct sun.', minSun: 5 },
  { name: 'Chilli (Mirchi)', scientific: 'Capsicum annuum', spaces: ['balcony', 'kitchen'], light: ['direct'], petSafe: true, water: 'Keep soil lightly moist and use a pot with drainage.', summary: 'A compact edible plant for a bright, warm balcony.', minSun: 5 },
  { name: 'Curry leaf (Kadi patta)', scientific: 'Murraya koenigii', spaces: ['balcony'], light: ['direct', 'bright'], petSafe: true, water: 'Water when the top soil begins to dry; protect young plants from cold.', summary: 'A useful Indian kitchen plant; give it a warm, bright position.', minSun: 3 },
  { name: 'Jasmine (Mogra)', scientific: 'Jasminum sambac', spaces: ['balcony'], light: ['direct', 'bright'], petSafe: true, water: 'Water regularly in warm weather while keeping drainage clear.', summary: 'A fragrant flowering choice for a bright balcony with some shelter.', minSun: 3, shelterSensitive: true },
  { name: 'Portulaca (Moss rose)', scientific: 'Portulaca grandiflora', spaces: ['balcony'], light: ['direct'], petSafe: true, water: 'Let the soil dry slightly between light waterings.', summary: 'A heat-tolerant, low-water flower for hot sunny balconies.', minSun: 6 },
  { name: 'Mint (Pudina)', scientific: 'Mentha spicata', spaces: ['balcony', 'kitchen'], light: ['bright', 'direct'], petSafe: true, water: 'Keep soil evenly moist; grow in its own pot because it spreads.', summary: 'A useful herb for a bright or partly sunny spot; afternoon shade helps in peak summer.', minSun: 2 },
];

export default function SpaceFinder() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [ready, setReady] = useState(false);
  const [space, setSpace] = useState<SpaceId>('balcony');
  const [light, setLight] = useState<LightId>('bright');
  const [petSafeOnly, setPetSafeOnly] = useState(false);
  const [sunHours, setSunHours] = useState(3);
  const [balconyExposure, setBalconyExposure] = useState<'open' | 'covered'>('open');
  const [plantName, setPlantName] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [checking, setChecking] = useState(false);
  const [advisorError, setAdvisorError] = useState('');
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
      if ([0, 2, 3, 5, 6, 8].includes(saved.sunHours)) setSunHours(saved.sunHours);
      if (saved.balconyExposure === 'covered') setBalconyExposure('covered');
    } catch { /* Start with the defaults if saved preferences are malformed. */ }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (ready) localStorage.setItem('pnapana-space-profile', JSON.stringify({ space, light, petSafeOnly, sunHours, balconyExposure }));
  }, [ready, space, light, petSafeOnly, sunHours, balconyExposure]);

  const recommendations = useMemo(() => plantOptions.filter(plant =>
    plant.spaces.includes(space) && (space === 'balcony' ? sunHours >= (plant.minSun || 0) : plant.light.includes(light)) && (!petSafeOnly || plant.petSafe) &&
    (space !== 'balcony' || balconyExposure !== 'open' || !plant.shelterSensitive)
  ), [space, light, petSafeOnly, sunHours, balconyExposure]);

  const onPhotoSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setAdvisorError(hi ? 'Photo 5 MB se chhoti honi chahiye.' : 'Choose a photo smaller than 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setPhoto(String(reader.result || '')); setPhotoName(file.name); setAssessment(null); setAdvisorError(''); };
    reader.readAsDataURL(file);
  };

  const checkPurchase = async () => {
    setChecking(true); setAssessment(null); setAdvisorError('');
    try {
      const response = await authFetch('check_plant_purchase.php', { method: 'POST', body: JSON.stringify({
        plant_name: plantName.trim(), image_base64: photo, target_space: space, light, sun_hours: sunHours,
        balcony_exposure: balconyExposure, pet_safe_only: petSafeOnly, language: hi ? 'hi' : 'en'
      }) });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || (hi ? 'Abhi check nahi ho paya. Dobara koshish karein.' : 'Could not check this plant. Please try again.'));
      setAssessment(data.assessment);
    } catch (error) { setAdvisorError(error instanceof Error ? error.message : (hi ? 'Kuch galat hua. Dobara koshish karein.' : 'Something went wrong. Please try again.')); }
    finally { setChecking(false); }
  };

  if (!ready) return <Loader fullScreen label={t('common.loading')} />;
  const selectedSpace = spaces.find(option => option.id === space)!;
  const SelectedIcon = selectedSpace.icon;

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>{hi ? 'आपकी जगह के लिए पौधे' : 'PLANTS FOR YOUR SPACE'}</span>
        <h1>{hi ? 'आपका स्पेस, आपकी हरियाली' : 'Find the right plant for your space'}</h1>
        <p>{hi ? 'नर्सरी में खरीदने से पहले पौधा चेक करें और अपनी बालकनी के लिए सही विकल्प खोजें।' : 'Check a plant before buying it at the nursery, then find the right plants for your balcony and home.'}</p>
      </header>

      <section className={styles.advisor} aria-labelledby="nursery-advisor-title">
        <div className={styles.advisorHeading}><span className={styles.advisorIcon}><Camera size={21} /></span><div><span className={styles.eyebrow}>{hi ? 'नर्सरी में' : 'AT THE NURSERY'}</span><h2 id="nursery-advisor-title">{hi ? 'क्या यह पौधा मेरे घर के लिए सही है?' : 'Should I buy this plant?'}</h2><p>{hi ? 'नाम लिखें या पौधे की फोटो लें। हम आपकी जगह, रोशनी और देखभाल के हिसाब से बताएँगे।' : 'Type its name or take a photo. We’ll check it against your space, light, pets, and care routine.'}</p></div></div>
        <div className={styles.advisorControls}>
          <label className={styles.nameField}><span>{hi ? 'पौधे का नाम (वैकल्पिक अगर फोटो है)' : 'Plant name (optional if you add a photo)'}</span><input value={plantName} onChange={event => { setPlantName(event.target.value); setAssessment(null); }} maxLength={120} placeholder={hi ? 'जैसे: मोगरा, मनी प्लांट' : 'e.g. jasmine, money plant'} /></label>
          <label className={styles.photoButton}><input type="file" accept="image/*" capture="environment" onChange={onPhotoSelected} /><Upload size={17} />{hi ? 'फोटो लें / चुनें' : 'Take or choose a photo'}</label>
          <button type="button" className={styles.checkButton} disabled={checking || (!plantName.trim() && !photo)} onClick={checkPurchase}>{checking ? <span className={styles.spinner} /> : <Sprout size={17} />}{checking ? (hi ? 'चेक हो रहा है…' : 'Checking…') : (hi ? 'क्या खरीदूँ?' : 'Check before I buy')}</button>
        </div>
        {(photo || photoName) && <div className={styles.photoPreview}>{photo && <img src={photo} alt={hi ? 'चुने गए पौधे की फोटो' : 'Selected plant'} />}<span>{photoName}</span><button type="button" aria-label={hi ? 'फोटो हटाएँ' : 'Remove photo'} onClick={() => { setPhoto(''); setPhotoName(''); setAssessment(null); }}><X size={17} /></button></div>}
        {advisorError && <p className={styles.advisorError} role="alert">{advisorError}</p>}
        {assessment && <div className={`${styles.assessment} ${styles[`verdict_${assessment.verdict}`]}`} aria-live="polite">
          <div className={styles.assessmentTop}><span className={styles.verdictIcon}>{assessment.verdict === 'buy' ? <CheckCircle2 size={21} /> : <AlertTriangle size={21} />}</span><div><span className={styles.eyebrow}>{assessment.verdict === 'buy' ? (hi ? 'अच्छा मेल' : 'GOOD MATCH') : assessment.verdict === 'conditional' ? (hi ? 'पहले जाँचें' : 'CHECK FIRST') : assessment.verdict === 'skip' ? (hi ? 'शायद सही नहीं' : 'NOT A GOOD FIT') : (hi ? 'पहचान पक्की नहीं' : 'NOT SURE YET')}</span><h3>{assessment.plant_name || (hi ? 'पौधे का सुझाव' : 'Plant check')}</h3></div><strong className={styles.fitScore}>{assessment.fit_score}%<small>{hi ? 'मेल' : 'fit'}</small></strong></div>
          <p className={styles.assessmentSummary}>{assessment.summary}</p>
          <div className={styles.assessmentColumns}><div><strong>{hi ? 'क्यों ठीक हो सकता है' : 'Why it could work'}</strong>{assessment.good_fit.map((item, index) => <span key={index}><CheckCircle2 size={14} />{item}</span>)}</div><div><strong>{hi ? 'इन बातों का ध्यान रखें' : 'Things to watch'}</strong>{assessment.watch_out.map((item, index) => <span key={index}><AlertTriangle size={14} />{item}</span>)}</div></div>
          <div className={styles.nurseryChecks}><strong>{hi ? 'नर्सरी में ये 3 चीज़ें देखें' : 'Check these 3 things at the nursery'}</strong><ol>{assessment.nursery_checks.map((item, index) => <li key={index}>{item}</li>)}</ol></div>
          <small className={styles.careLevel}>{hi ? 'देखभाल का स्तर:' : 'Care level:'} {assessment.care_level}{assessment.garden_context_used ? (hi ? ' · आपके गार्डन के हिसाब से' : ' · matched to your garden') : ''}</small>
        </div>}
      </section>

      <section className={styles.panel} aria-labelledby="space-picker-title">
        <h2 id="space-picker-title">{space === 'balcony' ? (hi ? 'आपकी बालकनी कैसी है?' : 'What is your balcony like?') : (hi ? 'घर में कहाँ रखना है?' : 'Where will it live at home?')}</h2>
        <div className={styles.spaceGrid} role="tablist" aria-label="Choose a space">
          {spaces.map(option => {
            const Icon = option.icon;
            const selected = space === option.id;
            return <button key={option.id} type="button" role="tab" aria-selected={selected} className={`${styles.spaceOption} ${selected ? styles.selected : ''}`} onClick={() => setSpace(option.id)}>
              <Icon size={20} aria-hidden="true" /><span>{hi ? ({ living: 'लिविंग रूम', bedroom: 'बेडरूम', balcony: 'बालकनी', kitchen: 'रसोई', bathroom: 'बाथरूम', office: 'स्टडी / ऑफिस' } as Record<SpaceId, string>)[option.id] : option.label}</span>
            </button>;
          })}
        </div>

        {space === 'balcony' && <div className={styles.balconyControls}>
          <fieldset><legend>{hi ? 'सीधी धूप कितने घंटे?' : 'Hours of direct sun'}</legend><div className={styles.sunChoices}>{[{ value: 0, en: '0–2 hours', hi: '0–2 घंटे' }, { value: 3, en: '3–5 hours', hi: '3–5 घंटे' }, { value: 6, en: '6+ hours', hi: '6+ घंटे' }].map(option => <button type="button" key={option.value} aria-pressed={sunHours === option.value} className={sunHours === option.value ? styles.sunSelected : ''} onClick={() => { setSunHours(option.value); setLight(option.value >= 6 ? 'direct' : option.value >= 3 ? 'bright' : 'low'); }}>{hi ? option.hi : option.en}</button>)}</div></fieldset>
          <fieldset><legend>{hi ? 'बालकनी खुली है या ढकी हुई?' : 'Is it open or covered?'}</legend><div className={styles.sunChoices}><button type="button" aria-pressed={balconyExposure === 'open'} className={balconyExposure === 'open' ? styles.sunSelected : ''} onClick={() => setBalconyExposure('open')}>{hi ? 'खुली / हवादार' : 'Open / windy'}</button><button type="button" aria-pressed={balconyExposure === 'covered'} className={balconyExposure === 'covered' ? styles.sunSelected : ''} onClick={() => setBalconyExposure('covered')}>{hi ? 'ढकी / सुरक्षित' : 'Covered / sheltered'}</button></div></fieldset>
        </div>}

        <div className={styles.selectionIntro}>
          <span className={styles.selectionIcon}><SelectedIcon size={22} /></span>
          <div><h3>{selectedSpace.label}</h3><p>{selectedSpace.note}</p></div>
        </div>

        <h2 className={styles.lightHeading}>{space === 'balcony' ? (hi ? 'छनी हुई या सीधी धूप?' : 'Sun exposure') : (hi ? 'दिन में यहाँ कितनी रोशनी आती है?' : 'How much daylight does it get?')}</h2>
        <div className={styles.lightGrid} role="radiogroup" aria-label="Choose the light level">
        {lights.map(option => {
            const Icon = option.icon;
            const selected = light === option.id;
            return <button key={option.id} type="button" role="radio" aria-checked={selected} className={`${styles.lightOption} ${selected ? styles.lightSelected : ''}`} onClick={() => { setLight(option.id); if (space === 'balcony') setSunHours(option.id === 'direct' ? 6 : option.id === 'low' ? 0 : 3); }}>
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
