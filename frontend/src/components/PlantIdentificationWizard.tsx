'use client';

import { useState } from 'react';
import { Camera, Check, ImagePlus, Leaf, RotateCcw, Sparkles, X } from 'lucide-react';
import { authFetch } from '@/lib/api';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import styles from './PlantIdentificationWizard.module.css';

type Candidate = {
  species: string;
  common_name: string;
  probability: number;
  description?: string;
  image_url?: string;
  family?: string;
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
  { id: 'whole', title: 'Plant photo', detail: 'Show the whole plant, including a few clear leaves.', required: true },
  { id: 'leaf', title: 'Close-up leaf', detail: 'Required: fill the frame with one sharp, healthy leaf.', required: true },
  { id: 'stem', title: 'Stem or flower', detail: 'Required: show stem texture, nodes, or a flower.', required: true },
  { id: 'angle', title: 'Another angle', detail: 'Optional: back of leaf or side view.', required: false },
] as const;

type PreparedPhoto = { dataUrl: string; qualityNotes: string[]; blocking: boolean; metrics: { blur: number; green: number; pixels: number } };

function photoQuality(image: HTMLImageElement): Omit<PreparedPhoto, 'dataUrl'> {
  const sample = document.createElement('canvas');
  sample.width = 64;
  sample.height = 64;
  const context = sample.getContext('2d', { willReadFrequently: true });
  if (!context) return { qualityNotes: [], blocking: false, metrics: { blur: 0, green: 0, pixels: image.naturalWidth * image.naturalHeight } };
  context.drawImage(image, 0, 0, sample.width, sample.height);
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
  let total = 0; let green = 0; let edge = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2];
    total += r * 0.2126 + g * 0.7152 + b * 0.0722;
    if (g > r * 1.08 && g > b * 1.05 && g > 45) green++;
    if (index >= 4) edge += Math.abs(g - pixels[index - 3]);
  }
  const brightness = total / (pixels.length / 4);
  const notes: string[] = [];
  const pixelsCount = image.naturalWidth * image.naturalHeight;
  if (brightness < 45) notes.push('Too dark — use brighter, indirect daylight.');
  if (brightness > 235) notes.push('Too bright — avoid direct glare so leaf detail remains visible.');
  if (edge / (pixels.length / 4) < 5.5) notes.push('This looks blurry — hold still and focus on one leaf.');
  if (pixelsCount < 350000) notes.push('This photo is small — move closer so a leaf fills more of the frame.');
  if (green / (pixels.length / 4) < .08) notes.push('We cannot clearly see plant detail. Include leaves, stem, or flower.');
  return { qualityNotes: notes, blocking: brightness < 45 || brightness > 235 || edge / (pixels.length / 4) < 5.5 || pixelsCount < 350000, metrics: { blur: edge / (pixels.length / 4), green: green / (pixels.length / 4), pixels: pixelsCount } };
}

async function prepareImage(file: File): Promise<PreparedPhoto> {
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
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight), Math.sqrt(2_000_000 / (image.naturalWidth * image.naturalHeight)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.86), ...photoQuality(image) };
}

function formatProbability(probability: number): string {
  if (!Number.isFinite(probability)) return '—';
  // Keep the provider's numeric score meaningful rather than rounding a
  // 63.127% result down to a misleading 63%.
  return `${(probability * 100).toFixed(3).replace(/\.?0+$/, '')}%`;
}

