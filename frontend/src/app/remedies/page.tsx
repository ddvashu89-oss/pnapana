'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sprout, ShieldCheck, Droplets, Scissors, Bug, Leaf, ExternalLink, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import WeatherCard from '@/components/WeatherCard';
import { authFetch } from '@/lib/api';
import styles from './Remedies.module.css';

type Remedy = { icon: LucideIcon; issue: string; issueHi?: string; method: string; methodHi?: string; source?: string; sourceLabel?: string; sourceLabelHi?: string };
type PlantIssue = { issue: string; solution: string };

const remedies: Remedy[] = [
  {
    icon: Droplets,
    issue: 'Aphids or spider mites',
    issueHi: 'एफिड्स या स्पाइडर माइट्स',
    method: 'Rinse the leaves with a firm stream of lukewarm water, especially underneath. Isolate the plant and repeat as needed while checking nearby plants.',
    methodHi: 'पत्तियों के नीचे की तरफ भी गुनगुने पानी की तेज धार से धोएँ। पौधे को अलग रखें और ज़रूरत पड़ने पर दोहराएँ; पास के पौधों को भी जाँचें।',
    source: 'https://extension.umn.edu/garden-and-home/yard-and-garden/yard-and-garden-insects/insects-on-indoor-plants',
    sourceLabel: 'UMN Extension',
    sourceLabelHi: 'UMN Extension',
  },
  {
    icon: Bug,
    issue: 'A new or pest-affected plant',
    issueHi: 'नया या कीट लगा पौधा',
    method: 'Keep it apart from your other plants while you inspect the leaves and stems regularly. A three-week quarantine helps catch pests before they spread.',
    methodHi: 'जाँच के दौरान इसे बाकी पौधों से अलग रखें और पत्तियों व तनों को नियमित देखें। तीन हफ़्ते अलग रखने से कीट फैलने से पहले दिख सकते हैं।',
    source: 'https://extension.colostate.edu/resource/managing-houseplant-pests/',
    sourceLabel: 'Colorado State Extension',
    sourceLabelHi: 'Colorado State Extension',
  },
  {
    icon: Leaf,
    issue: 'A few visible mealybugs',
    issueHi: 'कुछ दिख रहे मिलीबग्स',
    method: 'For a small infestation, dab the insects with a cotton swab. If using rubbing alcohol, test one small leaf area first; some plants are sensitive. Keep it off the soil.',
    methodHi: 'कम कीट हों तो कॉटन स्वैब से उन्हें हटाएँ। रबिंग अल्कोहल इस्तेमाल करने से पहले एक छोटी पत्ती पर जाँचें—कुछ पौधे संवेदनशील होते हैं। इसे मिट्टी पर न लगने दें।',
    source: 'https://extension.colostate.edu/resource/managing-houseplant-pests/',
    sourceLabel: 'Colorado State Extension',
    sourceLabelHi: 'Colorado State Extension',
  },
  {
    icon: Scissors,
    issue: 'A few badly damaged leaves',
    issueHi: 'कुछ बहुत खराब पत्तियाँ',
    method: 'Trim only the badly affected leaves with clean scissors. Isolate the plant if pests or disease may be spreading, and keep watching the new growth.',
    methodHi: 'साफ़ कैंची से सिर्फ़ बहुत प्रभावित पत्तियाँ काटें। कीट या बीमारी फैलने का शक हो तो पौधे को अलग रखें और नई बढ़त पर नज़र रखें।',
    source: 'https://extension.psu.edu/pest-and-disease-problems-of-indoor-plants',
    sourceLabel: 'Penn State Extension',
    sourceLabelHi: 'Penn State Extension',
  },
  {
    icon: Droplets,
    issue: 'Soil staying wet for too long',
    issueHi: 'मिट्टी लंबे समय तक गीली रहना',
    method: 'Empty standing water from the saucer and check the soil before watering again. Let the surface dry only as much as your plant’s care needs allow.',
    methodHi: 'प्लेट में जमा पानी निकालें और अगली बार पानी देने से पहले मिट्टी जाँचें। मिट्टी की ऊपरी परत को पौधे की ज़रूरत के अनुसार ही सूखने दें।',
    source: 'https://extension.umn.edu/garden-and-home/yard-and-garden/yard-and-garden-insects/insects-on-indoor-plants',
    sourceLabel: 'UMN Extension',
    sourceLabelHi: 'UMN Extension',
  },
];

