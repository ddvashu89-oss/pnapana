import type { Weather } from '@/lib/hooks/useWeather';

export type WeatherPlant = {
  name?: string;
  species?: string;
  placement?: string;
  water_freq?: number;
  last_watered?: string | null;
  care_plan?: string | { temperature?: string; light?: { level?: string; detail?: string }; humidity?: { level?: string }; water?: { instructions?: string; frequency_days?: number } };
};

export function plantWeatherInsights(weather: Weather, plant?: WeatherPlant) {
  let plan: WeatherPlant['care_plan'] = plant?.care_plan;
  if (typeof plan === 'string') { try { plan = JSON.parse(plan); } catch { plan = undefined; } }
  const safePlan = plan && typeof plan === 'object' ? plan : {};
  const temperatureText = (safePlan as { temperature?: string }).temperature || '';
  const range = temperatureText.match(/(-?\d+)\s*[-–]\s*(-?\d+)\s*°?\s*C/i);
  const minTemp = range ? Number(range[1]) : null;
  const maxTemp = range ? Number(range[2]) : null;
  const hot = weather.temp >= 35 || (maxTemp !== null && weather.temp > maxTemp);
  const cold = weather.temp <= 8 || (minTemp !== null && weather.temp < minTemp);
  const outdoor = plant?.placement === 'outdoor';
  const elapsedDays = plant?.last_watered ? Math.floor((Date.now() - new Date(plant.last_watered.replace(' ', 'T')).getTime()) / 86_400_000) : null;
  const dueByHistory = elapsedDays !== null && Number.isFinite(elapsedDays) && elapsedDays >= Math.max(1, Number(plant?.water_freq || safePlan.water?.frequency_days || 7));
  const result: Array<{ kind: string; text: string }> = [];

  if (dueByHistory) result.push({ kind: 'water', text: `${plant?.name || plant?.species || 'This plant'} is due for a soil check based on its care history. Water only if the soil feels dry for its species.` });
  if (hot) result.push({ kind: 'heat', text: `Hot conditions (${weather.temp}°C) may dry pots faster. Check soil moisture more often; do not water unless the soil needs it.` });
  if (cold) result.push({ kind: 'cold', text: `Cool conditions (${weather.temp}°C) may slow growth and keep soil wet longer. Protect sensitive plants and check soil before watering.` });
  const nextRainProbability = Math.max(0, ...weather.hourlyForecast.slice(0, 12).map(hour => hour.rain_probability ?? 0));
  const nextRainMm = weather.hourlyForecast.slice(0, 12).reduce((sum, hour) => sum + (hour.precipitation_mm ?? 0), 0);
  const rainProbability = Math.max(weather.rainProbability ?? 0, nextRainProbability);
  const rainMm = Math.max(weather.rainMm ?? 0, nextRainMm);
  if (outdoor && rainProbability >= 60) result.push({ kind: 'rain', text: `Rain is likely (${Math.round(rainProbability)}%). Check outdoor pots and drainage before watering.` });
  if (outdoor && rainMm >= 15) result.push({ kind: 'heavy-rain', text: `Heavy rain is forecast (${Math.round(rainMm)} mm). Protect small pots from waterlogging.` });
  if (outdoor && Math.max(weather.windSpeedKmh ?? 0, ...weather.hourlyForecast.slice(0, 12).map(hour => hour.wind_kmh ?? 0)) >= 35) result.push({ kind: 'wind', text: `Strong winds are forecast. Secure lightweight pots and shelter fragile plants.` });
  if ((weather.uvIndex ?? 0) >= 8) result.push({ kind: 'uv', text: `Very high UV (${weather.uvIndex}) is forecast. Shade sensitive leaves during peak sun; indoor exposure depends on the window.` });
  if (!result.length) result.push({ kind: 'routine', text: `${weather.temp}°C and ${weather.humidity ?? '—'}% humidity. Follow the plant’s species-specific plan and check soil before watering.` });
  return result;
}
