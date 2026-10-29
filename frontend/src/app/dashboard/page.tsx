'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Droplets, Scissors, FlaskConical } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import { authFetch, getApiUrl } from '@/lib/api';
import styles from './Home.module.css';

const AFFIRMATIONS_EN = [
  "Bloom where you are planted. 🌸",
  "To plant a garden is to believe in tomorrow.",
  "Nature does not hurry, yet everything is accomplished.",
  "Just like your plants, you are growing every day.",
  "Deep roots are not reached by the frost."
];

const AFFIRMATIONS_HI = [
  "जहां लगाए जाओ, वहीं खिलो। 🌸",
  "बगीचा लगाना कल पर भरोसा करना है।",
  "प्रकृति जल्दी नहीं करती, फिर भी सब कुछ पूरा हो जाता है।",
  "अपने पौधों की तरह, आप भी हर दिन बढ़ रहे हैं।",
  "गहरी जड़ों तक पाला नहीं पहुंचता।"
];

export default function Home() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [user, setUser] = useState<{ id: number, name: string, token?: string } | null>(null);
  const [plants, setPlants] = useState<any[]>([]);
  const [thirstyPlants, setThirstyPlants] = useState<number[]>([]);
  const notifiedIds = useRef<Set<number>>(new Set());
  
  // Weather state
  const [weather, setWeather] = useState<{ temp: number | string, humidity: number | string }>({ temp: '--', humidity: '--' });
  const [weatherAQI, setWeatherAQI] = useState<{ value: number | string, status: string }>({ value: '--', status: 'Loading' });
  const [locationName, setLocationName] = useState('Locating...');

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
  
  // New Features State
  const [affirmation, setAffirmation] = useState('');

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

    fetchPlants(parsedUser.id, parsedUser.token);
    fetchWeather();
    fetchGamification(parsedUser.token);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    const affirmations = language === 'hi' ? AFFIRMATIONS_HI : AFFIRMATIONS_EN;
    setAffirmation(affirmations[Math.floor(Math.random() * affirmations.length)]);
  }, [language]);

  function fetchPlants(userId: number, token?: string) {
    authFetch(`get_plants.php?user_id=${userId}`)
      .then(res => res.json())
      .then(data => { if(data.status === "success") setPlants(data.plants); })
      .catch(() => {});
  }

  function fetchGamification(token?: string) {
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

  async function fetchWeather() {
    const fetchWeatherData = async (lat: number, lon: number, locationFallback: string = 'Bangalore') => {
      try {
        try {
          const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
          const geoData = await geoRes.json();
          setLocationName(geoData.city || geoData.locality || locationFallback);
        } catch (e) {
          console.error(e);
          setLocationName(locationFallback);
        }

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m&timezone=auto`);
        const weatherData = await weatherRes.json();
        if (weatherData.current) {
          setWeather({ temp: Math.round(weatherData.current.temperature_2m), humidity: weatherData.current.relative_humidity_2m });
        }

        try {
          const aqiRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`);
          const aqiData = await aqiRes.json();
          if (aqiData.current) {
            setWeatherAQI({ value: aqiData.current.us_aqi, status: 'Active' });
          }
        } catch (e) {
          console.error(e);
          setWeatherAQI({ value: '--', status: 'Error' });
        }
      } catch (e) {
        console.error("Failed to fetch weather", e);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeatherData(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn("Geolocation denied or failed", error);
          fetchWeatherData(12.9716, 77.5946, 'Bangalore');
        }
      );
    } else {
      fetchWeatherData(12.9716, 77.5946, 'Bangalore');
    }
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
        alert(data.message);
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
      }
    } catch(e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const filteredPlants = useMemo(() => {
    if (!searchQuery) return plants;
    return plants.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.species.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [plants, searchQuery]);

  const thirstyPlantsList = plants.filter(p => thirstyPlants.includes(p.id));
  const needsAttentionCount = plants.filter(p => thirstyPlants.includes(p.id) || p.status_color === 'orange').length;
  const healthyCount = plants.length - needsAttentionCount;
  const healthPercent = plants.length > 0 ? Math.round((healthyCount / plants.length) * 100) : 100;

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
          <h1>{t('dashboard.greeting', { name: user.name })}</h1>
          <p className={styles.affirmation}>{affirmation}</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.iconButton} onClick={handleLogout} title={t('dashboard.logout')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
          <div className={styles.profilePic}>
            <img src={`https://ui-avatars.com/api/?name=${user.name}&background=c17b54&color=fff`} alt="Profile" />
          </div>
        </div>
      </header>



      {/* --- PREMIUM BENTO BOX GRID --- */}
      <div className={styles.bentoGrid}>
        
        {/* Tile 1: Weather Snapshot */}
        <div className={`${styles.bentoTile} ${styles.weatherTile}`}>
          <div className={styles.bentoHeader}>
            <div>
              <h3>{locationName}</h3>
              <span>{t('dashboard.todaysOutlook')}</span>
            </div>
          </div>
          <div className={styles.weatherMain}>
            <div className={styles.tempLarge}>{weather.temp}°</div>
            <div className={styles.weatherIcon}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="url(#orange-grad)" strokeWidth="1.5"><defs><linearGradient id="orange-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f39c12" /><stop offset="100%" stopColor="#d35400" /></linearGradient></defs><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            </div>
          </div>
          <div className={styles.weatherStats}>
            <div className={styles.wStat}>
              <span className={styles.wLabel}>{t('dashboard.humidity')}</span>
              <span className={styles.wValue}>{weather.humidity}%</span>
            </div>
            <div className={styles.wStat}>
              <span className={styles.wLabel}>{t('dashboard.aqi')}</span>
              <span className={styles.wValue}>{weatherAQI.value}</span>
            </div>
          </div>
        </div>

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
        <div className={`${styles.bentoTile} ${styles.milestonesTile}`}>
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
      <section className={styles.collectionSection}>
        <div className={styles.sectionHeader}>
          <h3>{t('dashboard.yourGreenFamily')}</h3>
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
                        <img src={plant.image_url} alt={plant.name} className={styles.plantImage} />
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
                        <button className={styles.quickActionBtn} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} title={t('dashboard.prune')}>
                          <Scissors size={16} />
                        </button>
                        <button className={styles.quickActionBtn} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} title={t('dashboard.fertilize')}>
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
