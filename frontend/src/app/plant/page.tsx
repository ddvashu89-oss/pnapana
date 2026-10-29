'use client';
import { Suspense, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Sun,
  Droplets,
  Thermometer,
  Lightbulb,
  Camera,
  Check,
  RefreshCw,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import { authFetch } from '@/lib/api';
import { getPlantImageUrl, handlePlantImageError } from '@/lib/plantImages';
import styles from './Plant.module.css';

function PlantDetailsInner() {
  const searchParams = useSearchParams();
  const plantId = searchParams.get('id') ?? '';
  const router = useRouter();
  const { t } = useLanguage();
  const [hasUser, setHasUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [plant, setPlant] = useState<any>({
    name: 'Artificial Jade',
    species: 'Crassula ovata',
    status: 'Healthy',
    status_color: 'green',
    image_url: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=800&q=80',
    native_region: 'South Africa',
    light_requirement: 'Bright indirect to direct sunlight',
    water_requirement: 'Allow soil to dry between waterings',
    humidity: 'Low to moderate (35-45%)',
    pet_friendly: false
  });

  const [activeTab, setActiveTab] = useState<'Overview' | 'Care Tips' | 'History'>('Overview');

  // Scanner States
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

    if (plantId) {
      authFetch(`get_plant_details.php?id=${plantId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'success' && data.plant) {
            setPlant(data.plant);
          }
        })
        .finally(() => setIsLoading(false));

      fetchScans();
    } else {
      setIsLoading(false);
    }
  }, [plantId, router]);

  function fetchScans() {
    if (!plantId) return;
    authFetch(`get_plant_scans.php?plant_id=${plantId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success' && Array.isArray(data.scans)) {
          setScans(data.scans);
        }
      })
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
    } catch {
      alert('Could not access camera. Please check permissions.');
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const submitScan = async () => {
    if (!capturedImage || !plantId) return;
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
      }
    } catch (e) {
      console.error(e);
      alert('Scan failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  if (!hasUser || isLoading) return <Loader fullScreen label={t('common.loading')} />;

  let carePlan: any = null;
  try {
    carePlan = plant.care_plan ? (typeof plant.care_plan === 'string' ? JSON.parse(plant.care_plan) : plant.care_plan) : null;
  } catch {
    carePlan = null;
  }

  return (
    <div className={styles.container}>
      {/* Top Nav (Mockup Style) */}
      <nav className={styles.topNav}>
        <Link href="/dashboard" className={styles.goBackBtn}>
          <ArrowLeft size={16} />
          <span>Go Back</span>
        </Link>
        <div className={styles.navActions}>
          <button className={styles.circleActionBtn} onClick={() => window.location.reload()} title="Refresh">
            <RefreshCw size={17} />
          </button>
          <button className={styles.circleSuccessBtn} title="Mark Healthy">
            <Check size={18} />
          </button>
        </div>
      </nav>

      {/* Main Plant Centerpiece Card */}
      <div className={styles.plantHeroCard}>
        <div className={styles.imageContainer}>
          <img
            src={getPlantImageUrl(plant.image_url, plant.name)}
            alt={plant.name}
            className={styles.plantCutoutImg}
            onError={handlePlantImageError}
          />
          <div className={styles.interactivePinBadge}>
            <span className={styles.pinDot} />
            <span>{plant.name}</span>
          </div>
        </div>

        <h1 style={{ fontSize: '1.95rem', fontWeight: 800, color: '#12281b', marginBottom: '0.2rem' }}>
          {plant.name}
        </h1>
        <p style={{ color: '#637c6d', fontSize: '0.94rem', fontStyle: 'italic', marginBottom: '1.2rem' }}>
          {plant.species} {plant.family ? `• Family: ${plant.family}` : ''}
        </p>

        <button
          className={styles.scanYourPlantPillBtn}
          onClick={() => (isCapturing ? stopCamera() : startCamera())}
        >
          <Camera size={19} />
          <span>Scan your plant</span>
        </button>

        {/* Live Camera Viewfinder Modal */}
        {isCapturing && (
          <div style={{ marginTop: '1.5rem', background: '#0b291a', padding: '1rem', borderRadius: '24px' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '16px' }} />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
              <button
                onClick={capturePhoto}
                style={{ background: '#22c55e', color: '#fff', padding: '0.7rem 1.8rem', borderRadius: '999px', fontWeight: 700 }}
              >
                Capture Photo
              </button>
              <button
                onClick={stopCamera}
                style={{ background: '#ef4444', color: '#fff', padding: '0.7rem 1.4rem', borderRadius: '999px', fontWeight: 700 }}
              >
                Cancel
              </button>
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {/* Captured Preview */}
        {capturedImage && (
          <div style={{ marginTop: '1.5rem', background: '#f4f8f5', padding: '1rem', borderRadius: '24px', border: '1px solid #dce8e0' }}>
            <img src={capturedImage} alt="Captured" style={{ width: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: '14px' }} />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
              <button
                onClick={submitScan}
                disabled={isScanning}
                style={{ background: '#22c55e', color: '#fff', padding: '0.7rem 2rem', borderRadius: '999px', fontWeight: 700 }}
              >
                {isScanning ? 'Diagnosing...' : 'Analyze Photo'}
              </button>
              <button
                onClick={() => setCapturedImage(null)}
                style={{ background: '#dce8e0', color: '#12281b', padding: '0.7rem 1.4rem', borderRadius: '999px', fontWeight: 700 }}
              >
                Retake
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4 Bento Care Metrics (Matching Mockup) */}
      <div className={styles.bentoRow}>
        <div className={styles.bentoItem}>
          <div className={styles.bentoIconSquircle} style={{ background: '#eafaf0', color: '#15803d' }}>
            <Lightbulb size={20} />
          </div>
          <div className={styles.bentoMeta}>
            <span className={styles.bentoLabel}>Room Light</span>
            <span className={styles.bentoValue}>{plant.light_req || '76% (Optimal)'}</span>
          </div>
        </div>

        <div className={styles.bentoItem}>
          <div className={styles.bentoIconSquircle} style={{ background: '#f4fbe4', color: '#4d7c0f' }}>
            <Thermometer size={20} />
          </div>
          <div className={styles.bentoMeta}>
            <span className={styles.bentoLabel}>Room Temp</span>
            <span className={styles.bentoValue}>24°C</span>
          </div>
        </div>

        <div className={styles.bentoItem}>
          <div className={styles.bentoIconSquircle} style={{ background: '#fef8e7', color: '#b45309' }}>
            <Droplets size={20} />
          </div>
          <div className={styles.bentoMeta}>
            <span className={styles.bentoLabel}>Room Humidity</span>
            <span className={styles.bentoValue}>{plant.humidity || '20% (Dry)'}</span>
          </div>
        </div>

        <div className={styles.bentoItem}>
          <div className={styles.bentoIconSquircle} style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Calendar size={20} />
          </div>
          <div className={styles.bentoMeta}>
            <span className={styles.bentoLabel}>Water Cycle</span>
            <span className={styles.bentoValue}>{plant.watering_frequency_days || 7} Days</span>
          </div>
        </div>
      </div>

      {/* Detail Tabs */}
      <div className={styles.tabsContainer}>
        {(['Overview', 'Care Tips', 'History'] as const).map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? styles.tabBtnActive : styles.tabBtn}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'Overview' && (
        <div className={styles.tabCard}>
          <h3>Botanical Overview</h3>
          <p>
            {plant.description ||
              `${plant.name} is a resilient botanical specimen documented in the Pnapana Global Plant Registry. It thrives in well-ventilated rooms with bright filtered sunlight.`}
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.86rem' }}>
            <div>
              <strong>Native Origin:</strong> {plant.native_region || 'Tropical & Subtropical'}
            </div>
            <div>
              <strong>Pet Friendly:</strong> {plant.pet_friendly ? '✓ Yes (Non-toxic)' : '⚠ Toxic to pets'}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Care Tips' && (
        <div className={styles.tabCard}>
          <h3>Care Instructions (Botanical Intelligence Verified)</h3>
          <ul style={{ paddingLeft: '1.2rem', color: '#557061', lineHeight: '1.8', fontSize: '0.94rem' }}>
            <li><strong>Light:</strong> {carePlan?.light?.detail || plant.light_requirement || 'Bright indirect daylight.'}</li>
            <li><strong>Water:</strong> {carePlan?.water?.instructions || plant.water_requirement || 'Water when topsoil feels dry.'}</li>
            <li><strong>Humidity:</strong> {carePlan?.humidity?.detail || plant.humidity || 'Average to high room humidity.'}</li>
            <li><strong>Soil:</strong> {carePlan?.soil || 'Well-draining aerated potting mix.'}</li>
          </ul>
        </div>
      )}

      {activeTab === 'History' && (
        <div className={styles.tabCard}>
          <h3>Diagnostic Scans &amp; Activity Log</h3>
          {scans.length === 0 ? (
            <p style={{ color: '#8da295' }}>No scans recorded yet. Use &quot;Scan your plant&quot; above to log your first diagnostic check.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.8rem' }}>
              {scans.map((s, idx) => (
                <div key={idx} style={{ padding: '0.8rem', background: '#f9fbf9', borderRadius: '14px', border: '1px solid #e1ece5' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#12281b' }}>
                    Status: {s.status === 'healthy' ? '✓ Healthy' : '⚠ Issue Detected'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#557061', marginTop: '2px' }}>
                    {s.ai_analysis}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlantPage() {
  return (
    <Suspense fallback={<Loader fullScreen label="Loading plant..." />}>
      <PlantDetailsInner />
    </Suspense>
  );
}
