'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Bell, Check, Droplets, HeartPulse, Leaf, Lightbulb, PawPrint, RotateCw, Sprout, Sun, Thermometer, Wind } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import styles from './PlantSetupWizard.module.css';
import GrowingSpotAssessment from './GrowingSpotAssessment';

export type SetupPlant = {
  id?: number | string;
  name: string;
  species: string;
  image_url?: string;
  placement?: string;
  room?: string;
  light_req?: string;
  water_freq?: number;
  care_plan?: string | Record<string, any>;
  setup_data?: PlantSetupValues | null;
};

export type PlantSetupValues = {
  spot_verified?: boolean;
  sunlight_timing?: 'morning' | 'afternoon' | 'both' | 'none' | 'unknown';
  moisture_checked_at?: string;
  placement: 'indoor' | 'outdoor' | 'unknown';
  room: string;
  light: 'Direct sun' | 'Full sun' | 'Bright indirect' | 'Medium' | 'Low light' | 'Not sure';
  pot_size: 'small' | 'medium' | 'large' | 'extra-large' | 'not-sure';
  has_drainage: boolean | null;
  soil_condition: 'well-draining' | 'dense' | 'sandy' | 'moisture-retaining' | 'not-sure';
  moisture_level: 'dry' | 'slightly-dry' | 'moist' | 'wet' | 'not-sure';
  last_watered: 'today' | '1-3-days' | '4-7-days' | 'over-week' | 'never' | 'not-sure';
  last_repotted: 'under-month' | '1-6-months' | 'over-6-months' | 'never' | 'not-sure';
  soil_check_days: number;
  fertilizer_weeks: number;
  rotation_days: number;
  light_review_days: number;
  leaf_cleaning_days: number;
  health_check_days: number;
  reminder_time: string;
  notification_mode: 'in-app' | 'browser';
};

type Completion = { name: string; setup: PlantSetupValues };

