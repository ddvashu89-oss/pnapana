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
  sunrise: string | null;
  sunset: string | null;
  timezone: string | null;
  solarPeak: number | null;
  location: string;
};

type Coordinates = { lat: number; lon: number; location: string };
type VisualCrossingResponse = {
  resolvedAddress?: string;
  currentConditions?: {
    datetime?: string;
    temp?: number;
    feelslike?: number;
    humidity?: number;
    conditions?: string;
    icon?: string;
    cloudcover?: number;
    solarradiation?: number;
  };
  days?: Array<{
    sunrise?: string;
    sunset?: string;
    hours?: Array<{ solarradiation?: number }>;
  }>;
  timezone?: string;
};

let cachedWeather: { key: string; value: Weather; expiresAt: number } | null = null;
let pendingWeather: { key: string; promise: Promise<Weather> } | null = null;

function locationKey({ lat, lon }: Coordinates) {
  // Geolocation can shift by a few metres between cards; this keeps requests shared.
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function clockMinutes(value?: string | null) {
  if (!value) return null;
  const match = value.match(/(?:T)?(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function isDayAtLocation(timezone?: string | null, sunrise?: string | null, sunset?: string | null, fallback = true) {
  const rise = clockMinutes(sunrise);
  const set = clockMinutes(sunset);
  let localMinutes: number | null = null;
  try {
    const localTime = timezone
      ? new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date())
      : null;
    localMinutes = clockMinutes(localTime);
  } catch { /* Use the weather observation's day/night flag if the zone is invalid. */ }
  return localMinutes !== null && rise !== null && set !== null
    ? localMinutes >= rise && localMinutes < set
    : fallback;
}

async function fetchWeather(position: Coordinates, force = false): Promise<Weather> {
  const key = locationKey(position);
  if (pendingWeather?.key === key) return pendingWeather.promise;
  if (!force && cachedWeather?.key === key && cachedWeather.expiresAt > Date.now()) return cachedWeather.value;

  const params = new URLSearchParams({
    unitGroup: 'metric',
    include: 'current,days,hours',
    elements: 'datetime,temp,feelslike,humidity,conditions,icon,cloudcover,solarradiation,sunrise,sunset',
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
    const sunrise = data.days?.[0]?.sunrise || null;
    const sunset = data.days?.[0]?.sunset || null;
    const isDay = isDayAtLocation(data.timezone, sunrise, sunset,
      typeof current.solarradiation === 'number' ? current.solarradiation > 0 : !icon.includes('night'));

    return {
      temp: Math.round(current.temp),
      feelsLike: typeof current.feelslike === 'number' ? Math.round(current.feelslike) : null,
      humidity: current.humidity,
      condition: current.conditions || 'Conditions unavailable',
      icon,
      cloud: typeof current.cloudcover === 'number' ? current.cloudcover : 0,
      isDay,
      sunrise,
      sunset,
      timezone: data.timezone || null,
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
  useEffect(() => {
    refresh();
    const dayNightTimer = setInterval(() => {
      setWeather(previous => {
        if (!previous) return previous;
        const isDay = isDayAtLocation(previous.timezone, previous.sunrise, previous.sunset, previous.isDay);
        return previous.isDay === isDay ? previous : { ...previous, isDay };
      });
    }, 60_000);
    return () => clearInterval(dayNightTimer);
  }, [refresh]);
  return { weather, loading, error, refresh: () => refresh(true) };
}
