'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, CheckCircle2, Plane } from 'lucide-react';
import { authFetch } from '@/lib/api';
import Loader from '@/components/Loader';
import styles from './Vacation.module.css';

type Vacation = { enabled: boolean; starts_on: string | null; ends_on: string | null; instructions: string | null };

export default function VacationMode() {
  const router = useRouter();
  const [mode, setMode] = useState<Vacation>({ enabled: false, starts_on: '', ends_on: '', instructions: '' });
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('user')) { router.push('/login'); return; }
    authFetch('vacation_mode.php').then(readApiResponse).then(data => setMode(data.mode))
      .catch(loadError => setError(`Could not load your vacation settings. ${loadError instanceof Error ? loadError.message : ''}`.trim()))
      .finally(() => setReady(true));
  }, [router]);

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const response = await authFetch('vacation_mode.php', { method: 'POST', body: JSON.stringify(mode) });
      const data = await readApiResponse(response);
      if (data.status === 'success') setMessage(data.message);
      else setError(data.message || 'Could not save vacation mode.');
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Could not save vacation mode.'); }
    finally { setSaving(false); }
  }

  if (!ready) return <Loader fullScreen label="Loading vacation care plan…" />;

  return <main className={styles.container}>
    <header className={styles.header}><span className={styles.eyebrow}>PLAN AHEAD FOR YOUR PLANTS</span><h1><Plane size={30} /> Vacation Mode</h1><p>Set your trip dates and keep plant care notes handy while you’re away.</p></header>
    {message && <p className={styles.success} role="status"><CheckCircle2 size={17} />{message}</p>}{error && <p className={styles.error} role="alert">{error}</p>}
    <form className={styles.form} onSubmit={save}>
      <label className={styles.toggle}><span className={styles.toggleIcon}><CalendarClock size={19} /></span><span><strong>Enable Vacation Mode</strong><small>Save your trip dates and plant care notes in one place.</small></span><input type="checkbox" checked={mode.enabled} onChange={event => setMode({ ...mode, enabled: event.target.checked })} /></label>
      {mode.enabled && <>
        <div className={styles.dateGrid}><label>Leaving<input type="date" required min={localToday()} value={mode.starts_on || ''} onChange={event => setMode({ ...mode, starts_on: event.target.value, ends_on: mode.ends_on && mode.ends_on < event.target.value ? event.target.value : mode.ends_on })} /></label><label>Returning<input type="date" required min={mode.starts_on || localToday()} max={mode.starts_on ? addDays(mode.starts_on, 120) : undefined} value={mode.ends_on || ''} onChange={event => setMode({ ...mode, ends_on: event.target.value })} /></label></div>
        <label className={styles.field}>Plant care notes<textarea maxLength={1000} rows={4} value={mode.instructions || ''} onChange={event => setMode({ ...mode, instructions: event.target.value })} placeholder="For example: Check the soil before watering. The fiddle-leaf fig is sensitive to moving." /></label>
      </>}
      <button className={styles.saveButton} type="submit" disabled={saving}>{saving ? 'Saving…' : mode.enabled ? 'Save vacation care plan' : 'Turn off vacation mode'}</button>
    </form>
    {mode.enabled && <aside className={styles.notice}><strong>{isActive(mode) ? 'Vacation mode is active now.' : 'Your care plan is saved.'}</strong><span>Your trip dates and plant care notes are saved to your account.</span></aside>}
  </main>;
}

function localToday() { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function addDays(date: string, days: number) { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function isActive(mode: Vacation) { const today = localToday(); return Boolean(mode.starts_on && mode.ends_on && mode.starts_on <= today && mode.ends_on >= today); }
async function readApiResponse(response: Response) {
  let data: any;
  try { data = await response.json(); }
  catch { throw new Error(`Server returned an unreadable response (${response.status}).`); }
  if (!response.ok || data?.status !== 'success') throw new Error(data?.message || `Request failed (${response.status}).`);
  return data;
}
