'use client';
import { useCallback, useEffect, useState } from 'react';

export type Weather = { temp: number; feelsLike: number | null; humidity: number; code: number; cloud: number; isDay: boolean; location: string };
export function describeWeather(code: number) {
  if (code === 0) return 'Clear sky';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Foggy';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunderstorms';
}

export function useWeather() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const position = await new Promise<{ lat: number; lon: number; location: string }>(resolve => {
        const fallback = () => resolve({ lat: 12.9716, lon: 77.5946, location: 'Bengaluru · default location' });
        if (!navigator.geolocation) return fallback();
        navigator.geolocation.getCurrentPosition(p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, location: 'Your local weather' }), fallback, { timeout: 8000, maximumAge: 600000 });
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${position.lat}&longitude=${position.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,cloud_cover,is_day&timezone=auto`);
      if (!response.ok) throw new Error('Weather unavailable');
      const { current } = await response.json();
      if (typeof current?.temperature_2m !== 'number' || typeof current?.relative_humidity_2m !== 'number') throw new Error('Weather unavailable');
      setWeather({ temp: Math.round(current.temperature_2m), feelsLike: typeof current.apparent_temperature === 'number' ? Math.round(current.apparent_temperature) : null, humidity: current.relative_humidity_2m, code: current.weather_code, cloud: current.cloud_cover, isDay: !!current.is_day, location: position.location });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { weather, loading, error, refresh };
}