export default function HomeRemedies() {
  const router = useRouter();
  const { language } = useLanguage();
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [plants, setPlants] = useState<any[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const hi = language === 'hi';

  const selectedPlant = plants.find(plant => String(plant.id) === selectedPlantId) || null;
  const plantRemedies = useMemo<PlantIssue[]>(() => {
    if (!selectedPlant?.care_plan) return [];
    try {
      const plan = typeof selectedPlant.care_plan === 'string' ? JSON.parse(selectedPlant.care_plan) : selectedPlant.care_plan;
      return Array.isArray(plan?.common_issues)
        ? plan.common_issues.filter((item: any) => typeof item?.issue === 'string' && typeof item?.solution === 'string')
        : [];
    } catch { return []; }
  }, [selectedPlant]);

  useEffect(() => {
    if (!localStorage.getItem('user')) {
      router.push('/login');
      return;
    }
    const params = new URLSearchParams(window.location.search);
    setSelectedPlantId(params.get('plant_id') || '');
    authFetch('get_plants.php')
      .then(response => response.json())
      .then(data => { if (data.status === 'success' && Array.isArray(data.plants)) setPlants(data.plants); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [router]);

  const visibleRemedies = useMemo<Remedy[]>(() => {
    const search = query.trim().toLocaleLowerCase();
    const items: Remedy[] = selectedPlant ? plantRemedies.map(item => ({
      icon: ShieldCheck,
      issue: item.issue,
      method: item.solution,
      source: '',
      sourceLabel: '',
    })) : remedies;
    if (!search) return items;
    return items.filter(item => `${item.issue} ${item.issueHi || ''} ${item.method} ${item.methodHi || ''}`.toLocaleLowerCase().includes(search));
  }, [plantRemedies, query, selectedPlant]);

  const choosePlant = (id: string) => {
    setSelectedPlantId(id);
    const params = new URLSearchParams(window.location.search);
    if (id) params.set('plant_id', id);
    else params.delete('plant_id');
    router.replace(`/remedies${params.size ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  if (!ready) return <Loader fullScreen label={hi ? 'लोड हो रहा है…' : 'Loading home remedies…'} />;

  return <main className={styles.container}>
    <header className={styles.header}>
      <span className={styles.eyebrow}>{hi ? 'पौधों की घरेलू देखभाल' : 'SIMPLE STEPS AT HOME'}</span>
      <h1>{hi ? 'पौधों के घरेलू उपाय' : 'Home Remedies'}</h1>
      <p>{hi ? 'आम पौधों की समस्याओं के लिए आसान घरेलू तरीके।' : 'Practical, low-risk ways to help with common houseplant problems.'}</p>
    </header>

    <section className={styles.plantPicker} aria-label={hi ? 'पौधा चुनें' : 'Choose a plant'}>
      <label htmlFor="remedy-plant">{hi ? 'व्यक्तिगत उपाय के लिए पौधा' : 'Remedies for your plant'}</label>
      <select id="remedy-plant" value={selectedPlantId} onChange={event => choosePlant(event.target.value)}>
        <option value="">{hi ? 'सभी पौधों के सामान्य उपाय' : 'General plant remedies'}</option>
        {plants.map(plant => <option key={plant.id} value={plant.id}>{plant.name} · {plant.species}</option>)}
      </select>
      {selectedPlant && <p>{hi ? 'उपाय इस पौधे की सेव की गई देखभाल जानकारी से लिए गए हैं।' : `Showing recommendations saved for ${selectedPlant.name} (${selectedPlant.species}).`}</p>}
    </section>

    {selectedPlant && <div className={styles.weatherSection}>
      <h2>{hi ? 'आज के मौसम के अनुसार देखभाल' : `Care for ${selectedPlant.name} in today’s weather`}</h2>
      <WeatherCard plant={selectedPlant} />
    </div>}

    <aside className={styles.safetyNote}>
      <span><ShieldCheck size={19} /></span>
      <p>{hi ? 'नोट: डिश सोप, डिटर्जेंट, सिरका या बेकिंग सोडा के घरेलू स्प्रे पौधों को नुकसान पहुँचा सकते हैं। पहले समस्या पहचानें और हल्का तरीका अपनाएँ।' : 'Skip kitchen-mix sprays: dish soap, detergents, vinegar, and baking soda can damage plants. Identify the issue first and start with gentle, physical steps.'}</p>
    </aside>

    <label className={styles.search}>
      <Search size={18} aria-hidden="true" />
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={hi ? 'समस्या खोजें…' : 'Search a plant problem…'} aria-label={hi ? 'घरेलू उपाय खोजें' : 'Search home remedies'} />
    </label>

    <section className={styles.results} aria-live="polite">
      <div className={styles.resultsHeader}><h2>{selectedPlant ? (hi ? `${selectedPlant.name} के लिए उपाय` : `Remedies for ${selectedPlant.name}`) : (hi ? 'घरेलू उपाय' : 'At-home remedies')}</h2><span>{visibleRemedies.length}</span></div>
      {visibleRemedies.length ? <div className={styles.grid}>{visibleRemedies.map(item => {
        const Icon = item.icon;
        return <article key={item.issue} className={styles.card}>
          <span className={styles.cardIcon}><Icon size={20} /></span>
          <h3>{hi && item.issueHi ? item.issueHi : item.issue}</h3>
          <p>{hi && item.methodHi ? item.methodHi : item.method}</p>
          {item.source && <a href={item.source} target="_blank" rel="noreferrer">{hi ? item.sourceLabelHi : item.sourceLabel}<ExternalLink size={14} aria-hidden="true" /></a>}
        </article>;
      })}</div> : <div className={styles.empty}><Sprout size={26} /><strong>{selectedPlant ? (hi ? 'इस पौधे के लिए अभी कोई उपाय नहीं है' : 'No plant-specific remedies saved yet') : (hi ? 'कोई उपाय नहीं मिला' : 'No home remedies found')}</strong><p>{selectedPlant ? (hi ? 'इस पौधे का स्कैन करें ताकि इसकी समस्याओं के अनुसार सलाह मिल सके।' : 'Run a plant health scan to get advice for its detected issues.') : (hi ? 'दूसरा लक्षण खोजकर देखें।' : 'Try a different symptom or pest name.')}</p>{selectedPlant && <button type="button" onClick={() => router.push(`/plant?id=${selectedPlant.id}&tab=scan`)}>{hi ? 'पौधे का स्कैन करें' : 'Scan this plant'}</button>}</div>}
    </section>
  </main>;
}
