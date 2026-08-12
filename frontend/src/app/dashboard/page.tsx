'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Home.module.css';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: number, name: string } | null>(null);
  const [plants, setPlants] = useState<any[]>([]);
  const [thirstyPlants, setThirstyPlants] = useState<number[]>([]);
  const notifiedIds = useRef<Set<number>>(new Set());
  
  // Weather state
  const [weather, setWeather] = useState<{ temp: number | string, humidity: number | string }>({ temp: '--', humidity: '--' });
  const [weatherAQI, setWeatherAQI] = useState<{ value: number | string, status: string }>({ value: '--', status: 'Loading' });

  // Add Plant Modal state
  const [isAddPlantModalOpen, setIsAddPlantModalOpen] = useState(false);
  const [newPlant, setNewPlant] = useState({ name: '', species: '', image_url: '' });
  const [isAdding, setIsAdding] = useState(false);
  
  // Camera state
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Daily Tip state
  const [dailyTip, setDailyTip] = useState<{ title: string, content: string } | null>(null);

  const TIPS = [
    { title: "Don't Overwater!", content: "Most indoor plants prefer their soil to dry out between waterings. When in doubt, wait a day!" },
    { title: "Let There Be Light", content: "Check if your plant needs direct or indirect sunlight. Too much direct sun can burn delicate leaves." },
    { title: "Dust Those Leaves", content: "Wipe down your plant's leaves with a damp cloth every few weeks to help them photosynthesize better." },
    { title: "Check for Pests", content: "Always inspect the undersides of leaves when watering. Catching pests early is key!" }
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    fetchPlants(parsedUser.id);
    fetchWeather();

    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    // Set a random daily tip
    setDailyTip(TIPS[Math.floor(Math.random() * TIPS.length)]);

    const checkWateringNeeds = async () => {
      try {
        const res = await fetch(`http://localhost/pnapana/backend/api/get_notifications.php?user_id=${parsedUser.id}`);
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
    const interval = setInterval(checkWateringNeeds, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [router]);

  function fetchPlants(userId: number) {
    fetch(`http://localhost/pnapana/backend/api/get_plants.php?user_id=${userId}`)
      .then(res => res.json())
      .then(data => { if(data.status === "success") setPlants(data.plants); });
  }

  async function fetchWeather() {
    try {
      // Bangalore coordinates as default
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=12.9716&longitude=77.5946&current=temperature_2m,relative_humidity_2m&timezone=auto');
      const data = await res.json();
      if (data.current) {
        setWeather({ temp: Math.round(data.current.temperature_2m), humidity: data.current.relative_humidity_2m });
        // Mock AQI for now as open-meteo basic doesn't have it easily
        setWeatherAQI({ value: 38, status: 'Air Good' }); 
      }
    } catch (e) {
      console.error("Failed to fetch weather", e);
    }
  }

  const handleAddPlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPlant.name || !newPlant.species) return;
    setIsAdding(true);
    
    try {
      const res = await fetch('http://localhost/pnapana/backend/api/add_plant.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPlant, user_id: user.id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setIsAddPlantModalOpen(false);
        setNewPlant({ name: '', species: '', image_url: '' });
        fetchPlants(user.id);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera", err);
      alert("Could not access camera");
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
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const imageUrl = canvas.toDataURL('image/jpeg');
      setNewPlant({ ...newPlant, image_url: imageUrl });
      stopCamera();
    }
  };

  const closeModal = () => {
    setIsAddPlantModalOpen(false);
    stopCamera();
  };

  const removePlant = (id: number) => {
    fetch('http://localhost/pnapana/backend/api/remove_plant.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setPlants(plants.filter(plant => plant.id !== id));
        }
      });
  };

  const handleWaterPlant = async (id: number) => {
    try {
      const res = await fetch('http://localhost/pnapana/backend/api/water_plant.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        notifiedIds.current.delete(id);
        setThirstyPlants(prev => prev.filter(pId => pId !== id));
      }
    } catch(e) {}
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return <div className={styles.container} style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Loading...</div>;

  return (
    <div className={styles.container}>
      {isAddPlantModalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button type="button" className={styles.closeBtn} onClick={closeModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2>Add a New Plant</h2>
            <form onSubmit={handleAddPlant}>
              <div className={styles.inputGroup}>
                <label>Plant Name (e.g. Charlie)</label>
                <input type="text" required value={newPlant.name} onChange={e => setNewPlant({...newPlant, name: e.target.value})} placeholder="My lovely monstera" />
              </div>
              <div className={styles.inputGroup}>
                <label>Species</label>
                <input type="text" required value={newPlant.species} onChange={e => setNewPlant({...newPlant, species: e.target.value})} placeholder="Monstera Deliciosa" />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Plant Photo</label>
                
                {isCapturing ? (
                  <div>
                    <video ref={videoRef} autoPlay playsInline className={styles.cameraView} />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    <div className={styles.cameraActions}>
                      <button type="button" onClick={captureImage} className={styles.snapBtn}>Snap Photo</button>
                      <button type="button" onClick={stopCamera} className={styles.cancelCamBtn}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {newPlant.image_url ? (
                      <div>
                        <img src={newPlant.image_url} alt="Preview" className={styles.imagePreview} />
                        <button type="button" onClick={() => setNewPlant({...newPlant, image_url: ''})} className={styles.cameraBtn}>Remove Photo</button>
                      </div>
                    ) : (
                      <div>
                        <input type="url" value={newPlant.image_url} onChange={e => setNewPlant({...newPlant, image_url: e.target.value})} placeholder="https://... (or capture one)" style={{marginBottom: '0.5rem'}} />
                        <button type="button" onClick={startCamera} className={styles.cameraBtn}>
                          📸 Capture Photo
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button type="submit" className={styles.submitBtn} disabled={isAdding || isCapturing}>
                {isAdding ? 'Adding...' : 'Add Plant'}
              </button>
            </form>
          </div>
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.greeting}>
          <h1>Namaste, {user.name} 🌿</h1>
          <p className={styles.sanskrit}>सर्वे भवन्तु सुखिनः</p>
          <p className={styles.subtitle}>May all beings be happy and thrive.</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.iconButton} onClick={handleLogout} title="Logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
          <div className={styles.profilePic}>
            <img src={`https://ui-avatars.com/api/?name=${user.name}&background=c17b54&color=fff`} alt="Profile" />
          </div>
        </div>
      </header>

      <section className={styles.snapshotCard}>
        <div className={styles.snapshotTop}>
          <div>
            <h2>Today&apos;s Snapshot</h2>
            <p>Bangalore, KA</p>
          </div>
          <div className={styles.weather}>
            <div className={styles.temp}>
              {weather.temp}°
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d36a32" strokeWidth="2"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>
            </div>
            <div className={styles.airQuality}>
              {weatherAQI.status} <div className={styles.airDot}></div>
            </div>
          </div>
        </div>
        <div className={styles.snapshotStats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Light</span>
            <span className={`${styles.statValue} ${styles.optimal}`}>Optimal <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg></span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Humidity</span>
            <span className={styles.statValue}>{weather.humidity}% <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg></span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>AQI</span>
            <span className={styles.statValue}>{weatherAQI.value} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg></span>
          </div>
        </div>
      </section>

      <div className={styles.quickActionsList}>
        <div className={styles.quickActionBtn} onClick={() => setIsAddPlantModalOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          Scan Plant
        </div>
        <Link href="/rituals" className={styles.quickActionBtn} style={{textDecoration: 'none'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          Schedule
        </Link>
        <Link href="/explore" className={styles.quickActionBtn} style={{textDecoration: 'none'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          Explore
        </Link>
        <Link href="/care" className={styles.quickActionBtn} style={{textDecoration: 'none'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          Care Guide
        </Link>
      </div>

      {dailyTip && (
        <section className={styles.dailyTipCard}>
          <div className={styles.tipIcon}>💡</div>
          <div className={styles.tipContent}>
            <h4>{dailyTip.title}</h4>
            <p>{dailyTip.content}</p>
          </div>
        </section>
      )}

      <section>
        <div className={styles.sectionHeader}>
          <h3>Your Green Family</h3>
          {plants.length > 0 && (
            <button className={styles.addPlantBtn} onClick={() => setIsAddPlantModalOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Plant
            </button>
          )}
        </div>
        
        {plants.length === 0 ? (
          <div className={styles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
            <p>You don&apos;t have any plants yet.</p>
            <button className={styles.emptyStateBtn} onClick={() => setIsAddPlantModalOpen(true)}>
              + Add your first plant
            </button>
          </div>
        ) : (
          <div className={styles.plantList}>
            {plants.map(plant => {
              const isThirsty = thirstyPlants.includes(plant.id);
              return (
                <Link href={`/plant/${plant.id}`} key={plant.id} className={styles.plantCard} style={isThirsty ? { border: '2px solid #3498db' } : {}}>
                  <button 
                    className={styles.removeBtn} 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); removePlant(plant.id); }}
                    title="Remove Plant"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </button>
                  <img src={plant.image_url} alt={plant.name} className={styles.plantImage} />
                  <div className={styles.plantName}>{plant.name}</div>
                  <div className={styles.plantStatus}>
                    <div className={`${styles.statusDot} ${styles[isThirsty ? 'blue' : plant.status_color || 'green']}`} style={isThirsty ? { backgroundColor: '#3498db' } : {}}></div>
                    {isThirsty ? 'Needs Water' : plant.status || 'Happy'}
                  </div>
                  {isThirsty && (
                    <button 
                      className={styles.waterNowBtn}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleWaterPlant(plant.id); }}
                    >
                      💧 Water Now
                    </button>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.ritualCard}>
        <div className={styles.ritualInfo}>
          <h3>Amrit Ritual &middot; Evening</h3>
          <p>Misting & gratitude time</p>
          <button className={styles.ritualBtn} onClick={() => router.push('/rituals')}>Start Ritual</button>
        </div>
        <img src="https://cdn-icons-png.flaticon.com/512/2928/2928929.png" alt="Watering Can" className={styles.ritualImage} />
      </section>

      <button className={styles.fabButton} onClick={() => setIsAddPlantModalOpen(true)} title="Add Plant">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>

    </div>
  );
}
