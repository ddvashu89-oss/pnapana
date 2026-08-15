'use client';
import { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import styles from './Plant.module.css';

function getToken(): string | undefined {
  const stored = localStorage.getItem('user');
  return stored ? JSON.parse(stored).token : undefined;
}

export default function PlantDetails({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
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

    fetch(`http://127.0.0.1/pnapana/backend/api/get_plant_details.php?id=${unwrappedParams.id}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(res => res.json())
      .then(data => { if(data.status === "success") setPlant(data.plant); })
      .finally(() => setIsLoading(false));

    fetchScans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unwrappedParams.id]);

  function fetchScans() {
    fetch(`http://127.0.0.1/pnapana/backend/api/get_plant_scans.php?plant_id=${unwrappedParams.id}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(res => res.json())
      .then(data => { if(data.status === "success") setScans(data.scans); });
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
      const res = await fetch('http://127.0.0.1/pnapana/backend/api/analyze_plant.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ plant_id: unwrappedParams.id, image_url: capturedImage })
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchScans();
        setCapturedImage(null);
        // refresh plant data to update status color
        fetch(`http://127.0.0.1/pnapana/backend/api/get_plant_details.php?id=${unwrappedParams.id}`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        })
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

  if (!hasUser || isLoading) return <Loader fullScreen label={t('common.loading')} />;

  return (
    <div className={styles.container}>
      <nav className={styles.topNav}>
        <Link href="/dashboard" className={styles.iconBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div style={{display: 'flex', gap: '1rem'}}>
          <button className={styles.iconBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </button>
        </div>
      </nav>

      <section className={styles.imageSection}>
        <div className={styles.circleBg}></div>
        {plant.image_url && <img src={plant.image_url} alt={plant.name} className={styles.plantImage} />}
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

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab === 'Passport' ? styles.active : ''}`} onClick={() => setActiveTab('Passport')}>{t('plant.tabPassport')}</button>
          <button className={`${styles.tab} ${activeTab === 'AI Scan' ? styles.active : ''}`} onClick={() => setActiveTab('AI Scan')}>{t('plant.tabAiScan')}</button>
          <button className={`${styles.tab} ${activeTab === 'Care' ? styles.active : ''}`} onClick={() => setActiveTab('Care')}>{t('plant.tabCare')}</button>
        </div>

        <div className={styles.tabContent}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {activeTab === 'Passport' && (
            <>
              <p>{t('plant.passportSubtitle')}</p>
              <div className={styles.attributeList}>
                <div className={styles.attributeItem}>
                  <span className={styles.attrLabel}>{t('plant.native')}</span>
                  <span className={styles.attrValue}>{plant.native_region}</span>
                </div>
                <div className={styles.attributeItem}>
                  <span className={styles.attrLabel}>{t('plant.light')}</span>
                  <span className={styles.attrValue}>{plant.light_requirement}</span>
                </div>
                <div className={styles.attributeItem}>
                  <span className={styles.attrLabel}>{t('plant.water')}</span>
                  <span className={styles.attrValue}>{plant.water_requirement}</span>
                </div>
              </div>
            </>
          )}

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
            if (!cp) {
              return <p>{t('plant.noCarePlan')}</p>;
            }
            return (
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
            );
          })()}

        </motion.div>
        </div>
      </main>
    </div>
  );
}
