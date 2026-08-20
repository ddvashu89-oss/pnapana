import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, MotionConfig, useScroll, useTransform } from 'framer-motion'
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, AreaChart,
} from 'recharts'
import {
  Leaf, Sun, Compass, Ruler, Building2, Sprout, Droplets, Wind, ShoppingBag,
  Plus, Minus, X, Menu, ChevronDown, ArrowRight, ArrowDown, Check, CheckCircle2,
  Sparkles, Bug, Thermometer, FlaskConical, Activity, CalendarDays, Camera,
  MapPin, Radio, ScanLine, Layers, Microscope, BadgeCheck, Quote, Star, Mail,
  ShieldCheck, Clock, Package, Recycle, HeartPulse, Bot, Nfc, Gauge, Search,
  Trees, Timer, Scale, Waves, TrendingUp, Info, Users, ShieldAlert,
} from 'lucide-react'
import {
  clamp, fadeUp, Reveal, OnkarMark, Eyebrow, Button, Segmented, Slider, Field, ChartTip,
} from './ui.jsx'
import { IMG, PHOTO_CREDITS } from './assets/index.js'
import { SEED_PLANTS, SEED_USERS, SEED_POSTS, speciesById } from './data.js'
import Scan from './Scan.jsx'
import Community from './Community.jsx'
import Admin from './Admin.jsx'
import { AuthModal, UserMenu, LockedPanel, isAdmin } from './Auth.jsx'

/* ── solar engine ─────────────────────────────────────────────────────────
   Real clear-sky radiative math: declination → hour angle → solar position →
   Kasten-Young air mass → beam attenuation → vertical-window incidence →
   interior falloff → PPFD → integrated Daily Light Integral.            */

const RAD = Math.PI / 180

const CITIES = [
  { id: 'delhi', name: 'Delhi NCR', lat: 28.61, lon: 77.21, clarity: 0.6, aqi: 'AQI 168 avg' },
  { id: 'mumbai', name: 'Mumbai', lat: 19.08, lon: 72.88, clarity: 0.67, aqi: 'AQI 94 avg' },
  { id: 'bengaluru', name: 'Bengaluru', lat: 12.97, lon: 77.59, clarity: 0.71, aqi: 'AQI 71 avg' },
  { id: 'kolkata', name: 'Kolkata', lat: 22.57, lon: 88.36, clarity: 0.63, aqi: 'AQI 131 avg' },
]

const ASPECTS = [
  { id: 'E', label: 'East', sub: 'Window', az: 90, note: 'Soft direct beam until ~10:30, then diffuse.' },
  { id: 'S', label: 'South', sub: 'Window', az: 180, note: 'The longest arc. Winter’s most valuable wall.' },
  { id: 'W', label: 'West', sub: 'Window', az: 270, note: 'Late, hot, high-stress light. Leaf-scorch risk.' },
  { id: 'N', label: 'North', sub: 'Balcony', az: 0, note: 'Almost pure diffuse. Steady, never harsh.' },
]

const WINDOWS = [
  { id: 'slim', label: 'Slim casement', area: 0.9, dim: '0.9 × 1.0 m' },
  { id: 'standard', label: 'Standard', area: 1.8, dim: '1.2 × 1.5 m' },
  { id: 'wide', label: 'Wide sliding', area: 3.2, dim: '2.0 × 1.6 m' },
  { id: 'full', label: 'Floor-to-ceiling', area: 5.4, dim: '2.4 × 2.25 m' },
]

const OBSTRUCTIONS = [
  { id: 'open', label: 'Open sky', factor: 1.0, note: 'High floor, nothing across.' },
  { id: 'partial', label: 'Tower across', factor: 0.62, note: 'Facing block, 20–30 m gap.' },
  { id: 'dense', label: 'Dense colony', factor: 0.34, note: 'Low floor, shaded well.' },
]

const declination = (n) => 23.45 * Math.sin(RAD * (360 / 365) * (284 + n))

const eqOfTime = (n) => {
  const b = RAD * (360 / 364) * (n - 81)
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
}

function solarPosition(lat, lon, n, clockHour) {
  const d = declination(n)
  const correction = 4 * (lon - 15 * 5.5) + eqOfTime(n)
  const H = 15 * (clockHour + correction / 60 - 12)
  const sinAlt =
    Math.sin(RAD * lat) * Math.sin(RAD * d) +
    Math.cos(RAD * lat) * Math.cos(RAD * d) * Math.cos(RAD * H)
  const alt = Math.asin(clamp(sinAlt, -1, 1)) / RAD
  const az =
    (Math.atan2(
      Math.sin(RAD * H),
      Math.cos(RAD * H) * Math.sin(RAD * lat) - Math.tan(RAD * d) * Math.cos(RAD * lat),
    ) /
      RAD +
      180 +
      360) %
    360
  return { alt, az }
}

function clearSky(alt, clarity) {
  if (alt <= 1.5) return { dni: 0, dhi: 0, sinAlt: 0 }
  const sinAlt = Math.sin(RAD * alt)
  const airMass = 1 / (sinAlt + 0.50572 * Math.pow(alt + 6.07995, -1.6364))
  const dni = 1361 * Math.pow(clarity, Math.pow(airMass, 0.678))
  return { dni, dhi: 0.11 * dni * sinAlt, sinAlt }
}

/** Photosynthetic photon flux density at the plant, µmol·m⁻²·s⁻¹. */
function ppfdAtPlant(hour, cfg) {
  const { alt, az } = solarPosition(cfg.lat, cfg.lon, cfg.dayOfYear, hour)
  if (alt <= 1.5) return { ppfd: 0, alt: Math.max(alt, 0), onGlass: 0 }
  const { dni, dhi, sinAlt } = clearSky(alt, cfg.clarity)

  const cosIncidence = Math.cos(RAD * alt) * Math.cos(RAD * (az - cfg.windowAz))
  const beam = cosIncidence > 0 ? dni * cosIncidence : 0
  const skyDiffuse = dhi * 0.5
  const groundBounce = 0.2 * (dni * sinAlt + dhi) * 0.5
  const onGlass = (beam + skyDiffuse + groundBounce) * cfg.obstruction

  const transmitted = onGlass * 0.76
  const reach = 0.62 * Math.sqrt(cfg.windowArea) * Math.sqrt(cfg.ceiling / 2.7)
  const falloff = 1 / (1 + Math.pow(cfg.distance / reach, 2))

  return { ppfd: transmitted * falloff * 2.02, alt, onGlass }
}

function surveyLight(cfg) {
  const series = []
  let dli = 0
  let insolation = 0
  let usableHours = 0
  let peakPpfd = 0
  let peakHour = 12
  for (let h = 4; h <= 20; h += 0.5) {
    const { ppfd, alt, onGlass } = ppfdAtPlant(h, cfg)
    dli += (ppfd * 1800) / 1e6
    insolation += onGlass * 0.5
    if (ppfd >= 200) usableHours += 0.5
    if (ppfd > peakPpfd) {
      peakPpfd = ppfd
      peakHour = h
    }
    series.push({
      hour: h,
      label: `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`,
      ppfd: Math.round(ppfd),
      alt: Math.round(Math.max(alt, 0) * 10) / 10,
    })
  }
  return {
    series,
    dli: Math.round(dli * 10) / 10,
    peakSunHours: Math.round((insolation / 1000) * 10) / 10,
    usableHours,
    peakPpfd: Math.round(peakPpfd),
    peakHour,
  }
}

const PLANTS = [
  {
    max: 3.5,
    common: 'Snake Plant',
    img: IMG.snake,
    latin: 'Sansevieria trifasciata',
    tier: 'Deep-shade specialist',
    blurb:
      'It fixes carbon at night through CAM metabolism, so it earns a living where your light budget is thinnest. Nothing else survives this reading without stretching.',
    companions: ['ZZ Plant', 'Aglaonema Silver Bay'],
  },
  {
    max: 6.5,
    common: 'Peace Lily',
    img: IMG.peace,
    latin: 'Spathiphyllum wallisii',
    tier: 'Low-light bloomer',
    blurb:
      'This is the floor for reliable flowering indoors. Below 4 mol it will hold green leaves but stop producing spathes entirely.',
    companions: ['Golden Pothos', 'Calathea orbifolia'],
  },
  {
    max: 10.5,
    common: 'Monstera Deliciosa',
    img: IMG.monstera,
    latin: 'Monstera deliciosa',
    tier: 'Fenestration threshold',
    blurb:
      'Fenestration is a light-dependent trait. Under 6 mol the plant stays juvenile and the leaves never split; your reading clears that threshold.',
    companions: ['Philodendron Birkin', 'Rubber Plant'],
  },
  {
    max: 15.5,
    common: 'Fiddle Leaf Fig',
    img: IMG.fiddle,
    latin: 'Ficus lyrata',
    tier: 'High-demand canopy',
    blurb:
      'A genuine light hog. This reading supports the vertical growth and leaf size that makes the species worth its reputation for difficulty.',
    companions: ['Bird of Paradise', 'Ficus Audrey'],
  },
  {
    max: 999,
    common: 'Tulsi & Fruiting Herbs',
    img: IMG.tulsi,
    latin: 'Ocimum tenuiflorum',
    tier: 'Full-sun productive',
    blurb:
      'You have a genuine growing balcony, not a houseplant corner. This is enough radiation to set fruit and drive essential-oil production.',
    companions: ['Curry Leaf', 'Dwarf Chilli'],
  },
]

const matchPlant = (dli) => PLANTS.find((p) => dli < p.max) ?? PLANTS[PLANTS.length - 1]

function careProtocol(dli, aspect, month) {
  const waterDays = clamp(Math.round(12 - dli * 0.5), 3, 15)
  const feedWeeks = dli < 5 ? 10 : dli < 11 ? 8 : 6
  const grams = dli < 5 ? 45 : dli < 11 ? 60 : 80
  const summer = month >= 4 && month <= 9
  return {
    waterDays,
    waterNote:
      dli < 4
        ? 'Low evaporative demand. Overwatering, not drought, is the failure mode here.'
        : 'Check the top 3 cm with a finger before each cycle; the interval is a ceiling, not a schedule.',
    feedWeeks,
    grams,
    mist:
      aspect === 'W'
        ? 'Daily, 06:30–07:15. Never after 16:00 — droplets act as lenses under late western beam.'
        : dli > 11
          ? 'Daily at 07:00, before the direct beam arrives.'
          : summer
            ? '3× weekly at 07:30.'
            : '2× weekly at 08:00.',
    rotate: aspect === 'N' ? 'Every 3 weeks' : 'Every 10 days, quarter turn',
  }
}

/* ── content ──────────────────────────────────────────────────────────── */

const STRATA = [
  { id: 'canopy', label: 'Canopy', depth: '+240' },
  { id: 'foundation', label: 'The Open Air', depth: '+180' },
  { id: 'recon', label: 'The Light Field', depth: '+120' },
  { id: 'product', label: 'Topsoil · A', depth: '−5' },
  { id: 'sanctuary', label: 'The Beds', depth: '−40' },
  { id: 'journal', label: 'Rhizosphere', depth: '−65' },
  { id: 'proof', label: 'Bedrock', depth: '−120' },
]

