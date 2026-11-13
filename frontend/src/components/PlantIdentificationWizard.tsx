'use client';

import { useState } from 'react';
import { Camera, Check, ImagePlus, Leaf, RotateCcw, Sparkles, X } from 'lucide-react';
import { authFetch } from '@/lib/api';
import styles from './PlantIdentificationWizard.module.css';

type Candidate = {
  species: string;
  common_name: string;
  probability: number;
  description?: string;
  providers_agree?: boolean;
};

type ScanResult = {
  scan_id: string;
  strong_match: boolean;
  providers_agree: boolean;
  identification: Candidate & { confidence_score: number };
  candidates: Candidate[];
};

export type ConfirmedPlantIdentification = {
  species: string;
  common_name: string;
  description: string;
  confidence_score: number | null;
  care_plan: Record<string, any>;
  primary_image: string;
};

type Props = {
  onClose: () => void;
  onConfirmed: (plant: ConfirmedPlantIdentification) => void;
};

const PHOTO_SLOTS = [
  { id: 'whole', title: 'Whole plant', detail: 'Include the pot and full growth shape.', required: true },
  { id: 'leaf', title: 'Clear leaf', detail: 'Fill the frame with one healthy leaf.', required: true },
  { id: 'stem', title: 'Stem or flower', detail: 'Show nodes, stem texture, or a flower.', required: true },
  { id: 'angle', title: 'Another angle', detail: 'Optional: back of leaf or side view.', required: false },
] as const;

async function prepareImage(file: File): Promise<string> {
  if (file.size > 12 * 1024 * 1024) throw new Error('Choose a photo smaller than 12 MB.');
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read this photo.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Use a JPG, PNG, or WebP photo.'));
    element.src = source;
  });
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.86);
}

