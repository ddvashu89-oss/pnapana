import type { Weather } from '@/lib/hooks/useWeather';
export type GrowingSetup = { spot_verified?: boolean; sunlight_timing?: string; moisture_level?: string; moisture_checked_at?: string; has_drainage?: boolean | null; pot_size?: string; light?: string };
export type WeatherPlant = { status?: string; status_color?: string; name?: string; species?: string; placement?: string; water_freq?: number; last_watered?: string | null; setup_data?: string | GrowingSetup | null; care_plan?: string | {temperature?: string; light?: {level?: string; detail?: string}; humidity?: {level?: string}; water?: {instructions?: string; frequency_days?: number}} };
export function readSetup(value: WeatherPlant['setup_data']): GrowingSetup { try { const result = typeof value === 'string' ? JSON.parse(value) : value; return result && typeof result === 'object' ? result : {}; } catch { return {}; } }
export function plantWeatherInsights(weather: Weather | null, plant?: WeatherPlant, now = Date.now()) {
  let plan = plant?.care_plan;
  if (typeof plan === 'string') { try { plan = JSON.parse(plan); } catch { plan = undefined; } }
  const care = plan && typeof plan === 'object' ? plan : {};
  const setup = readSetup(plant?.setup_data);
  const result: Array<{kind:string;text:string}> = [];
  const add = (kind:string,text:string) => result.push({kind,text});
  if (plant?.status_color === 'orange' || /issue|unhealthy|sick/i.test(plant?.status || '')) add('health', 'A health concern is recorded for this plant. Inspect leaves and stems and review its latest diagnosis before changing feeding or watering.');
  const outdoor = plant?.placement === 'outdoor';
  const checked = Date.parse(setup.moisture_checked_at || '');
  const watered = Date.parse(plant?.last_watered?.replace(' ', 'T') || '');
  const fresh = Number.isFinite(checked) && now >= checked && now - checked <= 24*3600000 && (!Number.isFinite(watered) || checked >= watered);
  const recentWater = Number.isFinite(watered) && now >= watered && now-watered < 24*3600000;
  if (!setup.spot_verified) add('setup','Verify this plant’s growing spot so its light and weather advice can be personalised.');
  if (fresh && ['moist','wet'].includes(setup.moisture_level || '')) add('water',`Do not add water now: your latest soil check was ${setup.moisture_level}. Check drainage if the pot stays wet.`);
  else if (recentWater) add('water','Watering was logged within the last 24 hours. Check the soil again before adding any more.');
  else if (fresh && setup.moisture_level === 'dry') add('water',`You reported dry soil. Check the depth required for this species before watering. ${care.water?.instructions || 'Follow its species care plan; surface dryness alone is not enough.'}`);
  else add('water','Check soil moisture before deciding to water. No current soil reading is available; a reminder date is not a watering instruction.');
  if (setup.has_drainage === false) add('drainage','The pot has no drainage holes. Avoid standing water and use a draining inner pot before increasing watering.');
  if (setup.sunlight_timing === 'unknown' || !setup.sunlight_timing) add('light-check','Observe this exact spot in the morning and afternoon, then update its direct-sun timing. A photo cannot establish daily exposure.');
  const light = `${care.light?.level || ''} ${care.light?.detail || ''}`;
  if (/indirect|shade/i.test(light) && ['afternoon','both'].includes(setup.sunlight_timing || '')) add('placement','Your confirmed spot receives afternoon sun, while this plant’s plan calls for filtered light. Consider a shaded position; update the spot only after moving the plant.');
  if (/full sun|direct sun/i.test(light) && setup.sunlight_timing === 'none') add('placement','No direct sun is reported at this spot. Compare a brighter available spot with this species’ light requirements and acclimatise gradually.');
  if (!weather) { add('weather','Local weather is unavailable. These actions use your confirmed setup and care history.'); return result; }
  const hours = (weather.hourlyForecast || []).slice(0,12);
  const range = care.temperature?.match(/(-?\d+)\s*(?:°?\s*C)?\s*(?:to|[-–])\s*(-?\d+)\s*°?\s*C/i);
  const low = Math.min(weather.temp,...hours.map(h=>h.temperature ?? weather.temp));
  const high = Math.max(weather.temp,...hours.map(h=>h.temperature ?? weather.temp));
  if (outdoor && low <= 0) add('frost','Freezing temperatures are forecast. Protect frost-sensitive plants before temperatures fall.');
  else if (low < (range ? Number(range[1]) : 8)) add('cold',`${outdoor ? 'Outdoor' : 'Outdoor weather, not a measured indoor temperature:'} lows near ${low}°C may stress sensitive plants. Check conditions at the actual pot and protect it if needed.`);
  if (high > (range ? Number(range[2]) : 35)) add('heat',`Outdoor temperatures may reach ${high}°C. Check the pot’s moisture more often${setup.pot_size === 'small' ? ', especially in this small pot' : ''}; heat alone does not mean it needs water.`);
  const rain = Math.max(weather.rainProbability ?? 0,...hours.map(h=>h.rain_probability ?? 0));
  if (outdoor && rain >= 60) add('rain',`Rain probability reaches ${rain}% in the coming hours. If rain reaches this pot, reassess soil before watering; covered balconies may stay dry.`);
  if (outdoor && hours.reduce((sum,h)=>sum+(h.precipitation_mm ?? 0),0)>=15) add('heavy-rain','Heavy rainfall is forecast. Keep drainage clear and protect pots that collect rain.');
  if (outdoor && Math.max(weather.windSpeedKmh ?? 0,...hours.map(h=>h.wind_kmh ?? 0))>=35) add('wind','Strong wind is forecast. Secure lightweight pots and shelter fragile stems.');
  if (outdoor && Math.max(weather.uvIndex ?? 0,...hours.map(h=>h.uv_index ?? 0))>=8) add('uv','High UV is forecast. Provide shade for sensitive leaves according to this species’ light needs.');
  if ((weather.humidity ?? 100)<30) add('humidity','Outdoor humidity is low. Check humidity around the plant; indoor air may differ. Follow its species humidity needs.');
  return result;
}
