'use client';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { authFetch } from '@/lib/api';
import { isAppShellRoute } from '@/lib/routePolicy';
import PlantSetupWizard, { type SetupPlant, type PlantSetupValues } from './PlantSetupWizard';
export default function PlantSetupGate() {
  const pathname = usePathname();
  const [plants, setPlants] = useState<SetupPlant[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!isAppShellRoute(pathname) || !localStorage.getItem('user')) return;
    try {
      const response = await authFetch('get_incomplete_plant_setups.php');
      const data = await response.json();
      if (response.ok && data.status === 'success') setPlants(data.plants || []);
    } catch { /* The garden remains available; verification can be opened from each plant. */ }
  }, [pathname]);
  useEffect(() => { void refresh(); window.addEventListener('pnapana:plant-setup-refresh', refresh); return () => window.removeEventListener('pnapana:plant-setup-refresh', refresh); }, [refresh]);
  async function save({ name, setup }: {name: string; setup: PlantSetupValues}) {
    setBusy(true); setError('');
    try {
      const response = await authFetch('complete_plant_setup.php', {method:'POST',body:JSON.stringify({plant_id:plants[0].id,name,setup})});
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || 'Could not save growing spot.');
      setOpen(false); await refresh(); window.dispatchEvent(new Event('pnapana:plants-changed'));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save.'); }
    finally { setBusy(false); }
  }
  if (!plants.length || !isAppShellRoute(pathname)) return null;
  if (open) return <PlantSetupWizard key={plants[0].id} plant={plants[0]} editing busy={busy} serverError={error} onBack={() => setOpen(false)} onComplete={save} />;
  return <aside style={{padding:12,background:'#eef7ef',color:'#244d32'}}><button type="button" onClick={() => setOpen(true)}>Verify growing spot for {plants[0].name}</button> · {plants.length} plant(s) need a spot review.</aside>;
}
