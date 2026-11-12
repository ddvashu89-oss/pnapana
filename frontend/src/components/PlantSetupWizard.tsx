'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Bell, Check, Droplets, HeartPulse, Leaf, Lightbulb, PawPrint, RotateCw, Sprout, Sun, Thermometer, Wind } from 'lucide-react';
import styles from './PlantSetupWizard.module.css';

export type SetupPlant = {
  id?: number | string;
  name: string;
  species: string;
  image_url?: string;
  placement?: string;
  light_req?: string;
  water_freq?: number;
  care_plan?: string | Record<string, any>;
  setup_data?: PlantSetupValues | null;
};

export type PlantSetupValues = {
  placement: 'indoor' | 'outdoor';
  room: string;
  light: 'Direct sun' | 'Full sun' | 'Bright indirect' | 'Medium' | 'Low light';
  pot_size: 'small' | 'medium' | 'large' | 'extra-large' | 'not-sure';
  has_drainage: boolean;
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
  existing = false,
  remaining = 1,
  busy = false,
  serverError = '',
  onBack,
  onComplete,
}: {
  plant: SetupPlant;
  existing?: boolean;
  remaining?: number;
  busy?: boolean;
  serverError?: string;
  onBack?: () => void;
  onComplete: (value: Completion) => Promise<void> | void;
}) {
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
      setError(message);
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
    const message = validateStep(3, name, values);
    if (message) {
      setError(message);
      return;
    }
    if (values.notification_mode === 'browser' && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    await onComplete({ name: name.trim(), setup: values });
  };

  const lightMismatch = placementWarning(values.light, care.light?.level || plant.light_req || '');
  const image = plant.image_url || '/leaf.png';

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`Set up ${plant.name || plant.species}`}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <span className={styles.brand}><Leaf size={22} /> Pnapana</span>
          <div className={styles.progress} aria-label={`Step ${step} of 3`}>
            {['Identify', 'Care setup', 'Reminders'].map((label, index) => {
              const number = index + 1;
              return <div key={label} className={`${styles.progressStep} ${number === step ? styles.active : ''} ${number < step ? styles.complete : ''}`}>
                <span>{number < step ? <Check size={15} /> : number}</span><small>{label}</small>
              </div>;
            })}
          </div>
          {existing ? <span className={styles.requiredBadge}>{remaining} setup{remaining === 1 ? '' : 's'} required</span> : <span className={styles.requiredBadge}>Required setup</span>}
        </header>

        <main className={styles.main}>
          <section className={styles.formPane}>
            {step === 1 && <>
              <p className={styles.eyebrow}>{existing ? 'COMPLETE THIS PLANT’S SETUP' : 'PLANT IDENTIFIED'}</p>
              <h1>{existing ? 'Let’s finish its setup.' : 'You’re all set! Here’s your plant.'}</h1>
              <p className={styles.intro}>Confirm where it will live so every care recommendation fits this plant’s real environment.</p>
              <div className={styles.identity}>
                <img src={image} alt={plant.name || plant.species} />
                <div><strong>{plant.species}</strong><span><Sprout size={15} /> Species-specific plan ready</span></div>
              </div>
              <label className={styles.field}><span>Plant nickname</span><input value={name} maxLength={255} onChange={event => { setName(event.target.value); setError(''); }} placeholder="Give your plant a name" /></label>
              <div className={styles.fieldGrid}>
                <label className={styles.field}><span>Placement</span><select value={values.placement} onChange={event => update('placement', event.target.value as PlantSetupValues['placement'])}><option value="indoor">Indoor</option><option value="outdoor">Outdoor</option></select></label>
                <label className={styles.field}><span>Room or area</span><select value={values.room} onChange={event => update('room', event.target.value)}><option>Living room</option><option>Bedroom</option><option>Kitchen</option><option>Bathroom</option><option>Office</option><option>Balcony</option><option>Terrace</option><option>Garden</option></select></label>
                <label className={`${styles.field} ${styles.wide}`}><span>Available light</span><select value={values.light} onChange={event => update('light', event.target.value as PlantSetupValues['light'])}><option>Bright indirect</option><option>Direct sun</option><option>Full sun</option><option>Medium</option><option>Low light</option></select></label>
              </div>
              <div className={`${styles.fitNote} ${lightMismatch ? styles.warning : ''}`}><Lightbulb size={19} /><div><strong>{lightMismatch ? 'Check this light choice' : 'Placement looks suitable'}</strong><p>{lightMismatch || care.light?.detail || plant.light_req || 'We’ll use this placement to personalize its routine.'}</p></div></div>
            </>}

            {step === 2 && <>
              <p className={styles.eyebrow}>CURRENT GROWING CONDITIONS</p>
              <h1>Let’s set up its care.</h1>
              <p className={styles.intro}>Tell us what the plant is growing in now. This prevents generic pot, soil and watering advice.</p>
              <div className={styles.fieldGrid}>
                <label className={styles.field}><span>Pot size</span><select value={values.pot_size} onChange={event => update('pot_size', event.target.value as PlantSetupValues['pot_size'])}><option value="small">Small (under 15 cm)</option><option value="medium">Medium (15–25 cm)</option><option value="large">Large (25–35 cm)</option><option value="extra-large">Extra large</option><option value="not-sure">Not sure</option></select></label>
                <label className={styles.field}><span>Drainage holes</span><select value={values.has_drainage ? 'yes' : 'no'} onChange={event => update('has_drainage', event.target.value === 'yes')}><option value="yes">Yes, has drainage</option><option value="no">No drainage holes</option></select></label>
                <label className={styles.field}><span>Soil condition</span><select value={values.soil_condition} onChange={event => update('soil_condition', event.target.value as PlantSetupValues['soil_condition'])}><option value="well-draining">Loose and well-draining</option><option value="dense">Dense or compacted</option><option value="sandy">Sandy or gritty</option><option value="moisture-retaining">Moisture-retaining</option><option value="not-sure">Not sure</option></select></label>
                <label className={styles.field}><span>Current moisture</span><select value={values.moisture_level} onChange={event => update('moisture_level', event.target.value as PlantSetupValues['moisture_level'])}><option value="dry">Dry</option><option value="slightly-dry">Slightly dry</option><option value="moist">Moist</option><option value="wet">Wet</option><option value="not-sure">Not sure</option></select></label>
                <label className={styles.field}><span>Last watered</span><select value={values.last_watered} onChange={event => update('last_watered', event.target.value as PlantSetupValues['last_watered'])}><option value="today">Today</option><option value="1-3-days">1–3 days ago</option><option value="4-7-days">4–7 days ago</option><option value="over-week">More than a week ago</option><option value="never">Never</option><option value="not-sure">Not sure</option></select></label>
                <label className={styles.field}><span>Last repotted</span><select value={values.last_repotted} onChange={event => update('last_repotted', event.target.value as PlantSetupValues['last_repotted'])}><option value="under-month">Within the last month</option><option value="1-6-months">1–6 months ago</option><option value="over-6-months">More than 6 months ago</option><option value="never">Never</option><option value="not-sure">Not sure</option></select></label>
              </div>
              <div className={styles.careChecklist}>
                <h2>Species-specific care checklist</h2>
                {[
                  ['Soil', care.soil || 'Use a loose, well-draining mix.', Sprout],
                  ['First watering', care.water?.instructions || 'Check soil moisture before watering.', Droplets],
                  ['Humidity', care.humidity?.detail || care.humidity?.level || 'Follow the plant’s normal humidity range.', Wind],
                  ['Temperature', care.temperature || 'Keep away from sudden temperature changes.', Thermometer],
                  ['Pet safety', care.toxicity?.detail || (care.toxicity?.pet_friendly ? 'Listed as pet friendly.' : 'Keep out of reach until toxicity is confirmed.'), PawPrint],
                ].map(([title, body, Icon]: any) => <div key={title}><span><Icon size={18} /></span><p><strong>{title}</strong><small>{body}</small></p><Check size={17} /></div>)}
              </div>
            </>}

            {step === 3 && <>
              <p className={styles.eyebrow}>PERSONAL CARE ROUTINE</p>
              <h1>Set your care reminders.</h1>
              <p className={styles.intro}>These intervals start from setup completion and stay attached to this plant.</p>
              <div className={styles.soilNotice}><Droplets size={21} /><p><strong>Soil checks don’t mean automatic watering.</strong><span>We’ll remind you to check moisture first—not water on the calendar alone.</span></p></div>
              <div className={styles.reminderGrid}>
                <ReminderSelect icon={Droplets} title="Soil check" value={values.soil_check_days} onChange={value => update('soil_check_days', value)} options={dayOptions([1,2,3,5,7,10,14])} />
                <ReminderSelect icon={Leaf} title="Fertilizer" value={values.fertilizer_weeks} onChange={value => update('fertilizer_weeks', value)} options={weekOptions([0,2,4,6,8,12])} />
                <ReminderSelect icon={RotateCw} title="Rotation" value={values.rotation_days} onChange={value => update('rotation_days', value)} options={dayOptions([0,7,14,30])} />
                <ReminderSelect icon={Sun} title="Light review" value={values.light_review_days} onChange={value => update('light_review_days', value)} options={dayOptions([0,7,14,30])} />
                <ReminderSelect icon={Sprout} title="Leaf cleaning" value={values.leaf_cleaning_days} onChange={value => update('leaf_cleaning_days', value)} options={dayOptions([0,7,14,30])} />
                <ReminderSelect icon={HeartPulse} title="Health check" value={values.health_check_days} onChange={value => update('health_check_days', value)} options={dayOptions([7,14,30])} />
              </div>
              <div className={styles.fieldGrid}>
                <label className={styles.field}><span>Reminder time</span><input type="time" value={values.reminder_time} onChange={event => update('reminder_time', event.target.value)} /></label>
                <label className={styles.field}><span>Notifications</span><select value={values.notification_mode} onChange={event => update('notification_mode', event.target.value as PlantSetupValues['notification_mode'])}><option value="in-app">In-app reminders</option><option value="browser">In-app + browser notifications</option></select></label>
              </div>
              <div className={styles.summary}><Bell size={20} /><div><strong>{name || plant.species}’s routine is ready</strong><p>Soil check every {values.soil_check_days} days · Health check every {values.health_check_days} days · Reminder at {formatTime(values.reminder_time)}</p></div></div>
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
          {(step > 1 || onBack) ? <button type="button" className={styles.back} onClick={back} disabled={busy}><ArrowLeft size={19} /> Back</button> : <span />}
          <p>No skip—complete all three steps to add this plant to your garden family.</p>
          {step < 3
            ? <button type="button" className={styles.primary} onClick={next}>Continue <ArrowRight size={19} /></button>
            : <button type="button" className={styles.primary} onClick={finish} disabled={busy}>{busy ? 'Saving setup…' : existing ? 'Complete Setup' : 'Add to My Garden'} <ArrowRight size={19} /></button>}
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
  const validLight = ['Direct sun', 'Full sun', 'Bright indirect', 'Medium', 'Low light'].includes(plant.light_req || '') ? plant.light_req as PlantSetupValues['light'] : 'Medium';
  const soilDays = [1,2,3,5,7,10,14].includes(Number(plant.water_freq)) ? Number(plant.water_freq) : 7;
  return { placement: plant.placement === 'outdoor' ? 'outdoor' : 'indoor', room: plant.placement === 'outdoor' ? 'Balcony' : 'Living room', light: validLight, pot_size: 'not-sure', has_drainage: true, soil_condition: 'not-sure', moisture_level: 'not-sure', last_watered: 'not-sure', last_repotted: 'not-sure', soil_check_days: soilDays, fertilizer_weeks: 4, rotation_days: 14, light_review_days: 14, leaf_cleaning_days: 14, health_check_days: 14, reminder_time: '09:00', notification_mode: 'in-app' };
}

