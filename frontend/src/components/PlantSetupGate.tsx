'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { authFetch } from '@/lib/api';
import { isAppShellRoute } from '@/lib/routePolicy';
import Loader from '@/components/Loader';
import PlantSetupWizard, { PlantSetupValues, SetupPlant } from '@/components/PlantSetupWizard';

export default function PlantSetupGate() {
  const pathname = usePathname();
  const [checking, setChecking] = useState(false);
  const [plants, setPlants] = useState<SetupPlant[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [gateError, setGateError] = useState('');

  const refresh = useCallback(async () => {
    if (!isAppShellRoute(pathname)) {
      setPlants([]);
      setChecking(false);
      return;
    }
    const stored = localStorage.getItem('user');
    if (!stored) return;
    try {
      const user = JSON.parse(stored);
      if (Number(user.is_admin) === 1 || user.role === 'admin') return;
      setChecking(true);
      setGateError('');
      const response = await authFetch('get_incomplete_plant_setups.php');
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || 'Setup check failed.');
      setPlants(data.plants);
    } catch {
      setGateError('We could not verify your plant setup. Check your connection and try again.');
    } finally {
      setChecking(false);
    }
  }, [pathname]);

  useEffect(() => {
    refresh();
    window.addEventListener('pnapana:plant-setup-refresh', refresh);
    return () => window.removeEventListener('pnapana:plant-setup-refresh', refresh);
  }, [refresh]);

  if (!isAppShellRoute(pathname)) return null;
  if (checking) return <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#fbfaf2' }}><Loader fullScreen label="Checking plant setup…" /></div>;
  if (gateError) return <div role="alert" style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center', padding: 24, background: '#fbfaf2', color: '#173d2a', textAlign: 'center' }}><div><h1 style={{ fontFamily: 'Georgia, serif', fontSize: 32, marginBottom: 12 }}>Plant setup check unavailable</h1><p style={{ color: '#65766d', marginBottom: 20 }}>{gateError}</p><button onClick={refresh} style={{ border: 0, borderRadius: 14, padding: '14px 24px', background: '#075c36', color: 'white', fontWeight: 700 }}>Try again</button></div></div>;
  const plant = plants[0];
  if (!plant) return null;

  const complete = async ({ name, setup }: { name: string; setup: PlantSetupValues }) => {
    setBusy(true);
    setError('');
    try {
      const response = await authFetch('complete_plant_setup.php', {
        method: 'POST',
        body: JSON.stringify({ plant_id: plant.id, name, setup }),
      });
      const data = await response.json();
      if (data.status !== 'success') throw new Error(data.message || 'Could not save this setup.');
      setPlants(current => current.slice(1));
      window.dispatchEvent(new Event('pnapana:plants-changed'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this setup. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return <PlantSetupWizard key={String(plant.id)} plant={plant} existing remaining={plants.length} busy={busy} serverError={error} onComplete={complete} />;
}