const NAV = [
  { id: 'foundation', label: 'The Foundation' },
  { id: 'recon', label: 'AI Recon' },
  { id: 'product', label: 'Aadhar-Vati' },
  { id: 'sanctuary', label: 'The Sanctuary' },
]

const CATALOG = {
  trial: { sku: 'AV-5KG-T', name: 'Aadhar-Vati — 5 kg Trial', price: 499, unit: 'one-time' },
  quarterly: { sku: 'AV-15KG-Q', name: 'Aadhar-Vati — Quarterly Refill', price: 1299, unit: 'per quarter' },
  yantra: { sku: 'PY-NEEM', name: 'Prana-Yantra — Neem-wood Marker', price: 399, unit: 'one-time' },
}

const INGREDIENTS = [
  ['Eisenia fetida vermicast', '72%', 'Cured 60 days, screened to 4 mm'],
  ['Aged cow dung, 90-day', '14%', 'Zero raw manure, zero pathogen load'],
  ['Neem cake', '5%', 'Azadirachtin nematode suppression'],
  ['Rock phosphate + mycorrhizae', '4%', 'Glomus spp., 120 IP/g'],
  ['Microbial consortia', '3%', 'Trichoderma viride, Pseudomonas fluorescens'],
  ['Humic + fulvic fortification', '2%', '2.4% humic, 0.8% fulvic acid'],
]

const REVIEWS = [
  {
    name: 'Ananya Raghunathan',
    place: 'DLF Phase 3, Gurugram · 14th floor, west-facing',
    quote:
      'The recon tool told me my west window was 13.2 DLI and that I was scorching, not underfeeding. Moved the fiddle leaf 1.4 m back and top-dressed. Four new leaves since March.',
    plant: 'Ficus lyrata',
    weeks: 31,
  },
  {
    name: 'Rohit Menon',
    place: 'Powai, Mumbai · 6th floor, north balcony',
    quote:
      'I had bought three bags of white-label “organic manure” before this. The difference is that this one smells like forest floor, not ammonia. My monstera finally fenestrated.',
    plant: 'Monstera deliciosa',
    weeks: 22,
  },
  {
    name: 'Shreya Kulkarni',
    place: 'Indiranagar, Bengaluru · ground floor, dense colony',
    quote:
      'Being able to type BED-017 and see the exact fermentation day my bag came from is not a gimmick to me. I have stopped guessing what I am putting into my soil.',
    plant: 'Spathiphyllum',
    weeks: 44,
  },
]

const JOURNAL_LOG = [
  { week: 3, kind: 'ok', text: 'Baseline capture complete. 6 leaves, 34 cm. Chlorophyll index 0.61.' },
  { week: 8, kind: 'warn', text: 'Marginal chlorosis on leaf 2. Likely magnesium, not nitrogen. Aadhar-Vati top-dress advanced by 9 days.' },
  { week: 14, kind: 'ok', text: 'Chlorosis resolved. New growth point detected at node 4.' },
  { week: 21, kind: 'ok', text: 'First fenestration recorded. Leaf 9 shows 2 lateral splits.' },
  { week: 29, kind: 'warn', text: 'Solar path shift detected — window arc dropped 2.1 mol. Recommend 30 cm move toward glass.' },
  { week: 38, kind: 'ok', text: 'No nitrogen deficiency detected. Turgor and internode spacing within optimal band.' },
  { week: 47, kind: 'ok', text: 'Aerial root initiated. Structural support advised before week 52.' },
]

/* ── deterministic bed telemetry ──────────────────────────────────────── */

function bedTelemetry(bed) {
  const rnd = (salt) => {
    let x = Math.imul(bed + 1, 2654435761) ^ Math.imul(salt + 7, 40503)
    x = Math.imul(x ^ (x >>> 15), 2246822507)
    x ^= x >>> 13
    return ((x >>> 0) % 100000) / 100000
  }
  const cycleDay = 1 + Math.floor(rnd(1) * 60)
  const moisture = Math.round((70 + rnd(2) * 14) * 10) / 10
  const worms = Math.round(8200 + rnd(3) * 6400)
  const temp = Math.round((24.5 + rnd(4) * 6.5) * 10) / 10
  const cn = Math.round((13.5 + rnd(5) * 5) * 10) / 10
  const ph = Math.round((6.6 + rnd(6) * 0.5) * 10) / 10
  const feedstock = ['Mandi green waste', 'Dairy co-op dung', 'Sugarcane press mud', 'Campus leaf litter'][
    Math.floor(rnd(7) * 4)
  ]
  const row = String.fromCharCode(65 + Math.floor(bed / 10))
  return { cycleDay, moisture, worms, temp, cn, ph, feedstock, row, cam: 1 + (bed % 8) }
}

/* ── navigation ───────────────────────────────────────────────────────── */

const VIEWS = [
  { id: 'scan', label: 'Scan', icon: ScanLine },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'admin', label: 'Admin', icon: ShieldAlert, adminOnly: true },
]

const viewsFor = (user) =>
  !user ? [] : VIEWS.filter((v) => !v.adminOnly || isAdmin(user))

