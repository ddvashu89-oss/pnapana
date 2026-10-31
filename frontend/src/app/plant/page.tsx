'use client';
import { Suspense, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import { authFetch } from '@/lib/api';
import styles from './Plant.module.css';
import WeatherCard from '@/components/WeatherCard';
import { Droplets, Globe, Sun, CalendarDays, Check, FlaskConical, HeartPulse } from 'lucide-react';

function PlantDetailsInner() {
  const searchParams = useSearchParams();
  const plantId = searchParams.get('id') ?? '';
  const router = useRouter();
  const { t } = useLanguage();
  const [hasUser, setHasUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [plant, setPlant] = useState<any>({
    name: '',
    species: '',
    status: '',
    status_color: 'green',
    image_url: '',
    native_region: '',
    light_requirement: '',
    water_requirement: '',
    humidity: '',
    pet_friendly: false
  });

  const [activeTab, setActiveTab] = useState('Passport');
  const [now, setNow] = useState(() => Date.now());
  const [watering, setWatering] = useState(false);
  const [waterMessage, setWaterMessage] = useState('');
  const [careEvents, setCareEvents] = useState<any[]>([]);
  const [fertilizerNote, setFertilizerNote] = useState('');
  const [fertilizerMessage, setFertilizerMessage] = useState('');
  const [savingFertilizer, setSavingFertilizer] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [placement, setPlacement] = useState('');
  const [lightReq, setLightReq] = useState('Medium');
  const [purchaseMessage, setPurchaseMessage] = useState('');
  
  // AI Scanner States
  const [scans, setScans] = useState<any[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setHasUser(true);
    setActiveTab(searchParams.get('tab') === 'scan' ? 'AI Scan' : searchParams.get('tab') === 'care' ? 'Care' : 'Passport');

    authFetch(`get_plant_details.php?id=${plantId}`)
      .then(res => res.json())
      .then(data => { if(data.status === "success") { setPlant(data.plant); setPurchaseDate(data.plant.purchased_on || ''); setPlacement(data.plant.placement || ''); setLightReq(data.plant.light_req || 'Medium'); } })
      .finally(() => setIsLoading(false));

    fetchScans();
    fetchCareEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantId]);

  function fetchScans() {
    authFetch(`get_plant_scans.php?plant_id=${plantId}`)
      .then(res => res.json())
      .then(data => { if(data.status === "success") setScans(data.scans); });
  }

  function fetchCareEvents() {
    authFetch(`get_plant_care.php?plant_id=${plantId}`)
      .then(res => res.json())
      .then(data => { if (data.status === 'success') setCareEvents(data.events); })
      .catch(() => {});
  }

  const startCamera = async () => {
    setIsCapturing(true);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert(t('plant.cameraPermissionError'));
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCapturing(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const imageUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageUrl);
      stopCamera();
    }
  };
  
  const submitScan = async () => {
    if (!capturedImage) return;
    setIsScanning(true);
    
    try {
      const res = await authFetch('analyze_plant.php', {
        method: 'POST',
        body: JSON.stringify({ plant_id: plantId, image_url: capturedImage })
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchScans();
        setCapturedImage(null);
        // refresh plant data to update status color
        authFetch(`get_plant_details.php?id=${plantId}`)
          .then(r => r.json())
          .then(d => { if(d.status === "success") setPlant(d.plant); });
      }
    } catch (e) {
      console.error(e);
      alert(t('plant.aiScanFailed'));
    } finally {
      setIsScanning(false);
    }
  }

  const waterPlant = async () => {
    setWatering(true);
    setWaterMessage('');
    try {
      const response = await authFetch('water_plant.php', { method: 'POST', body: JSON.stringify({ id: plantId }) });
      const data = await response.json();
      if (data.status === 'success') {
        setNow(Date.now());
        setPlant((previous: any) => ({ ...previous, last_watered: new Date().toISOString() }));
        fetchCareEvents();
        setWaterMessage('Watering logged. Your plant says thanks!');
        window.dispatchEvent(new Event('pnapana:rewards'));
      } else setWaterMessage(data.message || 'Could not log watering. Please try again.');
    } catch { setWaterMessage('Could not log watering. Please try again.'); }
    finally { setWatering(false); }
  };
  const savePurchaseDate = async (event: React.FormEvent) => {
    event.preventDefault();
    setPurchaseMessage('');
    try {
      const response = await authFetch('update_plant_profile.php', { method: 'POST', body: JSON.stringify({ id: plantId, purchased_on: purchaseDate, placement, light_req: lightReq }) });
      const data = await response.json();
      if (data.status === 'success') {
        setPlant((previous: any) => ({ ...previous, purchased_on: data.purchased_on, placement: data.placement, light_req: data.light_req }));
        setPurchaseMessage('Plant profile saved.');
      } else setPurchaseMessage(data.message || 'Could not save purchase date.');
    } catch { setPurchaseMessage('Could not save purchase date.'); }
  };
  const logFertilizer = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingFertilizer(true);
    setFertilizerMessage('');
    try {
      const response = await authFetch('log_fertilizer.php', { method: 'POST', body: JSON.stringify({ plant_id: plantId, details: fertilizerNote }) });
      const data = await response.json();
      if (data.status === 'success') { setFertilizerNote(''); setFertilizerMessage('Fertilizer application logged.'); fetchCareEvents(); }
      else setFertilizerMessage(data.message || 'Could not save fertilizer entry.');
    } catch { setFertilizerMessage('Could not save fertilizer entry.'); }
    finally { setSavingFertilizer(false); }
  };
  const daysSinceWatering = plant.last_watered ? Math.max(0, Math.floor((now - new Date(plant.last_watered.replace(' ', 'T')).getTime()) / 86400000)) : null;
  const plantAge = plant.purchased_on ? describePlantAge(plant.purchased_on) : '';

  if (!hasUser || isLoading) return <Loader fullScreen label={t('common.loading')} />;

  return (
    <div className={styles.container}>
      <nav className={styles.topNav}>
        <Link href="/dashboard" className={styles.iconBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div style={{display: 'flex', gap: '1rem'}}>
          <button className={styles.iconBtn} aria-label="Share plant" onClick={() => { if (navigator.share) navigator.share({ title: plant.name, text: `Meet ${plant.name}, part of my green family on Pnapana.`, url: window.location.origin }).catch(() => {}); else router.push('/community'); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </button>
        </div>
      </nav>

      <section className={styles.imageSection}>
        <div className={styles.circleBg}></div>
        <img src={plant.image_url || "/plants/tulsi.webp"} alt={plant.name || "Your plant"} className={styles.plantImage} />
      </section>

      <main className={styles.content}>
        <div className={styles.headerRow}>
          <div className={styles.titleBox}>
            <h1>{plant.name}</h1>
            <p>{plant.species}</p>
          </div>
          <div className={styles.statusTag}>
            <div className={`${styles.statusDot} ${styles[plant.status_color]}`}></div>
            {plant.status}
          </div>
        </div>

        <div className={styles.plantStats}>
          <div><span><Droplets size={14} />Last watered</span><strong>{daysSinceWatering === null || !Number.isFinite(daysSinceWatering) ? 'Not logged yet' : daysSinceWatering === 0 ? 'Today' : `${daysSinceWatering} days ago`}</strong></div>
          <div><span><CalendarDays size={14} />Water every</span><strong>{plant.water_freq || 7} days</strong></div>
          <div><span><Sun size={14} />Light</span><strong>{plant.light_req || 'See care plan'}</strong></div>
        </div>
        <form className={styles.purchaseDateForm} onSubmit={savePurchaseDate}>
          <label htmlFor="purchase-date">Purchase date <input id="purchase-date" type="date" max={localDateInputValue()} value={purchaseDate} onChange={event => setPurchaseDate(event.target.value)} /></label>
          <label htmlFor="plant-placement-detail">Location <select id="plant-placement-detail" value={placement} onChange={event => setPlacement(event.target.value)}><option value="">Not set</option><option value="indoor">Indoor</option><option value="outdoor">Outdoor</option></select></label>
          <label htmlFor="plant-light-detail">Light <select id="plant-light-detail" value={lightReq} onChange={event => setLightReq(event.target.value)}>{!['Medium', 'Direct sun', 'Full sun', 'Bright indirect', 'Low light'].includes(lightReq) && <option value={lightReq}>{lightReq}</option>}<option value="Medium">Not sure / medium</option><option value="Direct sun">Direct sun</option><option value="Full sun">Full sun</option><option value="Bright indirect">Bright, indirect</option><option value="Low light">Low light</option></select></label>
          <button type="submit">Save date</button>
          {plantAge && <span>Plant age: <strong>{plantAge}</strong></span>}
          {purchaseMessage && <small role="status">{purchaseMessage}</small>}
        </form>
        <div className={styles.plantActions}>
          <button onClick={waterPlant} disabled={watering}><Droplets size={19} />{watering ? 'Saving…' : 'Water it'}</button>
          <button onClick={() => { setActiveTab('AI Scan'); requestAnimationFrame(() => { document.getElementById('plant-care')?.scrollIntoView({ behavior: 'smooth' }); startCamera(); }); }}><HeartPulse size={20} />Plant SOS</button>
        </div>
        {waterMessage && <p className={styles.waterMessage} role="status"><Check size={16} />{waterMessage}</p>}
        <h2 className={styles.sectionTitle}>Adjusted for today’s weather</h2>
        <WeatherCard plant={plant} />
        <h2 className={styles.sectionTitle}>Care plan</h2>
        <div className={styles.tabContent}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {(
            <>
              <div className={styles.attributeList}>
                <div className={styles.attributeItem}>
                  <span className={styles.careIcon}><Globe size={23} /></span><div><span className={styles.attrLabel}>{t('plant.native')}</span>
                  <span className={styles.attrValue}>{plant.native_region || 'Native region not available'}</span></div>
                </div>
                <div className={styles.attributeItem}>
                  <span className={styles.careIcon}><Sun size={24} /></span><div><span className={styles.attrLabel}>{t('plant.light')} <em>{plant.light_req || 'Medium'}</em></span>
                  <span className={styles.attrValue}>{plant.light_requirement || 'Check the detailed care plan for light requirements.'}</span></div>
                </div>
                <div className={styles.attributeItem}>
                  <span className={styles.careIcon}><Droplets size={24} /></span><div><span className={styles.attrLabel}>{t('plant.water')} <em>{plant.water_freq || 7} days between waterings</em></span>
                  <span className={styles.attrValue}>{plant.water_requirement || 'Check the topsoil before watering.'}</span></div>
                </div>
              </div>
            </>
          )}

        <div className={styles.tabs} id="plant-care">
          <button className={`${styles.tab} ${activeTab === 'Passport' ? styles.active : ''}`} onClick={() => setActiveTab('Passport')}>{t('plant.tabPassport')}</button>
          <button className={`${styles.tab} ${activeTab === 'AI Scan' ? styles.active : ''}`} onClick={() => setActiveTab('AI Scan')}>{t('plant.tabAiScan')}</button>
          <button className={`${styles.tab} ${activeTab === 'Care' ? styles.active : ''}`} onClick={() => setActiveTab('Care')}>{t('plant.tabCare')}</button>
        </div>


          {activeTab === 'AI Scan' && (
            <div className={styles.aiScannerArea}>
              <h3 style={{marginBottom: '1rem'}}>{t('plant.dailyHealthCheck')}</h3>
              <p style={{marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem'}}>
                {t('plant.aiScanText')}
              </p>

              {!isCapturing && !capturedImage && (
                <button className={styles.aiScanBtn} onClick={startCamera}>
                  {t('plant.openCamera')}
                </button>
              )}

              {isCapturing && (
                <div className={styles.cameraBox}>
                  <video ref={videoRef} autoPlay playsInline className={styles.cameraView} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <div className={styles.cameraActions}>
                    <button type="button" onClick={captureImage} className={styles.snapBtn}>{t('plant.snapPhoto')}</button>
                    <button type="button" onClick={stopCamera} className={styles.cancelCamBtn}>{t('plant.cancel')}</button>
                  </div>
                </div>
              )}

              {capturedImage && (
                <div className={styles.previewBox}>
                  <img src={capturedImage} alt="Preview" className={styles.imagePreview} />
                  {isScanning ? (
                    <div className={styles.scanningAnim}>
                      <div className={styles.scanLine}></div>
                      <p>{t('plant.aiAnalyzing')}</p>
                    </div>
                  ) : (
                    <div className={styles.cameraActions}>
                      <button type="button" onClick={submitScan} className={styles.submitScanBtn}>{t('plant.runAiScan')}</button>
                      <button type="button" onClick={() => setCapturedImage(null)} className={styles.cancelCamBtn}>{t('plant.retake')}</button>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.scanHistory}>
                <h4>{t('plant.scanHistory')}</h4>
                {scans.length === 0 ? (
                  <p className={styles.noScans}>{t('plant.noScansYet')}</p>
                ) : (
                  scans.map(scan => (
                    <div key={scan.id} className={`${styles.scanCard} ${styles[scan.status]}`}>
                      <div className={styles.scanCardTop}>
                        <strong>{new Date(scan.created_at).toLocaleDateString()}</strong>
                        <span className={styles.scanBadge}>{scan.status === 'healthy' ? t('plant.allGood') : t('plant.issueDetected')}</span>
                      </div>
                      <p>{scan.ai_analysis}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'Care' && (() => {
            let cp: any = null;
            try { cp = plant.care_plan ? JSON.parse(plant.care_plan) : null; } catch { cp = null; }
            const hasCarePlan = !!cp;
            cp = cp || {};
            return (
              <>
              {!hasCarePlan && <p>{t('plant.noCarePlan')}</p>}
              <motion.div
                className={styles.carePlanList}
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {cp.water?.instructions && (
                  <motion.div className={styles.careItem} variants={fadeInUp}>
                    <span className={styles.attrLabel}>💧 {t('plant.careWatering')}</span>
                    <p>{cp.water.instructions}</p>
                  </motion.div>
                )}
                {cp.light?.detail && (
                  <motion.div className={styles.careItem} variants={fadeInUp}>
                    <span className={styles.attrLabel}>☀️ {t('plant.careLight')}</span>
                    <p>{cp.light.detail}</p>
                  </motion.div>
                )}
                {cp.humidity?.detail && (
                  <motion.div className={styles.careItem} variants={fadeInUp}>
                    <span className={styles.attrLabel}>💦 {t('plant.careHumidity')}</span>
                    <p>{cp.humidity.detail}</p>
                  </motion.div>
                )}
                {cp.soil && (
                  <motion.div className={styles.careItem} variants={fadeInUp}>
                    <span className={styles.attrLabel}>🌱 {t('plant.careSoil')}</span>
                    <p>{cp.soil}</p>
                  </motion.div>
                )}
                {cp.temperature && (
                  <motion.div className={styles.careItem} variants={fadeInUp}>
                    <span className={styles.attrLabel}>🌡️ {t('plant.careTemperature')}</span>
                    <p>{cp.temperature}</p>
                  </motion.div>
                )}
                {cp.fertilizing && (
                  <motion.div className={styles.careItem} variants={fadeInUp}>
                    <span className={styles.attrLabel}>🧪 {t('plant.careFertilizing')}</span>
                    <p>{cp.fertilizing}</p>
                  </motion.div>
                )}
                {cp.pruning && (
                  <motion.div className={styles.careItem} variants={fadeInUp}>
                    <span className={styles.attrLabel}>✂️ {t('plant.carePruning')}</span>
                    <p>{cp.pruning}</p>
                  </motion.div>
                )}
                {cp.toxicity?.detail && (
                  <motion.div className={styles.careItem} variants={fadeInUp}>
                    <span className={styles.attrLabel}>⚠️ {t('plant.careToxicity')}</span>
                    <p>{cp.toxicity.detail}</p>
                  </motion.div>
                )}
                {cp.common_issues?.length > 0 && (
                  <motion.div className={styles.careItem} variants={fadeInUp}>
                    <span className={styles.attrLabel}>🩺 {t('plant.careCommonIssues')}</span>
                    {cp.common_issues.map((ci: any, i: number) => (
                      <p key={i}><strong>{ci.issue}:</strong> {ci.solution}</p>
                    ))}
                  </motion.div>
                )}
              </motion.div>
              <section className={styles.journalSection} aria-labelledby="fertilizer-journal-title">
                <h3 id="fertilizer-journal-title"><FlaskConical size={19} /> Log fertilizer</h3>
                <form onSubmit={logFertilizer} className={styles.fertilizerForm}>
                  <input maxLength={500} value={fertilizerNote} onChange={event => setFertilizerNote(event.target.value)} placeholder="Fertilizer type or notes (optional)" aria-label="Fertilizer type or notes" />
                  <button type="submit" disabled={savingFertilizer}>{savingFertilizer ? 'Saving…' : 'Log application'}</button>
                </form>
                {fertilizerMessage && <p role="status">{fertilizerMessage}</p>}
              </section>
              <section className={styles.journalSection} aria-labelledby="care-history-title">
                <h3 id="care-history-title">Care history</h3>
                {careEvents.length === 0 ? <p>No watering or fertilizer history yet.</p> : <ul className={styles.careHistoryList}>{careEvents.map(item => <li key={item.id}><span className={styles.historyIcon}>{item.event_type === 'water' ? <Droplets size={17} /> : <FlaskConical size={17} />}</span><div><strong>{item.event_type === 'water' ? 'Watered' : 'Fertilized'}</strong>{item.details && <p>{item.details}</p>}</div><time>{new Date(String(item.created_at).replace(' ', 'T')).toLocaleString()}</time></li>)}</ul>}
              </section>
              </>
            );
          })()}

        </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function PlantDetails() {
  return (
    <Suspense fallback={<Loader fullScreen label="Loading..." />}>
      <PlantDetailsInner />
    </Suspense>
  );
}

function describePlantAge(date: string) {
  const start = new Date(`${date}T00:00:00`);
  if (!Number.isFinite(start.getTime())) return '';
  const today = new Date();
  let months = (today.getFullYear() - start.getFullYear()) * 12 + today.getMonth() - start.getMonth();
  if (today.getDate() < start.getDate()) months--;
  months = Math.max(0, months);
  if (months < 1) return 'under 1 month';
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return [years ? `${years} ${years === 1 ? 'year' : 'years'}` : '', remainder ? `${remainder} ${remainder === 1 ? 'month' : 'months'}` : ''].filter(Boolean).join(' ');
}

function localDateInputValue() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