export default function PlantIdentificationWizard({ onClose, onConfirmed }: Props) {
  const { language } = useLanguage();
  const hi = language === 'hi';
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [qualityNotes, setQualityNotes] = useState<Record<string, string[]>>({});
  const [quality, setQuality] = useState<Record<string, PreparedPhoto['metrics']>>({});
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [needsCloseup, setNeedsCloseup] = useState(false);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [customSpecies, setCustomSpecies] = useState('');
  const [customCommonName, setCustomCommonName] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requiredCount = PHOTO_SLOTS.filter(slot => slot.required && photos[slot.id]).length;
  const images = PHOTO_SLOTS.map(slot => photos[slot.id]).filter(Boolean);
  const hasBlockingQuality = false; // Quality notes guide the customer; they do not trap legitimate pale or flowering plants.

  const choosePhoto = async (slotId: string, file?: File) => {
    if (!file) return;
    setError('');
    try {
      const prepared = await prepareImage(file);
      setPhotos(current => ({ ...current, [slotId]: prepared.dataUrl }));
      setQualityNotes(current => {
        const next = { ...current };
        if (prepared.qualityNotes.length) next[slotId] = prepared.qualityNotes;
        else delete next[slotId];
        return next;
      });
      setQuality(current => ({ ...current, [slotId]: prepared.metrics }));
      setScan(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not prepare this photo.');
    }
  };

  const identify = async () => {
    if (requiredCount < 3 || (needsCloseup && !photos.leaf) || hasBlockingQuality) return;
    setBusy(true);
    setError('');
    try {
      const response = await authFetch('identify_plant_multi.php', { method: 'POST', body: JSON.stringify({ images, lang: language, category, location_consent: Boolean(location), latitude: location?.latitude, longitude: location?.longitude, quality }) });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        const reference = typeof data.reference_id === 'string' && data.reference_id ? ` Reference: ${data.reference_id}.` : '';
        throw new Error(`${data.message || 'Identification failed.'}${reference}`);
      }
      setScan(data);
      setNeedsCloseup(Boolean(data.uncertain && images.length < 2));
      setSelectedSpecies(data.strong_match ? data.candidates[0]?.species || '' : '');
      setShowCustom(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identification failed. Please retake the photos.');
    } finally {
      setBusy(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationMessage(hi ? 'इस ब्राउज़र में लोकेशन उपलब्ध नहीं है।' : 'Location is unavailable in this browser.'); return; }
    navigator.geolocation.getCurrentPosition(position => { setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setLocationMessage(hi ? 'क्षेत्र केवल इस पहचान के लिए उपयोग होगा।' : 'Your area will be used only for this identification.'); }, () => setLocationMessage(hi ? 'लोकेशन नहीं मिली। आप बिना इसके जारी रख सकते हैं।' : 'Location was not shared. You can continue without it.'), { maximumAge: 86_400_000, timeout: 8_000 });
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
          lang: document.documentElement.lang || 'en',
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
          <div><span className={styles.eyebrow}>{hi ? 'पौधे की पहचान' : 'PLANT IDENTIFICATION'}</span><h2 id="plant-id-title">{hi ? 'पौधे के संकेतों की फ़ोटो लें' : 'Photograph the clues'}</h2></div>
          <button type="button" className={styles.close} onClick={onClose} aria-label={hi ? 'पहचान बंद करें' : 'Close plant identification'}><X size={20} /></button>
        </header>

        {!scan ? (
          <>
            <div className={styles.intro}>
              <strong>{hi ? 'सटीक पहचान के लिए 3 फ़ोटो ज़रूरी हैं' : 'Three photos are required for a reliable match'}</strong>
              <p>{hi ? 'पूरा पौधा, पत्ते का क्लोज़-अप, और तना या फूल—तीनों एक ही पौधे के हों।' : 'Add the whole plant, a close-up leaf, and stem or flower from the same plant.'}</p>
              <div className={styles.progress}><span style={{ width: `${requiredCount * 100 / 3}%` }} /></div>
              <small>{requiredCount}/3 {hi ? 'ज़रूरी फ़ोटो तैयार' : 'required photos ready'} · {hi ? 'अतिरिक्त कोण वैकल्पिक हैं' : 'another angle is optional'}</small>
            </div>
            <div className={styles.signals}>
              <label>{hi ? 'यह किस तरह का पौधा है? (वैकल्पिक)' : 'What type of plant is this? (optional)'}<select value={category} onChange={event => setCategory(event.target.value)}><option value="">{hi ? 'पता नहीं' : 'Not sure'}</option><option value="houseplant">{hi ? 'घर के अंदर' : 'Houseplant'}</option><option value="outdoor">{hi ? 'बालकनी / बगीचा' : 'Balcony / garden'}</option><option value="herb">{hi ? 'जड़ी-बूटी / खाने वाला पौधा' : 'Herb / edible plant'}</option></select></label>
              <button type="button" className={styles.locationButton} onClick={requestLocation}>{location ? (hi ? 'क्षेत्र जोड़ा गया' : 'Area added') : (hi ? 'अपना क्षेत्र जोड़ें' : 'Use my area')}</button>
              <small>{locationMessage || (hi ? 'क्षेत्र और मौसम परिणाम बेहतर कर सकते हैं। Pnapana आपकी सटीक लोकेशन सेव नहीं करता; यह केवल इस scan के लिए Plant.id को भेजी जाती है।' : 'Area and season can improve close matches. Pnapana does not store precise location; it is sent to Plant.id only for this scan.')}</small>
            </div>
            <div className={styles.photoGrid}>
              {PHOTO_SLOTS.map((slot, index) => (
                <article className={`${styles.photoSlot} ${photos[slot.id] ? styles.photoReady : ''}`} key={slot.id}>
                  {photos[slot.id] ? <img src={photos[slot.id]} alt={`${slot.title} preview`} /> : <span className={styles.slotNumber}>{index + 1}</span>}
                  <div className={styles.slotCopy}><strong>{slot.title}{!slot.required && <em>Optional</em>}</strong><p>{slot.detail}</p>{qualityNotes[slot.id]?.map(note => <p className={styles.qualityWarning} key={note}>{note}</p>)}</div>
                  <div className={styles.photoActions}>
                    <label><Camera size={15} /> {hi ? 'फ़ोटो लें' : 'Take photo'}<input type="file" accept="image/*" capture="environment" onChange={event => choosePhoto(slot.id, event.target.files?.[0])} /></label>
                    <label><ImagePlus size={15} /> {hi ? 'गैलरी से चुनें' : 'Upload from gallery'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => choosePhoto(slot.id, event.target.files?.[0])} /></label>
                    {photos[slot.id] ? <button type="button" onClick={() => { setPhotos(current => { const next = { ...current }; delete next[slot.id]; return next; }); setQualityNotes(current => { const next = { ...current }; delete next[slot.id]; return next; }); }} aria-label={`Remove ${slot.title} photo`}><X size={15} /></button> : null}
                  </div>
                </article>
              ))}
            </div>
            <div className={styles.tip}><Sparkles size={17} /><span>{hi ? 'बेहतर परिणाम: दिन की रोशनी में एक ही पौधा रखें और पत्ते साफ़ दिखें। चेतावनी होने पर भी आप चाहें तो scan जारी रख सकते हैं।' : 'For the best result: use daylight, keep one plant in frame, and make leaves sharp. Quality warnings are guidance; you can still scan.'}</span></div>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            <footer className={styles.footer}><button type="button" className={styles.secondary} onClick={onClose}>{hi ? 'रद्द करें' : 'Cancel'}</button><button type="button" className={styles.primary} disabled={requiredCount < 3 || busy || (needsCloseup && !photos.leaf) || hasBlockingQuality} onClick={identify}>{busy ? (hi ? 'पहचान रहे हैं…' : 'Identifying…') : (hi ? 'पौधा पहचानें' : 'Identify my plant')}</button></footer>
          </>
        ) : (
          <>
            <div className={`${styles.resultBanner} ${scan.strong_match ? styles.strong : styles.uncertain}`}>
              {scan.strong_match ? <Check size={21} /> : <Leaf size={21} />}
              <div><strong>{scan.strong_match ? (hi ? 'सबसे अच्छा मिलान — पुष्टि करें' : 'Top match — please confirm') : (hi ? 'हमें पूरी तरह भरोसा नहीं है' : "We’re not fully sure")}</strong><p>{needsCloseup ? (hi ? 'करीब से पत्ते या फूल की एक और फ़ोटो जोड़ें।' : 'Add one close-up leaf or flower photo before choosing.') : (hi ? 'नाम, पत्ते और पैटर्न मिलाकर चुनें।' : 'Compare the name, leaf shape, and pattern before choosing.')}</p></div>
            </div>
            <div className={styles.candidates} role="radiogroup" aria-label="Plant identification choices">
              {scan.candidates.map(candidate => (
                <label className={`${styles.candidate} ${selectedSpecies === candidate.species && !showCustom ? styles.candidateSelected : ''}`} key={candidate.species}>
                  <input type="radio" name="plant-candidate" checked={selectedSpecies === candidate.species && !showCustom} onChange={() => { setSelectedSpecies(candidate.species); setShowCustom(false); }} />
                  <span className={styles.radioMark} />
                  {candidate.image_url ? <img className={styles.candidateImage} src={candidate.image_url} alt="" /> : null}<span className={styles.candidateCopy}><strong>{candidate.common_name || candidate.species}</strong><em>{candidate.species}</em><small>{candidate.family ? `Family: ${candidate.family} · ` : ''}{hi ? 'पत्ते, पैटर्न और तने से मिलाएँ' : 'Compare leaf shape, pattern, and stem'}</small></span>
                  <span className={styles.confidence}>{formatProbability(candidate.probability)}<small>Plant.id score</small></span>
                </label>
              ))}
              <button type="button" className={`${styles.notListed} ${showCustom ? styles.notListedActive : ''}`} onClick={() => { setShowCustom(true); setSelectedSpecies(''); }}>My plant isn’t listed</button>
              {showCustom ? <div className={styles.customFields}><label>Correct species or plant name<input value={customSpecies} onChange={event => setCustomSpecies(event.target.value)} placeholder="e.g. Calathea orbifolia" /></label><label>Common name <small>Optional</small><input value={customCommonName} onChange={event => setCustomCommonName(event.target.value)} placeholder="e.g. Prayer plant" /></label></div> : null}
            </div>
            <p className={styles.confirmNote}>{hi ? 'यह फ़ोटो-मिलान का अनुमान है, पक्की पहचान नहीं। चुने हुए पौधे की देखभाल जानकारी केवल हमारे reviewed catalog में मिलने पर दिखाई जाएगी।' : 'This is a photo-match estimate, not certainty. Care guidance is shown only when the species is in our reviewed catalog.'}</p>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            <footer className={styles.footer}><button type="button" className={styles.secondary} onClick={() => { setScan(null); setNeedsCloseup(true); setError(''); }}><RotateCcw size={16} /> {needsCloseup ? (hi ? 'क्लोज़-अप जोड़ें' : 'Add close-up') : (hi ? 'फिर से लें' : 'Retake')}</button><button type="button" className={styles.primary} disabled={busy || needsCloseup || (!showCustom && !selectedSpecies)} onClick={confirmPlant}>{busy ? (hi ? 'पुष्टि हो रही है…' : 'Confirming…') : (hi ? 'यह पहचान चुनें' : 'Use this identification')}</button></footer>
          </>
        )}
      </section>
    </div>
  );
}
