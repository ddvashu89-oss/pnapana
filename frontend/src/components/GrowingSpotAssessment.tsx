'use client';
import { useState } from 'react';
import { authFetch } from '@/lib/api';

type Assessment = { placement: 'indoor' | 'outdoor' | 'unknown'; room: string; observations: string; uncertainty: string };
export default function GrowingSpotAssessment({ onConfirm }: { onConfirm: (value: Assessment) => void }) {
  const [result, setResult] = useState<Assessment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function analyze(file?: File) {
    if (!file) return;
    setError(''); setResult(null);
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 9 * 1024 * 1024) { setError('Choose a JPG, PNG or WebP under 9 MB.'); return; }
    setBusy(true);
    try {
      const image = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      const response = await authFetch('assess_growing_spot.php', { method: 'POST', body: JSON.stringify({ image }) });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || 'Could not assess this spot.');
      setResult(data.assessment);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Assessment unavailable. Confirm the details below.'); }
    finally { setBusy(false); }
  }
  return <section aria-label="Growing spot assessment" style={{ padding: 16, background: '#eef7ef', borderRadius: 12, marginBottom: 16 }}>
    <strong>Show us where your plant lives</strong>
    <p>Take a wide photo with the pot, window or balcony and nearby shade. Avoid including people or private details. The photo is sent for AI assessment and is not saved as a location photo.</p>
    <label>Growing spot photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => void analyze(event.target.files?.[0])} /></label>
    {busy && <p role="status">Assessing visible surroundings…</p>}
    {error && <p role="alert">{error}</p>}
    {result && <div><p><strong>Photo estimate:</strong> {result.placement} · {result.room}</p><p>{result.observations}</p><p>{result.uncertainty}</p><button type="button" onClick={() => { onConfirm(result); setResult(null); }}>This matches the current spot</button></div>}
    <small>A photo cannot establish daily sunlight hours or soil moisture. Confirm those below. You can also complete setup without a photo.</small>
  </section>;
}
