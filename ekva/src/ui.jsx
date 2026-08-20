import { motion } from 'framer-motion'

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`

export const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

export function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-70px' }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}

export function OnkarMark({ className = 'h-7 w-7' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <circle cx="13" cy="20" r="8.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 11.8V3.4c0-1 .8-1.8 1.8-1.8h9.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M21.6 8.4h5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="13" cy="20" r="2.6" fill="currentColor" opacity="0.55" />
    </svg>
  )
}

export function Eyebrow({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2.5">
      {Icon && <Icon className="h-3.5 w-3.5 text-gold-500" strokeWidth={1.6} />}
      <span className="eyebrow">{children}</span>
    </div>
  )
}

export function Button({ variant = 'primary', className = '', children, ...rest }) {
  const base =
    'group inline-flex items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-[0.8rem] tracking-[0.13em] uppercase font-medium transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none'
  const variants = {
    primary:
      'bg-gold-500 text-soil-950 hover:bg-gold-400 shadow-[0_0_0_0_rgba(212,175,55,0.5)] hover:shadow-[0_10px_34px_-12px_rgba(212,175,55,0.75)]',
    ghost: 'border border-gold-500/30 text-parchment hover:border-gold-500/70 hover:bg-gold-500/[0.07]',
    moss: 'bg-moss-700 text-parchment hover:bg-moss-600 border border-moss-500/30',
    danger: 'border border-terracotta/40 text-terracotta-soft hover:bg-terracotta/10 hover:border-terracotta/70',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}

export function Segmented({ options, value, onChange, columns = 2 }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`rounded-lg border px-3 py-2.5 text-left transition-all duration-200 ${
              active
                ? 'border-gold-500/60 bg-gold-500/[0.09] text-parchment'
                : 'border-soil-700 bg-soil-900/40 text-parchment-dim hover:border-soil-600 hover:text-parchment-muted'
            }`}
          >
            <span className="block text-[0.82rem] leading-tight">{o.label}</span>
            {o.sub && <span className="block font-mono text-[0.6rem] tracking-wider uppercase opacity-60">{o.sub}</span>}
            {o.dim && <span className="block font-mono text-[0.6rem] tracking-wider opacity-60">{o.dim}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function Slider({ label, value, min, max, step, onChange, suffix }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-[0.62rem] tracking-[0.18em] uppercase text-parchment-dim">{label}</span>
        <span className="tnum font-mono text-[0.78rem] text-gold-400">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-soil-700 accent-[#D4AF37] outline-none"
      />
    </label>
  )
}

export function Field({ label, value, unit, tone = 'default', icon: Icon }) {
  const tones = {
    default: 'text-parchment',
    good: 'text-moss-400',
    warn: 'text-terracotta-soft',
    gold: 'text-gold-400',
  }
  return (
    <div className="rounded-xl border border-soil-700/70 bg-soil-900/50 px-4 py-3.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-parchment-dim" strokeWidth={1.6} />}
        <span className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-parchment-dim">{label}</span>
      </div>
      <div className={`tnum font-mono text-lg ${tones[tone]}`}>
        {value}
        {unit && <span className="ml-1 text-[0.65rem] text-parchment-dim">{unit}</span>}
      </div>
    </div>
  )
}

export function Pill({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'border-soil-600 bg-soil-800/60 text-parchment-muted',
    good: 'border-moss-500/40 bg-moss-800/40 text-moss-400',
    gold: 'border-gold-500/40 bg-gold-500/10 text-gold-400',
    warn: 'border-terracotta/40 bg-terracotta/10 text-terracotta-soft',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.56rem] tracking-[0.14em] uppercase whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function ChartTip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null
  return (
    <div className="hairline rounded-lg bg-soil-950/95 px-3 py-2 font-mono text-[0.68rem] backdrop-blur">
      <div className="mb-1 tracking-widest text-gold-500">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="tnum flex gap-3" style={{ color: p.color }}>
          <span className="opacity-70">{p.name || p.dataKey}</span>
          <span>{fmt ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}