function validateStep(step: number, name: string, values: PlantSetupValues) {
  if (step === 1 && !name.trim()) return 'Give your plant a nickname to continue.';
  if (step === 1 && !values.room) return 'Choose where this plant will live.';
  if (step === 2 && !values.pot_size) return 'Complete the current growing conditions.';
  if (step === 3 && !values.reminder_time) return 'Choose a reminder time.';
  return '';
}

function placementWarning(selected: string, preferred: string) {
  const need = preferred.toLowerCase();
  if (/indirect|shade|low/.test(need) && /^(?:direct sun|full sun)$/i.test(selected)) return 'This plant prefers filtered or indirect light. Protect it from harsh direct afternoon sun.';
  if (/full|direct|high/.test(need) && /low light/i.test(selected)) return 'This plant normally needs more light than the selected location provides.';
  return '';
}

function dayOptions(values: number[]): Array<[number,string]> { return values.map(value => [value, value === 0 ? 'Off' : value === 1 ? 'Every day' : `Every ${value} days`]); }
function weekOptions(values: number[]): Array<[number,string]> { return values.map(value => [value, value === 0 ? 'Off' : value === 1 ? 'Every week' : `Every ${value} weeks`]); }
function formatTime(value: string) { const [hour, minute] = value.split(':').map(Number); return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(2020, 0, 1, hour, minute)); }
