'use client';
import { useState } from 'react';
import { Check, Droplets, RefreshCw, Sprout, Sun } from 'lucide-react';
import { useWeather, describeWeather } from '@/lib/hooks/useWeather';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import styles from './WeatherCard.module.css';

type CarePlan = { temperature?: string; pruning?: string; light?: { level?: string }; water?: { frequency_days?: number } };
type CarePlant = { water_freq?: number; last_watered?: string; light_req?: string; light_requirement?: string; water_requirement?: string; care_plan?: string | CarePlan };

export default function WeatherCard({ plant }: { plant?: CarePlant }) {
  const { weather, loading, error, refresh } = useWeather();
  const { language } = useLanguage();
  const hi = language === 'hi';
  const [now] = useState(() => Date.now());
  let plan: CarePlan = {};
  try { plan = typeof plant?.care_plan === 'string' ? JSON.parse(plant.care_plan) : plant?.care_plan || {}; } catch { /* Older plants may have no structured care plan. */ }
  const frequency = Math.max(1, Number(plant?.water_freq || plan.water?.frequency_days) || 7);
  const lastWatered = plant?.last_watered ? new Date(plant.last_watered.replace(' ', 'T')).getTime() : NaN;
  const elapsed = Number.isFinite(lastWatered) ? Math.max(0, Math.floor((now - lastWatered) / 86400000)) : null;
  const remaining = elapsed === null ? null : Math.max(0, frequency - elapsed);
  const condition = weather ? describeWeather(weather.condition) : error ? 'Weather unavailable' : 'Checking the weather…';
  const icon = weather?.icon || '';
  const weatherEmoji = !weather ? '🌤️' : icon.includes('thunder') ? '⛈️' : icon.includes('snow') ? '🌨️' : icon.includes('rain') || icon.includes('showers') ? '🌦️' : icon.includes('fog') ? '🌫️' : (icon.includes('clear') || icon.includes('sun')) && !weather.isDay ? '🌙' : icon.includes('clear') || icon.includes('sun') ? '☀️' : icon.includes('partly-cloudy') ? weather.isDay ? '🌤️' : '☁️🌙' : icon.includes('cloudy') ? '☁️' : weather.isDay ? '🌤️' : '🌙';
  const lightIndex = weather?.solarPeak === null || !weather
    ? null
    : weather.solarPeak >= 650
      ? 3
      : weather.solarPeak >= 350
        ? 2
        : weather.solarPeak >= 120
          ? 1
          : 0;
  const light = lightIndex === null ? '—' : ['Low', 'Soft', 'Bright', 'High'][lightIndex];
  const preferredLight = (plant?.light_req || plan.light?.level || 'Medium').toLowerCase();
  const comfortable = /high|full|direct|sun/.test(preferredLight) ? [2, 3] : /low|shade/.test(preferredLight) ? [0, 1] : [1, 2];
  const lightSuits = lightIndex !== null && comfortable.includes(lightIndex);
  const lightEvidence = weather?.solarPeak === null || !weather
    ? 'Outdoor sunlight forecast unavailable.'
    : `Peak outdoor solar forecast: ${Math.round(weather.solarPeak)} W/m²`;
  const lightAdvice = lightIndex === null
    ? 'There is no solar forecast for today, so check the plant’s actual position and follow its care plan.'
    : lightSuits
      ? 'Outdoor sunlight is within its listed preference. Indoor light still depends on its window, shade, and placement.'
      : lightIndex === 3
        ? 'High solar intensity is forecast outdoors. If this plant prefers indirect light, protect it from prolonged afternoon exposure.'
        : plant?.light_requirement || 'Today’s outdoor sunlight may be below its preferred range. Keep following its care plan.';
  const range = plan.temperature?.match(/(-?\d+)\s*[-–]\s*(-?\d+)/);
  const minTemp = range ? Number(range[1]) : null;
  const maxTemp = range ? Number(range[2]) : null;
  const growing = weather && minTemp !== null && maxTemp !== null ? weather.temp >= minTemp && weather.temp <= maxTemp : null;
  const temperaturePosition = weather ? Math.max(2, Math.min(96, weather.temp / 50 * 100)) : null;
  const tip = !weather ? 'Check the soil before watering and follow each plant’s care plan.' : !weather.isDay ? 'a calm evening. Keep to the usual care routine and water only if the soil is dry.' : weather.temp >= 33 ? 'a warm day. Check soil moisture and protect tender leaves from harsh afternoon sun.' : weather.temp < 15 ? 'a cool day. Keep tender plants sheltered and check the soil before watering.' : 'a good growing day. Normal watering, and let them have the morning light.';

  return (
    <section className={`${styles.card} ${plant ? styles.plantCard : styles.dailyCard}`} aria-label={hi ? 'आज का मौसम' : 'Today’s weather'}>
      <div className={styles.overview} title={weather?.location}>
        <span className={styles.weatherIcon} aria-hidden="true">{weatherEmoji}</span>
        <div className={styles.temperature}>
          <div className={styles.temperatureLine}><strong>{weather ? `${weather.temp}°C` : '—°C'}</strong>{!plant && weather?.feelsLike !== null && weather?.feelsLike !== undefined && <small>(Feels {weather.feelsLike}°C)</small>}</div>
          <span>{condition}{plant && weather ? ` · ${weather.humidity}% Humidity` : ''}</span>
        </div>
        {plant ? <span className={styles.weatherBased}>Weather-based</span> : <span className={styles.humidity}><Droplets size={14} /> {weather ? weather.humidity : '—'}% {hi ? 'नमी' : 'Humidity'}</span>}
        <button className={styles.refresh} onClick={refresh} disabled={loading} aria-label={hi ? 'मौसम रिफ्रेश करें' : 'Refresh weather'} title={weather?.location || 'Refresh local weather'}><RefreshCw size={18} className={loading ? styles.spinning : ''} /></button>
      </div>
      {weather?.location.includes('default') && <small className={styles.fallbackLocation}>{weather.location}</small>}
      {!plant ? (
        <div className={styles.tip}><span aria-hidden="true">🌱</span><p><strong>{hi ? 'आज की देखभाल: ' : "Today's Weather Care Tip: "}</strong>{weather && <>{weather.temp} °C, {weather.humidity}% humidity — </>}{tip}</p></div>
      ) : (
        <>
          <div className={styles.metrics}>
            {[{ icon: '🌡️', label: 'Temp', value: weather ? `${weather.temp}°` : '—' }, { icon: '💧', label: 'Humidity', value: weather ? `${weather.humidity}%` : '—' }, { icon: '☀️', label: 'Sunlight', value: light }, { icon: '🌦️', label: 'Weather', value: weather ? condition : '—' }].map(({ icon, label, value }) => <div key={label}><span className={styles.metricIcon} aria-hidden="true">{icon}</span><span className={styles.metricLabel}>{label}</span><strong title={value}>{value}</strong></div>)}
          </div>
          <div className={styles.verdict}>
            <span className={styles.check}><Check size={24} /></span>
            <div><span>{hi ? 'आज पानी देना है?' : 'WATER TODAY?'}</span><div className={styles.verdictLine}><strong>{remaining === null ? 'Check the soil first' : remaining === 0 ? 'Time to check the soil' : 'No, leave it today'}</strong>{remaining !== null && remaining > 0 && <p>next in {remaining} {remaining === 1 ? 'day' : 'days'}</p>}</div></div>
          </div>
          <div className={styles.advice}><span className={styles.adviceIcon}><Droplets size={20} /></span><div><h3>Water on the usual schedule</h3><p>{weather && weather.temp >= 33 ? 'Warm weather can dry pots faster. Finger-test the soil and water when the top inch is dry.' : weather && weather.temp < 15 ? 'Cool weather can keep the soil wet for longer. Finger-test it before watering.' : "Nothing in today's weather changes this one's watering. Finger-test the soil and water when the top inch is dry."}</p><small>Today that means every {frequency} days</small></div></div>
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
            <div className={styles.growthScale}>{temperaturePosition !== null && <span style={{ left: `${temperaturePosition}%` }}>▲ {weather!.temp}°</span>}</div>
            <div className={styles.scaleLabels}><span>Cold</span><span>Growing</span><span>Heat</span></div>
            <span className={styles.pill}>{growing === true ? 'Actively growing' : growing === false ? 'Outside its comfort zone' : 'Follow its care plan'}</span>
            <p><strong>{growing === true ? 'Growing weather.' : growing === false ? 'A little extra care.' : 'Every plant has its own pace.'}</strong> {growing === true ? `Active growth at this temperature. ${plan.pruning || 'Keep a steady care routine and watch for fresh growth.'}` : plan.temperature ? `Preferred temperature: ${plan.temperature} ${plan.pruning || ''}` : 'Temperature, light, and soil moisture all shape growth. Follow the care plan below for this plant’s needs.'}</p>
          </div>
        </>
      )}
      <p className={styles.attribution}><a href="https://www.visualcrossing.com/" target="_blank" rel="noreferrer">Weather data: Visual Crossing</a>{plant && ' · Outdoor solar estimate; indoor light varies by placement.'}</p>
    </section>
  );
}
