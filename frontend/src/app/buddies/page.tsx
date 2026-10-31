'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Droplets, Leaf, LoaderCircle, MailPlus, Sprout, UserRoundPlus, X } from 'lucide-react';
import { authFetch } from '@/lib/api';
import Loader from '@/components/Loader';
import styles from './Buddies.module.css';

type Buddy = { id: number; name: string };
type Plant = { id: number; name: string; species: string; image_url?: string; placement?: string; light_req?: string; light_requirement?: string; water_freq: number; last_watered?: string };
type CareTask = Plant & { owner_id: number; owner_name: string; starts_on: string; ends_on: string; instructions?: string };

export default function PlantBuddies() {
  const router = useRouter();
  const [friends, setFriends] = useState<Buddy[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [careTasks, setCareTasks] = useState<CareTask[]>([]);
  const [gardenOwner, setGardenOwner] = useState('');
  const [garden, setGarden] = useState<Plant[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [wateringId, setWateringId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    const [buddyResponse, careResponse] = await Promise.all([authFetch('plant_buddies.php'), authFetch('buddy_care.php')]);
    const buddyData = await buddyResponse.json(); const careData = await careResponse.json();
    if (buddyData.status === 'success') { setFriends(buddyData.friends); setIncoming(buddyData.incoming); setOutgoing(buddyData.outgoing); }
    if (careData.status === 'success') setCareTasks(careData.care_tasks);
  }
  useEffect(() => {
    if (!localStorage.getItem('user')) { router.push('/login'); return; }
    refresh().catch(() => setError('Could not load your plant buddies.')).finally(() => setReady(true));
  }, [router]);

  async function sendRequest(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice(''); setError('');
    try {
      const response = await authFetch('plant_buddies.php', { method: 'POST', body: JSON.stringify({ action: 'request', email }) });
      const data = await response.json();
      if (data.status === 'success') { setNotice(data.message); setEmail(''); await refresh(); }
      else setError(data.message || 'Could not send this request.');
    } catch { setError('Could not send this request.'); }
    finally { setBusy(false); }
  }

  async function respond(requestId: number, accept: boolean) {
    setError('');
    const response = await authFetch('plant_buddies.php', { method: 'POST', body: JSON.stringify({ action: 'respond', request_id: requestId, accept }) });
    const data = await response.json();
    if (data.status === 'success') { setNotice(data.message); await refresh(); } else setError(data.message || 'Could not update the request.');
  }

  async function openGarden(buddy: Buddy) {
    setGardenOwner(buddy.name); setGarden([]); setError('');
    try {
      const response = await authFetch(`buddy_garden.php?buddy_id=${buddy.id}`); const data = await response.json();
      if (data.status === 'success') { setGarden(data.plants); setGardenOwner(data.buddy.name); }
      else setError(data.message || 'Could not open this garden.');
    } catch { setError('Could not open this garden.'); }
  }

  async function waterBuddyPlant(plantId: number) {
    setWateringId(plantId); setError('');
    try {
      const response = await authFetch('water_plant.php', { method: 'POST', body: JSON.stringify({ id: plantId }) }); const data = await response.json();
      if (data.status === 'success') { setNotice('Watering saved to your buddy’s plant record.'); await refresh(); }
      else setError(data.message || 'This plant is not currently assigned to you.');
    } catch { setError('Could not save watering.'); }
    finally { setWateringId(null); }
  }

  if (!ready) return <Loader fullScreen label="Loading plant buddies…" />;

  return <main className={styles.container}>
    <header className={styles.header}><span className={styles.eyebrow}>GROW TOGETHER</span><h1>Plant Buddy</h1><p>Add friends to share garden inspiration. Accepted buddies can view each other’s saved plant profiles.</p></header>
    {notice && <p className={styles.notice} role="status">{notice}</p>}{error && <p className={styles.error} role="alert">{error}</p>}

    <section className={styles.panel}>
      <div className={styles.panelTitle}><span><UserRoundPlus size={20} /></span><div><h2>Invite a plant buddy</h2><p>Send a request using the email tied to their Pnapana account.</p></div></div>
      <form onSubmit={sendRequest} className={styles.inviteForm}><input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="friend@example.com" aria-label="Friend's account email" /><button disabled={busy}>{busy ? <LoaderCircle className={styles.spin} size={17} /> : <><MailPlus size={17} /> Send request</>}</button></form>
    </section>

    {incoming.length > 0 && <section className={styles.panel}><h2>Buddy requests</h2><div className={styles.requestList}>{incoming.map(request => <div key={request.id} className={styles.requestRow}><div><strong>{request.name}</strong><small>{request.email}</small></div><div><button onClick={() => respond(request.id, true)} aria-label={`Accept ${request.name}`}><Check size={16} /> Accept</button><button className={styles.decline} onClick={() => respond(request.id, false)} aria-label={`Decline ${request.name}`}><X size={16} /></button></div></div>)}</div></section>}
    {outgoing.length > 0 && <section className={styles.panel}><h2>Sent requests</h2>{outgoing.map(request => <p className={styles.sentRow} key={request.id}><span>{request.name}</span><small>Waiting for response</small></p>)}</section>}

    <section className={styles.section}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>YOUR GARDEN CIRCLE</span><h2>Plant buddies</h2></div><span>{friends.length}</span></div>
      {friends.length ? <div className={styles.buddyGrid}>{friends.map(buddy => <button key={buddy.id} className={styles.buddyCard} onClick={() => openGarden(buddy)}><span className={styles.buddyIcon}><Sprout size={22} /></span><span><strong>{buddy.name}</strong><small>View shared garden</small></span><ArrowRight size={17} /></button>)}</div> : <div className={styles.empty}><Leaf size={24} /><p>When someone accepts your request, their garden will appear here.</p></div>}
    </section>

    {gardenOwner && <section className={styles.panel}><div className={styles.sectionHeading}><h2>{gardenOwner}’s garden</h2><button className={styles.clearButton} onClick={() => { setGardenOwner(''); setGarden([]); }}>Close</button></div>{garden.length ? <div className={styles.plantGrid}>{garden.map(plant => <article key={plant.id} className={styles.plantCard}>{plant.image_url ? <img src={plant.image_url} alt="" /> : <span className={styles.plantPlaceholder}><Leaf size={20} /></span>}<div><strong>{plant.name}</strong><small>{plant.species}</small><span>{plant.placement || 'Location not set'} · {plant.light_requirement || plant.light_req || 'Light preference not set'}</span><span>Last watered: {formatDate(plant.last_watered)}</span></div></article>)}</div> : <p className={styles.muted}>This garden doesn’t have plants to show yet.</p>}</section>}

    {careTasks.length > 0 && <section className={`${styles.panel} ${styles.carePanel}`}><div className={styles.panelTitle}><span><Droplets size={20} /></span><div><h2>Vacation care assigned to you</h2><p>These friends have shared care instructions for their trip.</p></div></div><div className={styles.careGrid}>{careTasks.map(task => <article key={`${task.owner_id}-${task.id}`} className={styles.careCard}><div><strong>{task.name}</strong><small>{task.species} · {task.owner_name}’s plant</small><p>{task.instructions || `Water about every ${task.water_freq} days. Check that the soil is dry first.`}</p><small>Trip: {task.starts_on} to {task.ends_on}</small></div><button disabled={wateringId === task.id} onClick={() => waterBuddyPlant(task.id)}>{wateringId === task.id ? <LoaderCircle className={styles.spin} size={16} /> : <><Droplets size={16} /> Log water</>}</button></article>)}</div></section>}
  </main>;
}

function formatDate(value?: string) { if (!value) return 'Not logged yet'; const date = new Date(value.replace(' ', 'T')); return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : 'Not logged yet'; }
