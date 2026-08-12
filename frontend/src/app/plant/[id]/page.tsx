'use client';
import { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import styles from './Plant.module.css';

export default function PlantDetails({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const [plant, setPlant] = useState<any>({
    name: 'Loading...',
    species: '',
    status: 'Loading',
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

  // Fetch real data when backend is ready
  useEffect(() => {
    fetch(`http://localhost/pnapana/backend/api/get_plant_details.php?id=${unwrappedParams.id}`)
      .then(res => res.json())
      .then(data => { if(data.status === "success") setPlant(data.plant); });
      
    fetchScans();
  }, [unwrappedParams.id]);

  function fetchScans() {
    fetch(`http://localhost/pnapana/backend/api/get_plant_scans.php?plant_id=${unwrappedParams.id}`)
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
      alert("Could not access camera. Please allow permissions.");
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
      const res = await fetch('http://localhost/pnapana/backend/api/analyze_plant.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plant_id: unwrappedParams.id, image_url: capturedImage })
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchScans();
        setCapturedImage(null);
        // refresh plant data to update status color
        fetch(`http://localhost/pnapana/backend/api/get_plant_details.php?id=${unwrappedParams.id}`)
          .then(r => r.json())
          .then(d => { if(d.status === "success") setPlant(d.plant); });
      }
    } catch (e) {
      console.error(e);
      alert("Failed to run AI scan.");
    } finally {
      setIsScanning(false);
    }
  }

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
          <button className={`${styles.tab} ${activeTab === 'Passport' ? styles.active : ''}`} onClick={() => setActiveTab('Passport')}>Passport</button>
          <button className={`${styles.tab} ${activeTab === 'AI Scan' ? styles.active : ''}`} onClick={() => setActiveTab('AI Scan')}>AI Scan</button>
          <button className={`${styles.tab} ${activeTab === 'Care' ? styles.active : ''}`} onClick={() => setActiveTab('Care')}>Care</button>
        </div>

        <div className={styles.tabContent}>
          
          {activeTab === 'Passport' && (
            <>
              <p>Your plant&apos;s identity & preferences.</p>
              <div className={styles.attributeList}>
                <div className={styles.attributeItem}>
                  <span className={styles.attrLabel}>Native</span>
                  <span className={styles.attrValue}>{plant.native_region}</span>
                </div>
                <div className={styles.attributeItem}>
                  <span className={styles.attrLabel}>Light</span>
                  <span className={styles.attrValue}>{plant.light_requirement}</span>
                </div>
                <div className={styles.attributeItem}>
                  <span className={styles.attrLabel}>Water</span>
                  <span className={styles.attrValue}>{plant.water_requirement}</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'AI Scan' && (
            <div className={styles.aiScannerArea}>
              <h3 style={{marginBottom: '1rem'}}>Daily Health Check 🤖🌿</h3>
              <p style={{marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem'}}>
                Snap a daily picture and let PNA AI analyze your plant&apos;s health.
              </p>
              
              {!isCapturing && !capturedImage && (
                <button className={styles.aiScanBtn} onClick={startCamera}>
                  📸 Open Camera
                </button>
              )}

              {isCapturing && (
                <div className={styles.cameraBox}>
                  <video ref={videoRef} autoPlay playsInline className={styles.cameraView} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <div className={styles.cameraActions}>
                    <button type="button" onClick={captureImage} className={styles.snapBtn}>Snap Photo</button>
                    <button type="button" onClick={stopCamera} className={styles.cancelCamBtn}>Cancel</button>
                  </div>
                </div>
              )}

              {capturedImage && (
                <div className={styles.previewBox}>
                  <img src={capturedImage} alt="Preview" className={styles.imagePreview} />
                  {isScanning ? (
                    <div className={styles.scanningAnim}>
                      <div className={styles.scanLine}></div>
                      <p>PNA AI is analyzing...</p>
                    </div>
                  ) : (
                    <div className={styles.cameraActions}>
                      <button type="button" onClick={submitScan} className={styles.submitScanBtn}>🔍 Run AI Scan</button>
                      <button type="button" onClick={() => setCapturedImage(null)} className={styles.cancelCamBtn}>Retake</button>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.scanHistory}>
                <h4>Scan History</h4>
                {scans.length === 0 ? (
                  <p className={styles.noScans}>No scans yet.</p>
                ) : (
                  scans.map(scan => (
                    <div key={scan.id} className={`${styles.scanCard} ${styles[scan.status]}`}>
                      <div className={styles.scanCardTop}>
                        <strong>{new Date(scan.created_at).toLocaleDateString()}</strong>
                        <span className={styles.scanBadge}>{scan.status === 'healthy' ? '✅ All Good' : '⚠️ Issue Detected'}</span>
                      </div>
                      <p>{scan.ai_analysis}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'Care' && (
             <p>Care instructions will appear here.</p>
          )}

        </div>
      </main>
    </div>
  );
}
