'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Bot, CalendarClock, Droplets, House, Leaf, LoaderCircle, Sun, TriangleAlert } from 'lucide-react';
import { authFetch } from '@/lib/api';
import Loader from '@/components/Loader';
import styles from './Manager.module.css';

type Plant = {
  id: number; name: string; species: string; image_url?: string; placement: 'indoor' | 'outdoor' | 'unknown';
  direct_sun: boolean; light_req: string; light_requirement: string; water_freq: number;
  last_watered: string | null; waterings_30d: number; care_consistency: number;
  last_issue_at: string | null; last_issue: string | null; status: string; status_color: string;
};
type ManagerData = { total_plants: number; indoor_plants: number; outdoor_plants: number; direct_sun_plants: number; needs_watering: number; plants_with_disease_history: number; regular_care_plants: number };

export default function GardenManager() {
  const router = useRouter();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [summary, setSummary] = useState<ManagerData | null>(null);
  const [aiAllowed, setAiAllowed] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('user')) { router.push('/login'); return; }
    authFetch('garden_manager.php').then(response => response.json()).then(data => {
      if (data.status === 'success') { setPlants(data.plants); setSummary(data.summary); setAiAllowed(data.ai_chat_allowed); }
      else setError(data.message || 'Could not load your garden overview.');
    }).catch(() => setError('Could not load your garden overview.')).finally(() => setLoading(false));
  }, [router]);

  const askManager = async (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    setAsking(true); setError(''); setAnswer('');
    try {
      const response = await authFetch('garden_manager.php', { method: 'POST', body: JSON.stringify({ question: question.trim() }) });
      const data = await response.json();
      if (data.status === 'success') setAnswer(data.answer);
      else setError(data.message || 'Your manager could not answer right now.');
    } catch { setError('Your manager could not answer right now.'); }
    finally { setAsking(false); }
  };

  if (loading) return <Loader fullScreen label="Loading your garden intelligence…" />;

  return <main className={styles.container}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>YOUR GARDEN, UNDERSTOOD</span><h1>Personal AI Plant Manager</h1><p>A clear view of your plants, their care, and what may need attention.</p></div>
      <Link href="/vacation" className={styles.headerLink}><CalendarClock size={17} /> Vacation mode</Link>
    </header>

    {summary && <section className={styles.summaryGrid} aria-label="Garden overview">
      <article><span><Leaf size={18} /> Plants</span><strong>{summary.total_plants}</strong><small>in your garden</small></article>
      <article><span><House size={18} /> Indoor</span><strong>{summary.indoor_plants}</strong><small>{summary.outdoor_plants} outdoor · {summary.total_plants - summary.indoor_plants - summary.outdoor_plants} not set</small></article>
      <article><span><Sun size={18} /> Direct sun</span><strong>{summary.direct_sun_plants}</strong><small>based on saved light preferences</small></article>
      <article><span><Droplets size={18} /> Need watering</span><strong>{summary.needs_watering}</strong><small>based on logged watering dates</small></article>
      <article><span><TriangleAlert size={18} /> Past issues</span><strong>{summary.plants_with_disease_history}</strong><small>plants with an issue scan</small></article>
      <article><span><CalendarClock size={18} /> Regular care</span><strong>{summary.regular_care_plants}/{summary.total_plants}</strong><small>at least 70% of expected waterings, last 30 days</small></article>
    </section>}

    <section className={styles.askCard}>
      <div className={styles.askHeading}><span className={styles.botIcon}><Bot size={21} /></span><div><h2>Ask about your garden</h2><p>Questions are answered using your saved plant and care history.</p></div></div>
      {aiAllowed ? <form onSubmit={askManager} className={styles.askForm}>
        <input maxLength={500} value={question} onChange={event => setQuestion(event.target.value)} placeholder="Which plant needs attention today?" aria-label="Ask your plant manager" />
        <button type="submit" disabled={asking || !question.trim()}>{asking ? <><LoaderCircle size={17} className={styles.spin} /> Thinking…</> : <>Ask manager <ArrowUpRight size={16} /></>}</button>
      </form> : <div className={styles.premiumNote}>Garden insights are ready. AI chat is part of Premium. <Link href="/subscription">See plans <ArrowUpRight size={14} /></Link></div>}
      {answer && <p className={styles.answer} role="status">{answer}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>

    <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>PLANT-BY-PLANT</span><h2>Your garden profile</h2></div><Link href="/dashboard#collection">Edit garden <ArrowUpRight size={16} /></Link></div>
    {plants.length === 0 ? <div className={styles.empty}><Leaf size={26} /><p>Add plants to build your personal garden profile.</p><Link href="/dashboard">Open garden</Link></div> : <section className={styles.plantGrid}>
      {plants.map(plant => <article className={styles.plantCard} key={plant.id}>
        {plant.image_url ? <img src={plant.image_url} alt="" /> : <span className={styles.plantPlaceholder}><Leaf size={22} /></span>}
        <div className={styles.plantBody}>
          <div className={styles.plantTitle}><div><h3>{plant.name}</h3><p>{plant.species}</p></div><span className={`${styles.placement} ${styles[plant.placement]}`}>{plant.placement === 'unknown' ? 'Location not set' : plant.placement}</span></div>
          <div className={styles.factGrid}><span><Sun size={15} />{plant.direct_sun ? 'Direct sun' : plant.light_requirement || plant.light_req || 'Light preference unknown'}</span><span><Droplets size={15} />Last watered: {formatDate(plant.last_watered)}</span><span><CalendarClock size={15} />Every {plant.water_freq} days</span></div>
          <div className={styles.consistency}><div><span>Care consistency</span><strong>{plant.care_consistency}%</strong></div><div className={styles.track}><i style={{ width: `${plant.care_consistency}%` }} /></div><small>{plant.waterings_30d} logged watering{plant.waterings_30d === 1 ? '' : 's'} in 30 days</small></div>
          {plant.last_issue_at && <div className={styles.issue}><TriangleAlert size={16} /><div><strong>Previous plant health issue</strong><p>{plant.last_issue || 'Issue found in a previous health scan'} · {formatDate(plant.last_issue_at)}</p></div></div>}
          <Link className={styles.detailsLink} href={`/plant?id=${plant.id}`}>Open plant record <ArrowUpRight size={14} /></Link>
        </div>
      </article>)}
    </section>}
    <section className={styles.sosBanner}><div><span className={styles.eyebrow}>URGENT PLANT CHECK</span><h2>Plant SOS</h2><p>Take a photo to run a health scan and save its diagnosis to that plant’s history.</p></div><Link href={plants[0] ? `/plant?id=${plants[0].id}&tab=scan` : '/dashboard?action=scan'}>Start a health scan <ArrowUpRight size={16} /></Link></section>
  </main>;
}

function formatDate(value: string | null) {
  if (!value) return 'Not logged yet';
  const parsed = new Date(value.replace(' ', 'T'));
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString() : 'Not logged yet';
}
