'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search,
  Bell,
  Camera,
  ChevronDown,
  Sprout,
  Heart,
  AlertTriangle,
  Star,
  Sun,
  Moon,
  Droplets,
  Shield,
  Clock,
  Thermometer,
  Lightbulb,
  CheckCircle2,
  Circle,
  MoreVertical,
  Plus,
  X,
  Upload,
  ArrowRight,
  Sparkles,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { authFetch } from '@/lib/api';
import { getPlantImageUrl, handlePlantImageError } from '@/lib/plantImages';
import PlantCompanion, { CompanionMood } from '@/components/PlantCompanion';
import styles from './Home.module.css';

interface Plant {
  id: number;
  name: string;
  species: string;
  image_url: string;
  status?: string;
  status_color?: string;
  water_freq?: number;
  last_watered?: string;
  watering_frequency_days?: number;
  water_requirement?: string;
  light_requirement?: string;
  temp_range?: string;
}

export default function Home() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [user, setUser] = useState<{ id: number; name: string; email?: string; token?: string } | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [thirstyPlants, setThirstyPlants] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const notifiedIds = useRef<Set<number>>(new Set());

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  // Weather state
  const [weather, setWeather] = useState<{ temp: number | string; humidity: number | string }>({ temp: 32, humidity: 45 });
  const [weatherAQI, setWeatherAQI] = useState<{ value: number | string; status: string }>({ value: 38, status: 'Good' });
  const [locationName, setLocationName] = useState('Hisar, Haryana');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Add Plant Modal state
  const [isAddPlantModalOpen, setIsAddPlantModalOpen] = useState(false);
  const [newPlant, setNewPlant] = useState<{
    name: string;
    species: string;
    image_url: string;
    native_region: string;
    light_requirement: string;
    water_requirement: string;
    humidity: string;
    pet_friendly: boolean;
    water_freq: number;
    light_req: string;
    care_plan: any;
    location_notes?: string;
  }>({
    name: '',
    species: '',
    image_url: '',
    native_region: '',
    light_requirement: '',
    water_requirement: '',
    humidity: '',
    pet_friendly: false,
    water_freq: 7,
    light_req: 'Medium',
    care_plan: null,
    location_notes: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  const [addMode, setAddMode] = useState<'ai' | 'manual'>('ai');

  // Camera & AI State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [identifiedData, setIdentifiedData] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Botanical Search State
  const [trefleQuery, setTrefleQuery] = useState('');
  const [trefleResults, setTrefleResults] = useState<any[]>([]);
  const [isSearchingTrefle, setIsSearchingTrefle] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'new' | 'harvested'>('new');

  // Gamification & Plant Companion State
  const [streakDays, setStreakDays] = useState(1);
  const [companionMood, setCompanionMood] = useState<CompanionMood>('happy');
  const [companionMessage, setCompanionMessage] = useState<string>('');
  const [companionMessageHi, setCompanionMessageHi] = useState<string>('');
  const [thirstyCount, setThirstyCount] = useState<number>(0);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    if (localStorage.getItem('is_new_signup')) {
      localStorage.removeItem('is_new_signup');
      setCompanionMessage(`Welcome to Pnapana, ${parsedUser.name || 'Friend'}! 🎉 So thrilled to meet you! Let's start growing your green sanctuary together! 🌱✨`);
      setCompanionMood('ecstatic');
    }

    fetchPlants(parsedUser.id, parsedUser.token);
    fetchWeather();
    fetchGamification(parsedUser.token);
    syncDailyStreak();

    // Hash navigation listener
    const handleHash = () => {
      if (window.location.hash === '#scan') {
        setIsAddPlantModalOpen(true);
      } else if (window.location.hash === '#plants') {
        const el = document.getElementById('my-plants-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [router]);

  function fetchPlants(userId: number, token?: string) {
    authFetch(`get_plants.php?user_id=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success' && Array.isArray(data.plants)) {
          setPlants(data.plants);
          const thirsty = data.plants
            .filter((p: any) => {
              if (!p.last_watered) return true;
              const diffDays = (Date.now() - new Date(p.last_watered).getTime()) / (1000 * 60 * 60 * 24);
              const freq = p.water_freq || p.watering_frequency_days || 7;
              return diffDays >= freq;
            })
            .map((p: any) => p.id);
          setThirstyPlants(thirsty);
        } else {
          setPlants([]);
          setThirstyPlants([]);
        }
      })
      .catch(() => {
        setPlants([]);
        setThirstyPlants([]);
      });
  }

  function fetchGamification(token?: string) {
    authFetch('get_gamification.php')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          if (data.streak_days !== undefined) {
            setStreakDays(data.streak_days);
          }
        }
      })
      .catch(() => {});
  }

  function syncDailyStreak() {
    authFetch('sync_streak.php')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          if (data.streak_days !== undefined) {
            setStreakDays(data.streak_days);
          }
          if (data.mood) {
            setCompanionMood(data.mood);
          }
          if (data.companion) {
            setCompanionMessage(data.companion.message || '');
            setCompanionMessageHi(data.companion.message_hi || '');
          }
          if (data.thirsty_count !== undefined) {
            setThirstyCount(data.thirsty_count);
          }
        }
      })
      .catch((err) => {
        console.warn('Streak sync error:', err);
      });
  }

  async function fetchWeather() {
    const fetchWeatherData = async (lat: number, lon: number, locationFallback: string = 'Hisar, Haryana') => {
      try {
        try {
          const geoRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          const geoData = await geoRes.json();
          setLocationName(geoData.city ? `${geoData.city}, ${geoData.countryName || 'India'}` : locationFallback);
        } catch {
          setLocationName(locationFallback);
        }

        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m&timezone=auto`
        );
        const weatherData = await weatherRes.json();
        if (weatherData.current) {
          setWeather({
            temp: Math.round(weatherData.current.temperature_2m),
            humidity: weatherData.current.relative_humidity_2m
          });
        }

        try {
          const aqiRes = await fetch(
            `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`
          );
          const aqiData = await aqiRes.json();
          if (aqiData.current) {
            const aqiVal = aqiData.current.us_aqi;
            const aqiStatus = aqiVal <= 50 ? 'Good' : aqiVal <= 100 ? 'Moderate' : 'Unhealthy';
            setWeatherAQI({ value: aqiVal, status: aqiStatus });
          }
        } catch {
          setWeatherAQI({ value: 42, status: 'Good' });
        }
      } catch (e) {
        console.error('Failed to fetch weather', e);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeatherData(position.coords.latitude, position.coords.longitude);
        },
        () => {
          fetchWeatherData(29.1492, 75.7217, 'Hisar, Haryana');
        }
      );
    } else {
      fetchWeatherData(29.1492, 75.7217, 'Hisar, Haryana');
    }
  }

  const handleWaterPlant = async (plantId: number) => {
    try {
      const res = await authFetch('water_plant.php', {
        method: 'POST',
        body: JSON.stringify({ plant_id: plantId })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setThirstyPlants((prev) => prev.filter((id) => id !== plantId));
        if (user) {
          fetchPlants(user.id);
          fetchGamification();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const removePlant = async (id: number) => {
    if (!confirm('Are you sure you want to remove this plant?')) return;
    try {
      const res = await authFetch('remove_plant.php', {
        method: 'POST',
        body: JSON.stringify({ plant_id: id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setPlants((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const closeAddModal = () => {
    stopCamera();
    setIsAddPlantModalOpen(false);
    setIdentifiedData(null);
    setAiError(null);
    setTrefleResults([]);
    setTrefleQuery('');
  };

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
        closeAddModal();
        setNewPlant({
          name: '',
          species: '',
          image_url: '',
          native_region: '',
          light_requirement: '',
          water_requirement: '',
          humidity: '',
          pet_friendly: false,
          water_freq: 7,
          light_req: 'Medium',
          care_plan: null,
          location_notes: ''
        });
        fetchPlants(user.id);
        fetchGamification();
      } else {
        if (data.code === 'PLAN_LIMIT_REACHED') {
          if (confirm(`${data.message}\n\nWould you like to upgrade your plan now?`)) {
            closeAddModal();
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

  const startCamera = async () => {
    setAiError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        cameraInputRef.current?.click();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err) {
      console.warn('Camera stream error, using camera capture input fallback:', err);
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const captureCameraSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      stopCamera();
      setNewPlant((prev: any) => ({ ...prev, image_url: base64 }));
      identifyPlantFromImage(base64);
    }
  };

  const identifyPlantFromImage = async (imageUrl: string, hint?: string) => {
    setIsIdentifying(true);
    setAiError(null);
    try {
      const res = await authFetch('identify_plant.php', {
        method: 'POST',
        body: JSON.stringify({ image_base64: imageUrl, hint: hint || '' })
      });
      const data = await res.json();
      if (data.status === 'success') {
        const { identification: id, care_plan: cp } = data;
        setIdentifiedData(data);
        setNewPlant((prev: any) => ({
          ...prev,
          name: prev.name || id.common_name || id.species.split(' ')[0] || 'My Green Plant',
          species: id.species || prev.species,
          image_url: imageUrl || id.image_url || prev.image_url,
          native_region: cp?.native_region || '',
          light_requirement: cp?.light?.detail || '',
          water_requirement: cp?.water?.instructions || '',
          humidity: cp?.humidity?.level || '',
          pet_friendly: !!cp?.toxicity?.pet_friendly,
          water_freq: cp?.water?.frequency_days || 7,
          light_req: cp?.light?.level || 'Medium',
          care_plan: cp
        }));
      } else {
        setAiError(data.message || 'Plant not clearly detected. Please adjust photo.');
      }
    } catch (err) {
      console.error(err);
      setAiError('Identification temporarily unavailable. Enter details manually.');
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleTrefleSearch = async (query: string) => {
    setTrefleQuery(query);
    if (!query || query.trim().length < 2) {
      setTrefleResults([]);
      return;
    }
    setIsSearchingTrefle(true);
    try {
      const res = await authFetch(`search_trefle.php?q=${encodeURIComponent(query.trim())}&limit=6`);
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.data)) {
        setTrefleResults(data.data);
      }
    } catch (e) {
      console.error('Botanical search error:', e);
    } finally {
      setIsSearchingTrefle(false);
    }
  };

  const handleSelectTrefleSpecies = (speciesItem: any) => {
    const common = speciesItem.common_name || speciesItem.scientific_name;
    const img = speciesItem.image_url || newPlant.image_url;
    setNewPlant((prev) => ({
      ...prev,
      name: common,
      species: speciesItem.scientific_name,
      image_url: img
    }));
    setTrefleResults([]);
    setTrefleQuery(common);
    identifyPlantFromImage(img || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', speciesItem.scientific_name);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setNewPlant((prev) => ({ ...prev, image_url: base64 }));
        identifyPlantFromImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const samplePlants = [
    { name: 'Peace Lily', species: 'Spathiphyllum', img: '/peace.png' },
    { name: 'Snake Plant', species: 'Sansevieria trifasciata', img: '/snake.png' },
    { name: 'Money Plant', species: 'Epipremnum aureum', img: 'https://images.unsplash.com/photo-1512428813834-c702c7702b78?w=500&q=80' },
    { name: 'Aloe Vera', species: 'Aloe barbadensis miller', img: 'https://images.unsplash.com/photo-1567689265664-1c48de61db0b?w=500&q=80' },
    { name: 'Tulsi', species: 'Ocimum tenuiflorum', img: '/tulsi.png' }
  ];

  // Dynamic Greeting
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const filteredPlants = useMemo(() => {
    if (!searchQuery.trim()) return plants;
    const q = searchQuery.toLowerCase();
    return plants.filter(
      (p) => p.name.toLowerCase().includes(q) || p.species.toLowerCase().includes(q)
    );
  }, [plants, searchQuery]);

  const healthyCount = Math.max(0, plants.length - thirstyPlants.length);
  const healthPercent = plants.length > 0 ? Math.round((healthyCount / plants.length) * 100) : 100;

  return (
    <div className={styles.dashboardWrapper}>
      {/* Top Header Bar */}
      <header className={styles.topBar}>
        <div className={styles.topBarMain}>
          <div className={styles.greetingBlock}>
            <h1>
              {plants.length === 0 ? 'Welcome to Pnapana' : greetingText}, {user?.name || 'Friend'} 👋
            </h1>
            <p className={styles.greetingSub}>
              {plants.length === 0
                ? "Let's add your first plant and begin your green journey! 🌱"
                : 'Your plants are happy, keep going!'}
            </p>
          </div>

          <div className={styles.topProfileActions}>
            <button
              className={styles.notifBtn}
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} />}
            </button>

            <button className={styles.notifBtn} title="Notifications">
              <Bell size={18} />
              <span className={styles.notifBadge} />
            </button>

            <Link href="/settings" className={styles.userPill}>
              <div className={styles.userAvatar}>
                {user?.name ? user.name.charAt(0).toUpperCase() : '🌿'}
              </div>
              <span className={styles.userName}>{user?.name || 'Profile'}</span>
              <ChevronDown size={14} color="#637c6d" />
            </Link>
          </div>
        </div>

        <div className={styles.topSearchWrapper}>
          <div className={styles.searchBar}>
            <Search size={17} color="#8da295" />
            <input
              type="text"
              placeholder="Search plants, features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className={styles.mainGrid}>
        {/* Left Column (Hero, Metrics, Plants Grid) */}
        <div className={styles.leftColumn}>
          {/* Daily Streak & Living Plant Companion ("Pana") */}
          <PlantCompanion
            mood={companionMood}
            streakDays={streakDays}
            initialMessage={companionMessage}
            initialMessageHi={companionMessageHi}
            thirstyCount={thirstyCount}
            mode="hero"
          />

          {/* Featured Vibrant Lime-Green Banner Card (Reference Mockup Style) */}
          <section className={styles.heroBanner}>
            <div className={styles.heroContent}>
              <h2>Manage Your Home Plants</h2>
              <p>
                Smart sensors report optimal 76% ambient daylight and 24°C microclimate. Keep your botanical sanctuary thriving.
              </p>
              <button
                className={styles.scanPlantBtn}
                onClick={() => setIsAddPlantModalOpen(true)}
              >
                <Camera size={16} />
                <span>Scan Your Plant</span>
              </button>
            </div>

            <div className={styles.heroVisual}>
              <img
                src="https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=350&q=80"
                alt="Succulent"
                className={styles.heroPlantImg}
              />
              <div className={styles.bannerPillsCol}>
                <div className={styles.bannerGlassBadge}>
                  <div className={styles.bannerGlassBadgeTitle}>Succulent</div>
                  <div className={styles.bannerGlassBadgeSub}>12 days ago planted</div>
                </div>

                <div className={styles.bannerMetricPill}>
                  <div className={styles.bannerMetricIcon} style={{ background: '#f4fbe4', color: '#4d7c0f' }}>
                    <Thermometer size={13} />
                  </div>
                  <div className={styles.bannerMetricText}>
                    <span>Room temp</span>
                    24°C
                  </div>
                </div>

                <div className={styles.bannerMetricPill}>
                  <div className={styles.bannerMetricIcon} style={{ background: '#eafaf0', color: '#15803d' }}>
                    <Lightbulb size={13} />
                  </div>
                  <div className={styles.bannerMetricText}>
                    <span>Room Light</span>
                    76%
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Segmented Tabs: New Plant • / Harvested */}
          <div className={styles.tabGroup}>
            <div
              className={dashboardTab === 'new' ? styles.tabItemActive : styles.tabItemInactive}
              onClick={() => setDashboardTab('new')}
            >
              New Plant {dashboardTab === 'new' && <span className={styles.tabGreenDot} />}
            </div>
            <div
              className={dashboardTab === 'harvested' ? styles.tabItemActive : styles.tabItemInactive}
              onClick={() => setDashboardTab('harvested')}
            >
              Harvested / Archived {dashboardTab === 'harvested' && <span className={styles.tabGreenDot} />}
            </div>
          </div>

          {/* My Plants Section - Direct underneath Tabs */}
          <section id="my-plants-section">
            <div className={styles.sectionHeader}>
              <h3>My Plants</h3>
              <div className={styles.sectionHeaderActions}>
                <button
                  className={styles.addPlantBtn}
                  onClick={() => setIsAddPlantModalOpen(true)}
                >
                  <Plus size={15} />
                  <span>Add Plant</span>
                </button>
                <Link href="#my-plants-section" className={styles.viewAllLink}>
                  <span>View All</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {plants.length === 0 ? (
              <div className={styles.emptyPlantsCard}>
                <div className={styles.emptyIconWrapper}>
                  <Sprout size={30} />
                </div>
                <h4>No plants yet</h4>
                <p>Start your green family by adding your first plant or scanning with AI.</p>
                <button
                  className={styles.scanPlantBtn}
                  onClick={() => setIsAddPlantModalOpen(true)}
                >
                  <Plus size={15} />
                  <span>Add First Plant</span>
                </button>
              </div>
            ) : filteredPlants.length === 0 ? (
              <div className={styles.emptyPlantsCard}>
                <p>No plants matching &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              <div className={styles.plantGrid}>
                {filteredPlants.map((plant) => {
                  const isThirsty = thirstyPlants.includes(plant.id);
                  const isFav = favorites.includes(plant.id);
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={plant.id}
                      className={styles.plantCard}
                    >
                      <div className={styles.plantImageWrapper}>
                        <Link href={`/plant?id=${plant.id}`}>
                          <img
                            src={getPlantImageUrl(plant.image_url, plant.name)}
                            alt={plant.name}
                            className={styles.plantImage}
                            onError={handlePlantImageError}
                            loading="lazy"
                          />
                        </Link>
                        <button
                          type="button"
                          className={`${styles.favoriteBtn} ${isFav ? styles.favoriteBtnActive : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(plant.id);
                          }}
                          title="Favorite"
                        >
                          <Heart size={14} fill={isFav ? '#ef4444' : 'none'} stroke={isFav ? '#ef4444' : '#526f5e'} />
                        </button>
                        {isThirsty && (
                          <div className={styles.thirstyOverlay}>
                            <Droplets size={11} />
                            <span>Needs Water</span>
                          </div>
                        )}
                      </div>

                      <div className={styles.plantInfo}>
                        <div className={styles.plantTitleRow}>
                          <Link href={`/plant?id=${plant.id}`}>
                            <span className={styles.plantName}>{plant.name}</span>
                          </Link>
                          <button
                            className={styles.plantDotsBtn}
                            onClick={() => removePlant(plant.id)}
                            title="Remove Plant"
                          >
                            <MoreVertical size={15} />
                          </button>
                        </div>

                        <span className={styles.plantSpecies}>{plant.species}</span>

                        <div className={styles.donutRingWrapper}>
                          <svg className={styles.donutSvg} viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#e8efe9"
                              strokeWidth="3.8"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke={isThirsty ? "#f59e0b" : "#22c55e"}
                              strokeWidth="3.8"
                              strokeDasharray={`${isThirsty ? 25 : 78}, 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span>{isThirsty ? 'Water overdue' : `${plant.watering_frequency_days || 7}d cycle`}</span>
                        </div>

                        <div className={styles.plantStatusRow}>
                          <span
                            className={`${styles.statusPill} ${
                              isThirsty ? styles.needsWater : styles.healthy
                            }`}
                          >
                            {isThirsty ? 'Needs Water' : 'Healthy'}
                          </span>

                          <button
                            className={styles.quickWaterBtn}
                            onClick={() => handleWaterPlant(plant.id)}
                            title="Water Plant Now"
                          >
                            <Droplets size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Quick Metrics (4 cards row - Secondary Vitality Bar) */}
          <section className={styles.metricsRow}>
            {/* 1. Total Plants */}
            <div className={styles.metricCard}>
              <div className={styles.metricIconCircle} style={{ background: '#eaf7ee', color: '#1fa652' }}>
                <Sprout size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>Total Plants</span>
                <span className={styles.metricValue}>{plants.length}</span>
                <span className={styles.metricSub}>{plants.length === 0 ? 'No plants yet' : `${plants.length} in collection`}</span>
              </div>
            </div>

            {/* 2. Healthy */}
            <div className={styles.metricCard}>
              <div className={styles.metricIconCircle} style={{ background: '#eaf7ee', color: '#1fa652' }}>
                <Heart size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>Healthy</span>
                <span className={styles.metricValue}>{healthyCount}</span>
                <span className={styles.metricSub}>{plants.length === 0 ? '100% optimal' : `${healthPercent}% of your plants`}</span>
              </div>
            </div>

            {/* 3. Needs Attention */}
            <div className={styles.metricCard}>
              <div className={styles.metricIconCircle} style={{ background: '#fef3e2', color: '#e67e22' }}>
                <AlertTriangle size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>Needs Attention</span>
                <span className={styles.metricValue}>{thirstyPlants.length}</span>
                <span className={styles.metricSub}>{thirstyPlants.length > 0 ? `${thirstyPlants.length} need water` : 'All plants hydrated'}</span>
              </div>
            </div>

            {/* 4. Current Streak */}
            <div className={styles.metricCard}>
              <div className={styles.metricIconCircle} style={{ background: '#fef9e7', color: '#f1c40f' }}>
                <Star size={20} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>Current Streak</span>
                <span className={styles.metricValue}>{streakDays} days</span>
                <span className={styles.metricSub}>Keep it up!</span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Sidebar Column */}
        <div className={styles.rightColumn}>
          {/* Weather & Environment Card */}
          <div className={styles.weatherCard}>
            <div className={styles.weatherHeader}>
              <div className={styles.weatherLocationRow}>
                <div>
                  <div className={styles.weatherCity}>{locationName}</div>
                  <div className={styles.weatherCondition}>Sunny</div>
                </div>
                <Sun size={26} color="#f59e0b" />
              </div>

              <div className={styles.weatherTempRow}>
                <span className={styles.weatherTemp}>{weather.temp}°C</span>
                <span className={styles.weatherHiLo}>H: {Number(weather.temp) + 2}° L: {Number(weather.temp) - 5}°</span>
              </div>
            </div>

            <div className={styles.weatherStatsGrid}>
              <div className={styles.weatherStatItem}>
                <span className={styles.weatherStatLabel}>
                  <Droplets size={13} color="#3b82f6" />
                  <span>Humidity</span>
                </span>
                <span className={styles.weatherStatVal}>{weather.humidity}%</span>
              </div>

              <div className={styles.weatherStatItem}>
                <span className={styles.weatherStatLabel}>
                  <Sun size={13} color="#f59e0b" />
                  <span>Light</span>
                </span>
                <span className={styles.weatherStatVal}>8.2 klx</span>
              </div>

              <div className={styles.weatherStatItem}>
                <span className={styles.weatherStatLabel}>
                  <Shield size={13} color="#10b981" />
                  <span>Air Quality</span>
                </span>
                <span className={styles.weatherStatVal}>{weatherAQI.status}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className={styles.activityCard}>
            <div className={styles.cardTopRow}>
              <h4>Recent Activity</h4>
              <Link href="/care" className={styles.viewAllLink}>
                <span>View All</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className={styles.activityList}>
              {plants.length === 0 ? (
                <>
                  <div className={styles.activityItem}>
                    <div className={styles.activityIcon} style={{ background: '#eaf7ee', color: '#16a34a' }}>
                      <Sprout size={16} />
                    </div>
                    <div className={styles.activityText}>
                      <span className={styles.activityTitle}>Account created</span>
                      <span className={styles.activitySub}>Welcome to Pnapana • Just now</span>
                    </div>
                  </div>
                  <div className={styles.activityItem}>
                    <div className={styles.activityIcon} style={{ background: '#fef3e2', color: '#d97706' }}>
                      <Camera size={16} />
                    </div>
                    <div className={styles.activityText}>
                      <span className={styles.activityTitle}>Ready for your first scan</span>
                      <span className={styles.activitySub}>Tap &lsquo;Scan Your Plant&rsquo; above</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.activityItem}>
                    <div className={styles.activityIcon}>
                      <Camera size={16} />
                    </div>
                    <div className={styles.activityText}>
                      <span className={styles.activityTitle}>Plant care monitored</span>
                      <span className={styles.activitySub}>{plants[0]?.name} • Active today</span>
                    </div>
                  </div>
                  <div className={styles.activityItem}>
                    <div className={styles.activityIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}>
                      <Droplets size={16} />
                    </div>
                    <div className={styles.activityText}>
                      <span className={styles.activityTitle}>Water rhythm configured</span>
                      <span className={styles.activitySub}>{plants[0]?.name} • {plants[0]?.watering_frequency_days || 7} day cycle</span>
                    </div>
                  </div>
                  {plants.length > 1 && (
                    <div className={styles.activityItem}>
                      <div className={styles.activityIcon} style={{ background: '#eaf7ee', color: '#16a34a' }}>
                        <Sprout size={16} />
                      </div>
                      <div className={styles.activityText}>
                        <span className={styles.activityTitle}>Collection growing</span>
                        <span className={styles.activitySub}>{plants[1]?.name} • Added</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Upcoming Reminders Card */}
          <div className={styles.remindersCard}>
            <div className={styles.cardTopRow}>
              <h4>Upcoming Reminders</h4>
              <Link href="/care" className={styles.viewAllLink}>
                <span>View All</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className={styles.remindersList}>
              {plants.length === 0 ? (
                <div className={styles.reminderItem}>
                  <div className={styles.reminderInfo}>
                    <span className={styles.uncheckCircle}>
                      <Sprout size={18} />
                    </span>
                    <div className={styles.reminderText}>
                      <span className={styles.reminderTitle}>Add your first plant</span>
                      <span className={styles.reminderTime}>To unlock smart watering reminders</span>
                    </div>
                  </div>
                </div>
              ) : thirstyPlants.length > 0 ? (
                thirstyPlants.slice(0, 3).map((plantId) => {
                  const p = plants.find((x) => x.id === plantId);
                  if (!p) return null;
                  return (
                    <div key={p.id} className={styles.reminderItem}>
                      <div className={styles.reminderInfo}>
                        <button
                          className={styles.checkCircleBtn}
                          onClick={() => handleWaterPlant(p.id)}
                          title="Water now"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <div className={styles.reminderText}>
                          <span className={styles.reminderTitle}>Water {p.name}</span>
                          <span className={styles.reminderTime}>Needs water • Today</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                plants.slice(0, 3).map((p, idx) => (
                  <div key={p.id} className={styles.reminderItem}>
                    <div className={styles.reminderInfo}>
                      <span className={styles.uncheckCircle}>
                        <Circle size={18} />
                      </span>
                      <div className={styles.reminderText}>
                        <span className={styles.reminderTitle}>
                          {idx === 0 ? `Check soil moisture - ${p.name}` : `Upcoming care for ${p.name}`}
                        </span>
                        <span className={styles.reminderTime}>
                          In {p.watering_frequency_days || 7} days • 09:00 AM
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Plant & AI Scan Modal */}
      {isAddPlantModalOpen && (
        <div className={styles.modalBackdrop} onClick={closeAddModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalCloseBtn}
              onClick={closeAddModal}
              aria-label="Close modal"
            >
              <X size={22} />
            </button>

            <div className={styles.modalHeader}>
              <h2>Add Plant to Collection</h2>
              <p>Choose an option below to add your plant to your personal garden.</p>
            </div>

            {/* Hidden Camera & File Inputs for Direct Device Capture */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Two-Option Switcher: Scan via AI vs Add Manually */}
            <div className={styles.modalModeToggle}>
              <button
                type="button"
                className={`${styles.modalModeBtn} ${addMode === 'ai' ? styles.modalModeBtnActive : ''}`}
                onClick={() => {
                  setAddMode('ai');
                  stopCamera();
                }}
              >
                <Sparkles size={16} />
                <span>Scan via AI</span>
              </button>
              <button
                type="button"
                className={`${styles.modalModeBtn} ${addMode === 'manual' ? styles.modalModeBtnActive : ''}`}
                onClick={() => {
                  setAddMode('manual');
                  stopCamera();
                }}
              >
                <Edit3 size={16} />
                <span>Add Manually</span>
              </button>
            </div>

            {/* ================= OPTION 1: SCAN VIA AI ================= */}
            {addMode === 'ai' && (
              <div>
                {/* Live Camera Viewfinder (when camera active) */}
                {isCameraActive ? (
                  <div className={styles.cameraViewfinder}>
                    <video ref={videoRef} className={styles.cameraVideo} autoPlay playsInline muted />
                    <div className={styles.cameraOverlayReticle}>
                      <span className={styles.cameraReticleText}>🌿 Align Plant in Frame</span>
                    </div>
                    <div className={styles.cameraActions}>
                      <button type="button" onClick={captureCameraSnapshot} className={styles.cameraCaptureBtn}>
                        <Camera size={18} />
                        <span>Capture Photo</span>
                      </button>
                      <button type="button" onClick={stopCamera} className={styles.cameraCloseBtn}>
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Camera & Gallery Action Buttons */
                  <div className={styles.cameraTriggerBar}>
                    <button type="button" onClick={startCamera} className={styles.cameraTriggerBtn}>
                      <Camera size={18} />
                      <span>Take Photo / Camera</span>
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className={styles.uploadFileBtn}>
                      <Upload size={18} />
                      <span>Upload from Gallery</span>
                    </button>
                  </div>
                )}

                {/* Scanning Laser Animation */}
                {isIdentifying && (
                  <div className={styles.scannerPreviewCard} style={{ marginBottom: '1.2rem' }}>
                    <img
                      src={getPlantImageUrl(newPlant.image_url, newPlant.name)}
                      alt="Scanning preview"
                      className={styles.scannerImg}
                      onError={handlePlantImageError}
                    />
                    <div className={styles.scanLine} />
                    <span className={styles.detectingBadge}>Scanning with Pnapana AI...</span>
                  </div>
                )}

                {/* AI Error Alert */}
                {aiError && (
                  <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.65rem 1rem', borderRadius: '12px', fontSize: '0.84rem', marginBottom: '1rem', border: '1px solid #fecaca' }}>
                    {aiError}
                  </div>
                )}

                {/* Botanical Registry Instant Search */}
                <div style={{ marginBottom: '1.2rem', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>🌿</span> Or Search 400,000+ Botanical Species:
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#637c6d' }}>Pnapana Registry</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Type species name e.g. Quercus, Monstera, Rose, Tulsi..."
                      value={trefleQuery}
                      onChange={(e) => handleTrefleSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        border: '1px solid #c8ded0',
                        background: '#ffffff',
                        fontSize: '0.9rem',
                        color: '#12281b',
                        outline: 'none',
                        boxShadow: '0 2px 8px rgba(18, 40, 27, 0.04)'
                      }}
                    />
                    {isSearchingTrefle && (
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.76rem', color: '#22c55e', fontWeight: 600 }}>
                        Searching...
                      </span>
                    )}
                  </div>

                  {trefleResults.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid #dce8e0',
                      boxShadow: '0 12px 35px rgba(18, 40, 27, 0.15)',
                      zIndex: 60,
                      marginTop: '4px',
                      overflow: 'hidden',
                      maxHeight: '260px',
                      overflowY: 'auto'
                    }}>
                      {trefleResults.map((item) => (
                        <div
                          key={item.id || item.slug}
                          onClick={() => handleSelectTrefleSpecies(item)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            padding: '0.65rem 1rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f5f2',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f8f5')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                        >
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.scientific_name}
                              style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#eaf7ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                              🌱
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#12281b' }}>
                              {item.common_name || item.scientific_name}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#557061', fontStyle: 'italic' }}>
                              {item.scientific_name} {item.family ? `• ${item.family}` : ''}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#22c55e', background: '#eaf7ee', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                            Select
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Sample Selector */}
                <div style={{ marginBottom: '1.2rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#637c6d', fontWeight: 600, display: 'block', marginBottom: '0.45rem' }}>
                    Or try with a sample plant:
                  </span>
                  <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '4px' }}>
                    {samplePlants.map((sample) => (
                      <button
                        key={sample.name}
                        type="button"
                        onClick={() => {
                          setNewPlant((prev: any) => ({
                            ...prev,
                            name: sample.name,
                            species: sample.species,
                            image_url: sample.img
                          }));
                          identifyPlantFromImage(sample.img, sample.species);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: newPlant.species === sample.species ? '#eaf7ee' : '#f7faf8',
                          border: newPlant.species === sample.species ? '1.5px solid #22c55e' : '1px solid #dce8e0',
                          borderRadius: '999px',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: '#12281b',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                      >
                        <img
                          src={sample.img}
                          alt={sample.name}
                          style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span>{sample.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* SHOW DATA ACCORDING TO THE API (When Identified) */}
                {identifiedData && (
                  <div className={styles.aiResultCard}>
                    <div className={styles.aiResultHeader}>
                      <img
                        src={getPlantImageUrl(identifiedData.identification?.image_url || newPlant.image_url, newPlant.name)}
                        alt={newPlant.name}
                        className={styles.aiResultImg}
                        onError={handlePlantImageError}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className={styles.aiResultTitle}>
                          {identifiedData.identification?.common_name || newPlant.name}
                        </div>
                        <div className={styles.aiResultSub}>
                          {identifiedData.identification?.scientific_name || newPlant.species}
                          {identifiedData.identification?.family ? ` • Family: ${identifiedData.identification?.family}` : ''}
                        </div>
                        <div className={styles.aiConfidenceBadge}>
                          <Sparkles size={13} />
                          <span>Pnapana AI Verified Specimen</span>
                        </div>
                      </div>
                    </div>

                    {identifiedData.identification?.description && (
                      <div className={styles.aiDescription}>
                        {identifiedData.identification.description}
                      </div>
                    )}

                    {/* Care Guidelines directly from API */}
                    {identifiedData.care_plan && (
                      <div className={styles.aiCareGrid}>
                        <div className={styles.aiCareItem}>
                          <div className={styles.aiCareItemTitle}>
                            <Droplets size={13} /> Watering Cycle
                          </div>
                          <div className={styles.aiCareItemVal}>
                            Every {identifiedData.care_plan.water?.frequency_days || newPlant.water_freq} Days
                          </div>
                          <div className={styles.aiCareItemDesc}>
                            {identifiedData.care_plan.water?.instructions || 'Water when topsoil feels dry.'}
                          </div>
                        </div>

                        <div className={styles.aiCareItem}>
                          <div className={styles.aiCareItemTitle}>
                            <Sun size={13} /> Sunlight Requirement
                          </div>
                          <div className={styles.aiCareItemVal}>
                            {identifiedData.care_plan.light?.level || newPlant.light_req}
                          </div>
                          <div className={styles.aiCareItemDesc}>
                            {identifiedData.care_plan.light?.detail || 'Thrives in bright filtered daylight.'}
                          </div>
                        </div>

                        <div className={styles.aiCareItem}>
                          <div className={styles.aiCareItemTitle}>
                            <Thermometer size={13} /> Humidity &amp; Climate
                          </div>
                          <div className={styles.aiCareItemVal}>
                            {identifiedData.care_plan.humidity?.level || 'Medium'}
                          </div>
                          <div className={styles.aiCareItemDesc}>
                            {identifiedData.care_plan.humidity?.detail || 'Comfortable room temperature 16-30°C.'}
                          </div>
                        </div>

                        <div className={styles.aiCareItem}>
                          <div className={styles.aiCareItemTitle}>
                            <Shield size={13} /> Pet Safety
                          </div>
                          <div className={styles.aiCareItemVal}>
                            {identifiedData.care_plan.toxicity?.pet_friendly ? '✓ Safe for Pets' : '⚠️ Toxic to Pets'}
                          </div>
                          <div className={styles.aiCareItemDesc}>
                            {identifiedData.care_plan.toxicity?.detail || 'Keep away from domestic pets if ingested.'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Alternatives pills if present */}
                    {identifiedData.alternatives && identifiedData.alternatives.length > 0 && (
                      <div style={{ marginTop: '0.9rem' }}>
                        <span style={{ fontSize: '0.74rem', color: '#637c6d', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                          Alternative Botanical Matches:
                        </span>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {identifiedData.alternatives.map((alt: any) => (
                            <button
                              key={alt.species}
                              type="button"
                              onClick={() => {
                                setNewPlant((p: any) => ({
                                  ...p,
                                  name: alt.common_name,
                                  species: alt.species,
                                  image_url: alt.image_url || p.image_url
                                }));
                                identifyPlantFromImage(alt.image_url || newPlant.image_url, alt.species);
                              }}
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '999px',
                                background: '#ffffff',
                                border: '1px solid #c9ebd4',
                                color: '#15803d',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              {alt.common_name} ({alt.species})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Confirm & Save to Garden Form */}
                <form onSubmit={handleAddPlant}>
                  <div className={styles.formRow}>
                    <label>Plant Name / Nickname</label>
                    <input
                      type="text"
                      placeholder="e.g. Living Room Monstera"
                      className={styles.formInput}
                      value={newPlant.name}
                      onChange={(e) => setNewPlant({ ...newPlant, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.formRow}>
                    <label>Botanical Species</label>
                    <input
                      type="text"
                      placeholder="e.g. Monstera deliciosa"
                      className={styles.formInput}
                      value={newPlant.species}
                      onChange={(e) => setNewPlant({ ...newPlant, species: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.formRow}>
                    <label>Water Frequency (days)</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      className={styles.formInput}
                      value={newPlant.water_freq}
                      onChange={(e) => setNewPlant({ ...newPlant, water_freq: parseInt(e.target.value) || 7 })}
                      required
                    />
                  </div>

                  <button type="submit" disabled={isAdding || isIdentifying} className={styles.submitBtn}>
                    {isAdding ? 'Adding Plant...' : '🌿 Add to My Garden'}
                  </button>
                </form>
              </div>
            )}

            {/* ================= OPTION 2: ADD MANUALLY ================= */}
            {addMode === 'manual' && (
              <form onSubmit={handleAddPlant}>
                <div className={styles.formRow}>
                  <label>Plant Nickname *</label>
                  <input
                    type="text"
                    placeholder="e.g. My Balcony Snake Plant"
                    className={styles.formInput}
                    value={newPlant.name}
                    onChange={(e) => setNewPlant({ ...newPlant, name: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formRow}>
                  <label>Botanical Species *</label>
                  <input
                    type="text"
                    placeholder="e.g. Dracaena trifasciata"
                    className={styles.formInput}
                    value={newPlant.species}
                    onChange={(e) => setNewPlant({ ...newPlant, species: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div className={styles.formRow}>
                    <label>Water Every (Days) *</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      className={styles.formInput}
                      value={newPlant.water_freq}
                      onChange={(e) => setNewPlant({ ...newPlant, water_freq: parseInt(e.target.value) || 7 })}
                      required
                    />
                  </div>

                  <div className={styles.formRow}>
                    <label>Sunlight Needs</label>
                    <select
                      className={styles.formInput}
                      value={newPlant.light_req}
                      onChange={(e) => setNewPlant({ ...newPlant, light_req: e.target.value, light_requirement: e.target.value })}
                    >
                      <option value="Low">Low Light / Shade</option>
                      <option value="Medium">Medium Indirect</option>
                      <option value="Bright Indirect">Bright Indirect</option>
                      <option value="Direct Sun">Direct Full Sun</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div className={styles.formRow}>
                    <label>Humidity Preference</label>
                    <select
                      className={styles.formInput}
                      value={newPlant.humidity || 'Medium'}
                      onChange={(e) => setNewPlant({ ...newPlant, humidity: e.target.value })}
                    >
                      <option value="Low">Low (30-40%)</option>
                      <option value="Medium">Medium (40-60%)</option>
                      <option value="High">High Tropical (60%+)</option>
                    </select>
                  </div>

                  <div className={styles.formRow}>
                    <label>Pet Safe?</label>
                    <select
                      className={styles.formInput}
                      value={newPlant.pet_friendly ? 'yes' : 'no'}
                      onChange={(e) => setNewPlant({ ...newPlant, pet_friendly: e.target.value === 'yes' })}
                    >
                      <option value="no">⚠️ Toxic to Pets</option>
                      <option value="yes">✓ Safe for Pets</option>
                    </select>
                  </div>
                </div>

                {/* Choose Icon / Photo Presets */}
                <div className={styles.formRow} style={{ marginTop: '0.3rem' }}>
                  <label>Plant Icon / Photo Preset</label>
                  <div className={styles.manualPresets}>
                    {[
                      { name: 'Monstera', img: '/monstera.png' },
                      { name: 'Snake Plant', img: '/snake.png' },
                      { name: 'Tulsi', img: '/tulsi.png' },
                      { name: 'Peace Lily', img: '/peace.png' },
                      { name: 'Areca Palm', img: '/areca.png' },
                      { name: 'Fiddle Leaf', img: '/fiddle.png' }
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        className={`${styles.manualPresetBtn} ${newPlant.image_url === preset.img ? styles.manualPresetBtnActive : ''}`}
                        onClick={() => setNewPlant({ ...newPlant, image_url: preset.img })}
                      >
                        <img src={preset.img} alt={preset.name} className={styles.manualPresetImg} />
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Photo Upload for Manual Mode */}
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem', marginBottom: '0.8rem' }}>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      background: '#f7faf8',
                      border: '1px solid #dce8e0',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#15803d',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Camera size={15} />
                    <span>Take Custom Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      background: '#f7faf8',
                      border: '1px solid #dce8e0',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#385744',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Upload size={15} />
                    <span>Upload File</span>
                  </button>
                </div>

                {newPlant.image_url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem', background: '#eaf7ee', padding: '0.4rem 0.8rem', borderRadius: '10px' }}>
                    <img src={getPlantImageUrl(newPlant.image_url, newPlant.name)} alt="" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
                    <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>Custom Photo Attached</span>
                  </div>
                )}

                <div className={styles.formRow}>
                  <label>Room / Care Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Near balcony window, likes morning light"
                    className={styles.formInput}
                    value={newPlant.location_notes || ''}
                    onChange={(e) => setNewPlant({ ...newPlant, location_notes: e.target.value })}
                  />
                </div>

                <button type="submit" disabled={isAdding} className={styles.submitBtn}>
                  {isAdding ? 'Adding Plant...' : '🌿 Add Plant to My Garden'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Floating Interactive Plant Companion Buddy */}
      <PlantCompanion
        mood={companionMood}
        streakDays={streakDays}
        initialMessage={companionMessage}
        initialMessageHi={companionMessageHi}
        thirstyCount={thirstyCount}
        mode="floating"
      />
    </div>
  );
}
