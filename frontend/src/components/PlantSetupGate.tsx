'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { authFetch } from '@/lib/api';
import { isAppShellRoute } from '@/lib/routePolicy';
import { automaticPlantSetup } from '@/lib/automaticPlantSetup';
import type { SetupPlant } from '@/components/PlantSetupWizard';

// Older plants may still be waiting for the former mandatory setup form.
export default function PlantSetupGate() {
  const pathname = usePathname();
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!isAppShellRoute(pathname) || !localStorage.getItem('user')) return;
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (Number(user.is_admin) === 1 || user.role === 'admin') return;
      const response = await authFetch('get_incomplete_plant_setups.php');
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || 'Could not load plant setup.');
      for (const plant of (data.plants || []) as SetupPlant[]) {
        const result = await authFetch('complete_plant_setup.php', {
          method: 'POST',
          body: JSON.stringify({ plant_id: plant.id, name: plant.name || plant.species, setup: { ...automaticPlantSetup(plant.water_freq), ...(plant.setup_data || {}) } }),
        });
        const completed = await result.json();
        if (!result.ok || completed.status !== 'success') throw new Error(completed.message || 'Could not finish plant setup.');
      }
      if (data.plants?.length) window.dispatchEvent(new Event('pnapana:plants-changed'));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not prepare your plants.');
    }
  }, [pathname]);

  useEffect(() => {
    void refresh();
    window.addEventListener('pnapana:plant-setup-refresh', refresh);
    return () => window.removeEventListener('pnapana:plant-setup-refresh', refresh);
  }, [refresh]);

  if (!error || !isAppShellRoute(pathname)) return null;
  return <div role="alert" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 10000, maxWidth: 360, padding: 16, borderRadius: 14, background: '#fff8ee', color: '#513b22', boxShadow: '0 8px 24px #0002' }}>
    {error} <button type="button" onClick={() => void refresh()} style={{ marginLeft: 8, color: '#075c36', fontWeight: 700 }}>Try again</button>
  </div>;
}
