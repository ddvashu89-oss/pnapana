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
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  locationAccuracyM: number | null;
};

export type WeatherLocation = {
  lat: number;
  lon: number;
  city: string;
  region: string | null;
  country: string | null;
};
type Coordinates = {
  lat: number;
  lon: number;
  accuracy: number | null;
  city?: string;
  region?: string | null;
  country?: string | null;
};
type WeatherApiResponse = { status?: string; weather?: Weather; message?: string };
type ReverseGeocodeResponse = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
};

let cachedWeather: { key: string; value: Weather; expiresAt: number } | null = null;
let pendingWeather: { key: string; promise: Promise<Weather> } | null = null;
const WEATHER_LOCATION_KEY = 'pnapana.weatherLocation';

function savedLocation(): Coordinates | null {
  try {
    const value = JSON.parse(localStorage.getItem(WEATHER_LOCATION_KEY) || 'null') as Partial<WeatherLocation> | null;
    if (!value || !Number.isFinite(value.lat) || !Number.isFinite(value.lon) || typeof value.city !== 'string' || !value.city.trim()) return null;
    return {
      lat: Number(value.lat),
      lon: Number(value.lon),
      accuracy: null,
      city: value.city.trim(),
      region: typeof value.region === 'string' ? value.region : null,
      country: typeof value.country === 'string' ? value.country : null,
    };
  } catch {
    return null;
  }
}

function bestDeviceLocation(force = false): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location access is unavailable'));
      return;
    }
    let best: Coordinates | null = null;
    let settled = false;
    let watchId: number | null = null;
    const finish = (position?: Coordinates, message = 'Allow location access or choose your city') => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (position) resolve(position);
      else reject(new Error(message));
    };
    const timeoutId = window.setTimeout(() => finish(best || undefined), 8000);
    watchId = navigator.geolocation.watchPosition(
      current => {
        const candidate = {
          lat: current.coords.latitude,
          lon: current.coords.longitude,
          accuracy: Number.isFinite(current.coords.accuracy) ? Math.round(current.coords.accuracy) : null,
        };
        if (!best || candidate.accuracy !== null && (best.accuracy === null || candidate.accuracy < best.accuracy)) best = candidate;
        if (candidate.accuracy !== null && candidate.accuracy <= 250) finish(candidate);
      },
      () => finish(best || undefined),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: force ? 0 : 60000 },
    );
  });
}

function locationKey({ lat, lon }: Coordinates) {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

async function reverseGeocode({ lat, lon }: Coordinates) {
  const query = new URLSearchParams({
    latitude: lat.toFixed(5),
    longitude: lon.toFixed(5),
    localityLanguage: 'en',
  });
  try {
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${query}`, { cache: 'force-cache' });
    if (!response.ok) return { city: null, region: null, country: null };
    const data: ReverseGeocodeResponse = await response.json();
    return {
      city: data.city?.trim() || data.locality?.trim() || null,
      region: data.principalSubdivision?.trim() || null,
      country: data.countryName?.trim() || null,
    };
  } catch {
    return { city: null, region: null, country: null };
  }
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

  // Four decimal places preserve roughly street-level coordinates for the
  // weather grid while avoiding unnecessary raw GPS precision in the URL.
  const query = new URLSearchParams({ lat: position.lat.toFixed(4), lon: position.lon.toFixed(4) });
  const url = getApiUrl(`weather.php?${query.toString()}`);
  const promise = (async () => {
    const [response, place] = await Promise.all([
      fetch(url, { cache: force ? 'no-store' : 'default' }),
      position.city
        ? Promise.resolve({ city: position.city, region: position.region || null, country: position.country || null })
        : reverseGeocode(position),
    ]);
    if (!response.ok) throw new Error('Weather unavailable');
    const data: WeatherApiResponse = await response.json();
    if (data.status !== 'success' || !data.weather || typeof data.weather.temp !== 'number') {
      throw new Error(data.message || 'Weather unavailable');
    }
    return {
      ...data.weather,
      ...place,
      latitude: position.lat,
      longitude: position.lon,
      locationAccuracyM: position.accuracy,
    };
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
  const [locationMode, setLocationMode] = useState<'device' | 'manual'>('device');
  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const stored = savedLocation();
      setLocationMode(stored ? 'manual' : 'device');
      const position = stored || await bestDeviceLocation(force);
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
  const chooseLocation = useCallback(async (location: WeatherLocation) => {
    localStorage.setItem(WEATHER_LOCATION_KEY, JSON.stringify(location));
    setLocationMode('manual');
    setLoading(true);
    setError(null);
    try {
      const nextWeather = await fetchWeather({ ...location, accuracy: null }, true);
      setWeather({
        ...nextWeather,
        isDay: isDayAtLocation(nextWeather.timezone, nextWeather.sunrise, nextWeather.sunset, nextWeather.isDay),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Weather unavailable');
    } finally {
      setLoading(false);
    }
  }, []);
  const switchToDeviceLocation = useCallback(async () => {
    localStorage.removeItem(WEATHER_LOCATION_KEY);
    setLocationMode('device');
    await refresh(true);
  }, [refresh]);
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
  return { weather, loading, error, locationMode, refresh: () => refresh(true), chooseLocation, switchToDeviceLocation };
}
