'use client';
import { useCallback, useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/api';

export type Weather = {
  temp: number;
  feelsLike: number | null;
  humidity: number | null;
  condition: string;
  icon: string;
  cloud: number | null;
  isDay: boolean;
  sunrise: string | null;
  sunset: string | null;
  timezone: string | null;
  solarPeak: number | null;
  location: string;
  source: 'station-observation' | 'forecast-model';
  updatedAt: string | null;
  stationDistanceKm: number | null;
  observationText: string | null;
};

type Coordinates = { lat: number; lon: number };
type WeatherApiResponse = { status?: string; weather?: Weather; message?: string };

let cachedWeather: { key: string; value: Weather; expiresAt: number } | null = null;
let pendingWeather: { key: string; promise: Promise<Weather> } | null = null;

function locationKey({ lat, lon }: Coordinates) {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
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
  } catch { /* Fall back to the provider's day/night flag if the zone is invalid. */ }
  return localMinutes !== null && rise !== null && set !== null
    ? localMinutes >= rise && localMinutes < set
    : fallback;
}

async function fetchWeather(position: Coordinates, force = false): Promise<Weather> {
  const key = locationKey(position);
  if (pendingWeather?.key === key) return pendingWeather.promise;
  if (!force && cachedWeather?.key === key && cachedWeather.expiresAt > Date.now()) return cachedWeather.value;

  // Send neighborhood-level precision; this is enough to pick a nearby station.
  const query = new URLSearchParams({ lat: position.lat.toFixed(2), lon: position.lon.toFixed(2) });
  const url = getApiUrl(`weather.php?${query.toString()}`);
  const promise = (async () => {
    const response = await fetch(url, { cache: force ? 'no-store' : 'default' });
    if (!response.ok) throw new Error('Weather unavailable');
    const data: WeatherApiResponse = await response.json();
    if (data.status !== 'success' || !data.weather || typeof data.weather.temp !== 'number') {
      throw new Error(data.message || 'Weather unavailable');
    }
    return data.weather;
  })();

  pendingWeather = { key, promise };
  try {
    const value = await promise;
    cachedWeather = { key, value, expiresAt: Date.now() + 5 * 60 * 1000 };
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
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const position = await new Promise<Coordinates>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Location access is unavailable'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          current => resolve({ lat: current.coords.latitude, lon: current.coords.longitude }),
          () => reject(new Error('Allow location access to get local weather')),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 },
        );
      });
      const nextWeather = await fetchWeather(position, force);
      setWeather({
        ...nextWeather,
        isDay: isDayAtLocation(nextWeather.timezone, nextWeather.sunrise, nextWeather.sunset, nextWeather.isDay),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Weather unavailable');
      setWeather(null);
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
