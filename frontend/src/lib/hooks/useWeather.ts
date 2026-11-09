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
type OpenMeteoResponse = {
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    cloud_cover?: number;
    is_day?: number;
    shortwave_radiation?: number;
  };
  hourly?: { shortwave_radiation?: Array<number | null> };
  daily?: { sunrise?: string[]; sunset?: string[] };
  timezone?: string;
};

let cachedWeather: { key: string; value: Weather; expiresAt: number } | null = null;
let pendingWeather: { key: string; promise: Promise<Weather> } | null = null;

function locationKey({ lat, lon }: Coordinates) {
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
  } catch { /* Fall back to the API's current day/night flag if the zone is invalid. */ }
  return localMinutes !== null && rise !== null && set !== null
    ? localMinutes >= rise && localMinutes < set
    : fallback;
}

function describeWmoCode(code: number) {
  if (code === 0) return { condition: 'Clear sky', icon: 'clear' };
  if (code === 1) return { condition: 'Mainly clear', icon: 'partly-cloudy' };
  if (code === 2) return { condition: 'Partly cloudy', icon: 'partly-cloudy' };
  if (code === 3) return { condition: 'Overcast', icon: 'cloudy' };
  if (code === 45 || code === 48) return { condition: 'Fog', icon: 'fog' };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: 'Drizzle', icon: 'rain' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: 'Rain', icon: 'rain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'Snow', icon: 'snow' };
  if ([95, 96, 99].includes(code)) return { condition: 'Thunderstorm', icon: 'thunder' };
  return { condition: 'Conditions unavailable', icon: 'cloudy' };
}

async function fetchWeather(position: Coordinates, force = false): Promise<Weather> {
  const key = locationKey(position);
  if (pendingWeather?.key === key) return pendingWeather.promise;
  if (!force && cachedWeather?.key === key && cachedWeather.expiresAt > Date.now()) return cachedWeather.value;

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(position.lat),
    longitude: String(position.lon),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,is_day,shortwave_radiation',
    hourly: 'shortwave_radiation',
    daily: 'sunrise,sunset',
    forecast_days: '1',
    timezone: 'auto',
  }).toString();

  const promise = (async () => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Weather unavailable');
    const data: OpenMeteoResponse = await response.json();
    const current = data.current;
    if (typeof current?.temperature_2m !== 'number' || typeof current.relative_humidity_2m !== 'number') {
      throw new Error('Weather unavailable');
    }

    const solarValues = data.hourly?.shortwave_radiation?.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)) || [];
    const solarPeak = solarValues.length ? Math.max(...solarValues) : typeof current.shortwave_radiation === 'number' ? current.shortwave_radiation : null;
    const sunrise = data.daily?.sunrise?.[0] || null;
    const sunset = data.daily?.sunset?.[0] || null;
    const fallbackDay = current.is_day === 1;
    const isDay = isDayAtLocation(data.timezone, sunrise, sunset, fallbackDay);
    const weatherDescription = describeWmoCode(Number(current.weather_code));

    return {
      temp: Math.round(current.temperature_2m),
      feelsLike: typeof current.apparent_temperature === 'number' ? Math.round(current.apparent_temperature) : null,
      humidity: Math.round(current.relative_humidity_2m),
      condition: weatherDescription.condition,
      icon: weatherDescription.icon,
      cloud: typeof current.cloud_cover === 'number' ? current.cloud_cover : 0,
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
    cachedWeather = { key, value, expiresAt: Date.now() + 10 * 60 * 1000 };
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
          current => resolve({ lat: current.coords.latitude, lon: current.coords.longitude, location: 'Your local weather' }),
          () => reject(new Error('Allow location access to get local weather')),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 },
        );
      });
      setWeather(await fetchWeather(position, force));
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
