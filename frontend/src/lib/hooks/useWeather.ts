'use client';
import { useCallback, useEffect, useState } from 'react';

export type Weather = {
  temp: number;
  feelsLike: number | null;
  humidity: number;
  condition: string;
  icon: string;
  cloud: number;
  isDay: boolean;
  solarPeak: number | null;
  location: string;
};

type Coordinates = { lat: number; lon: number; location: string };
type VisualCrossingResponse = {
  resolvedAddress?: string;
  currentConditions?: {
    temp?: number;
    feelslike?: number;
    humidity?: number;
    conditions?: string;
    icon?: string;
    cloudcover?: number;
    solarradiation?: number;
  };
  days?: Array<{
    hours?: Array<{ solarradiation?: number }>;
  }>;
};

let cachedWeather: { key: string; value: Weather; expiresAt: number } | null = null;
let pendingWeather: { key: string; promise: Promise<Weather> } | null = null;

function locationKey({ lat, lon }: Coordinates) {
  // Geolocation can shift by a few metres between cards; this keeps requests shared.
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

async function fetchWeather(position: Coordinates, force = false): Promise<Weather> {
  const key = locationKey(position);
  if (pendingWeather?.key === key) return pendingWeather.promise;
  if (!force && cachedWeather?.key === key && cachedWeather.expiresAt > Date.now()) return cachedWeather.value;

  const params = new URLSearchParams({
    unitGroup: 'metric',
    include: 'current,hours',
    elements: 'datetime,temp,feelslike,humidity,conditions,icon,cloudcover,solarradiation',
    contentType: 'json',
  });
  const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${position.lat},${position.lon}/today?${params}`;
  const promise = (async () => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Weather unavailable');
    const data: VisualCrossingResponse = await response.json();
    const current = data.currentConditions;
    if (typeof current?.temp !== 'number' || typeof current.humidity !== 'number') throw new Error('Weather unavailable');

    const hourlySolar = data.days?.flatMap(day => day.hours || [])
      .map(hour => hour.solarradiation)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value)) || [];
    const currentSolar = current.solarradiation;
    const solarPeak = hourlySolar.length
      ? Math.max(...hourlySolar)
      : typeof currentSolar === 'number' && Number.isFinite(currentSolar) ? currentSolar : null;
    const icon = current.icon || 'cloudy';

    return {
      temp: Math.round(current.temp),
      feelsLike: typeof current.feelslike === 'number' ? Math.round(current.feelslike) : null,
      humidity: current.humidity,
      condition: current.conditions || 'Conditions unavailable',
      icon,
      cloud: typeof current.cloudcover === 'number' ? current.cloudcover : 0,
      isDay: !icon.includes('night'),
      solarPeak,
      location: position.location,
    };
  })();

  pendingWeather = { key, promise };
  try {
    const value = await promise;
    cachedWeather = { key, value, expiresAt: Date.now() + 15 * 60 * 1000 };
    return value;
  } finally {
    if (pendingWeather?.promise === promise) pendingWeather = null;
  }
}

export function describeWeather(condition: string) {
  return condition || 'Conditions unavailable';
}

export function useWeather() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError(false);
    try {
      const position = await new Promise<Coordinates>(resolve => {
        const fallback = () => resolve({ lat: 12.9716, lon: 77.5946, location: 'Bengaluru · default location' });
        if (!navigator.geolocation) return fallback();
        navigator.geolocation.getCurrentPosition(p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, location: 'Your local weather' }), fallback, { timeout: 8000, maximumAge: 600000 });
      });
      setWeather(await fetchWeather(position, force));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { weather, loading, error, refresh: () => refresh(true) };
}
