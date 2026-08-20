import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Mail, Lock, User as UserIcon, MapPin, ArrowRight, Check, LogOut,
  ShieldAlert, ScanLine, Users, Sparkles, ChevronDown,
} from 'lucide-react'
import { Button, OnkarMark, Pill } from './ui.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const ADMIN_EMAILS = ['admin@ekva.in', 'ops@ekva.in']

export const isAdmin = (user) => user?.role === 'admin'

const initials = (name) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

const PERKS = [
  [ScanLine, 'AI plant scanning', 'Measure chlorosis and canopy health from a photo.'],
  [Sparkles, 'Personal care protocols', 'Watering and feeding schedules built from your light reading.'],
  [Users, 'The Commons', 'Compare notes with growers on the same orientation as you.'],
]

export function AuthModal({ open, initialMode = 'signin', onClose, onAuth }) {
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [city, setCity] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const firstRef = useRef(null)

  useEffect(() => setMode(initialMode), [initialMode, open])

  useEffect(() => {
    if (!open) return
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    const t = setTimeout(() => firstRef.current?.focus(), 120)
    return () => {
      window.removeEventListener('keydown', esc)
      clearTimeout(t)
    }
  }, [open, onClose])

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (mode === 'signup' && name.trim().length < 2) next.name = 'Tell us what to call you.'
    if (!EMAIL_RE.test(email.trim())) next.email = 'That does not look like an email address.'
    if (password.length < 8) next.password = 'Use at least 8 characters.'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    const clean = email.trim().toLowerCase()
    setTimeout(() => {
      onAuth({
        name: mode === 'signup' ? name.trim() : clean.split('@')[0].replace(/[._]/g, ' '),
        email: clean,
        city: city.trim() || 'Delhi NCR',
        role: ADMIN_EMAILS.includes(clean) ? 'admin' : 'member',
        joined: new Date(),
      })
      setBusy(false)
      setName('')
      setEmail('')
      setPassword('')
      setCity('')
      setErrors({})
    }, 550)
  }

  const useAdmin = () => {
    setMode('signin')
    setEmail('admin@ekva.in')
    setPassword('sonipat-2026')
    setErrors({})
  }

  const field = (key, node) => (
    <div>
      {node}
      {errors[key] && <p className="mt-1.5 text-[0.75rem] text-terracotta-soft">{errors[key]}</p>}
    </div>
  )

  const inputCls = (key) =>
    `w-full rounded-xl border bg-soil-900/60 py-3 pl-11 pr-4 text-sm text-parchment placeholder:text-parchment-dim/60 focus:border-gold-500/60 ${
      errors[key] ? 'border-terracotta/60' : 'border-soil-700'
    }`

  // Visibility is driven straight from state with CSS rather than an exit
  // animation. A full-viewport blocker must never depend on an animation
  // finishing to stop swallowing clicks.
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-soil-950/85 p-4 backdrop-blur-sm transition-opacity duration-300"
      style={{
        opacity: open ? 1 : 0,
        visibility: open ? 'visible' : 'hidden',
        pointerEvents: open ? 'auto' : 'none',
      }}
      aria-hidden={!open}
      onClick={onClose}
    >
      {open && (
        <div>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={mode === 'signin' ? 'Sign in' : 'Create account'}
            onClick={(e) => e.stopPropagation()}
            className="my-auto grid w-full max-w-[880px] overflow-hidden rounded-2xl border border-gold-500/20 bg-soil-900 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.95)] lg:grid-cols-[1fr_0.85fr]"
          >
            <div className="p-7 sm:p-9">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-gold-500">
                  <OnkarMark className="h-6 w-6" />
                  <span className="font-display text-xl text-parchment">Ekva</span>
                </span>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-full p-2 text-parchment-muted transition-colors hover:text-gold-500 lg:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h2 className="mt-7 font-display text-[1.9rem] leading-tight text-parchment">
                {mode === 'signin' ? 'Welcome back.' : 'Start with the soil.'}
              </h2>
              <p className="mt-2 max-w-[42ch] text-[0.88rem] leading-relaxed text-parchment-muted">
                {mode === 'signin'
                  ? 'Sign in to reach the scanner, your plants and the Commons.'
                  : 'One account unlocks AI scanning, care protocols and the grower community.'}
              </p>

              <div className="mt-6 flex gap-1 rounded-full border border-soil-700 p-1">
                {[['signin', 'Sign in'], ['signup', 'Create account']].map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setErrors({}) }}
                    aria-pressed={mode === m}
                    className={`flex-1 rounded-full py-2.5 font-mono text-[0.62rem] tracking-[0.14em] uppercase transition-colors ${
                      mode === m ? 'bg-gold-500 text-soil-950' : 'text-parchment-dim hover:text-parchment'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="mt-6 flex flex-col gap-3.5" noValidate>
                {mode === 'signup' &&
                  field('name',
                    <div className="relative">
                      <UserIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-dim" strokeWidth={1.6} />
                      <input
                        ref={firstRef}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        aria-label="Your name"
                        className={inputCls('name')}
                      />
                    </div>,
                  )}

                {field('email',
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-dim" strokeWidth={1.6} />
                    <input
                      ref={mode === 'signin' ? firstRef : null}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.in"
                      aria-label="Email address"
                      autoComplete="email"
                      className={inputCls('email')}
                    />
                  </div>,
                )}

                {field('password',
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-dim" strokeWidth={1.6} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      aria-label="Password"
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      className={inputCls('password')}
                    />
                  </div>,
                )}

                {mode === 'signup' &&
                  field('city',
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-dim" strokeWidth={1.6} />
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City (sets your solar latitude)"
                        aria-label="City"
                        className={inputCls('city')}
                      />
                    </div>,
                  )}

                <Button type="submit" disabled={busy} className="mt-1.5 w-full">
                  {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                </Button>
              </form>

              <button
                onClick={useAdmin}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold-500/30 py-2.5 font-mono text-[0.6rem] tracking-[0.14em] uppercase text-gold-500 transition-colors hover:bg-gold-500/[0.06]"
              >
                <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.7} />
                Fill operator credentials
              </button>

              <p className="mt-5 text-[0.72rem] leading-relaxed text-parchment-dim">
                Front-end demonstration only. There is no auth server behind this form — nothing you
                type is transmitted or stored, and the session clears when you close the tab.
              </p>
            </div>

            <div className="relative hidden flex-col justify-center border-l border-gold-500/15 bg-gradient-to-br from-moss-900 via-soil-900 to-soil-950 p-9 lg:flex">
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-5 top-5 rounded-full p-2 text-parchment-muted transition-colors hover:text-gold-500"
              >
                <X className="h-4 w-4" />
              </button>

              <p className="eyebrow mb-6">What an account opens</p>
              <div className="flex flex-col gap-6">
                {PERKS.map(([Icon, t, d]) => (
                  <div key={t} className="flex gap-4">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" strokeWidth={1.6} />
                    <div>
                      <p className="text-[0.94rem] text-parchment">{t}</p>
                      <p className="mt-1 text-[0.82rem] leading-relaxed text-parchment-dim">{d}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-9 border-t border-soil-700/60 pt-6">
                <p className="font-display text-base italic leading-relaxed text-parchment-muted">
                  “The soil does not ask who you are. But the software has to.”
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full border border-gold-500/25 py-1 pl-1 pr-2.5 transition-colors hover:border-gold-500/60"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-moss-700 to-soil-700 font-mono text-[0.6rem] text-gold-400">
          {initials(user.name)}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-parchment-dim transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.8} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-gold-500/20 bg-soil-900 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]"
          >
            <div className="border-b border-soil-800 px-4 py-3.5">
              <p className="truncate text-[0.9rem] capitalize text-parchment">{user.name}</p>
              <p className="truncate font-mono text-[0.6rem] tracking-wide text-parchment-dim">{user.email}</p>
              <span className="mt-2 inline-block">
                <Pill tone={isAdmin(user) ? 'gold' : 'good'}>{isAdmin(user) ? 'Operator' : 'Member'}</Pill>
              </span>
            </div>
            <button
              onClick={() => { setOpen(false); onSignOut() }}
              className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left text-[0.85rem] text-parchment-muted transition-colors hover:bg-soil-800 hover:text-terracotta-soft"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.7} />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function LockedPanel({ title, blurb, onSignIn }) {
  return (
    <div className="glass hairline flex flex-col items-center rounded-2xl px-6 py-12 text-center">
      <div className="rounded-full border border-gold-500/25 p-4 text-gold-500">
        <Lock className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h3 className="mt-5 font-display text-2xl text-parchment">{title}</h3>
      <p className="mt-2.5 max-w-[42ch] text-[0.9rem] leading-relaxed text-parchment-muted">{blurb}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Button onClick={() => onSignIn('signup')}>
          Create a free account
          <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
        </Button>
        <Button variant="ghost" onClick={() => onSignIn('signin')}>
          I already have one
        </Button>
      </div>
      <p className="mt-5 flex items-center gap-2 font-mono text-[0.6rem] tracking-wider uppercase text-parchment-dim">
        <Check className="h-3 w-3 text-moss-500" strokeWidth={2.4} />
        Free · no card required
      </p>
    </div>
  )
}