export default function PlantIdentificationWizard({ onClose, onConfirmed }: Props) {
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [customSpecies, setCustomSpecies] = useState('');
  const [customCommonName, setCustomCommonName] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requiredCount = PHOTO_SLOTS.filter(slot => slot.required && photos[slot.id]).length;
  const images = PHOTO_SLOTS.map(slot => photos[slot.id]).filter(Boolean);

  const choosePhoto = async (slotId: string, file?: File) => {
    if (!file) return;
    setError('');
    try {
      const image = await prepareImage(file);
      setPhotos(current => ({ ...current, [slotId]: image }));
      setScan(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not prepare this photo.');
    }
  };

  const identify = async () => {
    if (requiredCount < 3) return;
    setBusy(true);
    setError('');
    try {
      const response = await authFetch('identify_plant.php', { method: 'POST', body: JSON.stringify({ images }) });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || 'Identification failed.');
      setScan(data);
      setSelectedSpecies(data.strong_match ? data.candidates[0]?.species || '' : '');
      setShowCustom(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identification failed. Please retake the photos.');
    } finally {
      setBusy(false);
    }
  };

  const confirmPlant = async () => {
    if (!scan) return;
    const chosen = showCustom ? customSpecies.trim() : selectedSpecies;
    if (!chosen) {
      setError(showCustom ? 'Enter the correct species or plant name.' : 'Choose the plant that matches yours.');
      return;
    }
    const candidate = scan.candidates.find(item => item.species === selectedSpecies);
    setBusy(true);
    setError('');
    try {
      const response = await authFetch('confirm_identification.php', {
        method: 'POST',
        body: JSON.stringify({
          scan_id: scan.scan_id,
          species: chosen,
          common_name: showCustom ? (customCommonName.trim() || chosen) : (candidate?.common_name || chosen),
          custom_correction: showCustom,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || 'Could not confirm this plant.');
      onConfirmed({ ...data.identification, care_plan: data.care_plan, primary_image: images[0] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm this plant.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.overlay} role="presentation">
      <section className={styles.wizard} role="dialog" aria-modal="true" aria-labelledby="plant-id-title">
        <header className={styles.header}>
          <div className={styles.brandMark}><Leaf size={22} /></div>
          <div><span className={styles.eyebrow}>PLANT IDENTIFICATION</span><h2 id="plant-id-title">Photograph the clues</h2></div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close plant identification"><X size={20} /></button>
        </header>

        {!scan ? (
          <>
            <div className={styles.intro}>
              <strong>Take 3–4 photos from different angles</strong>
              <p>Good light and varied views help the models separate similar plants and cultivars.</p>
              <div className={styles.progress}><span style={{ width: `${requiredCount * 100 / 3}%` }} /></div>
              <small>{requiredCount}/3 required views ready</small>
            </div>
            <div className={styles.photoGrid}>
              {PHOTO_SLOTS.map((slot, index) => (
                <article className={`${styles.photoSlot} ${photos[slot.id] ? styles.photoReady : ''}`} key={slot.id}>
                  {photos[slot.id] ? <img src={photos[slot.id]} alt={`${slot.title} preview`} /> : <span className={styles.slotNumber}>{index + 1}</span>}
                  <div className={styles.slotCopy}><strong>{slot.title}{!slot.required && <em>Optional</em>}</strong><p>{slot.detail}</p></div>
                  <div className={styles.photoActions}>
                    <label><Camera size={15} /> Take photo<input type="file" accept="image/*" capture="environment" onChange={event => choosePhoto(slot.id, event.target.files?.[0])} /></label>
                    <label><ImagePlus size={15} /> Upload<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => choosePhoto(slot.id, event.target.files?.[0])} /></label>
                    {photos[slot.id] ? <button type="button" onClick={() => setPhotos(current => { const next = { ...current }; delete next[slot.id]; return next; })} aria-label={`Remove ${slot.title} photo`}><X size={15} /></button> : null}
                  </div>
                </article>
              ))}
            </div>
            <div className={styles.tip}><Sparkles size={17} /><span>Avoid zoom, filters, harsh shadows, and multiple plants in one frame.</span></div>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            <footer className={styles.footer}><button type="button" className={styles.secondary} onClick={onClose}>Cancel</button><button type="button" className={styles.primary} disabled={requiredCount < 3 || busy} onClick={identify}>{busy ? 'Comparing photos…' : 'Identify my plant'}</button></footer>
          </>
        ) : (
          <>
            <div className={`${styles.resultBanner} ${scan.strong_match ? styles.strong : styles.uncertain}`}>
              {scan.strong_match ? <Check size={21} /> : <Leaf size={21} />}
              <div><strong>{scan.strong_match ? 'Strong match — please confirm' : "We’re not fully sure"}</strong><p>{scan.strong_match ? 'Both identification systems agree. Check the plant name before we create its care plan.' : 'Compare these possibilities with your plant, then choose the closest match.'}</p></div>
            </div>
            <div className={styles.candidates} role="radiogroup" aria-label="Plant identification choices">
              {scan.candidates.map(candidate => (
                <label className={`${styles.candidate} ${selectedSpecies === candidate.species && !showCustom ? styles.candidateSelected : ''}`} key={candidate.species}>
                  <input type="radio" name="plant-candidate" checked={selectedSpecies === candidate.species && !showCustom} onChange={() => { setSelectedSpecies(candidate.species); setShowCustom(false); }} />
                  <span className={styles.radioMark} />
                  <span className={styles.candidateCopy}><strong>{candidate.common_name || candidate.species}</strong><em>{candidate.species}</em>{candidate.description ? <small>{candidate.description}</small> : null}</span>
                  <span className={styles.confidence}>{Math.round(candidate.probability * 100)}%<small>{candidate.providers_agree ? 'Both agree' : 'Model score'}</small></span>
                </label>
              ))}
              <button type="button" className={`${styles.notListed} ${showCustom ? styles.notListedActive : ''}`} onClick={() => { setShowCustom(true); setSelectedSpecies(''); }}>My plant isn’t listed</button>
              {showCustom ? <div className={styles.customFields}><label>Correct species or plant name<input value={customSpecies} onChange={event => setCustomSpecies(event.target.value)} placeholder="e.g. Calathea orbifolia" /></label><label>Common name <small>Optional</small><input value={customCommonName} onChange={event => setCustomCommonName(event.target.value)} placeholder="e.g. Prayer plant" /></label></div> : null}
            </div>
            <p className={styles.confirmNote}>Your confirmation is required. The care plan is generated only after you approve the identity.</p>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            <footer className={styles.footer}><button type="button" className={styles.secondary} onClick={() => { setScan(null); setError(''); }}><RotateCcw size={16} /> Retake</button><button type="button" className={styles.primary} disabled={busy || (!showCustom && !selectedSpecies)} onClick={confirmPlant}>{busy ? 'Creating care plan…' : 'Confirm plant & create care plan'}</button></footer>
          </>
        )}
      </section>
    </div>
  );
}