function Nav({ cartCount, onCart, active, onChallenge, view, setView, user, onSignIn, onSignOut }) {
  const [open, setOpen] = useState(false)
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const fn = () => setSolid(window.scrollY > 40)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const go = (id) => {
    setOpen(false)
    if (view !== 'site') {
      setView('site')
      requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
      return
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const goView = (v) => {
    setOpen(false)
    setView(v)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid || view !== 'site' ? 'glass border-b border-gold-500/12' : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-[70px] max-w-[1320px] items-center gap-4 px-5 sm:px-8">
        <button onClick={() => goView('site')} className="flex items-center gap-3" aria-label="Ekva home">
          <span className="text-gold-500">
            <OnkarMark />
          </span>
          <span className="font-display text-[1.45rem] leading-none tracking-[0.02em] text-parchment">
            Ekva
          </span>
        </button>

        {view === 'site' && (
          <nav className="ml-6 hidden items-center gap-7 xl:flex">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                className={`relative py-2 text-[0.78rem] tracking-wide transition-colors ${
                  active === n.id ? 'text-gold-400' : 'text-parchment-muted hover:text-parchment'
                }`}
              >
                {n.label}
                {active === n.id && (
                  <motion.span
                    layoutId="navdot"
                    className="absolute -bottom-0.5 left-0 h-px w-full bg-gold-500"
                  />
                )}
              </button>
            ))}
          </nav>
        )}

        {user && (
          <nav className="ml-auto hidden items-center gap-1 rounded-full border border-soil-700 p-1 lg:flex">
            <button
              onClick={() => goView('site')}
              aria-pressed={view === 'site'}
              className={`rounded-full px-4 py-2 font-mono text-[0.62rem] tracking-[0.14em] uppercase transition-colors ${
                view === 'site' ? 'bg-gold-500 text-soil-950' : 'text-parchment-dim hover:text-parchment'
              }`}
            >
              Store
            </button>
            {viewsFor(user).map((v) => (
              <button
                key={v.id}
                onClick={() => goView(v.id)}
                aria-pressed={view === v.id}
                className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[0.62rem] tracking-[0.14em] uppercase transition-colors ${
                  view === v.id ? 'bg-gold-500 text-soil-950' : 'text-parchment-dim hover:text-parchment'
                }`}
              >
                <v.icon className="h-3.5 w-3.5" strokeWidth={1.7} />
                {v.label}
              </button>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {view === 'site' && user && (
            <Button
              variant="ghost"
              onClick={onChallenge}
              className="hidden !px-5 !py-2.5 !text-[0.68rem] 2xl:inline-flex"
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.6} />
              Claim 14-Day Prana Challenge
            </Button>
          )}

          {user ? (
            <UserMenu user={user} onSignOut={onSignOut} />
          ) : (
            <>
              <button
                onClick={() => onSignIn('signin')}
                className="hidden px-3 py-2 font-mono text-[0.66rem] tracking-[0.14em] uppercase text-parchment-muted transition-colors hover:text-gold-400 sm:block"
              >
                Sign in
              </button>
              <Button onClick={() => onSignIn('signup')} className="!px-5 !py-2.5 !text-[0.66rem]">
                Create account
              </Button>
            </>
          )}

          <button
            onClick={onCart}
            className="relative rounded-full border border-gold-500/25 p-2.5 text-parchment transition-colors hover:border-gold-500/60 hover:text-gold-400"
            aria-label={`Cart, ${cartCount} items`}
          >
            <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="tnum absolute -right-1 -top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-gold-500 px-1 font-mono text-[0.58rem] font-semibold text-soil-950">
                {cartCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-soil-700 p-2.5 text-parchment lg:hidden"
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="glass overflow-hidden border-t border-gold-500/12 lg:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-5 sm:px-8">
              {user ? (
                <div className="mb-3 grid grid-cols-2 gap-1.5">
                  {[{ id: 'site', label: 'Store', icon: ShoppingBag }, ...viewsFor(user)].map((v) => (
                    <button
                      key={v.id}
                      onClick={() => goView(v.id)}
                      aria-pressed={view === v.id}
                      className={`flex items-center gap-2 rounded-xl border px-3.5 py-3 font-mono text-[0.62rem] tracking-[0.14em] uppercase transition-colors ${
                        view === v.id
                          ? 'border-gold-500/60 bg-gold-500/10 text-gold-400'
                          : 'border-soil-700 text-parchment-dim'
                      }`}
                    >
                      <v.icon className="h-3.5 w-3.5" strokeWidth={1.7} />
                      {v.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mb-4 flex flex-col gap-2">
                  <Button onClick={() => { setOpen(false); onSignIn('signup') }} className="w-full">
                    Create a free account
                  </Button>
                  <Button variant="ghost" onClick={() => { setOpen(false); onSignIn('signin') }} className="w-full">
                    Sign in
                  </Button>
                </div>
              )}

              {view === 'site' &&
                NAV.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => go(n.id)}
                    className="flex items-center justify-between border-b border-soil-800 py-3.5 text-left font-display text-lg text-parchment"
                  >
                    {n.label}
                    <ArrowRight className="h-4 w-4 text-gold-600" strokeWidth={1.5} />
                  </button>
                ))}
              {user && (
                <Button variant="primary" className="mt-4 w-full" onClick={() => { setOpen(false); onChallenge() }}>
                  Claim 14-Day Prana Challenge
                </Button>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

function StrataRail({ active }) {
  return (
    <div className="pointer-events-none fixed left-8 top-1/2 z-40 hidden -translate-y-1/2 xl:block">
      <div className="relative flex flex-col gap-6 pl-5">
        <span className="absolute left-0 top-1 h-[calc(100%-8px)] w-px bg-gradient-to-b from-transparent via-gold-500/25 to-transparent" />
        {STRATA.map((s) => {
          const on = s.id === active
          return (
            <button
              key={s.id}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })}
              className="pointer-events-auto flex items-center gap-3 text-left"
            >
              <span
                className={`absolute left-0 h-px transition-all duration-400 ${
                  on ? 'w-3.5 bg-gold-500' : 'w-1.5 bg-soil-600'
                }`}
              />
              <span
                className={`font-mono text-[0.56rem] tracking-[0.2em] uppercase transition-all duration-400 ${
                  on ? 'text-gold-400 opacity-100' : 'text-parchment-dim opacity-45'
                }`}
              >
                {s.label}
                <span className="tnum ml-2 opacity-50">{s.depth}cm</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── hero ─────────────────────────────────────────────────────────────── */

function Pouch() {
  const ref = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    setTilt({
      x: ((e.clientY - r.top) / r.height - 0.5) * -14,
      y: ((e.clientX - r.left) / r.width - 0.5) * 16,
    })
  }

  const badges = [
    { icon: Leaf, text: '100% Organic', pos: 'left-[-8%] top-[14%]', d: 0 },
    { icon: ShieldCheck, text: 'Zero Weed Seeds', pos: 'right-[-10%] top-[42%]', d: 0.9 },
    { icon: FlaskConical, text: 'Bio-Enzyme Fortified', pos: 'left-[-4%] bottom-[13%]', d: 1.8 },
  ]

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative mx-auto w-full max-w-[330px]"
      style={{ perspective: '1200px' }}
    >
      <motion.div
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: 'spring', stiffness: 110, damping: 16 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative"
      >
        <div className="absolute -inset-8 rounded-[50%] bg-gold-500/10 blur-[60px]" />
        <div className="relative overflow-hidden rounded-t-[26px] rounded-b-[10px] border border-gold-500/25 bg-gradient-to-b from-soil-800 via-soil-900 to-soil-950 px-7 pb-9 pt-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.95)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background: `linear-gradient(${125 + tilt.y * 2}deg, transparent 35%, rgba(244,241,234,0.055) 48%, transparent 60%)`,
            }}
          />
          <div className="mb-5 flex items-center justify-between border-b border-gold-500/20 pb-4">
            <span className="text-gold-500">
              <OnkarMark className="h-5 w-5" />
            </span>
            <span className="font-mono text-[0.5rem] tracking-[0.3em] text-parchment-dim">EKVA · BED-042</span>
          </div>

          <p className="eyebrow mb-2.5">Fortified Bio-Active</p>
          <h3 className="font-display text-[2.5rem] leading-[0.94] tracking-tight text-parchment">
            Aadhar
            <span className="text-gold-500">-</span>
            Vati
          </h3>
          <p className="mt-2 font-display text-sm italic text-parchment-muted">जीवित मृदा · Living Soil</p>

          <div className="relative my-6 overflow-hidden rounded-lg border border-gold-500/15">
            <img src={IMG.soil} alt="Fortified bio-active vermicompost" className="h-32 w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-soil-950/85 via-transparent to-soil-950/25" />
          </div>

          <div className="flex items-end justify-between border-t border-gold-500/20 pt-4">
            <div>
              <p className="font-mono text-[0.52rem] tracking-[0.22em] text-parchment-dim">NET WEIGHT</p>
              <p className="tnum font-display text-2xl text-gold-500">5 kg</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[0.52rem] tracking-[0.22em] text-parchment-dim">C:N RATIO</p>
              <p className="tnum font-mono text-sm text-parchment-muted">15 : 1</p>
            </div>
          </div>
        </div>
      </motion.div>

      {badges.map((b) => (
        <motion.div
          key={b.text}
          className={`absolute ${b.pos} z-10`}
          animate={{ y: [0, -9, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, delay: b.d, ease: 'easeInOut' }}
        >
          <div className="glass hairline flex items-center gap-2 rounded-full py-2 pl-2.5 pr-3.5 whitespace-nowrap">
            <b.icon className="h-3.5 w-3.5 text-gold-500" strokeWidth={1.7} />
            <span className="font-mono text-[0.56rem] tracking-[0.14em] uppercase text-parchment">{b.text}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function Hero({ onAdd, onRecon }) {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 700], [0, 90])

  return (
    <section id="canopy" className="relative overflow-hidden pb-24 pt-32 sm:pt-40">
      <div className="pointer-events-none absolute left-1/2 top-[-14%] h-[520px] w-[900px] max-w-[130vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.14),transparent_66%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64">
        <svg viewBox="0 0 1440 260" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M0 92 Q360 52 720 92 T1440 84 L1440 260 L0 260Z" fill="#241B17" opacity="0.85" />
          <path d="M0 140 Q400 108 760 146 T1440 134 L1440 260 L0 260Z" fill="#1C1613" />
          <path d="M0 190 Q380 166 720 196 T1440 184 L1440 260 L0 260Z" fill="#12281E" opacity="0.55" />
          <path d="M0 228 Q420 210 780 230 T1440 222 L1440 260 L0 260Z" fill="#100C0A" />
        </svg>
      </div>

      <div className="relative mx-auto grid max-w-[1320px] items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.11 } } }}>
          <motion.div variants={fadeUp}>
            <Eyebrow icon={Sprout}>Infrastructure for living things</Eyebrow>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-6 font-display text-[2.85rem] leading-[1.02] tracking-[-0.025em] text-parchment sm:text-[3.9rem] lg:text-[4.4rem]"
            style={{ fontVariationSettings: "'SOFT' 24, 'WONK' 1" }}
          >
            The biological foundation
            <br className="hidden sm:block" /> for your{' '}
            <em className="not-italic text-gold-500" style={{ fontVariationSettings: "'WONK' 1" }}>
              living world.
            </em>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-7 max-w-[52ch] text-[1.02rem] leading-[1.75] text-parchment-muted"
          >
            Born from 60 vermicompost beds across 3.5 acres of living land. Paired with zero-hardware
            AI spatial mapping that reads the light in your actual room — no sensors, no subscription
            box of guesses.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => onAdd('trial')}>
              <Package className="h-4 w-4" strokeWidth={1.7} />
              Order Aadhar-Vati · 5 kg
            </Button>
            <Button variant="ghost" onClick={onRecon}>
              <ScanLine className="h-4 w-4" strokeWidth={1.7} />
              Scan your space with AI Recon
            </Button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-12 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-xl border border-soil-700/60 bg-soil-700/40"
          >
            {[
              ['3.5', 'acres of land'],
              ['60', 'active beds'],
              ['14', 'day guarantee'],
            ].map(([n, l]) => (
              <div key={l} className="bg-soil-950/80 px-4 py-4">
                <p className="tnum font-display text-2xl text-gold-500">{n}</p>
                <p className="mt-0.5 font-mono text-[0.56rem] tracking-[0.16em] uppercase text-parchment-dim">{l}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div style={{ y }} className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Pouch />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

/* ── foundation ───────────────────────────────────────────────────────── */

function Foundation() {
  const pillars = [
    {
      icon: Recycle,
      title: 'Cycled, not extracted',
      body: 'Mandi green waste and dairy co-op dung enter the beds. Nothing is mined, nothing is synthesised, nothing is shipped from a foreign chemical plant.',
    },
    {
      icon: Microscope,
      title: 'A population, not a powder',
      body: 'Every gram carries a living microbial census. White-bag fertiliser feeds a plant once; a soil biology feeds it for the life of the pot.',
    },
    {
      icon: Waves,
      title: 'One continuous system',
      body: 'Ek Onkar — oneness. The worm, the bed, the bag, the balcony and the person watering it are not five things. They are one process observed at five points.',
    },
  ]

  return (
    <section id="foundation" className="relative border-t border-soil-800 py-24 sm:py-32">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <Reveal>
            <Eyebrow icon={OnkarMark}>The Foundation</Eyebrow>
            <h2 className="mt-6 font-display text-[2.15rem] leading-[1.1] text-parchment sm:text-[2.9rem]">
              Not cheap white-bag chemicals.
              <span className="mt-2 block text-gold-500">The biological foundation of life.</span>
            </h2>
            <div className="mt-8 border-l-2 border-gold-500/30 pl-6">
              <p className="font-display text-lg italic leading-relaxed text-parchment-muted">
                “एकं सत् विप्रा बहुधा वदन्ति”
              </p>
              <p className="mt-2 font-mono text-[0.66rem] leading-relaxed tracking-wider text-parchment-dim">
                EKAM SAT VIPRĀ BAHUDHĀ VADANTI — <br />
                Truth is one; the wise call it by many names.
              </p>
            </div>
          </Reveal>

          <div className="flex flex-col gap-px overflow-hidden rounded-2xl border border-soil-700/60 bg-soil-700/40">
            {pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <div className="group flex gap-5 bg-soil-950/85 p-7 transition-colors duration-500 hover:bg-soil-900 sm:p-9">
                  <div className="mt-0.5 shrink-0 rounded-full border border-gold-500/25 p-2.5 text-gold-500 transition-colors duration-500 group-hover:border-gold-500/60 group-hover:bg-gold-500/10">
                    <p.icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-parchment">{p.title}</h3>
                    <p className="mt-2.5 max-w-[58ch] text-[0.94rem] leading-[1.72] text-parchment-muted">{p.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── recon ────────────────────────────────────────────────────────────── */

function RoomSection({ aspect, windowArea, ceiling, distance, noonAlt }) {
  const H = 210
  const W = 420
  const floorY = H - 26
  const ceilPx = clamp((ceiling / 3.6) * 130, 60, 138)
  const ceilY = floorY - ceilPx
  const winH = clamp(Math.sqrt(windowArea) * 34, 26, ceilPx - 16)
  const winTop = ceilY + (ceilPx - winH) * 0.36
  const plantX = 92 + clamp(distance / 3, 0, 1) * 250
  const beamAngle = clamp(noonAlt, 6, 78)
  const beamDrop = Math.tan(RAD * beamAngle) * 300

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Room cross-section with modelled light cone">
      <defs>
        <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wallg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2B211C" />
          <stop offset="100%" stopColor="#1C1613" />
        </linearGradient>
      </defs>

      <rect x="60" y={ceilY} width={W - 90} height={ceilPx} fill="url(#wallg)" />
      <path
        d={`M60 ${winTop} L${60 + 300} ${winTop + beamDrop * 0.34} L${60 + 300} ${floorY} L60 ${winTop + winH}Z`}
        fill="url(#beam)"
      />

      <line x1="60" y1={ceilY} x2={W - 30} y2={ceilY} stroke="#4E3E34" strokeWidth="1.5" />
      <line x1="60" y1={floorY} x2={W - 30} y2={floorY} stroke="#4E3E34" strokeWidth="1.5" />
      <line x1="60" y1={ceilY} x2="60" y2={floorY} stroke="#4E3E34" strokeWidth="1.5" />

      <rect x="55" y={winTop} width="10" height={winH} fill="#100C0A" />
      <rect x="56.5" y={winTop + 1.5} width="7" height={winH - 3} fill="#D4AF37" opacity="0.75" />

      <g stroke="#D4AF37" strokeWidth="1" opacity="0.55" fill="none">
        <path d={`M14 ${winTop + winH / 2} h34`} strokeLinecap="round" />
        <path d={`M40 ${winTop + winH / 2 - 4} l8 4 -8 4`} strokeLinejoin="round" />
      </g>
      <text x="14" y={winTop + winH / 2 - 9} fill="#94897A" fontFamily="IBM Plex Mono, monospace" fontSize="8.5" letterSpacing="1.4">
        {aspect}
      </text>

      <g transform={`translate(${plantX} ${floorY})`}>
        <path d="M-9 0 L9 0 L6.5 -13 L-6.5 -13Z" fill="#3A2E27" />
        <path d="M0 -13 v-19" stroke="#4E7C5E" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M0 -22 c-9 -1 -13 -7 -13 -14 c8 0 13 6 13 14Z" fill="#4E7C5E" opacity="0.85" />
        <path d="M0 -27 c9 -1 13 -7 13 -14 c-8 0 -13 6 -13 14Z" fill="#7BA88C" opacity="0.8" />
      </g>

      <g stroke="#4E3E34" strokeWidth="0.75" strokeDasharray="2 3">
        <line x1="60" y1={floorY + 12} x2={plantX} y2={floorY + 12} />
      </g>
      <text
        x={(60 + plantX) / 2}
        y={floorY + 22}
        textAnchor="middle"
        fill="#94897A"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="8"
        letterSpacing="0.8"
      >
        {distance.toFixed(1)} m
      </text>
      <text
        x={W - 34}
        y={ceilY + ceilPx / 2}
        textAnchor="end"
        fill="#94897A"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="8"
        letterSpacing="0.8"
      >
        {ceiling.toFixed(1)} m ceiling
      </text>
    </svg>
  )
}

function DliGauge({ dli }) {
  const pct = clamp(dli / 24, 0, 1)
  const R = 62
  const C = Math.PI * R
  const tone = dli < 4 ? '#C25A38' : dli < 10 ? '#D4AF37' : '#4E7C5E'
  return (
    <div className="relative">
      <svg viewBox="0 0 160 92" className="w-full max-w-[220px]" role="img" aria-label={`Daily light integral ${dli}`}>
        <path d="M18 82 A62 62 0 0 1 142 82" fill="none" stroke="#3A2E27" strokeWidth="9" strokeLinecap="round" />
        <motion.path
          d="M18 82 A62 62 0 0 1 142 82"
          fill="none"
          stroke={tone}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={false}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ type: 'spring', stiffness: 60, damping: 16 }}
        />
        {[0, 6, 12, 18, 24].map((t) => {
          const a = Math.PI * (1 - t / 24)
          return (
            <text
              key={t}
              x={80 + Math.cos(a) * 78}
              y={84 - Math.sin(a) * 76}
              textAnchor="middle"
              fill="#94897A"
              fontFamily="IBM Plex Mono, monospace"
              fontSize="7"
            >
              {t}
            </text>
          )
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <p className="tnum font-display text-[2.6rem] leading-none" style={{ color: tone }}>
          {dli.toFixed(1)}
        </p>
        <p className="font-mono text-[0.55rem] tracking-[0.18em] uppercase text-parchment-dim">mol · m⁻² · day⁻¹</p>
      </div>
    </div>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_MID_DOY = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349]

function Recon({ onAdd, authed, onRequireAuth }) {
  const [cityId, setCityId] = useState('delhi')
  const [aspectId, setAspectId] = useState('S')
  const [winId, setWinId] = useState('standard')
  const [obsId, setObsId] = useState('partial')
  const [ceiling, setCeiling] = useState(2.7)
  const [distance, setDistance] = useState(0.6)
  const [month, setMonth] = useState(3)
  const [scanning, setScanning] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const city = CITIES.find((c) => c.id === cityId)
  const aspect = ASPECTS.find((a) => a.id === aspectId)
  const win = WINDOWS.find((w) => w.id === winId)
  const obs = OBSTRUCTIONS.find((o) => o.id === obsId)

  const result = useMemo(
    () =>
      surveyLight({
        lat: city.lat,
        lon: city.lon,
        clarity: city.clarity,
        dayOfYear: MONTH_MID_DOY[month - 1],
        windowAz: aspect.az,
        windowArea: win.area,
        obstruction: obs.factor,
        ceiling,
        distance,
      }),
    [city, aspect, win, obs, ceiling, distance, month],
  )

  const noonAlt = useMemo(
    () => solarPosition(city.lat, city.lon, MONTH_MID_DOY[month - 1], 12).alt,
    [city, month],
  )

  const plant = matchPlant(result.dli)
  const care = careProtocol(result.dli, aspectId, month)

  const runScan = () => {
    if (!authed) {
      onRequireAuth('signup')
      return
    }
    setScanning(true)
    setRevealed(false)
    setTimeout(() => {
      setScanning(false)
      setRevealed(true)
    }, 1400)
  }

  const band =
    result.dli < 4
      ? { short: 'Limited', t: 'Light-limited interior', tone: 'warn', c: '#C25A38' }
      : result.dli < 10
        ? { short: 'Moderate', t: 'Moderate interior', tone: 'gold', c: '#D4AF37' }
        : { short: 'High', t: 'High-light interior', tone: 'good', c: '#4E7C5E' }

  return (
    <section id="recon" className="relative border-t border-soil-800 bg-soil-950 py-24 sm:py-32">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <Reveal>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow icon={ScanLine}>Feature 01 · Zero-hardware</Eyebrow>
              <h2 className="mt-5 max-w-[18ch] font-display text-[2.15rem] leading-[1.08] text-parchment sm:text-[2.9rem]">
                AI Plant Reconnaissance <span className="text-gold-500">&amp; Solar Path Simulator</span>
              </h2>
            </div>
            <p className="max-w-[42ch] text-[0.94rem] leading-[1.7] text-parchment-muted">
              We solve the real clear-sky equations for your latitude, your wall’s orientation and your
              glass area — then integrate the day into a single number your plant actually responds to.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
          {/* Step A */}
          <Reveal className="h-full">
            <div className="glass hairline h-full rounded-2xl p-6 sm:p-7">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 font-mono text-[0.62rem] font-semibold text-soil-950">
                  A
                </span>
                <span className="font-mono text-[0.62rem] tracking-[0.2em] uppercase text-parchment-muted">
                  Room Simulation
                </span>
              </div>

              <div className="flex flex-col gap-6">
                <div>
                  <p className="mb-2.5 font-mono text-[0.62rem] tracking-[0.18em] uppercase text-parchment-dim">
                    <MapPin className="mr-1.5 inline h-3 w-3" strokeWidth={1.6} />
                    City
                  </p>
                  <Segmented
                    options={CITIES.map((c) => ({ id: c.id, label: c.name, sub: c.aqi }))}
                    value={cityId}
                    onChange={setCityId}
                  />
                </div>

                <div>
                  <p className="mb-2.5 font-mono text-[0.62rem] tracking-[0.18em] uppercase text-parchment-dim">
                    <Compass className="mr-1.5 inline h-3 w-3" strokeWidth={1.6} />
                    Orientation
                  </p>
                  <Segmented options={ASPECTS} value={aspectId} onChange={setAspectId} columns={4} />
                  <p className="mt-2.5 text-[0.78rem] leading-relaxed text-parchment-dim">{aspect.note}</p>
                </div>

                <div>
                  <p className="mb-2.5 font-mono text-[0.62rem] tracking-[0.18em] uppercase text-parchment-dim">
                    <Ruler className="mr-1.5 inline h-3 w-3" strokeWidth={1.6} />
                    Glazing
                  </p>
                  <Segmented options={WINDOWS} value={winId} onChange={setWinId} />
                </div>

                <div>
                  <p className="mb-2.5 font-mono text-[0.62rem] tracking-[0.18em] uppercase text-parchment-dim">
                    <Building2 className="mr-1.5 inline h-3 w-3" strokeWidth={1.6} />
                    Sky access
                  </p>
                  <Segmented
                    options={OBSTRUCTIONS.map((o) => ({ id: o.id, label: o.label, sub: o.note }))}
                    value={obsId}
                    onChange={setObsId}
                    columns={1}
                  />
                </div>

                <Slider label="Ceiling height" value={ceiling} min={2.4} max={3.6} step={0.1} onChange={setCeiling} suffix=" m" />
                <Slider label="Plant distance from glass" value={distance} min={0.3} max={3} step={0.1} onChange={setDistance} suffix=" m" />

                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="font-mono text-[0.62rem] tracking-[0.18em] uppercase text-parchment-dim">Season</span>
                    <span className="font-mono text-[0.78rem] text-gold-400">{MONTHS[month - 1]}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    step={1}
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-soil-700 accent-[#D4AF37]"
                  />
                </div>

                <div className="overflow-hidden rounded-xl border border-soil-700/70 bg-soil-950/70 p-2">
                  <RoomSection
                    aspect={aspect.id}
                    windowArea={win.area}
                    ceiling={ceiling}
                    distance={distance}
                    noonAlt={noonAlt}
                  />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Steps B + C */}
          <div className="flex flex-col gap-5">
            <Reveal delay={0.08}>
              <div className="glass hairline relative overflow-hidden rounded-2xl p-6 sm:p-7">
                {scanning && (
                  <motion.div
                    className="pointer-events-none absolute inset-x-0 z-20 h-24 bg-gradient-to-b from-transparent via-gold-500/18 to-transparent"
                    initial={{ top: '-20%' }}
                    animate={{ top: '110%' }}
                    transition={{ duration: 1.4, ease: 'linear' }}
                  />
                )}

                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 font-mono text-[0.62rem] font-semibold text-soil-950">
                      B
                    </span>
                    <span className="font-mono text-[0.62rem] tracking-[0.2em] uppercase text-parchment-muted">
                      Live Math Engine
                    </span>
                  </div>
                  <span className="flex items-center gap-2 font-mono text-[0.58rem] tracking-[0.16em] uppercase text-moss-400">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-moss-400 opacity-70" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-moss-400" />
                    </span>
                    Solving · {city.lat.toFixed(2)}°N {city.lon.toFixed(2)}°E
                  </span>
                </div>

                <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Peak PPFD" value={result.peakPpfd} unit="µmol" icon={Sun} tone="gold" />
                    <Field label="Peak sun hours" value={result.peakSunHours} unit="h" icon={Clock} />
                    <Field label="Solar noon alt." value={noonAlt.toFixed(1)} unit="°" icon={TrendingUp} />
                    <Field label="Classification" value={band.short} icon={Gauge} tone={band.tone} />
                  </div>
                  <div className="flex justify-center sm:pl-4">
                    <DliGauge dli={result.dli} />
                  </div>
                </div>

                <div className="mt-6 h-[210px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={result.series} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ppfdFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.55} />
                          <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#3A2E27" strokeDasharray="2 4" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={{ stroke: '#3A2E27' }}
                        interval={5}
                        minTickGap={18}
                      />
                      <YAxis tickLine={false} axisLine={false} width={46} />
                      <Tooltip content={<ChartTip />} cursor={{ stroke: '#D4AF37', strokeOpacity: 0.35 }} />
                      <ReferenceLine y={200} stroke="#4E7C5E" strokeDasharray="3 3" strokeOpacity={0.7} />
                      <Area
                        type="monotone"
                        dataKey="ppfd"
                        stroke="#D4AF37"
                        strokeWidth={1.8}
                        fill="url(#ppfdFill)"
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="alt"
                        stroke="#4E7C5E"
                        strokeWidth={1.2}
                        dot={false}
                        strokeDasharray="4 3"
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 flex items-start gap-2 font-mono text-[0.6rem] leading-relaxed tracking-wider text-parchment-dim">
                  <Info className="mt-px h-3 w-3 shrink-0" strokeWidth={1.6} />
                  GOLD — photon flux at the plant. GREEN DASH — solar altitude. 200 µmol is the
                  working threshold for foliage species; you clear it for{' '}
                  <span className="text-gold-500">{result.usableHours.toFixed(1)} h</span> a day in{' '}
                  {MONTHS[month - 1]}.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <Button onClick={runScan} disabled={scanning} className="w-full sm:w-auto">
                    {scanning ? (
                      <>
                        <Radio className="h-4 w-4 animate-pulse" strokeWidth={1.7} />
                        Reconnoitring…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" strokeWidth={1.7} />
                        Generate care protocol
                      </>
                    )}
                  </Button>
                  {!authed && (
                    <p className="font-mono text-[0.6rem] tracking-[0.14em] uppercase text-parchment-dim">
                      Free account required
                    </p>
                  )}
                </div>
              </div>
            </Reveal>

            {!authed && (
              <Reveal delay={0.12}>
                <LockedPanel
                  title="The protocol is behind a free account"
                  blurb="The light survey above is open to everyone. Matching a species to that reading, and turning it into a watering and feeding schedule, needs somewhere to keep your plants."
                  onSignIn={onRequireAuth}
                />
              </Reveal>
            )}

            <AnimatePresence>
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="hairline overflow-hidden rounded-2xl bg-gradient-to-br from-moss-900 via-soil-900 to-soil-950">
                    <div className="flex items-center gap-3 border-b border-gold-500/15 px-6 py-4 sm:px-7">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 font-mono text-[0.62rem] font-semibold text-soil-950">
                        C
                      </span>
                      <span className="font-mono text-[0.62rem] tracking-[0.2em] uppercase text-parchment-muted">
                        Diagnostic Card
                      </span>
                      <span className="ml-auto flex items-center gap-1.5 font-mono text-[0.56rem] tracking-[0.16em] uppercase text-gold-500">
                        <BadgeCheck className="h-3.5 w-3.5" strokeWidth={1.6} />
                        Match confidence 94%
                      </span>
                    </div>

                    <div className="p-6 sm:p-7">
                      <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={plant.img}
                            alt={plant.common}
                            className="h-20 w-20 shrink-0 rounded-xl border border-gold-500/20 object-cover"
                          />
                          <div>
                            <p className="eyebrow">{plant.tier}</p>
                            <h3 className="mt-1.5 font-display text-[2rem] leading-tight text-parchment">{plant.common}</h3>
                            <p className="font-display text-sm italic text-moss-400">{plant.latin}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[0.56rem] tracking-[0.18em] uppercase text-parchment-dim">
                            Your reading
                          </p>
                          <p className="tnum font-display text-3xl" style={{ color: band.c }}>
                            {result.dli.toFixed(1)}
                          </p>
                          <p className="font-mono text-[0.56rem] tracking-[0.14em] uppercase text-parchment-dim">
                            {band.t}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 max-w-[62ch] text-[0.94rem] leading-[1.72] text-parchment-muted">
                        {plant.blurb}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {plant.companions.map((c) => (
                          <span
                            key={c}
                            className="rounded-full border border-moss-500/30 bg-moss-800/40 px-3 py-1.5 font-mono text-[0.6rem] tracking-wider uppercase text-moss-400"
                          >
                            {c}
                          </span>
                        ))}
                      </div>

                      <div className="mt-7 border-t border-soil-700/70 pt-6">
                        <p className="eyebrow mb-4">Custom Care Protocol</p>
                        <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-soil-700/70 bg-soil-700/40">
                          {[
                            {
                              icon: Droplets,
                              k: 'Watering',
                              v: `Every ${care.waterDays} days`,
                              n: care.waterNote,
                            },
                            {
                              icon: Sprout,
                              k: 'Aadhar-Vati',
                              v: `${care.grams} g every ${care.feedWeeks} weeks`,
                              n: 'Fork into the top 2 cm and water in. It cannot burn roots at any dose.',
                            },
                            {
                              icon: Wind,
                              k: 'Shuddhi mist',
                              v: care.mist,
                              n: 'Leaf-surface pH and dust load govern stomatal efficiency more than people expect.',
                            },
                            {
                              icon: Compass,
                              k: 'Rotation',
                              v: care.rotate,
                              n: 'Phototropic correction — keeps the stem plumb and the canopy even.',
                            },
                          ].map((r) => (
                            <div key={r.k} className="flex gap-4 bg-soil-950/85 px-5 py-4">
                              <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" strokeWidth={1.6} />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-baseline gap-x-3">
                                  <span className="font-mono text-[0.6rem] tracking-[0.16em] uppercase text-parchment-dim">
                                    {r.k}
                                  </span>
                                  <span className="text-[0.92rem] text-parchment">{r.v}</span>
                                </div>
                                <p className="mt-1 text-[0.8rem] leading-relaxed text-parchment-dim">{r.n}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button className="mt-6 w-full sm:w-auto" onClick={() => onAdd('trial')}>
                        <Package className="h-4 w-4" strokeWidth={1.7} />
                        Add the matching 5 kg pack
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── product ──────────────────────────────────────────────────────────── */

function Accordion({ items }) {
  const [open, setOpen] = useState(0)
  return (
    <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-soil-700/70 bg-soil-700/40">
      {items.map((it, i) => {
        const isOpen = open === i
        return (
          <div key={it.title} className="bg-soil-950/85">
            <button
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="flex items-center gap-3">
                <it.icon className="h-4 w-4 text-gold-500" strokeWidth={1.6} />
                <span className="font-display text-lg text-parchment">{it.title}</span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-parchment-dim transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                strokeWidth={1.6}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pl-12">{it.body}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

function Product({ onAdd, plan, setPlan }) {
  const [qty, setQty] = useState(1)
  const active = CATALOG[plan]

  const accordion = [
    {
      title: 'Biological Ingredients',
      icon: FlaskConical,
      body: (
        <div>
          <div className="flex flex-col gap-2">
            {INGREDIENTS.map(([n, pct, note]) => (
              <div key={n} className="flex items-baseline gap-3 border-b border-soil-800 pb-2 last:border-0">
                <span className="tnum w-11 shrink-0 font-mono text-[0.72rem] text-gold-500">{pct}</span>
                <div className="min-w-0">
                  <p className="text-[0.9rem] text-parchment">{n}</p>
                  <p className="font-mono text-[0.66rem] tracking-wide text-parchment-dim">{note}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['N-P-K', '1.8 · 1.2 · 1.6'],
              ['pH', '6.9'],
              ['Moisture', '28%'],
              ['Screen', '4 mm'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-soil-700/70 px-3 py-2">
                <p className="font-mono text-[0.55rem] tracking-[0.16em] uppercase text-parchment-dim">{k}</p>
                <p className="tnum font-mono text-[0.82rem] text-parchment">{v}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'How to Apply',
      icon: Scale,
      body: (
        <ol className="flex flex-col gap-3">
          {[
            'Top-dress 60 g — roughly four heaped tablespoons — per 8-inch pot.',
            'Fork it gently into the top 2 cm of substrate. Do not dig; you will tear feeder roots.',
            'Water in slowly until the first drops leave the drainage hole.',
            'Repeat every 6–8 weeks. For a fresh potting mix, blend at 25% by volume.',
          ].map((s, i) => (
            <li key={i} className="flex gap-3.5">
              <span className="tnum mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gold-500/35 font-mono text-[0.6rem] text-gold-500">
                {i + 1}
              </span>
              <span className="text-[0.9rem] leading-relaxed text-parchment-muted">{s}</span>
            </li>
          ))}
        </ol>
      ),
    },
    {
      title: 'The 14-Day Guarantee',
      icon: ShieldCheck,
      body: (
        <div className="flex flex-col gap-3 text-[0.9rem] leading-relaxed text-parchment-muted">
          <p>
            Photograph your plant in Prana-Lekha on day zero. If our diagnostic engine cannot measure an
            improvement in leaf turgor, colour index or new growth within fourteen days, we refund the
            order in full.
          </p>
          <p className="text-parchment">You keep the pack. Returning five kilos of living soil helps nobody.</p>
          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
            {['No return shipping', 'No form to fill', 'Refund in 3 working days'].map((x) => (
              <span key={x} className="flex items-center gap-2 font-mono text-[0.66rem] tracking-wider text-moss-400">
                <Check className="h-3.5 w-3.5" strokeWidth={2} />
                {x}
              </span>
            ))}
          </div>
        </div>
      ),
    },
  ]

  const plans = [
    {
      id: 'trial',
      name: 'Single Trial Pack',
      weight: '5 kg · one-time',
      price: 499,
      per: '₹99.8 / kg',
      perks: ['One 5 kg pouch', 'Batch traceability card', 'AI Recon access', '14-day guarantee'],
    },
    {
      id: 'quarterly',
      name: 'Quarterly Refill',
      weight: '15 kg · every 90 days',
      price: 1299,
      per: '₹86.6 / kg',
      badge: 'Free Prana-Yantra · worth ₹399',
      perks: [
        'Three 5 kg pouches per quarter',
        'Neem-wood Prana-Yantra NFC marker',
        'Prana-Lekha 3D journal, unlocked',
        'Priority seasonal re-scan',
      ],
    },
  ]

  return (
    <section id="product" className="relative border-t border-soil-800 py-24 sm:py-32">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <Reveal>
          <Eyebrow icon={Package}>Feature 02 · The Hero Product</Eyebrow>
          <h2 className="mt-5 max-w-[20ch] font-display text-[2.15rem] leading-[1.08] text-parchment sm:text-[2.9rem]">
            Aadhar-Vati. <span className="text-gold-500">The base tablet of living soil.</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <div className="hairline rounded-2xl bg-gradient-to-b from-soil-900 to-soil-950 p-8 sm:p-10">
                <Pouch />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  [Bug, '11,400', 'worms / m³'],
                  [Timer, '60', 'day cure'],
                  [Layers, '4 mm', 'screened'],
                ].map(([Icon, v, l]) => (
                  <div key={l} className="rounded-xl border border-soil-700/70 bg-soil-900/40 px-3 py-3 text-center">
                    <Icon className="mx-auto mb-1.5 h-3.5 w-3.5 text-gold-600" strokeWidth={1.6} />
                    <p className="tnum font-mono text-[0.85rem] text-parchment">{v}</p>
                    <p className="font-mono text-[0.53rem] tracking-[0.14em] uppercase text-parchment-dim">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <div className="flex flex-col gap-6">
            <Reveal delay={0.06}>
              <div className="grid gap-3 sm:grid-cols-2">
                {plans.map((p) => {
                  const on = plan === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPlan(p.id)}
                      aria-pressed={on}
                      className={`relative rounded-2xl border p-6 text-left transition-all duration-300 ${
                        on
                          ? 'border-gold-500/70 bg-gold-500/[0.07] shadow-[0_0_40px_-18px_rgba(212,175,55,0.7)]'
                          : 'border-soil-700 bg-soil-900/40 hover:border-soil-600'
                      }`}
                    >
                      {p.badge && (
                        <span className="absolute -top-2.5 left-5 rounded-full bg-gold-500 px-2.5 py-1 font-mono text-[0.53rem] font-semibold tracking-[0.12em] uppercase text-soil-950">
                          {p.badge}
                        </span>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-xl text-parchment">{p.name}</p>
                          <p className="font-mono text-[0.62rem] tracking-[0.14em] uppercase text-parchment-dim">
                            {p.weight}
                          </p>
                        </div>
                        <span
                          className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            on ? 'border-gold-500 bg-gold-500' : 'border-soil-600'
                          }`}
                        >
                          {on && <Check className="h-2.5 w-2.5 text-soil-950" strokeWidth={3.5} />}
                        </span>
                      </div>
                      <p className="tnum mt-5 font-display text-[2.1rem] leading-none text-parchment">
                        ₹{p.price.toLocaleString('en-IN')}
                      </p>
                      <p className="tnum font-mono text-[0.62rem] tracking-wider text-gold-500">{p.per}</p>
                      <ul className="mt-5 flex flex-col gap-2">
                        {p.perks.map((x) => (
                          <li key={x} className="flex gap-2.5 text-[0.82rem] leading-snug text-parchment-muted">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-moss-500" strokeWidth={2} />
                            {x}
                          </li>
                        ))}
                      </ul>
                    </button>
                  )
                })}
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="glass hairline flex flex-wrap items-center gap-4 rounded-2xl p-5">
                <div className="flex items-center rounded-full border border-soil-700">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="p-3 text-parchment-muted transition-colors hover:text-gold-500"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <span className="tnum w-8 text-center font-mono text-sm text-parchment">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(12, q + 1))}
                    className="p-3 text-parchment-muted transition-colors hover:text-gold-500"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>

                <div className="mr-auto">
                  <p className="tnum font-display text-2xl text-parchment">
                    ₹{(active.price * qty).toLocaleString('en-IN')}
                  </p>
                  <p className="font-mono text-[0.58rem] tracking-[0.14em] uppercase text-parchment-dim">
                    {active.unit} · free delivery over ₹999
                  </p>
                </div>

                <Button onClick={() => onAdd(plan, qty)} className="flex-1 sm:flex-none">
                  <ShoppingBag className="h-4 w-4" strokeWidth={1.7} />
                  Add to cart
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.14}>
              <Accordion items={accordion} />
            </Reveal>

            <Reveal delay={0.18}>
              <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-xl border border-moss-500/20 bg-moss-900/30 px-5 py-4">
                {[
                  [Recycle, 'Compostable kraft pouch'],
                  [Trees, 'Carbon-negative production'],
                  [Nfc, 'NFC batch verification'],
                ].map(([Icon, t]) => (
                  <span key={t} className="flex items-center gap-2.5 text-[0.8rem] text-parchment-muted">
                    <Icon className="h-4 w-4 text-moss-400" strokeWidth={1.5} />
                    {t}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── sanctuary ────────────────────────────────────────────────────────── */

function LandFrame({ bed, cam }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-soil-700/70 bg-soil-950">
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={bed % 2 ? IMG.beds : IMG.land}
          alt={`Bed ${bed} at the Sonipat facility`}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-soil-950/80 via-transparent to-soil-950/40" />
        <motion.div
          className="pointer-events-none absolute inset-x-0 h-px bg-gold-500/40"
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3.5">
        <div className="flex items-start justify-between">
          <span className="flex items-center gap-1.5 rounded-sm bg-soil-950/70 px-2 py-1 font-mono text-[0.55rem] tracking-[0.16em] text-terracotta-soft backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-terracotta" />
            REC
          </span>
          <span className="rounded-sm bg-soil-950/70 px-2 py-1 font-mono text-[0.55rem] tracking-[0.14em] text-parchment-muted backdrop-blur">
            BED-{String(bed).padStart(3, '0')} · CAM {String(cam).padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <span className="rounded-sm bg-soil-950/70 px-2 py-1 font-mono text-[0.55rem] tracking-[0.14em] text-parchment-dim backdrop-blur">
            28.42°N 77.09°E · SONIPAT
          </span>
          <span className="flex items-center gap-1.5 rounded-sm bg-soil-950/70 px-2 py-1 font-mono text-[0.55rem] tracking-[0.14em] text-parchment-dim backdrop-blur">
            <Camera className="h-2.5 w-2.5" strokeWidth={1.8} />
            2160p
          </span>
        </div>
      </div>
    </div>
  )
}

function Sanctuary() {
  const [bed, setBed] = useState(42)
  const [query, setQuery] = useState('BED-042')
  const t = bedTelemetry(bed)

  const submit = (e) => {
    e.preventDefault()
    const n = parseInt(query.replace(/\D/g, ''), 10)
    if (!Number.isNaN(n) && n >= 1 && n <= 60) {
      setBed(n)
      setQuery(`BED-${String(n).padStart(3, '0')}`)
    }
  }

  const pick = (n) => {
    setBed(n)
    setQuery(`BED-${String(n).padStart(3, '0')}`)
  }

  return (
    <section id="sanctuary" className="relative border-t border-soil-800 bg-soil-950 py-24 sm:py-32">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <Reveal>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow icon={Trees}>Feature 03 · Traceability Engine</Eyebrow>
              <h2 className="mt-5 max-w-[17ch] font-display text-[2.15rem] leading-[1.08] text-parchment sm:text-[2.9rem]">
                The 3.5-Acre <span className="text-gold-500">Sanctuary</span>
              </h2>
            </div>
            <p className="max-w-[40ch] text-[0.94rem] leading-[1.7] text-parchment-muted">
              Sixty beds, each on its own sixty-day clock. Type the batch number printed on your pouch
              and watch the bed it came from, live.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.06fr_0.94fr]">
          <Reveal>
            <div className="glass hairline rounded-2xl p-5 sm:p-6">
              <LandFrame bed={bed} cam={t.cam} />

              <form onSubmit={submit} className="mt-5 flex gap-2">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-dim"
                    strokeWidth={1.6}
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value.toUpperCase())}
                    placeholder="BED-042"
                    aria-label="Batch number"
                    className="tnum w-full rounded-full border border-soil-700 bg-soil-900/60 py-3 pl-10 pr-4 font-mono text-sm tracking-widest text-parchment placeholder:text-parchment-dim/60 focus:border-gold-500/60"
                  />
                </div>
                <Button type="submit" variant="moss" className="!px-6">
                  Trace
                </Button>
              </form>

              <p className="mt-4 font-mono text-[0.58rem] tracking-[0.16em] uppercase text-parchment-dim">
                Or select a bed · Row {t.row}
              </p>
              <div className="mt-2.5 grid grid-cols-10 gap-1">
                {Array.from({ length: 60 }, (_, i) => i + 1).map((n) => {
                  const on = n === bed
                  const day = bedTelemetry(n).cycleDay
                  return (
                    <button
                      key={n}
                      onClick={() => pick(n)}
                      title={`BED-${String(n).padStart(3, '0')} · day ${day}/60`}
                      aria-label={`Bed ${n}`}
                      className={`aspect-square rounded-sm transition-all duration-200 ${
                        on
                          ? 'bg-gold-500 ring-2 ring-gold-500/40'
                          : day > 52
                            ? 'bg-moss-500/60 hover:bg-moss-400'
                            : 'bg-soil-700 hover:bg-soil-600'
                      }`}
                    />
                  )
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[0.55rem] tracking-[0.14em] uppercase text-parchment-dim">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-moss-500/60" /> Harvest-ready
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-soil-700" /> In cycle
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-gold-500" /> Selected
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="glass hairline flex h-full flex-col rounded-2xl p-6 sm:p-7">
              <div className="flex items-baseline justify-between border-b border-soil-700/70 pb-4">
                <div>
                  <p className="eyebrow">Live telemetry</p>
                  <h3 className="tnum mt-1.5 font-display text-3xl text-parchment">
                    BED-{String(bed).padStart(3, '0')}
                  </h3>
                </div>
                <span className="rounded-full border border-moss-500/30 bg-moss-800/40 px-3 py-1.5 font-mono text-[0.58rem] tracking-[0.14em] uppercase text-moss-400">
                  {t.cycleDay > 52 ? 'Harvest window' : 'Fermenting'}
                </span>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="font-mono text-[0.6rem] tracking-[0.16em] uppercase text-parchment-dim">
                    Fermentation cycle
                  </span>
                  <span className="tnum font-mono text-[0.76rem] text-gold-400">Day {t.cycleDay} of 60</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-soil-700">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-moss-600 to-gold-500"
                    initial={false}
                    animate={{ width: `${(t.cycleDay / 60) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 70, damping: 18 }}
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <Field
                  label="Moisture"
                  value={t.moisture}
                  unit="%"
                  icon={Droplets}
                  tone={t.moisture >= 70 && t.moisture <= 82 ? 'good' : 'warn'}
                />
                <Field label="Earthworm density" value={t.worms.toLocaleString('en-IN')} unit="/m³" icon={Bug} tone="gold" />
                <Field label="Core temp" value={t.temp} unit="°C" icon={Thermometer} />
                <Field label="C:N ratio" value={`${t.cn} : 1`} icon={Activity} />
                <Field label="pH" value={t.ph} icon={FlaskConical} />
                <Field label="Feedstock" value={t.feedstock} icon={Recycle} />
              </div>

              <div className="mt-5 flex-1 rounded-xl border border-soil-700/70 bg-soil-900/40 p-4">
                <p className="eyebrow mb-3">Chain of custody</p>
                <div className="flex flex-col gap-3">
                  {[
                    ['Feedstock intake', `Day 0 · ${t.feedstock}`],
                    ['Thermophilic pre-compost', 'Day 0–12 · 62 °C peak'],
                    ['Worm inoculation', `Day 13 · Eisenia fetida to ${t.worms.toLocaleString('en-IN')}/m³`],
                    ['Curing & screening', `Day 52–60 · 4 mm`],
                  ].map(([k, v], i) => {
                    const done = t.cycleDay > [0, 12, 13, 52][i]
                    return (
                      <div key={k} className="flex gap-3">
                        <span className="mt-0.5">
                          {done ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-moss-500" strokeWidth={1.8} />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-parchment-dim" strokeWidth={1.8} />
                          )}
                        </span>
                        <div>
                          <p className={`text-[0.84rem] ${done ? 'text-parchment' : 'text-parchment-dim'}`}>{k}</p>
                          <p className="font-mono text-[0.62rem] tracking-wide text-parchment-dim">{v}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ── journal ──────────────────────────────────────────────────────────── */

function PlantPortrait({ week }) {
  const growth = 1 - Math.exp(-week / 17)
  const stem = 20 + growth * 82
  const leaves = Math.min(14, 2 + Math.floor(growth * 15))
  return (
    <svg viewBox="0 0 150 175" className="h-full w-full" role="img" aria-label={`Growth capture, week ${week}`}>
      <defs>
        <radialGradient id="portraitBg" cx="50%" cy="35%">
          <stop offset="0%" stopColor="#2B211C" />
          <stop offset="100%" stopColor="#100C0A" />
        </radialGradient>
      </defs>
      <rect width="150" height="175" fill="url(#portraitBg)" />
      <ellipse cx="75" cy="152" rx="42" ry="7" fill="#000" opacity="0.5" />
      <path d="M55 152 L95 152 L89 122 L61 122Z" fill="#3A2E27" />
      <path d="M61 122 L89 122 L88 117 L62 117Z" fill="#4E3E34" />
      <path d={`M75 122 V${122 - stem}`} stroke="#4E7C5E" strokeWidth="2.2" strokeLinecap="round" />
      {Array.from({ length: leaves }, (_, i) => {
        const t = (i + 1) / (leaves + 1)
        const y = 122 - stem * t
        const side = i % 2 === 0 ? 1 : -1
        const len = 15 + growth * 19 * (1 - t * 0.35)
        return (
          <path
            key={i}
            d={`M75 ${y} c${side * len * 0.55} ${-3} ${side * len} ${-len * 0.52} ${side * len} ${-len * 0.86} c${-side * len * 0.62} ${len * 0.1} ${-side * len} ${len * 0.4} ${-side * len} ${len * 0.86}Z`}
            fill={i % 3 === 0 ? '#4E7C5E' : '#7BA88C'}
            opacity={0.55 + t * 0.42}
          />
        )
      })}
    </svg>
  )
}

function Journal() {
  const [week, setWeek] = useState(38)

  const series = useMemo(
    () =>
      Array.from({ length: 52 }, (_, i) => {
        const w = i + 1
        const g = 1 - Math.exp(-w / 17)
        const wobble = Math.sin(w / 3.4) * 3.6 + Math.sin(w / 1.7) * 1.5
        return {
          week: w,
          health: Math.round(clamp(56 + g * 40 + wobble, 40, 99)),
          height: Math.round(24 + g * 96),
        }
      }),
    [],
  )

  const now = series[week - 1]
  const log = JOURNAL_LOG.filter((l) => l.week <= week).slice(-4).reverse()

  return (
    <section id="journal" className="relative border-t border-soil-800 py-24 sm:py-32">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <Reveal>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow icon={Bot}>Feature 04 · Coming to the ecosystem</Eyebrow>
              <h2 className="mt-5 max-w-[18ch] font-display text-[2.15rem] leading-[1.08] text-parchment sm:text-[2.9rem]">
                Prana-Lekha <span className="text-gold-500">3D Life Journal</span>
              </h2>
            </div>
            <p className="max-w-[40ch] text-[0.94rem] leading-[1.7] text-parchment-muted">
              Fifty-two weeks of your plant, reconstructed from a phone camera. Drag the scrubber to walk
              the timeline.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-12 overflow-hidden rounded-2xl border border-soil-700/60 bg-gradient-to-br from-soil-900 via-soil-950 to-moss-900/40">
            <div className="flex flex-wrap items-center gap-3 border-b border-soil-800 px-6 py-4">
              <span className="flex items-center gap-2 font-mono text-[0.6rem] tracking-[0.18em] uppercase text-parchment-muted">
                <Nfc className="h-3.5 w-3.5 text-gold-500" strokeWidth={1.6} />
                PY-7734 · Monstera “Bhoomi”
              </span>
              <span className="ml-auto tnum font-mono text-[0.6rem] tracking-[0.16em] uppercase text-parchment-dim">
                Week {String(week).padStart(2, '0')} / 52
              </span>
            </div>

            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr]">
              <div className="flex gap-3">
                {[Math.max(1, week - 16), Math.max(1, week - 8), week].map((w, i) => (
                  <div
                    key={i}
                    className={`overflow-hidden rounded-xl border ${
                      i === 2 ? 'border-gold-500/50' : 'border-soil-700/70 opacity-55'
                    }`}
                    style={{ width: i === 2 ? 128 : 88 }}
                  >
                    <PlantPortrait week={w} />
                    <p className="tnum bg-soil-950/85 py-1.5 text-center font-mono text-[0.55rem] tracking-widest text-parchment-dim">
                      W{String(w).padStart(2, '0')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <Field label="Health index" value={now.health} unit="/100" icon={HeartPulse} tone="good" />
                  <Field label="Height" value={now.height} unit="cm" icon={Ruler} />
                  <Field label="Captures" value={week * 2} icon={Camera} />
                  <Field label="Next feed" value={`${Math.max(0, 6 - (week % 6))} wks`} icon={CalendarDays} tone="gold" />
                </div>

                <div className="h-[136px] w-full rounded-xl border border-soil-700/70 bg-soil-950/60 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 4, right: 4, left: -30, bottom: -4 }}>
                      <defs>
                        <linearGradient id="healthFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4E7C5E" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#4E7C5E" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#3A2E27" strokeDasharray="2 4" vertical={false} />
                      <XAxis dataKey="week" tickLine={false} axisLine={false} interval={12} />
                      <YAxis domain={[40, 100]} tickLine={false} axisLine={false} width={40} />
                      <ReferenceLine x={week} stroke="#D4AF37" strokeWidth={1.2} />
                      <Area
                        type="monotone"
                        dataKey="health"
                        stroke="#4E7C5E"
                        strokeWidth={1.6}
                        fill="url(#healthFill)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <input
                  type="range"
                  min={1}
                  max={52}
                  value={week}
                  onChange={(e) => setWeek(parseInt(e.target.value, 10))}
                  aria-label="Timeline week"
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-soil-700 accent-[#D4AF37]"
                />

                <div className="flex flex-col gap-2">
                  <p className="eyebrow">AI diagnostic log</p>
                  {log.map((l) => (
                    <div
                      key={l.week}
                      className="flex gap-3 rounded-lg border border-soil-700/60 bg-soil-950/60 px-4 py-2.5"
                    >
                      <span className="tnum mt-0.5 font-mono text-[0.6rem] tracking-wider text-parchment-dim">
                        W{String(l.week).padStart(2, '0')}
                      </span>
                      <span
                        className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          l.kind === 'warn' ? 'bg-terracotta' : 'bg-moss-500'
                        }`}
                      />
                      <p className="text-[0.82rem] leading-relaxed text-parchment-muted">{l.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Droplets, n: 'Amrit', d: 'Liquid Nectar — root-drench bio-stimulant' },
              { icon: Wind, n: 'Shuddhi', d: 'Leaf Mist — stomatal dust clearance' },
              { icon: HeartPulse, n: 'Jeevan', d: 'Recovery Drops — acute stress triage' },
              { icon: Nfc, n: 'Prana-Yantra', d: 'Neem-wood NFC & QR plant marker' },
            ].map((p) => (
              <div
                key={p.n}
                className="group rounded-xl border border-soil-700/60 bg-soil-900/40 p-5 transition-colors duration-400 hover:border-gold-500/35"
              >
                <p.icon className="h-4 w-4 text-gold-600 transition-colors group-hover:text-gold-500" strokeWidth={1.6} />
                <p className="mt-3 font-display text-lg text-parchment">{p.n}</p>
                <p className="mt-1 text-[0.8rem] leading-relaxed text-parchment-dim">{p.d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ── proof + b2b ──────────────────────────────────────────────────────── */

function Proof() {
  return (
    <section id="proof" className="relative border-t border-soil-800 bg-soil-950 py-24 sm:py-32">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <Reveal>
          <Eyebrow icon={Quote}>From Tier-1 balconies</Eyebrow>
          <h2 className="mt-5 max-w-[22ch] font-display text-[2.15rem] leading-[1.08] text-parchment sm:text-[2.6rem]">
            Written by people with <span className="text-gold-500">one window and high hopes.</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {REVIEWS.map((r, i) => (
            <Reveal key={r.name} delay={i * 0.08}>
              <figure className="flex h-full flex-col rounded-2xl border border-soil-700/60 bg-soil-900/40 p-7 transition-colors duration-500 hover:border-gold-500/30">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-gold-500 text-gold-500" strokeWidth={0} />
                  ))}
                </div>
                <blockquote className="mt-5 flex-1 text-[0.95rem] leading-[1.75] text-parchment-muted">
                  {r.quote}
                </blockquote>
                <figcaption className="mt-6 border-t border-soil-800 pt-5">
                  <p className="font-display text-base text-parchment">{r.name}</p>
                  <p className="mt-0.5 font-mono text-[0.6rem] leading-relaxed tracking-wide text-parchment-dim">
                    {r.place}
                  </p>
                  <p className="mt-2.5 flex items-center gap-2 font-mono text-[0.6rem] tracking-wide text-moss-400">
                    <Leaf className="h-3 w-3" strokeWidth={1.7} />
                    {r.plant} · week {r.weeks}
                  </p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-6 overflow-hidden rounded-2xl border border-gold-500/20 bg-gradient-to-r from-moss-900 via-soil-900 to-soil-900">
            <div className="flex flex-col gap-6 p-7 sm:p-9 lg:flex-row lg:items-center">
              <div className="flex-1">
                <Eyebrow icon={Building2}>For institutions</Eyebrow>
                <h3 className="mt-3 max-w-[34ch] font-display text-[1.6rem] leading-tight text-parchment">
                  Corporate ESG, SEBI BRSR green-compliance data, or a school living lab?
                </h3>
                <p className="mt-3 max-w-[62ch] text-[0.9rem] leading-relaxed text-parchment-muted">
                  Every bed logs feedstock diversion, carbon retention and water use against BRSR
                  Principle 6. We hand your reporting team the raw ledger, not a brochure.
                </p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                  {['Audited diversion tonnage', 'Per-batch carbon ledger', 'Living-lab curriculum kit'].map((x) => (
                    <span key={x} className="flex items-center gap-2 font-mono text-[0.62rem] tracking-wide text-gold-500">
                      <Check className="h-3 w-3" strokeWidth={2.2} />
                      {x}
                    </span>
                  ))}
                </div>
              </div>
              <Button variant="ghost" className="shrink-0">
                Request institutional audit
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.7} />
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ── footer ───────────────────────────────────────────────────────────── */

function Footer() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const groups = [
    ['Products', ['Aadhar-Vati 5 kg', 'Quarterly Refill', 'Prana-Yantra Marker', 'Amrit (soon)', 'Shuddhi (soon)']],
    ['The Land', ['The 3.5-Acre Sanctuary', 'Batch Traceability', 'Carbon Ledger', 'Visit the Beds']],
    ['Company', ['The Foundation', 'Institutional Audit', 'Refund Policy', 'Contact']],
  ]

  return (
    <footer className="relative border-t border-gold-500/12 bg-soil-950 pt-20">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_1.75fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-gold-500">
                <OnkarMark className="h-8 w-8" />
              </span>
              <span className="font-display text-3xl text-parchment">Ekva</span>
            </div>
            <p className="mt-5 max-w-[42ch] font-display text-lg leading-relaxed italic text-parchment-muted">
              “Before the seed, the soil. Before the soil, the worm. Before the worm, the fallen leaf —
              and none of them are separate.”
            </p>
            <p className="mt-3 font-mono text-[0.6rem] leading-relaxed tracking-[0.14em] uppercase text-parchment-dim">
              A daily reading from the beds at Sonipat
            </p>

            <div className="mt-9 max-w-md">
              <p className="eyebrow mb-3">The Living Gazette</p>
              <p className="mb-4 text-[0.88rem] leading-relaxed text-parchment-muted">
                One letter each month: what the beds did, what the season demands of your balcony, and
                one thing we got wrong.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (email.includes('@')) setSent(true)
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email address"
                  className="flex-1 rounded-full border border-soil-700 bg-soil-900/60 px-5 py-3 text-sm text-parchment placeholder:text-parchment-dim/60 focus:border-gold-500/60"
                />
                <Button type="submit" variant={sent ? 'moss' : 'primary'} className="!px-6 shrink-0">
                  {sent ? <Check className="h-4 w-4" strokeWidth={2.4} /> : <Mail className="h-4 w-4" strokeWidth={1.7} />}
                  <span className="hidden sm:inline">{sent ? 'Subscribed' : 'Join'}</span>
                </Button>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {groups.map(([title, links]) => (
              <div key={title}>
                <p className="eyebrow mb-4">{title}</p>
                <ul className="flex flex-col gap-2.5">
                  {links.map((l) => (
                    <li key={l}>
                      <a
                        href="#canopy"
                        className="text-[0.86rem] text-parchment-muted transition-colors hover:text-gold-400"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* CC-BY requires visible attribution wherever the images are shown. */}
        <div className="mt-14 border-t border-soil-800 pt-6">
          <p className="eyebrow mb-3">Photography</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-1.5">
            {PHOTO_CREDITS.map(([what, who, lic]) => (
              <li key={what} className="font-mono text-[0.6rem] leading-relaxed tracking-wide text-parchment-dim">
                {what} — {who} ({lic})
              </li>
            ))}
          </ul>
          <p className="mt-2 font-mono text-[0.6rem] tracking-wide text-parchment-dim">
            Remaining imagery released under CC0. Demonstration build — all figures, batch telemetry
            and testimonials on this page are illustrative sample data, not records of a real facility.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-soil-800 py-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.62rem] tracking-wide text-parchment-dim">
            © 2026 Ekva Living Systems Pvt. Ltd. · Sonipat, Haryana · Made from fallen things.
          </p>
          <div className="flex gap-6">
            {['Privacy', 'Terms', 'Shipping'].map((l) => (
              <a key={l} href="#canopy" className="font-mono text-[0.62rem] tracking-wide text-parchment-dim hover:text-gold-500">
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ── cart ─────────────────────────────────────────────────────────────── */

function Cart({ open, onClose, items, setQty, remove, add }) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const shipping = subtotal >= 999 || subtotal === 0 ? 0 : 79

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open, onClose])

  // Keyed direct children: AnimatePresence cannot track exits through a Fragment,
  // which leaves the backdrop mounted and swallowing every click on the page.
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cart-backdrop"
          className="fixed inset-0 z-[70] bg-soil-950/75 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, pointerEvents: 'auto' }}
          exit={{ opacity: 0, pointerEvents: 'none' }}
          onClick={onClose}
        />
      )}
      {open && (
        <motion.aside
          key="cart-drawer"
          role="dialog"
          aria-label="Cart"
          className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-[420px] flex-col border-l border-gold-500/15 bg-soil-900"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 32 }}
        >
            <div className="flex items-center justify-between border-b border-soil-800 px-6 py-5">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-4 w-4 text-gold-500" strokeWidth={1.7} />
                <span className="font-display text-xl text-parchment">Your Cart</span>
              </div>
              <button onClick={onClose} className="rounded-full p-2 text-parchment-muted hover:text-gold-500" aria-label="Close cart">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Sprout className="h-8 w-8 text-soil-600" strokeWidth={1.3} />
                  <p className="mt-4 font-display text-lg text-parchment-muted">Nothing here yet.</p>
                  <p className="mt-1.5 max-w-[28ch] text-[0.84rem] text-parchment-dim">
                    Start with a 5 kg trial pack — it treats roughly eighteen 8-inch pots.
                  </p>
                  <Button className="mt-6" onClick={() => add('trial')}>
                    Add trial pack · ₹499
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {items.map((it) => (
                    <div key={it.sku} className="flex gap-4 border-b border-soil-800 pb-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-gold-500/20 bg-gradient-to-b from-soil-800 to-soil-950 text-gold-600">
                        <OnkarMark className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.9rem] leading-snug text-parchment">{it.name}</p>
                        <p className="font-mono text-[0.58rem] tracking-[0.14em] uppercase text-parchment-dim">
                          {it.sku} · {it.unit}
                        </p>
                        <div className="mt-2.5 flex items-center gap-3">
                          <div className="flex items-center rounded-full border border-soil-700">
                            <button onClick={() => setQty(it.sku, it.qty - 1)} className="px-2.5 py-1.5 text-parchment-dim hover:text-gold-500" aria-label="Decrease">
                              <Minus className="h-3 w-3" strokeWidth={2.2} />
                            </button>
                            <span className="tnum w-6 text-center font-mono text-xs text-parchment">{it.qty}</span>
                            <button onClick={() => setQty(it.sku, it.qty + 1)} className="px-2.5 py-1.5 text-parchment-dim hover:text-gold-500" aria-label="Increase">
                              <Plus className="h-3 w-3" strokeWidth={2.2} />
                            </button>
                          </div>
                          <span className="tnum ml-auto font-mono text-sm text-gold-400">
                            ₹{(it.price * it.qty).toLocaleString('en-IN')}
                          </span>
                          <button onClick={() => remove(it.sku)} className="text-parchment-dim hover:text-terracotta" aria-label="Remove">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {!items.some((i) => i.sku === CATALOG.yantra.sku) && (
                    <button
                      onClick={() => add('yantra')}
                      className="flex items-center gap-3 rounded-xl border border-dashed border-gold-500/30 px-4 py-3.5 text-left transition-colors hover:border-gold-500/60 hover:bg-gold-500/[0.05]"
                    >
                      <Nfc className="h-4 w-4 shrink-0 text-gold-500" strokeWidth={1.6} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.85rem] text-parchment">Add a Prana-Yantra marker</p>
                        <p className="text-[0.72rem] text-parchment-dim">
                          Neem-wood NFC tag — unlocks the 3D journal for this plant.
                        </p>
                      </div>
                      <span className="tnum shrink-0 font-mono text-xs text-gold-400">₹399</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-soil-800 px-6 py-5">
                <div className="flex flex-col gap-1.5 font-mono text-[0.72rem]">
                  <div className="flex justify-between text-parchment-muted">
                    <span>Subtotal</span>
                    <span className="tnum">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-parchment-muted">
                    <span>Delivery</span>
                    <span className="tnum">{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between border-t border-soil-800 pt-3">
                  <span className="font-mono text-[0.62rem] tracking-[0.18em] uppercase text-parchment-dim">Total</span>
                  <span className="tnum font-display text-2xl text-parchment">
                    ₹{(subtotal + shipping).toLocaleString('en-IN')}
                  </span>
                </div>
                <Button className="mt-4 w-full">
                  Checkout
                  <ArrowRight className="h-4 w-4" strokeWidth={1.7} />
                </Button>
                <p className="mt-3 flex items-center justify-center gap-2 font-mono text-[0.58rem] tracking-wide text-parchment-dim">
                  <ShieldCheck className="h-3 w-3" strokeWidth={1.7} />
                  14-day guarantee · keep the pack if it fails
                </p>
              </div>
            )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

/* ── app ──────────────────────────────────────────────────────────────── */

export default function EkvaApp() {
  const [items, setItems] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [plan, setPlan] = useState('quarterly')
  const [active, setActive] = useState('canopy')
  const [view, setView] = useState('site')
  const [plants, setPlants] = useState(SEED_PLANTS)
  const [users, setUsers] = useState(SEED_USERS)
  const [posts, setPosts] = useState(SEED_POSTS)
  const [user, setUser] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signin')
  const [pendingView, setPendingView] = useState(null)

  const askSignIn = useCallback((mode = 'signin', next = null) => {
    setAuthMode(mode)
    setPendingView(next)
    setAuthOpen(true)
  }, [])

  const onAuth = useCallback(
    (u) => {
      setUser(u)
      setAuthOpen(false)
      // Land people where they were headed when the gate stopped them.
      const target = pendingView && (pendingView !== 'admin' || u.role === 'admin') ? pendingView : null
      if (target) {
        setView(target)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      setPendingView(null)
    },
    [pendingView],
  )

  const signOut = useCallback(() => {
    setUser(null)
    setView('site')
  }, [])

  const add = useCallback((key, qty = 1) => {
    const p = CATALOG[key]
    setItems((prev) => {
      const found = prev.find((i) => i.sku === p.sku)
      if (found) return prev.map((i) => (i.sku === p.sku ? { ...i, qty: i.qty + qty } : i))
      return [...prev, { ...p, qty }]
    })
    setCartOpen(true)
  }, [])

  const setQty = (sku, q) =>
    setItems((prev) =>
      q <= 0 ? prev.filter((i) => i.sku !== sku) : prev.map((i) => (i.sku === sku ? { ...i, qty: q } : i)),
    )

  const remove = (sku) => setItems((prev) => prev.filter((i) => i.sku !== sku))

  const challenge = () => {
    setPlan('quarterly')
    setView('site')
    requestAnimationFrame(() =>
      document.getElementById('product')?.scrollIntoView({ behavior: 'smooth' }),
    )
  }

  // Never strand a gated view: signing out or losing a role returns to the store.
  useEffect(() => {
    if (view === 'site') return
    if (!user || (view === 'admin' && !isAdmin(user))) setView('site')
  }, [user, view])

  // Section spy only applies to the marketing view; re-run when it remounts.
  useEffect(() => {
    if (view !== 'site') return
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-38% 0px -52% 0px', threshold: [0, 0.25, 0.6] },
    )
    STRATA.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [view])

  const count = items.reduce((s, i) => s + i.qty, 0)

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-soil-950">
        <Nav
          cartCount={count}
          onCart={() => setCartOpen(true)}
          active={active}
          onChallenge={challenge}
          view={view}
          setView={setView}
          user={user}
          onSignIn={askSignIn}
          onSignOut={signOut}
        />
        {view === 'site' && <StrataRail active={active} />}

        {view === 'site' && (
          <>
            <main>
              <Hero
                onAdd={add}
                onRecon={() => document.getElementById('recon')?.scrollIntoView({ behavior: 'smooth' })}
              />
              <Foundation />
              <Recon onAdd={add} authed={!!user} onRequireAuth={askSignIn} />
              <Product onAdd={add} plan={plan} setPlan={setPlan} />
              <Sanctuary />
              <Journal />
              <Proof />
            </main>
            <Footer />
          </>
        )}

        {view === 'scan' && user && <Scan plants={plants} setPlants={setPlants} />}
        {view === 'community' && user && <Community posts={posts} setPosts={setPosts} />}
        {view === 'admin' && isAdmin(user) && (
          <Admin users={users} setUsers={setUsers} posts={posts} setPosts={setPosts} />
        )}

        <AuthModal
          open={authOpen}
          initialMode={authMode}
          onClose={() => { setAuthOpen(false); setPendingView(null) }}
          onAuth={onAuth}
        />

        <Cart
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          items={items}
          setQty={setQty}
          remove={remove}
          add={add}
        />
      </div>
    </MotionConfig>
  )
}
