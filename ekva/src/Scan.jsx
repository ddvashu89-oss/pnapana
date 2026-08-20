import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Camera, ScanLine, Leaf, Droplets, Sprout, Wind, AlertTriangle, CheckCircle2,
  Plus, X, Trash2, Sun, Activity, ImageOff, RefreshCw, ChevronRight, Info,
} from 'lucide-react'
import { Button, Eyebrow, Field, Pill, Reveal, clamp } from './ui.jsx'
import { SPECIES, speciesById } from './data.js'

/* Real analysis: the uploaded image is drawn to a canvas and its pixels are
   classified. Every number on the diagnostic card is measured from the photo. */

const hueOf = (r, g, b) => {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (!d) return 0
  let h
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return (h * 60 + 360) % 360
}

async function analyzeImage(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('That file could not be read as an image.'))
      i.src = url
    })
    const W = 260
    const H = Math.max(1, Math.round((img.height / img.width) * W))
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, W, H)
    const { data } = ctx.getImageData(0, 0, W, H)

    const n = data.length / 4
    let veg = 0, yellow = 0, brown = 0, white = 0, purple = 0
    let lumSum = 0, satSum = 0, hueSum = 0, frameLum = 0

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const sat = max === 0 ? 0 : (max - min) / max
      const hue = hueOf(r, g, b)
      frameLum += lum

      if (g > r * 1.04 && g > b * 1.04 && sat > 0.12) {
        veg++
        lumSum += lum
        satSum += sat
        hueSum += hue
      } else if (hue >= 38 && hue <= 68 && sat > 0.3 && lum > 90) {
        // Yellowing tissue: warm hue, bright enough to be lit leaf rather than shadow.
        yellow++
      } else if (hue >= 12 && hue < 38 && sat > 0.28 && lum > 55 && lum < 165) {
        // Necrotic tissue. The luminance window keeps dark soil and timber out.
        brown++
      }
      if (lum > 205 && sat < 0.12) white++
      if (b > r && b > g * 1.02 && sat > 0.15) purple++
    }

    // Ratios are taken against tissue-like pixels, not the whole frame, so a
    // dark or busy background cannot masquerade as disease.
    const tissue = Math.max(veg + yellow + brown, 1)
    const vegFrac = veg / n
    const chlorosis = yellow / tissue
    const necrosis = brown / tissue
    const whiteFrac = white / n
    const purpleFrac = purple / n
    const meanLum = veg ? lumSum / veg : 0
    const meanSat = veg ? satSum / veg : 0
    const meanHue = veg ? hueSum / veg : 0
    // Relative, not absolute: a deliberately dark photograph is not a sick plant.
    const frameMean = frameLum / n
    const lumRatio = meanLum / Math.max(frameMean, 1)

    // Heuristic species ranking from measured colour structure — a suggestion
    // the user confirms, never presented as a positive identification.
    const s = { monstera: 1, snake: 1, peace: 1, fiddle: 1, tulsi: 1 }
    if (meanLum < 92) s.monstera += 2.4
    if (meanLum > 120) s.fiddle += 1.2
    if (whiteFrac > 0.012) s.peace += 3.2
    if (purpleFrac > 0.02) s.tulsi += 3
    if (chlorosis > 0.16) s.snake += 2.2
    if (meanHue > 95 && meanHue < 135) s.fiddle += 1.1
    if (meanSat > 0.45) s.tulsi += 0.8
    if (vegFrac > 0.42) s.monstera += 0.9

    const ranked = Object.entries(s).sort((a, b) => b[1] - a[1])

    const metrics = { vegFrac, chlorosis, necrosis, meanLum, meanSat, whiteFrac, lumRatio, frameMean }

    // Refuse anything that is not plausibly a plant. Scoring a chart or a face
    // would be worse than declining: a confident wrong number is not a feature.
    const reject = rejectReason({ vegFrac, meanSat, whiteFrac })
    if (reject) return { thumb: c.toDataURL('image/jpeg', 0.82), ok: false, reject, ...metrics }
    const issues = findings(metrics)
    // Score and findings come from one penalty set, so they cannot disagree.
    const score = clamp(
      Math.round(96 - issues.reduce((t, i) => t + i.penalty, 0) - (vegFrac < 0.06 ? 20 : 0)),
      10,
      99,
    )

    return {
      thumb: c.toDataURL('image/jpeg', 0.82),
      ok: true,
      ...metrics,
      score,
      issues,
      guess: ranked[0][0],
      // Separation between the top two candidates, not a share of all five.
      confidence: Math.round((ranked[0][1] / (ranked[0][1] + ranked[1][1])) * 100),
      alts: ranked.slice(1, 3).map(([k]) => k),
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Gate the scanner to foliage. Returns null when the frame is plausibly a plant. */
function rejectReason({ vegFrac, meanSat, whiteFrac }) {
  if (whiteFrac > 0.42 && vegFrac < 0.15)
    return {
      title: 'That looks like a screenshot, not a plant',
      detail:
        'Most of the frame is flat white with almost no living tissue in it. Charts, documents and screenshots cannot be diagnosed.',
    }
  if (vegFrac < 0.05)
    return {
      title: 'No plant found in this photo',
      detail:
        'Under 5% of the frame reads as foliage, so there is nothing here to measure. Point the camera at the plant and fill more of the shot with leaves.',
    }
  if (meanSat < 0.1)
    return {
      title: 'Foliage is too washed out to read',
      detail:
        'The green in this frame has almost no colour depth — usually heavy backlight, a screen photographed off another screen, or a greyscale image.',
    }
  return null
}

/** Each finding carries its own penalty; the health score is what is left after them. */
function findings(a) {
  const out = []
  if (a.chlorosis > 0.12)
    out.push({
      tone: 'warn', penalty: Math.min(30, a.chlorosis * 85),
      t: 'Interveinal chlorosis detected',
      d: `${Math.round(a.chlorosis * 100)}% of tissue reads yellow. Most often nitrogen or magnesium, and it resolves on a top-dress rather than a feed.`,
    })
  if (a.necrosis > 0.14)
    out.push({
      tone: 'warn', penalty: Math.min(26, a.necrosis * 62),
      t: 'Marginal necrosis',
      d: `${Math.round(a.necrosis * 100)}% of tissue is browning. Crisp margins point to scorch or salt build-up; soft ones point to overwatering.`,
    })
  // Both tests must hold: dark leaves against a bright backdrop are normal for
  // deep-green species, so the scene itself has to be dim before this is a finding.
  if (a.frameMean < 108 && a.lumRatio < 0.92 && a.vegFrac > 0.06)
    out.push({
      tone: 'warn', penalty: 14,
      t: 'Canopy sitting in shade',
      d: 'Both the room and the foliage are returning little light. Run the recon survey — the fix is usually 40 cm closer to glass, not more fertiliser.',
    })
  if (a.meanSat < 0.2 && a.vegFrac > 0.08)
    out.push({
      tone: 'warn', penalty: 12,
      t: 'Low chlorophyll saturation',
      d: 'Colour is washed relative to a healthy canopy. Expect recovery over two feeding cycles.',
    })
  return out
}

const OK_FINDING = {
  tone: 'ok',
  t: 'No nitrogen deficiency detected',
  d: 'Turgor, colour saturation and leaf-area ratio all sit inside the healthy band for indoor foliage.',
}

function Ring({ value, size = 74 }) {
  const R = (size - 9) / 2
  const C = 2 * Math.PI * R
  const tone = value >= 78 ? '#4E7C5E' : value >= 55 ? '#D4AF37' : '#C25A38'
  return (
    <svg width={size} height={size} className="shrink-0" role="img" aria-label={`Health ${value} of 100`}>
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#3A2E27" strokeWidth="5" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={R} fill="none" stroke={tone} strokeWidth="5" strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        strokeDasharray={C}
        initial={{ strokeDashoffset: C }}
        animate={{ strokeDashoffset: C * (1 - value / 100) }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fill={tone}
        fontFamily="Fraunces, serif" fontSize={size * 0.29}>{value}</text>
    </svg>
  )
}

const daysSince = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000)

export default function Scan({ plants, setPlants }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [species, setSpecies] = useState('monstera')
  const [nickname, setNickname] = useState('')
  const [room, setRoom] = useState('')
  const [drag, setDrag] = useState(false)
  const [manual, setManual] = useState(false)
  const [rejected, setRejected] = useState(null)
  const fileRef = useRef(null)

  const run = useCallback(async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('That is not an image file.')
      return
    }
    setError(null)
    setBusy(true)
    setResult(null)
    setRejected(null)
    try {
      const a = await analyzeImage(file)
      await new Promise((r) => setTimeout(r, 620))
      if (a.reject) {
        setRejected({ thumb: a.thumb, vegFrac: a.vegFrac, ...a.reject })
      } else {
        setResult(a)
        setSpecies(a.guess)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }, [])

  const addPlant = () => {
    const sp = speciesById(species)
    setPlants((p) => [
      {
        id: 'p' + Date.now(),
        species,
        name: nickname.trim() || sp.common,
        room: room.trim() || 'Unassigned',
        added: new Date(),
        lastWater: new Date(),
        health: result?.score ?? 80,
        thumb: result?.thumb,
        dli: null,
      },
      ...p,
    ])
    setResult(null)
    setNickname('')
    setRoom('')
    setManual(false)
  }

  const water = (id) =>
    setPlants((p) => p.map((x) => (x.id === id ? { ...x, lastWater: new Date(), health: Math.min(99, x.health + 2) } : x)))
  const remove = (id) => setPlants((p) => p.filter((x) => x.id !== id))

  return (
    <div className="mx-auto max-w-[1320px] px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
      <Reveal>
        <Eyebrow icon={ScanLine}>Plant intelligence</Eyebrow>
        <h1 className="mt-5 max-w-[20ch] font-display text-[2.2rem] leading-[1.06] text-parchment sm:text-[3rem]">
          Scan a plant, or add one <span className="text-gold-500">by hand.</span>
        </h1>
        <p className="mt-4 max-w-[62ch] text-[0.96rem] leading-[1.72] text-parchment-muted">
          Photograph the foliage and the scanner measures leaf-area ratio, chlorophyll saturation and
          chlorosis directly from your image. Nothing is uploaded — the analysis runs in your browser.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Reveal>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); run(e.dataTransfer.files?.[0]) }}
            className={`glass relative flex min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              drag ? 'border-gold-500/70 bg-gold-500/[0.06]' : 'border-soil-700'
            }`}
          >
            {(result?.thumb || rejected?.thumb) && (
              <>
                <img
                  src={result?.thumb || rejected.thumb}
                  alt="Uploaded photo"
                  className="absolute inset-0 h-full w-full object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-soil-950 via-soil-950/60 to-transparent" />
              </>
            )}

            {busy && (
              <motion.div
                className="pointer-events-none absolute inset-x-0 z-20 h-28 bg-gradient-to-b from-transparent via-gold-500/25 to-transparent"
                initial={{ top: '-20%' }} animate={{ top: '110%' }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
              />
            )}

            <div className="relative z-10 flex flex-col items-center">
              {result?.thumb || rejected?.thumb ? (
                <img
                  src={result?.thumb || rejected.thumb}
                  alt=""
                  className={`mb-5 h-32 w-32 rounded-xl object-cover shadow-[0_18px_40px_-14px_rgba(0,0,0,0.9)] ${
                    rejected ? 'grayscale' : ''
                  }`}
                />
              ) : (
                <div className="mb-5 rounded-full border border-gold-500/25 p-4 text-gold-500">
                  <Leaf className="h-6 w-6" strokeWidth={1.4} />
                </div>
              )}
              <p className="font-display text-xl text-parchment">
                {busy
                  ? 'Reading the foliage…'
                  : rejected
                    ? 'Nothing to diagnose'
                    : result
                      ? 'Scan complete'
                      : 'Drop a photo of your plant'}
              </p>
              <p className="mt-1.5 max-w-[34ch] text-[0.84rem] leading-relaxed text-parchment-dim">
                {busy
                  ? 'Classifying pixels by hue, saturation and luminance.'
                  : rejected
                    ? 'This scanner only reads photographs of living plants.'
                    : 'JPG, PNG or HEIC. Fill the frame with leaves for the best reading.'}
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                <Button onClick={() => fileRef.current?.click()} disabled={busy}>
                  <Upload className="h-4 w-4" strokeWidth={1.7} />
                  Choose photo
                </Button>
                <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
                  <Camera className="h-4 w-4" strokeWidth={1.7} />
                  Use camera
                </Button>
              </div>
              <button
                onClick={() => { setManual(true); setResult(null); setRejected(null) }}
                className="mt-4 flex items-center gap-1.5 text-[0.8rem] text-parchment-dim underline-offset-4 hover:text-gold-400 hover:underline"
              >
                or add a plant without a photo
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.7} />
              </button>

              <input
                ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only"
                onChange={(e) => run(e.target.files?.[0])}
              />
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-terracotta/35 bg-terracotta/10 px-4 py-3">
              <ImageOff className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-soft" strokeWidth={1.7} />
              <p className="text-[0.85rem] leading-relaxed text-terracotta-soft">{error}</p>
            </div>
          )}
        </Reveal>

        <Reveal delay={0.06}>
          {/* Deliberately not wrapped in AnimatePresence: mode="wait" stalls the
              incoming panel until the outgoing exit resolves, which strands the
              diagnostic card if that animation is ever interrupted. */}
          <>
            {rejected ? (
              <div className="hairline h-full overflow-hidden rounded-2xl bg-gradient-to-br from-soil-800 via-soil-900 to-soil-950">
                <div className="flex items-center gap-3 border-b border-terracotta/25 px-6 py-4">
                  <ImageOff className="h-4 w-4 text-terracotta-soft" strokeWidth={1.7} />
                  <span className="font-mono text-[0.62rem] tracking-[0.2em] uppercase text-parchment-muted">
                    Scan refused
                  </span>
                  <span className="ml-auto">
                    <Pill tone="warn">Not a plant</Pill>
                  </span>
                </div>

                <div className="flex flex-col items-center px-6 py-10 text-center">
                  <img src={rejected.thumb} alt="" className="h-28 w-28 rounded-xl object-cover grayscale" />
                  <h3 className="mt-6 max-w-[24ch] font-display text-2xl leading-tight text-parchment">
                    {rejected.title}
                  </h3>
                  <p className="mt-3 max-w-[46ch] text-[0.9rem] leading-relaxed text-parchment-muted">
                    {rejected.detail}
                  </p>
                  <p className="tnum mt-4 font-mono text-[0.62rem] tracking-[0.14em] uppercase text-parchment-dim">
                    Foliage measured: {Math.round(rejected.vegFrac * 100)}% of frame
                  </p>

                  <div className="mt-7 flex flex-wrap justify-center gap-2.5">
                    <Button onClick={() => fileRef.current?.click()}>
                      <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
                      Try another photo
                    </Button>
                    <Button variant="ghost" onClick={() => { setRejected(null); setManual(true) }}>
                      Add without a photo
                    </Button>
                  </div>
                </div>
              </div>
            ) : result || manual ? (
              <motion.div
                key="card"
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="hairline h-full overflow-hidden rounded-2xl bg-gradient-to-br from-moss-900 via-soil-900 to-soil-950"
              >
                <div className="flex items-center gap-3 border-b border-gold-500/15 px-6 py-4">
                  <Activity className="h-4 w-4 text-gold-500" strokeWidth={1.7} />
                  <span className="font-mono text-[0.62rem] tracking-[0.2em] uppercase text-parchment-muted">
                    {manual ? 'Add plant manually' : 'Diagnostic card'}
                  </span>
                  {result && (
                    <span className="ml-auto">
                      <Pill tone="gold">{result.confidence}% match</Pill>
                    </span>
                  )}
                </div>

                <div className="p-6">
                  {result && (
                    <>
                      <div className="flex items-center gap-5">
                        <Ring value={result.score} />
                        <div className="min-w-0">
                          <p className="eyebrow">Health index</p>
                          <p className="font-display text-2xl leading-tight text-parchment">
                            {result.score >= 78 ? 'Thriving' : result.score >= 55 ? 'Holding, with issues' : 'Under stress'}
                          </p>
                          <p className="mt-1 font-mono text-[0.62rem] tracking-wider text-parchment-dim">
                            Measured from {Math.round(result.vegFrac * 100)}% foliage coverage
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        <Field label="Leaf area" value={Math.round(result.vegFrac * 100)} unit="%" icon={Leaf} />
                        <Field label="Chlorosis" value={Math.round(result.chlorosis * 100)} unit="%" icon={AlertTriangle}
                          tone={result.chlorosis > 0.14 ? 'warn' : 'good'} />
                        <Field label="Necrosis" value={Math.round(result.necrosis * 100)} unit="%" icon={AlertTriangle}
                          tone={result.necrosis > 0.12 ? 'warn' : 'good'} />
                        <Field label="Luminance" value={Math.round(result.meanLum)} icon={Sun}
                          tone={result.meanLum < 74 ? 'warn' : 'gold'} />
                      </div>

                      <div className="mt-5 flex flex-col gap-2">
                        {(result.issues.length ? result.issues : [OK_FINDING]).map((d) => (
                          <div key={d.t} className="flex gap-3 rounded-xl border border-soil-700/70 bg-soil-950/60 px-4 py-3">
                            {d.tone === 'warn'
                              ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-soft" strokeWidth={1.7} />
                              : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-moss-500" strokeWidth={1.7} />}
                            <div>
                              <p className="text-[0.9rem] text-parchment">{d.t}</p>
                              <p className="mt-0.5 text-[0.8rem] leading-relaxed text-parchment-dim">{d.d}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="mt-5 flex items-start gap-2 font-mono text-[0.6rem] leading-relaxed tracking-wider text-parchment-dim">
                        <Info className="mt-px h-3 w-3 shrink-0" strokeWidth={1.6} />
                        Metrics above are measured from your image. The species below is a colour-structure
                        suggestion, not a positive identification — confirm it before saving.
                      </p>
                    </>
                  )}

                  <div className={result ? 'mt-5 border-t border-soil-700/70 pt-5' : ''}>
                    <p className="eyebrow mb-3">{result ? 'Confirm species' : 'Species'}</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {SPECIES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSpecies(s.id)}
                          aria-pressed={species === s.id}
                          className={`overflow-hidden rounded-xl border text-left transition-all ${
                            species === s.id ? 'border-gold-500/70 bg-gold-500/[0.08]' : 'border-soil-700 hover:border-soil-600'
                          }`}
                        >
                          <img src={s.img} alt="" className="h-16 w-full object-cover" />
                          <span className="block px-2.5 py-2 text-[0.75rem] leading-tight text-parchment">{s.common}</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                      <input
                        value={nickname} onChange={(e) => setNickname(e.target.value)}
                        placeholder="Nickname (optional)" aria-label="Plant nickname"
                        className="rounded-xl border border-soil-700 bg-soil-900/60 px-4 py-3 text-sm text-parchment placeholder:text-parchment-dim/60 focus:border-gold-500/60"
                      />
                      <input
                        value={room} onChange={(e) => setRoom(e.target.value)}
                        placeholder="Where does it live?" aria-label="Room"
                        className="rounded-xl border border-soil-700 bg-soil-900/60 px-4 py-3 text-sm text-parchment placeholder:text-parchment-dim/60 focus:border-gold-500/60"
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2.5">
                      <Button onClick={addPlant}>
                        <Plus className="h-4 w-4" strokeWidth={2} />
                        Add to my plants
                      </Button>
                      <Button variant="ghost" onClick={() => { setResult(null); setManual(false); setError(null); setRejected(null) }}>
                        <X className="h-4 w-4" strokeWidth={1.8} />
                        Discard
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="glass hairline flex h-full min-h-[340px] flex-col justify-center rounded-2xl p-8"
              >
                <p className="eyebrow mb-4">What the scanner measures</p>
                {[
                  [Leaf, 'Leaf-area ratio', 'Share of the frame that is living foliage.'],
                  [AlertTriangle, 'Chlorosis index', 'Yellowing as a fraction of leaf area — the nitrogen signal.'],
                  [Sun, 'Mean luminance', 'How much light the canopy is actually returning.'],
                  [Activity, 'Chlorophyll saturation', 'Colour depth against a healthy reference band.'],
                ].map(([Icon, t, d]) => (
                  <div key={t} className="flex gap-4 border-b border-soil-800 py-4 last:border-0">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" strokeWidth={1.6} />
                    <div>
                      <p className="text-[0.92rem] text-parchment">{t}</p>
                      <p className="mt-0.5 text-[0.82rem] leading-relaxed text-parchment-dim">{d}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </>
        </Reveal>
      </div>

      <div className="mt-16">
        <div className="flex items-end justify-between border-b border-soil-800 pb-4">
          <div>
            <Eyebrow icon={Sprout}>My plants</Eyebrow>
            <h2 className="mt-3 font-display text-2xl text-parchment">
              {plants.length} under care
            </h2>
          </div>
        </div>

        {plants.length === 0 ? (
          <p className="py-14 text-center text-[0.9rem] text-parchment-dim">
            Nothing here yet. Scan a photo above, or add one by hand.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plants.map((p) => {
              const sp = speciesById(p.species)
              const since = daysSince(p.lastWater)
              const due = sp.water - since
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  className="group overflow-hidden rounded-2xl border border-soil-700/60 bg-soil-900/40 transition-colors hover:border-gold-500/30"
                >
                  <div className="relative h-40 overflow-hidden">
                    <img src={p.thumb || sp.img} alt={sp.common}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-soil-950 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-display text-lg leading-tight text-parchment">{p.name}</p>
                        <p className="truncate font-mono text-[0.58rem] tracking-wider uppercase text-parchment-dim">{sp.latin}</p>
                      </div>
                      <Ring value={p.health} size={46} />
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="truncate text-[0.78rem] text-parchment-dim">{p.room}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Pill tone={due <= 0 ? 'warn' : 'neutral'}>
                        <Droplets className="h-2.5 w-2.5" strokeWidth={2} />
                        {due <= 0 ? 'Water due' : `Water in ${due}d`}
                      </Pill>
                      <Pill tone="neutral">
                        <Sprout className="h-2.5 w-2.5" strokeWidth={2} />
                        Feed every {sp.feed}w
                      </Pill>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => water(p.id)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full border border-moss-500/30 bg-moss-800/40 py-2.5 font-mono text-[0.6rem] tracking-[0.14em] uppercase text-moss-400 transition-colors hover:bg-moss-700"
                      >
                        <Droplets className="h-3 w-3" strokeWidth={2} />
                        Log water
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        aria-label={`Remove ${p.name}`}
                        className="rounded-full border border-soil-700 p-2.5 text-parchment-dim transition-colors hover:border-terracotta/50 hover:text-terracotta"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
