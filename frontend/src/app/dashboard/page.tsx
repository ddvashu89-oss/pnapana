'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Droplets, Compass, HeartPulse, FlaskConical, ScanLine, Sprout, ArrowUpRight, Globe, Sun } from 'lucide-react';
import WeatherCard from '@/components/WeatherCard';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import { authFetch } from '@/lib/api';
import styles from './Home.module.css';

export default function Home() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [user, setUser] = useState<{ id: number, name: string, token?: string } | null>(null);
  const [plants, setPlants] = useState<any[]>([]);
  const [scanDates, setScanDates] = useState<Record<number, string[] | null>>({});
  const [today] = useState(() => new Date());
  const [plantsLoaded, setPlantsLoaded] = useState(false);
  const [thirstyPlants, setThirstyPlants] = useState<number[]>([]);
  const notifiedIds = useRef<Set<number>>(new Set());
  
  // Add Plant Modal state
  const [isAddPlantModalOpen, setIsAddPlantModalOpen] = useState(false);
  const [newPlant, setNewPlant] = useState<{
    name: string, species: string, image_url: string,
    native_region: string, light_requirement: string, water_requirement: string,
    humidity: string, pet_friendly: boolean,
    water_freq: number, light_req: string, care_plan: any
  }>({
    name: '', species: '', image_url: '',
    native_region: '', light_requirement: '', water_requirement: '',
    humidity: '', pet_friendly: false,
    water_freq: 7, light_req: 'Medium', care_plan: null
  });
  const [isAdding, setIsAdding] = useState(false);
  
  // Camera state
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // AI & Identification State
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [plantInfo, setPlantInfo] = useState<{ species: string, description: string } | null>(null);
  const [cameraMode, setCameraMode] = useState<'capture' | 'identify' | 'diagnose'>('capture');
  const [healthStatus, setHealthStatus] = useState<{ diagnosis: string, treatment: string } | null>(null);
  const [isDiagnosingModalOpen, setIsDiagnosingModalOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [carePlantId, setCarePlantId] = useState<number | null>(null);
  const carePlant = plants.find(plant => Number(plant.id) === carePlantId) || plants[0] || null;
  

  // Gamification State
  const [streakDays, setStreakDays] = useState(0);
  const [coins, setCoins] = useState(0);
  const [badges, setBadges] = useState<{ id: string, label: string, icon: string, description: string, unlocked: boolean, progress: string }[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    fetchPlants(parsedUser.id);
    fetchGamification();

    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    const checkWateringNeeds = async () => {
      try {
        const res = await authFetch(`get_notifications.php?user_id=${parsedUser.id}`);
        const data = await res.json();
        if (data.status === 'success') {
          const tPlants = data.notifications;
          setThirstyPlants(tPlants.map((p: any) => p.id));
          
          tPlants.forEach((plant: any) => {
            if (!notifiedIds.current.has(plant.id)) {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`Time to water ${plant.name}! 💧`, {
                  body: `${plant.name} (${plant.species}) needs watering.`,
                });
              }
              notifiedIds.current.add(plant.id);
            }
          });
        }
      } catch (e) {
        console.error("Failed to check notifications", e);
      }
    };

    checkWateringNeeds();
    const interval = setInterval(checkWateringNeeds, 30000);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    const syncNavigation = () => {
      if (new URLSearchParams(window.location.search).get('action') === 'scan') {
        setIsAddPlantModalOpen(true);
        window.history.replaceState(null, '', '/dashboard');
      }
    };
    syncNavigation();
    window.addEventListener('pnapana:scan', syncNavigation);
    return () => window.removeEventListener('pnapana:scan', syncNavigation);
  }, []);

  useEffect(() => {
    if (!user || !window.location.hash) return;
    const frame = requestAnimationFrame(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, [user]);

  function fetchPlants(userId: number) {
    authFetch(`get_plants.php?user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status !== 'success') return;
        setPlants(data.plants);
        setPlantsLoaded(true);
        data.plants.forEach((plant: { id: number }) => {
          authFetch(`get_plant_scans.php?plant_id=${plant.id}`).then(response => response.json()).then(history => {
            setScanDates(previous => ({ ...previous, [plant.id]: history.status === 'success' ? history.scans.map((scan: { created_at: string }) => scan.created_at) : null }));
          }).catch(() => setScanDates(previous => ({ ...previous, [plant.id]: null })));
        });
      })
      .catch(() => {});
  }

  function fetchGamification() {
    authFetch('get_gamification.php')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setStreakDays(data.streak_days);
          setCoins(data.coins);
          setBadges(data.badges);
        }
      })
      .catch(e => console.error('Failed to fetch gamification data', e));
  }

  const handleAddPlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPlant.name || !newPlant.species) return;
    setIsAdding(true);
    
    try {
      const res = await authFetch('add_plant.php', {
        method: 'POST',
        body: JSON.stringify({ ...newPlant, user_id: user.id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setIsAddPlantModalOpen(false);
        setNewPlant({
          name: '', species: '', image_url: '',
          native_region: '', light_requirement: '', water_requirement: '',
          humidity: '', pet_friendly: false,
          water_freq: 7, light_req: 'Medium', care_plan: null
        });
        fetchPlants(user.id);
        fetchGamification();
      } else {
        if (data.code === 'PLAN_LIMIT_REACHED') {
          if (confirm(`${data.message}\n\nWould you like to upgrade your plan now?`)) {
            setIsAddPlantModalOpen(false);
            router.push('/subscription');
            return;
          }
        } else {
          alert(data.message);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const startCamera = async (mode: 'capture' | 'identify' | 'diagnose' = 'capture') => {
    setCameraMode(mode);
    if (mode === 'diagnose') setIsDiagnosingModalOpen(true);
    
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera", err);
      alert(t('dashboard.couldNotAccessCamera'));
      setIsCapturing(false);
      setIsDiagnosingModalOpen(false);
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
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const imageUrl = canvas.toDataURL('image/jpeg');
      
      if (cameraMode === 'identify') {
        identifyPlantFromImage(imageUrl);
      } else if (cameraMode === 'diagnose') {
        diagnosePlant(imageUrl);
      } else {
        validateImageIsPlant(imageUrl);
      }
      stopCamera();
    }
  };

  const validateImageIsPlant = async (imageUrl: string) => {
    setIsIdentifying(true);
    setAiError(null);
    try {
      const res = await authFetch('identify_plant.php', {
        method: 'POST',
        body: JSON.stringify({ image_base64: imageUrl })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNewPlant(prev => ({ ...prev, image_url: imageUrl }));
      } else {
        setAiError(data.message || t('dashboard.aiCouldNotDetect'));
      }
    } catch (err) {
      console.error(err);
      setAiError(t('dashboard.aiCouldNotDetect'));
    } finally {
      setIsIdentifying(false);
    }
  };

  const identifyPlantFromImage = async (imageUrl: string) => {
    setIsIdentifying(true);
    setPlantInfo(null);
    setAiError(null);
    try {
      const res = await authFetch('identify_plant.php', {
        method: 'POST',
        body: JSON.stringify({ image_base64: imageUrl })
      });
      const data = await res.json();
      if (data.status === 'success') {
        const { identification: id, care_plan: cp } = data;
        setNewPlant(prev => ({
          ...prev,
          species: id.species,
          image_url: imageUrl,
          native_region: cp.native_region || '',
          light_requirement: cp.light?.detail || '',
          water_requirement: cp.water?.instructions || '',
          humidity: cp.humidity?.level || '',
          pet_friendly: !!cp.toxicity?.pet_friendly,
          water_freq: cp.water?.frequency_days || 7,
          light_req: cp.light?.level || 'Medium',
          care_plan: cp
        }));
        setPlantInfo({ species: id.species, description: id.description });
      } else {
        setAiError(data.message || t('dashboard.noPlantDetected'));
        setNewPlant(prev => ({ ...prev, image_url: '' }));
      }
    } catch (err) {
      console.error(err);
      setAiError(t('dashboard.aiIdentifyFailed'));
      setNewPlant(prev => ({ ...prev, image_url: '' }));
    } finally {
      setIsIdentifying(false);
    }
  };

  const diagnosePlant = (imageUrl: string) => {
    console.log("diagnosePlant", imageUrl);
    setIsIdentifying(true);
    setHealthStatus(null);
    setTimeout(() => {
      const mockHealth = {
        diagnosis: "Mild Sunburn",
        treatment: "Move the plant away from direct, harsh sunlight. Mist leaves gently to recover moisture."
      };
      setHealthStatus(mockHealth);
      setIsIdentifying(false);
    }, 3000);
  };

  const closeModal = () => {
    setIsAddPlantModalOpen(false);
    setIsDiagnosingModalOpen(false);
    setPlantInfo(null);
    setHealthStatus(null);
    setIsIdentifying(false);
    setAiError(null);
    stopCamera();
  };

  const removePlant = (id: number) => {
    authFetch('remove_plant.php', {
      method: 'POST',
      body: JSON.stringify({ id })
    }).then(res => res.json()).then(data => {
      if (data.status === 'success') {
        setPlants(plants.filter(plant => plant.id !== id));
      }
    });
  };

  const handleWaterPlant = async (id: number) => {
    try {
      const res = await authFetch('water_plant.php', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        notifiedIds.current.delete(id);
        setThirstyPlants(prev => prev.filter(pId => pId !== id));
        fetchGamification();
        fetchPlants(user!.id);
        window.dispatchEvent(new Event('pnapana:rewards'));
      }
    } catch(e) {
      console.error(e);
    }
  };

  const filteredPlants = useMemo(() => {
    if (!searchQuery) return plants;
    return plants.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.species.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [plants, searchQuery]);

  const thirstyPlantsList = plants.filter(p => thirstyPlants.includes(p.id));
  const needsAttentionCount = plants.filter(p => thirstyPlants.includes(p.id) || p.status_color === 'orange').length;
  const healthyCount = plants.length - needsAttentionCount;
  const healthPercent = plants.length > 0 ? Math.round((healthyCount / plants.length) * 100) : 100;

  const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const scannedDays = new Set(Object.values(scanDates).flatMap(dates => dates || []).map(value => dayKey(new Date(value.replace(' ', 'T')))));
  const photoHistoryKnown = plantsLoaded && plants.every(plant => Array.isArray(scanDates[plant.id]));
  const cursor = new Date(today);
  let photoStreak = 0;
  if (!scannedDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (scannedDays.has(dayKey(cursor))) {
    photoStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  const scannedToday = (id: number) => scanDates[id]?.some(value => dayKey(new Date(value.replace(' ', 'T'))) === dayKey(today));

  if (!user) return <Loader fullScreen label={t('common.loading')} />;

  return (
    <div className={styles.container}>
      
      {/* Animated Mesh Background for Premium Feel */}
      <div className={styles.meshBg}>
        <div className={styles.meshOrb1}></div>
        <div className={styles.meshOrb2}></div>
        <div className={styles.meshOrb3}></div>
      </div>

      {/* --- ADD PLANT MODAL --- */}
      {isAddPlantModalOpen && (
        <motion.div
          className={styles.modalOverlay}
          onClick={closeModal}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className={styles.modalContent}
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button type="button" className={styles.closeBtn} onClick={closeModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2>{t('dashboard.modalAddTitle')}</h2>
            <form onSubmit={handleAddPlant}>
              <div className={styles.inputGroup}>
                <label>{t('dashboard.plantNameLabel')}</label>
                <input type="text" required value={newPlant.name} onChange={e => setNewPlant({...newPlant, name: e.target.value})} placeholder={t('dashboard.plantNamePlaceholder')} />
              </div>
              <div className={styles.inputGroup}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{t('dashboard.speciesLabel')}</span>
                  <button type="button" onClick={() => startCamera('identify')} className={styles.identifyBtn}>
                    {t('dashboard.aiIdentify')}
                  </button>
                </label>
                <input type="text" required value={newPlant.species} onChange={e => setNewPlant({...newPlant, species: e.target.value})} placeholder={t('dashboard.speciesPlaceholder')} />
              </div>

              {isIdentifying && (
                <div className={styles.identifyingState} style={{marginBottom: '1rem'}}>
                  <div className={styles.scanSpinner}></div>
                  <p>{cameraMode === 'identify' ? t('dashboard.analyzingFeatures') : t('dashboard.validatingImage')}</p>
                </div>
              )}

              {aiError && (
                <div className={styles.aiErrorCard} style={{background: 'rgba(231, 76, 60, 0.1)', color: '#c0392b', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(231, 76, 60, 0.3)', marginBottom: '1rem', fontWeight: 500}}>
                  ⚠️ {aiError}
                </div>
              )}

              {plantInfo && !isIdentifying && cameraMode === 'identify' && !aiError && (
                <div className={styles.plantInfoCard}>
                  <h4>{t('dashboard.aboutThisPlant')}</h4>
                  <p>{plantInfo.description}</p>
                </div>
              )}

              <div className={styles.inputGroup}>
                <label>{t('dashboard.plantPhotoLabel')}</label>
                {isCapturing && cameraMode !== 'diagnose' ? (
                  <div>
                    <video ref={videoRef} autoPlay playsInline className={styles.cameraView} />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    <div className={styles.cameraActions}>
                      <button type="button" onClick={captureImage} className={styles.snapBtn}>{t('dashboard.snapPhoto')}</button>
                      <button type="button" onClick={stopCamera} className={styles.cancelCamBtn}>{t('dashboard.cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {newPlant.image_url ? (
                      <div>
                        <img src={newPlant.image_url} alt="Preview" className={styles.imagePreview} />
                        <button type="button" onClick={() => setNewPlant({...newPlant, image_url: ''})} className={styles.cameraBtn}>{t('dashboard.removePhoto')}</button>
                      </div>
                    ) : (
                      <div>
                        <input type="url" value={newPlant.image_url} onChange={e => setNewPlant({...newPlant, image_url: e.target.value})} placeholder={t('dashboard.urlPlaceholder')} style={{marginBottom: '0.5rem'}} />
                        <button type="button" onClick={() => startCamera('capture')} className={styles.cameraBtn}>{t('dashboard.capturePhoto')}</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button type="submit" className={styles.submitBtn} disabled={isAdding || isCapturing}>
                {isAdding ? t('dashboard.adding') : t('dashboard.addPlant')}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* --- AI DOCTOR MODAL --- */}
      {isDiagnosingModalOpen && (
        <motion.div
          className={styles.modalOverlay}
          onClick={closeModal}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className={styles.modalContent}
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button type="button" className={styles.closeBtn} onClick={closeModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2>{t('dashboard.aiDoctorTitle')}</h2>

            {!healthStatus && !isIdentifying && isCapturing && (
              <>
                <p style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>{t('dashboard.aiDoctorSnapPrompt')}</p>
                <div style={{position: 'relative', overflow: 'hidden', borderRadius: '16px'}}>
                  <video ref={videoRef} autoPlay playsInline className={styles.cameraView} style={{margin: 0}} />
                  <div className={styles.focusFrame}>
                    <div className={styles.focusCornerTL}></div><div className={styles.focusCornerTR}></div>
                    <div className={styles.focusCornerBL}></div><div className={styles.focusCornerBR}></div>
                  </div>
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className={styles.cameraActions}>
                  <button type="button" onClick={captureImage} className={styles.snapBtn}>{t('dashboard.analyzeHealth')}</button>
                </div>
              </>
            )}

            {isIdentifying && cameraMode === 'diagnose' && (
              <div className={styles.identifyingState} style={{marginTop: '2rem'}}>
                <div className={styles.scanLine}></div>
                <div className={styles.scanSpinner}></div>
                <p>{t('dashboard.diagnosing')}</p>
              </div>
            )}

            {healthStatus && (
              <div className={styles.diagnosisCard}>
                <div className={styles.diagHeader}>
                  <span className={styles.diagIcon}>⚠️</span>
                  <h3>{healthStatus.diagnosis}</h3>
                </div>
                <div className={styles.diagBody}>
                  <h4>{t('dashboard.treatmentPlan')}</h4>
                  <p>{healthStatus.treatment}</p>
                </div>
                <button className={styles.submitBtn} onClick={closeModal} style={{marginTop: '1.5rem'}}>{t('dashboard.gotItThanks')}</button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      <header className={styles.header}>
        <div className={styles.greeting}>
          <p className={styles.eyebrow}>{language === 'hi' ? 'आपका दिन शुभ हो' : new Date().getHours() < 12 ? 'GOOD MORNING' : new Date().getHours() < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING'}</p>
          <h1>{user.name.split(' ')[0]}</h1>
        </div>
        <Link href="/explore" className={styles.discoverLink}>{language === 'hi' ? 'कुछ नया उगाएँ' : 'A little inspiration'} <ArrowUpRight size={17} /></Link>
      </header>

      <WeatherCard />

      {carePlant && (
        <section className={styles.plantCareForecast} aria-labelledby="plant-care-forecast-title">
          <div className={styles.plantCareHeader}>
            <div>
              <h2 id="plant-care-forecast-title">Adjusted for today’s weather</h2>
              <p>Weather, watering, light, and growth guidance for your plant.</p>
            </div>
            <label className={styles.plantCarePicker}>
              <span>Plant</span>
              <select
                value={carePlant.id}
                onChange={event => setCarePlantId(Number(event.target.value))}
                aria-label="Choose a plant for today's care guidance"
              >
                {plants.map(plant => <option key={plant.id} value={plant.id}>{plant.name}</option>)}
              </select>
            </label>
          </div>

          <WeatherCard plant={carePlant} />

          <div className={styles.dashboardCarePlan}>
            <div className={styles.dashboardCarePlanHeader}>
              <h2>Care plan</h2>
              <Link href={`/plant?id=${carePlant.id}`}>Full plant details <ArrowUpRight size={15} /></Link>
            </div>
            <div className={styles.dashboardCareRows}>
              <div className={styles.dashboardCareRow}>
                <span className={styles.dashboardCareIcon}><Globe size={22} /></span>
                <div><span className={styles.dashboardCareLabel}>Native to</span><p>{carePlant.native_region || 'Native region not available'}</p></div>
              </div>
              <div className={styles.dashboardCareRow}>
                <span className={styles.dashboardCareIcon}><Sun size={22} /></span>
                <div><span className={styles.dashboardCareLabel}>Light <em>{carePlant.light_req || 'Medium'}</em></span><p>{carePlant.light_requirement || 'Check the detailed care plan for light requirements.'}</p></div>
              </div>
              <div className={styles.dashboardCareRow}>
                <span className={styles.dashboardCareIcon}><Droplets size={22} /></span>
                <div><span className={styles.dashboardCareLabel}>Water <em>{carePlant.water_freq || 7} days between waterings</em></span><p>{carePlant.water_requirement || 'Check the topsoil before watering.'}</p></div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className={styles.shortcuts}>
        <Link href="/rituals"><span className={styles.shortcutGreen}><Compass size={25} strokeWidth={1.6} /></span><strong>{language === 'hi' ? 'वास्तु और स्थान' : <>Vastu &<br />Space</>}</strong></Link>
        <button onClick={() => startCamera('diagnose')}><span className={styles.shortcutBlue}><HeartPulse size={25} strokeWidth={1.6} /></span><strong>{language === 'hi' ? 'स्वास्थ्य' : 'Health'}</strong></button>
        <Link href="/care"><span className={styles.shortcutPeach}><FlaskConical size={25} strokeWidth={1.6} /></span><strong>{language === 'hi' ? 'देखभाल' : 'Remedies'}</strong></Link>
      </div>

      <section className={styles.todaySection}>
        <div className={styles.sectionHeader}><h3>{language === 'hi' ? 'आज की देखभाल' : "Today's care"}</h3><Link href="/care">{language === 'hi' ? 'सभी देखें' : 'View schedule'} <ArrowUpRight size={14} /></Link></div>
        {plants.length === 0 ? <div className={styles.todayEmpty}><Sprout size={26} /><p>{language === 'hi' ? 'अपना पहला पौधा जोड़ें।' : 'Your green family starts with one plant.'}</p><button onClick={() => setIsAddPlantModalOpen(true)}>{t('dashboard.addPlant')}</button></div> : plants.map(plant => <div key={plant.id} className={styles.todayPlant}>
          <Link href={`/plant?id=${plant.id}`} className={styles.todayPlantInfo}>{plant.image_url ? <img src={plant.image_url} alt={plant.name} /> : <span className={styles.plantPlaceholder}><Sprout size={25} /></span>}<div><strong>{plant.name}</strong><span className={styles.todayStatus}><ScanLine size={13} />{scanDates[plant.id] === null ? 'Scan status unavailable' : scanDates[plant.id] === undefined ? 'Checking scan status…' : scannedToday(plant.id) ? (language === 'hi' ? 'आज स्कैन किया' : 'Scanned today') : language === 'hi' ? 'आज स्कैन नहीं किया' : 'Not scanned today'}</span></div></Link>
          <Link href={`/plant?id=${plant.id}&tab=scan`} className={styles.scanPill}>{language === 'hi' ? 'स्कैन' : 'Scan'}</Link>
        </div>)}
      </section>

      <section className={styles.photoStreakCard}>
        <span className={styles.photoStreakIcon} aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3c1 4-2 5-2 8 0 2 2 3 3 1 1-1 1-3 1-3 4 4 5 6 4 9-2 5-10 5-12 0-1-3 1-6 3-8-1 4 1 5 2 4 2-2 2-5 1-11Z"/></svg></span>
        <div><h3>{photoHistoryKnown ? `${photoStreak} day photo streak` : 'Your photo streak'}</h3><p>{language === 'hi' ? 'हर दिन एक तस्वीर लें और पौधे को बढ़ते देखें।' : 'A photo a day. Watch your green family grow.'}</p></div>
        <Link href="/dashboard?action=scan" onClick={event => { event.preventDefault(); setIsAddPlantModalOpen(true); }} aria-label="Start a photo check-in"><ScanLine size={21} /></Link>
      </section>

      <div className={styles.bentoGrid}>
        {/* Tile 2: Action Needed */}
        <div className={`${styles.bentoTile} ${styles.tasksTile}`}>
          <div className={styles.bentoHeader}>
            <h3>{t('dashboard.actionNeeded')}</h3>
            {thirstyPlantsList.length > 0 && <span className={styles.badgePulse}>{thirstyPlantsList.length}</span>}
          </div>

          <div className={styles.taskList}>
            {thirstyPlantsList.length > 0 ? (
              thirstyPlantsList.map(plant => (
                <div key={plant.id} className={styles.taskItem}>
                  <div className={styles.taskInfo}>
                    <div className={styles.taskDot}></div>
                    <div>
                      <h4>{t('care.waterPlant', { name: plant.name })}</h4>
                      <p>{t('dashboard.soilDry')}</p>
                    </div>
                  </div>
                  <button className={styles.taskBtn} onClick={(e) => { e.stopPropagation(); handleWaterPlant(plant.id); }}>{t('dashboard.done')}</button>
                </div>
              ))
            ) : (
              <div className={styles.allDone}>
                <div className={styles.doneCircle}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <p>{t('dashboard.allDone')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tile 3: Achievement Badges */}
        <div id="rewards" className={`${styles.bentoTile} ${styles.milestonesTile}`}>
          <div className={styles.bentoHeader}>
            <h3>{t('dashboard.achievements')}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className={styles.coinPill}>🪙 {coins}</span>
              <span>{badges.filter(b => b.unlocked).length}/{badges.length}</span>
            </div>
          </div>
          <div className={styles.badgeGrid}>
            {badges.map(b => (
              <div key={b.id} className={`${styles.badgeItem} ${!b.unlocked ? styles.locked : ''}`} title={t(`badges.${b.id}.description`)}>
                <div className={styles.badgeIconWrap}>
                  {b.icon}
                  {b.unlocked && <span className={styles.badgeCheck}>✓</span>}
                </div>
                <span className={styles.badgeLabel}>{t(`badges.${b.id}.label`)}</span>
                {!b.unlocked && <span className={styles.badgeProgress}>{b.progress}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Tile 4: Stats & Streak */}
        <div className={`${styles.bentoTile} ${styles.statsTile}`}>
          <div className={styles.streakWidget}>
            <div className={styles.streakFlame}>🔥</div>
            <div className={styles.streakInfo}>
              <h4>{streakDays} {streakDays === 1 ? t('dashboard.day') : t('dashboard.days')}</h4>
              <p>{streakDays > 0 ? t('dashboard.wateringStreak') : t('dashboard.startStreak')}</p>
            </div>
          </div>
          <div className={styles.statDivider}></div>
          <div className={styles.happinessWidget}>
            <div className={styles.statCircle}>
              <svg viewBox="0 0 36 36" className={styles.circularChart}>
                <defs>
                  <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={healthPercent >= 70 ? '#2ecc71' : healthPercent >= 40 ? '#f39c12' : '#e74c3c'} />
                    <stop offset="100%" stopColor={healthPercent >= 70 ? '#27ae60' : healthPercent >= 40 ? '#d35400' : '#c0392b'} />
                  </linearGradient>
                </defs>
                <path className={styles.circleBg} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <motion.path
                  className={styles.circle}
                  strokeDasharray="100, 100"
                  initial={{ strokeDasharray: '0, 100' }}
                  animate={{ strokeDasharray: `${healthPercent}, 100` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.8" className={styles.percentage}>{healthPercent}%</text>
              </svg>
            </div>
            <p className={styles.statsLabel}>{t('dashboard.collectionHealth')}</p>
            {plants.length > 0 && (
              <p className={styles.statsSubLabel}>{t('dashboard.thriving', { healthy: healthyCount, total: plants.length })}</p>
            )}
          </div>
        </div>

      </div>

      {/* --- PLANT COLLECTION --- */}
      <section id="garden" className={styles.collectionSection}>
        <div className={styles.sectionHeader}>
          <h3>{t('dashboard.yourGreenFamily')}</h3><button className={styles.addGardenBtn} onClick={() => setIsAddPlantModalOpen(true)}>+ {t('dashboard.addPlant')}</button>
        </div>

        {plants.length > 0 && (
          <div className={styles.searchBar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              type="text"
              placeholder={t('dashboard.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {plants.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIconWrapper}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
            </div>
            <p>{t('dashboard.emptyStateText')}</p>
            <button className={styles.emptyStateBtn} onClick={() => setIsAddPlantModalOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              {t('dashboard.addFirstPlant')}
            </button>
          </div>
        ) : filteredPlants.length === 0 ? (
          <div className={styles.emptySearch}>{t('dashboard.noPlantsFound', { query: searchQuery })}</div>
        ) : (
          <motion.div 
            className={styles.plantListGrid}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
          >
              {filteredPlants.map(plant => {
                const isThirsty = thirstyPlants.includes(plant.id);
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={plant.id}
                    className={`${styles.plantCardWrapper}`}
                  >
                    <Link href={`/plant?id=${plant.id}`} className={`${styles.plantCard} ${isThirsty ? styles.thirstyCard : ''}`}>
                      <button
                        className={styles.removeBtn}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); removePlant(plant.id); }}
                        title={t('dashboard.removePlant')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </button>
                      <div className={styles.plantImageWrapper}>
                        <img src={plant.image_url || "/plants/tulsi.webp"} alt={plant.name} className={styles.plantImage} />
                        {isThirsty && <div className={styles.thirstyOverlay}>💧 {t('dashboard.water')}</div>}
                      </div>
                      <div className={styles.plantInfo}>
                        <div className={styles.plantName}>{plant.name}</div>
                        <div className={styles.plantSpecies}>{plant.species}</div>
                      </div>
                      <div className={styles.plantStatus}>
                        <div className={`${styles.statusDot} ${styles[isThirsty ? 'blue' : plant.status_color || 'green']}`}></div>
                        {isThirsty ? t('dashboard.needsWater') : plant.status || t('dashboard.happy')}
                      </div>
                      
                      {/* Quick Actions Hover Menu */}
                      <div className={styles.quickActionsOverlay}>
                        <button className={styles.quickActionBtn} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleWaterPlant(plant.id); }} title={t('dashboard.water')}>
                          <Droplets size={16} />
                        </button>
                        <button className={styles.quickActionBtn} onClick={(e) => { e.preventDefault(); router.push(`/plant?id=${plant.id}&tab=care`); }} title={t('dashboard.prune')}>
                          <Sprout size={16} />
                        </button>
                        <button className={styles.quickActionBtn} onClick={(e) => { e.preventDefault(); router.push(`/plant?id=${plant.id}&tab=care`); }} title={t('dashboard.fertilize')}>
                          <FlaskConical size={16} />
                        </button>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
          </motion.div>
        )}
      </section>

      <button className={styles.fabButton} onClick={() => setIsAddPlantModalOpen(true)} title={t('dashboard.addPlant')}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>

    </div>
  );
}