export default function PlantSetupWizard({
  plant,
  busy = false,
  serverError = '',
  onBack,
  onComplete,
  editing = false,
}: {
  plant: SetupPlant;
  existing?: boolean;
  remaining?: number;
  busy?: boolean;
  serverError?: string;
  onBack?: () => void;
  onComplete: (value: Completion) => Promise<void> | void;
  editing?: boolean;
}) {
  const { language } = useLanguage();
  const hi = language === 'hi';
  const care = useMemo(() => parseCarePlan(plant.care_plan), [plant.care_plan]);
  const [step, setStep] = useState(1);
  const [name, setName] = useState(plant.name || commonName(plant.species));
  const [values, setValues] = useState<PlantSetupValues>(() => initialValues(plant));
  const [error, setError] = useState('');

  const update = <K extends keyof PlantSetupValues>(key: K, value: PlantSetupValues[K]) => {
    setValues(previous => ({ ...previous, [key]: value }));
    setError('');
  };

  const next = () => {
    const message = validateStep(step, name, values);
    if (message) {
      setError(hi ? translateValidation(message) : message);
      return;
    }
    setError('');
    setStep(current => Math.min(3, current + 1));
  };

  const back = () => {
    setError('');
    if (step > 1) setStep(current => current - 1);
    else onBack?.();
  };

  const finish = async () => {
    const message = validateStep(1, name, values);
    if (message) {
      setError(hi ? translateValidation(message) : message);
      return;
    }
    if (values.notification_mode === 'browser' && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    await onComplete({ name: name.trim(), setup: { ...values, spot_verified: true } });
  };

  const lightMismatch = placementWarning(values.light, care.light?.level || plant.light_req || '');
  const image = plant.image_url || '/leaf.png';

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`Set up ${plant.name || plant.species}`}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <span className={styles.brand}><Leaf size={22} /> Pnapana</span>
          <div className={styles.progress} aria-label={`Step ${step} of 3`}>
            {(hi ? ['शुरू करें', 'विवरण', 'रिमाइंडर'] : ['Get started', 'More details', 'Reminders']).map((label, index) => {
              const number = index + 1;
              return <div key={label} className={`${styles.progressStep} ${number === step ? styles.active : ''} ${number < step ? styles.complete : ''}`}>
                <span>{number < step ? <Check size={15} /> : number}</span><small>{label}</small>
              </div>;
            })}
          </div>
          <span className={styles.requiredBadge}>{editing ? (hi ? 'देखभाल बदलें' : 'Edit care') : (hi ? 'कुछ ही जानकारी चाहिए' : 'Just the essentials')}</span>
        </header>

        <main className={styles.main}>
          <section className={styles.formPane}>
            {step === 1 && <>
              <p className={styles.eyebrow}>{hi ? 'आपका पौधा' : 'YOUR PLANT'}</p>
              <h1>{editing ? (hi ? 'देखभाल की जानकारी बदलें।' : 'Update this plant’s care.') : (hi ? 'अपने पौधे से शुरुआत करें।' : 'Let’s welcome your plant.')}</h1>
              <p className={styles.intro}>{hi ? 'नाम और जगह तय करें। बाकी जानकारी बाद में भी जोड़ सकते हैं।' : 'Confirm its name and where it lives. You can add the details later.'}</p>
              <GrowingSpotAssessment onConfirm={assessment => setValues(previous => ({ ...previous, placement: assessment.placement, room: assessment.room }))} />
              <div className={styles.identity}>
                <img src={image} alt={plant.name || plant.species} />
                <div><strong>{plant.species}</strong><span><Sprout size={15} /> {hi ? 'इसे आपकी देखभाल सूची में जोड़ेंगे' : 'We’ll add it to your care list'}</span></div>
              </div>
              <label className={styles.field}><span>{hi ? 'पौधे का नाम' : 'Plant nickname'}</span><input value={name} maxLength={255} onChange={event => { setName(event.target.value); setError(''); }} placeholder={hi ? 'अपने पौधे को नाम दें' : 'Give your plant a name'} /></label>
              <div className={styles.fieldGrid}>
                <label className={styles.field}><span>{hi ? 'कहाँ रहेगा?' : 'Where does it live?'}</span><select value={values.placement} onChange={event => update('placement', event.target.value as PlantSetupValues['placement'])}><option value="unknown">{hi ? 'अभी पता नहीं' : 'Not specified'}</option><option value="indoor">{hi ? 'घर के अंदर' : 'Indoor'}</option><option value="outdoor">{hi ? 'बाहर' : 'Outdoor'}</option></select></label>
                <label className={styles.field}><span>{hi ? 'कमरा या जगह' : 'Room or area'}</span><select value={values.room} onChange={event => update('room', event.target.value)}>{[['Not specified','अभी पता नहीं'],['Living room','लिविंग रूम'],['Bedroom','बेडरूम'],['Kitchen','रसोई'],['Bathroom','बाथरूम'],['Office','ऑफिस'],['Balcony','बालकनी'],['Terrace','छत'],['Garden','बगीचा']].map(([value,label]) => <option key={value} value={value}>{hi ? label : value}</option>)}</select></label>
                <label className={`${styles.field} ${styles.wide}`}><span>{hi ? 'रोशनी कैसी है? (वैकल्पिक)' : 'How much light? (optional)'}</span><select value={values.light} onChange={event => update('light', event.target.value as PlantSetupValues['light'])}>{[['Not sure','पता नहीं'],['Bright indirect','तेज़ परोक्ष रोशनी'],['Direct sun','सीधी धूप'],['Full sun','पूरी धूप'],['Medium','मध्यम'],['Low light','कम रोशनी']].map(([value,label]) => <option key={value} value={value}>{hi ? label : value}</option>)}</select></label>
              </div>
              <label className={styles.field}><span>When does direct sun reach this exact spot?</span><select value={values.sunlight_timing || 'unknown'} onChange={event => update('sunlight_timing', event.target.value as PlantSetupValues['sunlight_timing'])}><option value="unknown">Not sure — help me check over the day</option><option value="morning">Morning only</option><option value="afternoon">Afternoon only</option><option value="both">Morning and afternoon</option><option value="none">No direct sun</option></select></label>
              <p>Confirm the current location above. Placement recommendations do not mean the plant has already been moved.</p>
              {values.light !== 'Not sure' && <div className={`${styles.fitNote} ${lightMismatch ? styles.warning : ''}`}><Lightbulb size={19} /><div><strong>{lightMismatch ? (hi ? 'रोशनी की जाँच करें' : 'Check this light choice') : (hi ? 'यह जगह ठीक लगती है' : 'Compare with its care plan')}</strong><p>{lightMismatch || care.light?.detail || (hi ? 'इस जगह के अनुसार देखभाल तय करेंगे।' : 'We’ll use this placement to personalize its routine.')}</p></div></div>}
            </>}

            {step === 2 && <>
              <p className={styles.eyebrow}>{hi ? 'वैकल्पिक जानकारी' : 'OPTIONAL DETAILS'}</p>
              <h1>{hi ? 'इसके बारे में और बताएँ।' : 'Tell us a little more.'}</h1>
              <p className={styles.intro}>{hi ? 'जो पता हो वही चुनें। बाकी बाद में बदल सकते हैं।' : 'Choose only what you know. You can update the rest later.'}</p>
              <div className={styles.fieldGrid}>
                <label className={styles.field}><span>{hi ? 'गमले का आकार' : 'Pot size'}</span><select value={values.pot_size} onChange={event => update('pot_size', event.target.value as PlantSetupValues['pot_size'])}>{[['not-sure','Not sure','पता नहीं'],['small','Small (under 15 cm)','छोटा (15 सेमी से कम)'],['medium','Medium (15–25 cm)','मध्यम (15–25 सेमी)'],['large','Large (25–35 cm)','बड़ा (25–35 सेमी)'],['extra-large','Extra large','बहुत बड़ा']].map(([value,en,translation]) => <option key={value} value={value}>{hi ? translation : en}</option>)}</select></label>
                <label className={styles.field}><span>{hi ? 'गमले में पानी निकलने के छेद' : 'Drainage holes'}</span><select value={values.has_drainage === null ? 'not-sure' : values.has_drainage ? 'yes' : 'no'} onChange={event => update('has_drainage', event.target.value === 'not-sure' ? null : event.target.value === 'yes')}><option value="not-sure">{hi ? 'पता नहीं' : 'Not sure'}</option><option value="yes">{hi ? 'हाँ' : 'Yes, has drainage'}</option><option value="no">{hi ? 'नहीं' : 'No drainage holes'}</option></select></label>
                <label className={styles.field}><span>{hi ? 'मिट्टी कैसी है?' : 'Soil condition'}</span><select value={values.soil_condition} onChange={event => update('soil_condition', event.target.value as PlantSetupValues['soil_condition'])}>{[['not-sure','Not sure','पता नहीं'],['well-draining','Loose and well-draining','ढीली, पानी आसानी से निकले'],['dense','Dense or compacted','घनी या सख्त'],['sandy','Sandy or gritty','रेतीली'],['moisture-retaining','Moisture-retaining','नमी रोकने वाली']].map(([value,en,translation]) => <option key={value} value={value}>{hi ? translation : en}</option>)}</select></label>
                <label className={styles.field}><span>{hi ? 'मिट्टी की नमी' : 'Current moisture'}</span><select value={values.moisture_level} onChange={event => update('moisture_level', event.target.value as PlantSetupValues['moisture_level'])}>{[['not-sure','Not sure','पता नहीं'],['dry','Dry','सूखी'],['slightly-dry','Slightly dry','थोड़ी सूखी'],['moist','Moist','नम'],['wet','Wet','गीली']].map(([value,en,translation]) => <option key={value} value={value}>{hi ? translation : en}</option>)}</select></label>
                <label className={styles.field}><span>{hi ? 'आखिरी बार पानी कब दिया?' : 'Last watered'}</span><select value={values.last_watered} onChange={event => update('last_watered', event.target.value as PlantSetupValues['last_watered'])}>{[['not-sure','Not sure','पता नहीं'],['today','Today','आज'],['1-3-days','1–3 days ago','1–3 दिन पहले'],['4-7-days','4–7 days ago','4–7 दिन पहले'],['over-week','More than a week ago','एक हफ्ते से पहले'],['never','Never','कभी नहीं']].map(([value,en,translation]) => <option key={value} value={value}>{hi ? translation : en}</option>)}</select></label>
                <label className={styles.field}><span>{hi ? 'गमला आखिरी बार कब बदला?' : 'Last repotted'}</span><select value={values.last_repotted} onChange={event => update('last_repotted', event.target.value as PlantSetupValues['last_repotted'])}>{[['not-sure','Not sure','पता नहीं'],['under-month','Within the last month','पिछले महीने में'],['1-6-months','1–6 months ago','1–6 महीने पहले'],['over-6-months','More than 6 months ago','6 महीने से पहले'],['never','Never','कभी नहीं']].map(([value,en,translation]) => <option key={value} value={value}>{hi ? translation : en}</option>)}</select></label>
              </div>
              <div className={styles.careChecklist}>
                <h2>{hi ? 'देखभाल की जानकारी' : 'Care guidance'}</h2>
                {[
                  [hi ? 'मिट्टी' : 'Soil', hi ? 'मिट्टी ढीली और पानी निकलने वाली रखें। पौधे की योजना में पूरी जानकारी देखें।' : care.soil || 'Use a loose, well-draining mix.', Sprout],
                  [hi ? 'पहली बार पानी देना' : 'First watering', hi ? 'पानी देने से पहले मिट्टी की नमी जाँचें।' : care.water?.instructions || 'Check soil moisture before watering.', Droplets],
                  [hi ? 'नमी' : 'Humidity', hi ? 'इस पौधे की देखभाल योजना में नमी की सलाह देखें।' : care.humidity?.detail || care.humidity?.level || 'Follow the plant’s normal humidity range.', Wind],
                  [hi ? 'तापमान' : 'Temperature', hi ? 'तापमान में अचानक बदलाव से बचाएँ।' : care.temperature || 'Keep away from sudden temperature changes.', Thermometer],
                  [hi ? 'पालतू जानवरों की सुरक्षा' : 'Pet safety', hi ? 'सुरक्षा की पुष्टि होने तक पौधे को पालतू जानवरों से दूर रखें।' : care.toxicity?.detail || (care.toxicity?.pet_friendly ? 'Listed as pet friendly.' : 'Keep out of reach until toxicity is confirmed.'), PawPrint],
                ].map(([title, body, Icon]: any) => <div key={title}><span><Icon size={18} /></span><p><strong>{title}</strong><small>{body}</small></p><Check size={17} /></div>)}
              </div>
            </>}

            {step === 3 && <>
              <p className={styles.eyebrow}>{hi ? 'देखभाल रिमाइंडर' : 'CARE REMINDERS'}</p>
              <h1>{hi ? 'रिमाइंडर चुनें।' : 'Choose your reminders.'}</h1>
              <p className={styles.intro}>{hi ? 'इन्हें बाद में किसी भी समय बदल सकते हैं।' : 'You can change these at any time from your plant’s page.'}</p>
              <div className={styles.soilNotice}><Droplets size={21} /><p><strong>{hi ? 'मिट्टी जाँचना, पानी देना नहीं है।' : 'A soil check is not a watering instruction.'}</strong><span>{hi ? 'पानी देने से पहले मिट्टी की नमी जाँचें।' : 'Check moisture before deciding whether to water.'}</span></p></div>
              <div className={styles.reminderGrid}>
                <ReminderSelect icon={Droplets} title={hi ? 'मिट्टी की जाँच' : 'Soil check'} value={values.soil_check_days} onChange={value => update('soil_check_days', value)} options={dayOptions([1,2,3,5,7,10,14], hi)} />
                <ReminderSelect icon={Leaf} title={hi ? 'खाद' : 'Fertilizer'} value={values.fertilizer_weeks} onChange={value => update('fertilizer_weeks', value)} options={weekOptions([0,2,4,6,8,12], hi)} />
                <ReminderSelect icon={RotateCw} title={hi ? 'गमला घुमाएँ' : 'Rotation'} value={values.rotation_days} onChange={value => update('rotation_days', value)} options={dayOptions([0,7,14,30], hi)} />
                <ReminderSelect icon={Sun} title={hi ? 'रोशनी जाँचें' : 'Light review'} value={values.light_review_days} onChange={value => update('light_review_days', value)} options={dayOptions([0,7,14,30], hi)} />
                <ReminderSelect icon={Sprout} title={hi ? 'पत्ते साफ करें' : 'Leaf cleaning'} value={values.leaf_cleaning_days} onChange={value => update('leaf_cleaning_days', value)} options={dayOptions([0,7,14,30], hi)} />
                <ReminderSelect icon={HeartPulse} title={hi ? 'सेहत जाँचें' : 'Health check'} value={values.health_check_days} onChange={value => update('health_check_days', value)} options={dayOptions([7,14,30], hi)} />
              </div>
              <div className={styles.fieldGrid}>
                <label className={styles.field}><span>{hi ? 'रिमाइंडर का समय' : 'Reminder time'}</span><input type="time" value={values.reminder_time} onChange={event => update('reminder_time', event.target.value)} /></label>
                <label className={styles.field}><span>{hi ? 'सूचनाएँ' : 'Notifications'}</span><select value={values.notification_mode} onChange={event => update('notification_mode', event.target.value as PlantSetupValues['notification_mode'])}><option value="in-app">{hi ? 'ऐप में रिमाइंडर' : 'In-app reminders'}</option><option value="browser">{hi ? 'ऐप और ब्राउज़र में' : 'In-app + browser notifications'}</option></select></label>
              </div>
              <div className={styles.summary}><Bell size={20} /><div><strong>{hi ? `${name || plant.species} के रिमाइंडर तैयार हैं` : `${name || plant.species}’s reminders are ready`}</strong><p>{hi ? `मिट्टी हर ${values.soil_check_days} दिन जाँचें · सेहत हर ${values.health_check_days} दिन जाँचें` : `Soil check every ${values.soil_check_days} days · Health check every ${values.health_check_days} days · Reminder at ${formatTime(values.reminder_time)}`}</p></div></div>
            </>}

            {(error || serverError) && <p className={styles.error} role="alert">{error || serverError}</p>}
          </section>

          <aside className={styles.visualPane} aria-hidden="true">
            <div className={styles.visualHalo} />
            <img src={image} alt="" />
            <div className={styles.visualCaption}><Sprout size={19} /><p><strong>{plant.species}</strong><span>{step === 1 ? care.light?.detail || 'Ready for a suitable new home.' : step === 2 ? care.water?.instructions || 'Care matched to its current setup.' : 'A routine built for this plant.'}</span></p></div>
          </aside>
        </main>

        <footer className={styles.actions}>
          {(step > 1 || onBack) ? <button type="button" className={styles.back} onClick={back} disabled={busy}><ArrowLeft size={19} /> {hi ? 'वापस' : 'Back'}</button> : <span />}
          <p>{hi ? 'विवरण बाद में भी बदल सकते हैं।' : 'You can refine the care details later.'}</p>
          <div className={styles.actionChoices}>
            {step < 3 && <button type="button" className={styles.detailsLink} onClick={next}>{hi ? 'और जानकारी जोड़ें' : 'Add more details'} <ArrowRight size={17} /></button>}
            <button type="button" className={styles.primary} onClick={finish} disabled={busy}>{busy ? (hi ? 'सहेज रहे हैं…' : 'Saving…') : editing ? (hi ? 'बदलाव सहेजें' : 'Save changes') : (hi ? 'पौधा जोड़ें' : 'Add to my garden')} <ArrowRight size={19} /></button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ReminderSelect({ icon: Icon, title, value, options, onChange }: { icon: any; title: string; value: number; options: Array<[number,string]>; onChange: (value: number) => void }) {
  return <label className={styles.reminder}><span><Icon size={20} /></span><strong>{title}</strong><select value={value} onChange={event => onChange(Number(event.target.value))}>{options.map(([option,label]) => <option key={option} value={option}>{label}</option>)}</select></label>;
}

function parseCarePlan(value: SetupPlant['care_plan']) {
  if (!value) return {} as Record<string, any>;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function commonName(species: string) { return species.split(' ')[0] || 'My plant'; }

function initialValues(plant: SetupPlant): PlantSetupValues {
  const saved = plant.setup_data;
  if (saved) return saved;
  const validLight = ['Direct sun', 'Full sun', 'Bright indirect', 'Medium', 'Low light', 'Not sure'].includes(plant.light_req || '') ? plant.light_req as PlantSetupValues['light'] : 'Not sure';
  const soilDays = [1,2,3,5,7,10,14].includes(Number(plant.water_freq)) ? Number(plant.water_freq) : 7;
  return { placement: plant.placement === 'outdoor' ? 'outdoor' : plant.placement === 'indoor' ? 'indoor' : 'unknown', room: plant.room || (plant.placement === 'outdoor' ? 'Balcony' : plant.placement === 'indoor' ? 'Living room' : 'Not specified'), light: validLight, pot_size: 'not-sure', has_drainage: null, soil_condition: 'not-sure', moisture_level: 'not-sure', last_watered: 'not-sure', last_repotted: 'not-sure', soil_check_days: soilDays, fertilizer_weeks: 0, rotation_days: 0, light_review_days: 0, leaf_cleaning_days: 0, health_check_days: 14, reminder_time: '09:00', notification_mode: 'in-app' };
}

function validateStep(step: number, name: string, values: PlantSetupValues) {
  if (step === 1 && !name.trim()) return 'Give your plant a nickname to continue.';
  if (step === 1 && values.placement === 'unknown') return 'Confirm whether this spot is indoors or outdoors.';
  if (step === 1 && (!values.room || values.room === 'Not specified')) return 'Choose where this plant will live.';
  if (step === 2 && !values.pot_size) return 'Complete the current growing conditions.';
  if (step === 3 && !values.reminder_time) return 'Choose a reminder time.';
  return '';
}

function translateValidation(message: string) {
  const messages: Record<string, string> = {
    'Give your plant a nickname to continue.': 'आगे बढ़ने के लिए पौधे को नाम दें।',
    'Choose where this plant will live.': 'पौधे की जगह चुनें।',
    'Complete the current growing conditions.': 'पौधे की वर्तमान स्थिति बताएँ।',
    'Choose a reminder time.': 'रिमाइंडर का समय चुनें।',
  };
  return messages[message] || message;
}

function placementWarning(selected: string, preferred: string) {
  const need = preferred.toLowerCase();
  if (/indirect|shade|low/.test(need) && /^(?:direct sun|full sun)$/i.test(selected)) return 'This plant prefers filtered or indirect light. Protect it from harsh direct afternoon sun.';
  if (/full|direct|high/.test(need) && /low light/i.test(selected)) return 'This plant normally needs more light than the selected location provides.';
  return '';
}

function dayOptions(values: number[], hi = false): Array<[number,string]> { return values.map(value => [value, hi ? value === 0 ? 'बंद' : value === 1 ? 'हर दिन' : `हर ${value} दिन` : value === 0 ? 'Off' : value === 1 ? 'Every day' : `Every ${value} days`]); }
function weekOptions(values: number[], hi = false): Array<[number,string]> { return values.map(value => [value, hi ? value === 0 ? 'बंद' : value === 1 ? 'हर हफ्ते' : `हर ${value} हफ्ते` : value === 0 ? 'Off' : value === 1 ? 'Every week' : `Every ${value} weeks`]); }
function formatTime(value: string) { const [hour, minute] = value.split(':').map(Number); return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(2020, 0, 1, hour, minute)); }
