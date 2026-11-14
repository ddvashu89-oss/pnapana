'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { Check, Droplets, MapPin, Navigation, RefreshCw, Search, Sprout, Sun, X } from 'lucide-react';
import { useWeather, describeWeather, type WeatherLocation } from '@/lib/hooks/useWeather';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import styles from './WeatherCard.module.css';

type CarePlan = { temperature?: string; pruning?: string; light?: { level?: string; detail?: string }; water?: { frequency_days?: number; instructions?: string }; humidity?: { level?: string; detail?: string }; common_issues?: Array<{ issue?: string; solution?: string }> };
type CarePlant = { id?: number | string; name?: string; species?: string; water_freq?: number; last_watered?: string; light_req?: string; light_requirement?: string; water_requirement?: string; humidity?: string; care_plan?: string | CarePlan };
type LocationResult = { id: number; name: string; latitude: number; longitude: number; admin1?: string; country?: string };

export default function WeatherCard({ plant, onLocationChange }: { plant?: CarePlant; onLocationChange?: (location: WeatherLocation | null) => void }) {
  const { weather, loading, error, locationMode, refresh, chooseLocation, switchToDeviceLocation } = useWeather();
  const { language } = useLanguage();
  const hi = language === 'hi';
  const [now] = useState(() => Date.now());
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  useEffect(() => {
    onLocationChange?.(weather?.latitude !== undefined && weather?.longitude !== undefined
      ? { lat: weather.latitude, lon: weather.longitude, city: weather.city || 'Your area', region: weather.region || null, country: weather.country || null }
      : null);
  }, [weather, onLocationChange]);
  let plan: CarePlan = {};
  try { plan = typeof plant?.care_plan === 'string' ? JSON.parse(plant.care_plan) : plant?.care_plan || {}; } catch { /* Older plants may have no structured care plan. */ }
  const frequency = Math.max(1, Number(plant?.water_freq || plan.water?.frequency_days) || 7);
  const lastWatered = plant?.last_watered ? new Date(plant.last_watered.replace(' ', 'T')).getTime() : NaN;
  const elapsed = Number.isFinite(lastWatered) ? Math.max(0, Math.floor((now - lastWatered) / 86400000)) : null;
  const remaining = elapsed === null ? null : Math.max(0, frequency - elapsed);
  const approximateLocation = locationMode === 'device' && weather?.locationAccuracyM !== null && weather?.locationAccuracyM !== undefined && weather.locationAccuracyM > 1000;
  const localWeather = approximateLocation ? null : weather;
  const condition = approximateLocation ? 'Select your city for accurate weather' : localWeather ? describeWeather(localWeather.condition) : error || 'Checking the weather…';
  const city = approximateLocation ? 'Choose your city' : weather?.city || (weather ? 'Your location' : 'Locating…');
  const cityRegion = !approximateLocation && weather?.region && weather.region.toLocaleLowerCase() !== city.toLocaleLowerCase()
    ? `${city}, ${weather.region}`
    : city;
  const icon = localWeather?.icon || '';
  const weatherEmoji = !localWeather ? approximateLocation || error ? '📍' : '🌤️' : icon.includes('thunder') ? '⛈️' : icon.includes('snow') ? '🌨️' : icon.includes('rain') || icon.includes('showers') ? '🌦️' : icon.includes('fog') || icon.includes('haze') ? '🌫️' : (icon.includes('clear') || icon.includes('sun')) && !localWeather.isDay ? '🌙' : icon.includes('clear') || icon.includes('sun') ? '☀️' : icon.includes('partly-cloudy') ? localWeather.isDay ? '🌤️' : '☁️🌙' : icon.includes('cloudy') ? '☁️' : localWeather.isDay ? '🌤️' : '🌙';
  const humidityText = localWeather?.humidity === null || !localWeather ? '—' : `${localWeather.humidity}%`;
  const lightIndex = localWeather?.solarPeak === null || !localWeather
    ? null
    : localWeather.solarPeak >= 650
      ? 3
      : localWeather.solarPeak >= 350
        ? 2
        : localWeather.solarPeak >= 120
          ? 1
          : 0;
  const light = lightIndex === null ? '—' : ['Low', 'Soft', 'Bright', 'High'][lightIndex];
  const preferredLight = (plant?.light_req || plan.light?.level || 'Medium').toLowerCase();
  const comfortable = /high|full|direct|sun/.test(preferredLight) ? [2, 3] : /low|shade/.test(preferredLight) ? [0, 1] : [1, 2];
  const lightSuits = lightIndex !== null && comfortable.includes(lightIndex);
  const lightEvidence = localWeather?.solarPeak === null || !localWeather
    ? 'Outdoor sunlight forecast unavailable.'
    : `Peak outdoor solar forecast: ${Math.round(localWeather.solarPeak)} W/m²`;
  const lightAdvice = lightIndex === null
    ? 'There is no solar forecast for today, so check the plant’s actual position and follow its care plan.'
    : lightSuits
      ? 'Outdoor sunlight is within its listed preference. Indoor light still depends on its window, shade, and placement.'
      : lightIndex === 3
        ? 'High solar intensity is forecast outdoors. If this plant prefers indirect light, protect it from prolonged afternoon exposure.'
        : plant?.light_requirement || 'Today’s outdoor sunlight may be below its preferred range. Keep following its care plan.';
  const celsiusRange = plan.temperature?.match(/(-?\d+)\s*°?\s*C\s*(?:to|[-–])\s*(-?\d+)\s*°?\s*C?/i)
    || plan.temperature?.match(/(-?\d+)\s*[-–]\s*(-?\d+)\s*°\s*C/i);
  const fahrenheitRange = plan.temperature?.match(/(-?\d+)\s*°?\s*F\s*(?:to|[-–])\s*(-?\d+)\s*°?\s*F?/i);
  const genericRange = plan.temperature?.match(/(-?\d+)\s*[-–]\s*(-?\d+)/);
  const minTemp = celsiusRange ? Number(celsiusRange[1]) : fahrenheitRange
    ? Math.round((Number(fahrenheitRange[1]) - 32) * 5 / 9)
    : genericRange ? Number(genericRange[1]) : null;
  const maxTemp = celsiusRange ? Number(celsiusRange[2]) : fahrenheitRange
    ? Math.round((Number(fahrenheitRange[2]) - 32) * 5 / 9)
    : genericRange ? Number(genericRange[2]) : null;
  const growing = localWeather && minTemp !== null && maxTemp !== null ? localWeather.temp >= minTemp && localWeather.temp <= maxTemp : null;
  const hotterThanPreferred = localWeather && maxTemp !== null && localWeather.temp > maxTemp;
  const coolerThanPreferred = localWeather && minTemp !== null && localWeather.temp < minTemp;
  const plantLabel = plant?.name || plant?.species || 'this plant';
  const wateringAdvice = !localWeather
    ? 'Check the soil before watering and follow this plant’s care plan.'
    : hotterThanPreferred || localWeather.temp >= 33
      ? `Warm conditions can dry ${plant?.name ? `${plant.name}’s` : 'the pot’s'} soil faster. Check it more often, but water only when the top layer is dry.`
      : coolerThanPreferred || localWeather.temp < 15
        ? 'Cool conditions can keep this plant’s soil wet longer. Check the soil before watering and avoid watering on the calendar alone.'
        : plan.water?.instructions || 'Weather does not change this plant’s usual schedule. Finger-test the soil and water when the top inch is dry.';
  const temperaturePosition = localWeather ? Math.max(2, Math.min(96, localWeather.temp / 50 * 100)) : null;
  const tip = !localWeather ? approximateLocation ? 'choose your city above before using weather-based care advice.' : 'check the soil before watering and follow each plant’s care plan.' : !localWeather.isDay ? 'a calm evening. Keep to the usual care routine and water only if the soil is dry.' : localWeather.temp >= 33 ? 'a warm day. Check soil moisture and protect tender leaves from harsh afternoon sun.' : localWeather.temp < 15 ? 'a cool day. Keep tender plants sheltered and check the soil before watering.' : 'a good growing day. Normal watering, and let them have the morning light.';
  const dateKey = new Date(now).toISOString().slice(0, 10);
  const adviceSeed = `${plant?.id || plant?.species || plant?.name || 'plant'}:${dateKey}`;
  const issues = (plan.common_issues || []).filter(issue => issue.issue || issue.solution);
  const issue = issues.length ? issues[stableIndex(`${adviceSeed}:issue`, issues.length)] : null;
  const humidityNeed = plan.humidity?.detail || plant?.humidity || (plan.humidity?.level ? `${plantLabel} prefers ${plan.humidity.level.toLowerCase()} humidity.` : '');
  const plantAdvice = [
    {
      kind: 'water',
      title: `Check ${plantLabel}’s soil`,
      body: wateringAdvice,
      meta: `Usual interval: every ${frequency} days`,
    },
    {
      kind: 'light',
      title: `Check ${plantLabel}’s light`,
      body: plan.light?.detail || plant?.light_requirement || lightAdvice,
      meta: `Listed preference: ${plant?.light_req || plan.light?.level || 'follow its care plan'}`,
    },
    humidityNeed ? {
      kind: 'humidity',
      title: `Humidity for ${plantLabel}`,
      body: humidityNeed,
      meta: localWeather ? `Local outdoor humidity: ${humidityText}` : 'Compare with the air around the plant',
    } : null,
    issue ? {
      kind: 'issue',
      title: `Watch ${plantLabel} for ${issue.issue || 'common stress'}`,
      body: issue.solution || 'Inspect the leaves and soil before changing its routine.',
      meta: 'Plant-specific issue to monitor',
    } : null,
    plan.pruning || plan.temperature ? {
      kind: 'growth',
      title: `Support ${plantLabel}’s growth`,
      body: plan.pruning || `Keep it within its preferred temperature range: ${plan.temperature}.`,
      meta: plan.temperature ? `Preferred temperature: ${plan.temperature}` : 'Follow its pruning guidance',
    } : null,
  ].filter((advice): advice is { kind: string; title: string; body: string; meta: string } => Boolean(advice));
  const rotatingAdvice = plantAdvice[stableIndex(adviceSeed, plantAdvice.length)];
  const dailyAdvice = hotterThanPreferred || coolerThanPreferred || (localWeather && (localWeather.temp >= 33 || localWeather.temp < 15))
    ? plantAdvice[0]
    : rotatingAdvice;

  useEffect(() => {
    if (approximateLocation) setLocationOpen(true);
  }, [approximateLocation]);

  const searchLocation = async (event: FormEvent) => {
    event.preventDefault();
    const query = locationQuery.trim();
    if (query.length < 2) {
      setLocationError('Enter at least two letters of your city.');
      return;
    }
    setLocationSearching(true);
    setLocationError(null);
    try {
      const params = new URLSearchParams({ name: query, count: '6', language: 'en', format: 'json' });
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
      if (!response.ok) throw new Error('City search is unavailable.');
      const data = await response.json() as { results?: LocationResult[] };
      const results = (data.results || []).filter(result => Number.isFinite(result.latitude) && Number.isFinite(result.longitude));
      setLocationResults(results);
      if (!results.length) setLocationError('No matching city found. Try “City, State”.');
    } catch (cause) {
      setLocationResults([]);
      setLocationError(cause instanceof Error ? cause.message : 'City search is unavailable.');
    } finally {
      setLocationSearching(false);
    }
  };

  return (
    <section className={`${styles.card} ${plant ? styles.plantCard : styles.dailyCard}`} aria-label={hi ? 'आज का मौसम' : 'Today’s weather'}>
      <div className={styles.overview} title={weather?.location}>
        <span className={styles.weatherIcon} aria-hidden="true">{weatherEmoji}</span>
        <div className={styles.temperature}>
          <div className={styles.temperatureLine}><strong>{localWeather ? `${localWeather.temp}°C` : '—°C'}</strong>{!plant && localWeather?.feelsLike !== null && localWeather?.feelsLike !== undefined && <small>(Feels {localWeather.feelsLike}°C)</small>}</div>
          <button type="button" className={styles.city} onClick={() => setLocationOpen(open => !open)} aria-expanded={locationOpen} aria-label={`Weather location: ${cityRegion}. Change location.`}><MapPin size={13} aria-hidden="true" /> {cityRegion}<span>Change</span></button>
          <span>{condition}{plant && localWeather ? ` · ${humidityText} Humidity` : ''}</span>
        </div>
        {plant ? <span className={styles.weatherBased}>{localWeather ? 'Weather-based' : 'Location needed'}</span> : <span className={styles.humidity}><Droplets size={14} /> {localWeather ? localWeather.humidity : '—'}% {hi ? 'नमी' : 'Humidity'}</span>}
        <button className={styles.refresh} onClick={refresh} disabled={loading} aria-label={hi ? 'मौसम रिफ्रेश करें' : 'Refresh weather'} title={weather?.location || 'Refresh local weather'}><RefreshCw size={18} className={loading ? styles.spinning : ''} /></button>
      </div>
      {locationOpen && <div className={styles.locationPicker} aria-label="Choose weather location">
        <div className={styles.locationPickerHeader}><div><strong>{approximateLocation ? 'Confirm your city for accurate weather' : 'Set weather location'}</strong><span>{approximateLocation ? 'Your device supplied only an approximate area. Select your actual city below.' : 'Choose your city if device location is inaccurate.'}</span></div><button type="button" onClick={() => setLocationOpen(false)} aria-label="Close location picker"><X size={17} /></button></div>
        <form className={styles.locationSearch} onSubmit={searchLocation}>
          <label htmlFor="weather-city">City or postal code</label>
          <div><input id="weather-city" value={locationQuery} onChange={event => setLocationQuery(event.target.value)} placeholder="e.g. Karnal, Haryana" autoComplete="off" /><button type="submit" disabled={locationSearching}><Search size={16} />{locationSearching ? 'Searching…' : 'Search'}</button></div>
        </form>
        {locationError && <p className={styles.locationError}>{locationError}</p>}
        {locationResults.length > 0 && <ul className={styles.locationResults}>
          {locationResults.map(result => <li key={result.id}><button type="button" onClick={async () => {
            await chooseLocation({ lat: result.latitude, lon: result.longitude, city: result.name, region: result.admin1 || null, country: result.country || null });
            setLocationOpen(false);
            setLocationResults([]);
          }}><MapPin size={15} /><span><strong>{result.name}</strong><small>{[result.admin1, result.country].filter(Boolean).join(', ')}</small></span></button></li>)}
        </ul>}
        <button type="button" className={styles.deviceLocation} onClick={async () => { await switchToDeviceLocation(); setLocationOpen(false); }} disabled={loading}><Navigation size={16} /> Use device location{locationMode === 'device' ? ' (current)' : ''}</button>
      </div>}
      {weather && <div className={styles.locationMeta}>
        <strong>{approximateLocation ? 'Location not confirmed' : weather.source === 'station-observation' ? 'Nearby observation' : 'Local forecast'}</strong>
        <span>{approximateLocation ? 'Choose your city for local conditions' : weather.country || weather.location}</span>
        {weather.stationDistanceKm !== null && <span>{weather.stationDistanceKm} km away</span>}
        {approximateLocation && <span>Approximate GPS area</span>}
        {weather.updatedAt && <time dateTime={weather.updatedAt}>Updated {formatUpdatedAt(weather.updatedAt)}</time>}
      </div>}
      {!plant ? (
        <div className={styles.tip}><span aria-hidden="true">🌱</span><p><strong>{hi ? 'आज की देखभाल: ' : "Today's Weather Care Tip: "}</strong>{localWeather && <>{localWeather.temp} °C, {humidityText} humidity — </>}{tip}</p></div>
      ) : (
        <>
          <div className={styles.metrics}>
            {[{ icon: '🌡️', label: 'Temp', value: localWeather ? `${localWeather.temp}°` : '—' }, { icon: '💧', label: 'Humidity', value: humidityText }, { icon: '☀️', label: 'Sunlight', value: light }, { icon: '🌦️', label: 'Weather', value: localWeather ? condition : '—' }].map(({ icon, label, value }) => <div key={label}><span className={styles.metricIcon} aria-hidden="true">{icon}</span><span className={styles.metricLabel}>{label}</span><strong title={value}>{value}</strong></div>)}
          </div>
          <div className={styles.verdict}>
            <span className={styles.check}><Check size={24} /></span>
            <div><span>{hi ? 'आज पानी देना है?' : 'WATER TODAY?'}</span><div className={styles.verdictLine}><strong>{remaining === null ? 'Check the soil first' : remaining === 0 ? 'Time to check the soil' : 'No, leave it today'}</strong>{remaining !== null && remaining > 0 && <p>next in {remaining} {remaining === 1 ? 'day' : 'days'}</p>}</div></div>
          </div>
          <div className={styles.advice}><span className={styles.adviceIcon}>{dailyAdvice.kind === 'light' ? <Sun size={20} /> : dailyAdvice.kind === 'growth' || dailyAdvice.kind === 'issue' ? <Sprout size={20} /> : <Droplets size={20} />}</span><div><h3>{dailyAdvice.title}</h3><p>{dailyAdvice.body}</p><small>{dailyAdvice.meta}</small></div></div>
          <div className={styles.detail}>
            <h3><Sun size={18} /> Is the light right today?</h3>
            <div className={styles.lightScale} aria-label={`Estimated outdoor sunlight: ${light}`}>
              {[0, 1, 2, 3].map(index => <i key={index} className={comfortable.includes(index) ? styles.comfortable : styles.outsideRange} />)}
              {lightIndex !== null && <span className={styles.lightMarker} style={{ left: `${[6, 34, 63, 88][lightIndex]}%` }}>▲</span>}
            </div>
            <div className={styles.scaleLabels}><span>Low</span><span>High</span></div>
            <p className={styles.legend}><i />Listed comfort range · <span>▲ forecast today</span></p>
            <p className={styles.lightEvidence}>{lightEvidence}</p>
            <p className={styles.lightAdvice}><strong>{lightSuits ? 'Outdoor forecast fits.' : lightIndex === null ? 'Check its position.' : 'Check the light.'}</strong> {lightAdvice}</p>
          </div>
          <div className={styles.detail}>
            <h3><Sprout size={20} /> How it will grow</h3>
            <div className={styles.growthScale}>{temperaturePosition !== null && localWeather && <span style={{ left: `${temperaturePosition}%` }}>▲ {localWeather.temp}°</span>}</div>
            <div className={styles.scaleLabels}><span>Cold</span><span>Growing</span><span>Heat</span></div>
            <span className={styles.pill}>{growing === true ? 'Actively growing' : growing === false ? 'Outside its comfort zone' : 'Follow its care plan'}</span>
            <p><strong>{growing === true ? 'Growing weather.' : growing === false ? 'A little extra care.' : 'Every plant has its own pace.'}</strong> {growing === true ? `Active growth at this temperature. ${plan.pruning || 'Keep a steady care routine and watch for fresh growth.'}` : plan.temperature ? `Preferred temperature: ${plan.temperature} ${plan.pruning || ''}` : 'Temperature, light, and soil moisture all shape growth. Follow the care plan below for this plant’s needs.'}</p>
          </div>
        </>
      )}
    </section>
  );
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function stableIndex(value: string, length: number) {
  if (length <= 1) return 0;
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(31, hash) + value.charCodeAt(index) | 0;
  return Math.abs(hash) % length;
}
