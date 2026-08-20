import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell,
} from 'recharts'
import {
  Users, IndianRupee, RefreshCcw, TrendingDown, Search, ShieldAlert, X, Ban, Play,
  Pause, CreditCard, Trash2, Mail, MapPin, CalendarDays, Package, Flag, Check,
  ArrowUpRight, LayoutDashboard, UserCog, Repeat, MessageSquareWarning,
} from 'lucide-react'
import { Button, Eyebrow, Pill, inr } from './ui.jsx'
import { PLAN_LABEL, PLAN_PRICE, REVENUE, REPORTED } from './data.js'

const STATUS_TONE = {
  active: 'good',
  past_due: 'warn',
  paused: 'neutral',
  suspended: 'warn',
  cancelled: 'neutral',
}
const STATUS_LABEL = {
  active: 'Active',
  past_due: 'Past due',
  paused: 'Paused',
  suspended: 'Suspended',
  cancelled: 'Cancelled',
}

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: UserCog },
  { id: 'subs', label: 'Subscriptions', icon: Repeat },
  { id: 'moderation', label: 'Moderation', icon: MessageSquareWarning },
]

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })

function Kpi({ icon: Icon, label, value, delta, tone = 'gold' }) {
  const tones = { gold: 'text-gold-500', good: 'text-moss-400', warn: 'text-terracotta-soft' }
  return (
    <div className="rounded-2xl border border-soil-700/60 bg-soil-900/40 p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-parchment-dim">{label}</span>
        <Icon className={`h-4 w-4 ${tones[tone]}`} strokeWidth={1.6} />
      </div>
      <p className="tnum mt-3 font-display text-[1.9rem] leading-none text-parchment">{value}</p>
      {delta && (
        <p className={`tnum mt-2 flex items-center gap-1 font-mono text-[0.62rem] ${delta.startsWith('-') ? 'text-terracotta-soft' : 'text-moss-400'}`}>
          <ArrowUpRight className={`h-3 w-3 ${delta.startsWith('-') ? 'rotate-90' : ''}`} strokeWidth={2} />
          {delta}
        </p>
      )}
    </div>
  )
}

function UserDrawer({ user, onClose, onAction }) {
  if (!user) return null
  return (
    <>
      <motion.div
        key="ad-backdrop"
        className="fixed inset-0 z-[70] bg-soil-950/75 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        key="ad-drawer"
        role="dialog" aria-label={`Manage ${user.name}`}
        className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-[430px] flex-col border-l border-gold-500/15 bg-soil-900"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 32 }}
      >
        <div className="flex items-start justify-between border-b border-soil-800 px-6 py-5">
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl text-parchment">{user.name}</h3>
            <p className="truncate font-mono text-[0.6rem] tracking-wider text-parchment-dim">{user.id}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-parchment-muted hover:text-gold-500">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-wrap gap-2">
            <Pill tone={STATUS_TONE[user.status]}>{STATUS_LABEL[user.status]}</Pill>
            <Pill tone={user.plan === 'quarterly' ? 'gold' : 'neutral'}>{PLAN_LABEL[user.plan]}</Pill>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {[
              [Mail, 'Email', user.email],
              [MapPin, 'City', user.city],
              [CalendarDays, 'Joined', fmtDate(user.joined)],
              [CreditCard, 'Payment method', user.method],
              [Package, 'Plants tracked', String(user.plants)],
              [IndianRupee, 'Lifetime value', inr(user.spend)],
            ].map(([Icon, k, v]) => (
              <div key={k} className="flex items-center gap-3 border-b border-soil-800 pb-3">
                <Icon className="h-3.5 w-3.5 shrink-0 text-parchment-dim" strokeWidth={1.6} />
                <span className="font-mono text-[0.6rem] tracking-[0.14em] uppercase text-parchment-dim">{k}</span>
                <span className="ml-auto truncate text-[0.85rem] text-parchment">{v}</span>
              </div>
            ))}
          </div>

          <p className="eyebrow mb-3 mt-7">Subscription</p>
          {user.plan === 'quarterly' && user.status !== 'cancelled' ? (
            <div className="rounded-xl border border-soil-700/70 bg-soil-950/60 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[0.88rem] text-parchment">Quarterly Refill · 15 kg</span>
                <span className="tnum font-mono text-sm text-gold-400">{inr(PLAN_PRICE.quarterly)}</span>
              </div>
              <p className="mt-2 font-mono text-[0.62rem] tracking-wider text-parchment-dim">
                {user.renews == null
                  ? 'No renewal scheduled'
                  : user.renews < 0
                    ? `Overdue by ${Math.abs(user.renews)} days`
                    : `Renews in ${user.renews} days`}
              </p>
            </div>
          ) : (
            <p className="text-[0.85rem] text-parchment-dim">No active subscription on this account.</p>
          )}

          <p className="eyebrow mb-3 mt-7">Actions</p>
          <div className="flex flex-col gap-2">
            {user.status !== 'suspended' ? (
              <Button variant="danger" className="w-full !py-3" onClick={() => onAction(user.id, 'suspend')}>
                <Ban className="h-4 w-4" strokeWidth={1.7} />
                Suspend account
              </Button>
            ) : (
              <Button variant="moss" className="w-full !py-3" onClick={() => onAction(user.id, 'activate')}>
                <Play className="h-4 w-4" strokeWidth={1.7} />
                Reinstate account
              </Button>
            )}

            {user.status === 'active' && (
              <Button variant="ghost" className="w-full !py-3" onClick={() => onAction(user.id, 'pause')}>
                <Pause className="h-4 w-4" strokeWidth={1.7} />
                Pause subscription
              </Button>
            )}
            {user.status === 'paused' && (
              <Button variant="ghost" className="w-full !py-3" onClick={() => onAction(user.id, 'activate')}>
                <Play className="h-4 w-4" strokeWidth={1.7} />
                Resume subscription
              </Button>
            )}
            {user.plan === 'trial' && (
              <Button variant="ghost" className="w-full !py-3" onClick={() => onAction(user.id, 'upgrade')}>
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.7} />
                Upgrade to quarterly
              </Button>
            )}
            {user.status === 'past_due' && (
              <Button variant="ghost" className="w-full !py-3" onClick={() => onAction(user.id, 'retry')}>
                <RefreshCcw className="h-4 w-4" strokeWidth={1.7} />
                Retry payment
              </Button>
            )}
            {user.status !== 'cancelled' && (
              <Button variant="danger" className="w-full !py-3" onClick={() => onAction(user.id, 'cancel')}>
                <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                Cancel subscription
              </Button>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  )
}

export default function Admin({ users, setUsers, posts, setPosts }) {
  const [section, setSection] = useState('overview')
  const [q, setQ] = useState('')
  const [plan, setPlan] = useState('all')
  const [status, setStatus] = useState('all')
  const [openId, setOpenId] = useState(null)
  const [reports, setReports] = useState(REPORTED)
  const [toast, setToast] = useState(null)

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        const hay = `${u.name} ${u.email} ${u.city} ${u.id}`.toLowerCase()
        if (q && !hay.includes(q.toLowerCase())) return false
        if (plan !== 'all' && u.plan !== plan) return false
        if (status !== 'all' && u.status !== status) return false
        return true
      }),
    [users, q, plan, status],
  )

  const kpi = useMemo(() => {
    const activeSubs = users.filter((u) => u.plan === 'quarterly' && u.status === 'active').length
    const mrr = activeSubs * (PLAN_PRICE.quarterly / 3)
    const churned = users.filter((u) => u.status === 'cancelled' || u.status === 'suspended').length
    const pastDue = users.filter((u) => u.status === 'past_due').length
    return { activeSubs, mrr, churned, pastDue, churnRate: ((churned / users.length) * 100).toFixed(1) }
  }, [users])

  const planMix = useMemo(() => {
    const q1 = users.filter((u) => u.plan === 'quarterly').length
    return [
      { name: 'Quarterly', v: q1, fill: '#D4AF37' },
      { name: 'Trial', v: users.length - q1, fill: '#4E7C5E' },
    ]
  }, [users])

  const flash = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  const act = (id, what) => {
    setUsers((us) =>
      us.map((u) => {
        if (u.id !== id) return u
        switch (what) {
          case 'suspend': return { ...u, status: 'suspended' }
          case 'activate': return { ...u, status: 'active' }
          case 'pause': return { ...u, status: 'paused' }
          case 'cancel': return { ...u, status: 'cancelled', renews: null }
          case 'upgrade': return { ...u, plan: 'quarterly', status: 'active', renews: 90 }
          case 'retry': return { ...u, status: 'active', renews: 90 }
          default: return u
        }
      }),
    )
    const labels = {
      suspend: 'Account suspended', activate: 'Account reinstated', pause: 'Subscription paused',
      cancel: 'Subscription cancelled', upgrade: 'Upgraded to quarterly', retry: 'Payment retried successfully',
    }
    flash(labels[what])
    if (what === 'suspend' || what === 'cancel') setOpenId(null)
  }

  const openUser = users.find((u) => u.id === openId) || null

  return (
    <div className="mx-auto max-w-[1320px] px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow icon={ShieldAlert}>Operator console</Eyebrow>
          <h1 className="mt-4 font-display text-[2rem] leading-tight text-parchment sm:text-[2.6rem]">
            Admin <span className="text-gold-500">Dashboard</span>
          </h1>
        </div>
        <Pill tone="good">
          <span className="h-1.5 w-1.5 rounded-full bg-moss-400" />
          All systems nominal
        </Pill>
      </div>

      <div className="mt-8 flex gap-1.5 overflow-x-auto border-b border-soil-800 pb-px">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            aria-pressed={section === s.id}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 font-mono text-[0.62rem] tracking-[0.14em] uppercase transition-colors ${
              section === s.id
                ? 'border-gold-500 text-gold-400'
                : 'border-transparent text-parchment-dim hover:text-parchment-muted'
            }`}
          >
            <s.icon className="h-3.5 w-3.5" strokeWidth={1.7} />
            {s.label}
          </button>
        ))}
      </div>

      {section === 'overview' && (
        <div className="mt-8 flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={Users} label="Total users" value={users.length} delta="+2 this month" />
            <Kpi icon={Repeat} label="Active subscriptions" value={kpi.activeSubs} delta="+1 this month" tone="good" />
            <Kpi icon={IndianRupee} label="Monthly recurring" value={inr(kpi.mrr)} delta="+16.7%" />
            <Kpi icon={TrendingDown} label="Churn rate" value={`${kpi.churnRate}%`} delta={`${kpi.pastDue} past due`} tone="warn" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-soil-700/60 bg-soil-900/40 p-6">
              <p className="eyebrow mb-5">Recurring revenue · 8 months</p>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={REVENUE} margin={{ top: 4, right: 6, left: -14, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#3A2E27" strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="m" tickLine={false} axisLine={{ stroke: '#3A2E27' }} />
                    <YAxis tickLine={false} axisLine={false} width={54}
                      tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip
                      contentStyle={{ background: '#100C0A', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, fontFamily: 'IBM Plex Mono', fontSize: 12 }}
                      labelStyle={{ color: '#D4AF37' }}
                      formatter={(v) => [inr(v), 'MRR']}
                    />
                    <Area type="monotone" dataKey="mrr" stroke="#D4AF37" strokeWidth={1.8} fill="url(#mrrFill)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-soil-700/60 bg-soil-900/40 p-6">
              <p className="eyebrow mb-5">Plan mix</p>
              <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planMix} layout="vertical" margin={{ left: -22, right: 12 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={90} />
                    <Bar dataKey="v" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                      {planMix.map((e) => <Cell key={e.name} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-col gap-2.5 border-t border-soil-800 pt-4">
                {[
                  ['Avg. lifetime value', inr(users.reduce((s, u) => s + u.spend, 0) / users.length)],
                  ['Plants under care', users.reduce((s, u) => s + u.plants, 0)],
                  ['Renewals next 7 days', users.filter((u) => u.renews != null && u.renews >= 0 && u.renews <= 7).length],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between">
                    <span className="text-[0.8rem] text-parchment-dim">{k}</span>
                    <span className="tnum font-mono text-[0.85rem] text-parchment">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {section === 'users' && (
        <div className="mt-8">
          <div className="flex flex-wrap gap-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-dim" strokeWidth={1.6} />
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email, city or ID" aria-label="Search users"
                className="w-full rounded-full border border-soil-700 bg-soil-900/60 py-3 pl-10 pr-4 text-sm text-parchment placeholder:text-parchment-dim/60 focus:border-gold-500/60"
              />
            </div>
            <select
              value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Filter by plan"
              className="rounded-full border border-soil-700 bg-soil-900/60 px-4 py-3 font-mono text-[0.68rem] tracking-wider uppercase text-parchment-muted focus:border-gold-500/60"
            >
              <option value="all">All plans</option>
              <option value="quarterly">Quarterly</option>
              <option value="trial">Trial</option>
            </select>
            <select
              value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
              className="rounded-full border border-soil-700 bg-soil-900/60 px-4 py-3 font-mono text-[0.68rem] tracking-wider uppercase text-parchment-muted focus:border-gold-500/60"
            >
              <option value="all">All statuses</option>
              {Object.keys(STATUS_LABEL).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>

          <p className="mt-4 font-mono text-[0.62rem] tracking-[0.14em] uppercase text-parchment-dim">
            {filtered.length} of {users.length} accounts
          </p>

          <div className="mt-3 overflow-x-auto rounded-2xl border border-soil-700/60">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-soil-700/60 bg-soil-900/60">
                  {['User', 'City', 'Plan', 'Status', 'Renews', 'LTV', ''].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-left font-mono text-[0.58rem] tracking-[0.16em] uppercase text-parchment-dim">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-soil-800 last:border-0 hover:bg-soil-900/50">
                    <td className="px-4 py-3.5">
                      <p className="text-[0.88rem] text-parchment">{u.name}</p>
                      <p className="font-mono text-[0.58rem] tracking-wide text-parchment-dim">{u.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[0.82rem] text-parchment-muted">{u.city}</td>
                    <td className="px-4 py-3.5">
                      <Pill tone={u.plan === 'quarterly' ? 'gold' : 'neutral'}>{PLAN_LABEL[u.plan]}</Pill>
                    </td>
                    <td className="px-4 py-3.5">
                      <Pill tone={STATUS_TONE[u.status]}>{STATUS_LABEL[u.status]}</Pill>
                    </td>
                    <td className="tnum px-4 py-3.5 font-mono text-[0.78rem] text-parchment-muted">
                      {u.renews == null ? '—' : u.renews < 0 ? `${Math.abs(u.renews)}d late` : `${u.renews}d`}
                    </td>
                    <td className="tnum px-4 py-3.5 font-mono text-[0.78rem] text-gold-400">{inr(u.spend)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setOpenId(u.id)}
                        className="rounded-full border border-soil-700 px-3.5 py-1.5 font-mono text-[0.58rem] tracking-[0.14em] uppercase text-parchment-muted transition-colors hover:border-gold-500/60 hover:text-gold-400"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="py-12 text-center text-[0.88rem] text-parchment-dim">No accounts match those filters.</p>
            )}
          </div>
        </div>
      )}

      {section === 'subs' && (
        <div className="mt-8 flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi icon={Repeat} label="Active" value={kpi.activeSubs} tone="good" />
            <Kpi icon={RefreshCcw} label="Past due" value={kpi.pastDue} tone="warn" />
            <Kpi icon={Pause} label="Paused" value={users.filter((u) => u.status === 'paused').length} />
          </div>

          <div className="rounded-2xl border border-soil-700/60 bg-soil-900/40 p-6">
            <p className="eyebrow mb-5">Billing queue</p>
            <div className="flex flex-col gap-2.5">
              {users
                .filter((u) => u.renews != null)
                .sort((a, b) => a.renews - b.renews)
                .map((u) => (
                  <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-soil-700/70 bg-soil-950/50 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.88rem] text-parchment">{u.name}</p>
                      <p className="truncate font-mono text-[0.58rem] tracking-wider text-parchment-dim">{u.method}</p>
                    </div>
                    <span className="tnum font-mono text-[0.78rem] text-parchment-muted">{inr(PLAN_PRICE[u.plan])}</span>
                    <Pill tone={u.renews < 0 ? 'warn' : u.renews <= 7 ? 'gold' : 'neutral'}>
                      {u.renews < 0 ? `${Math.abs(u.renews)}d overdue` : `in ${u.renews}d`}
                    </Pill>
                    {u.renews < 0 && (
                      <button
                        onClick={() => act(u.id, 'retry')}
                        className="rounded-full border border-moss-500/40 px-3.5 py-1.5 font-mono text-[0.58rem] tracking-[0.14em] uppercase text-moss-400 hover:bg-moss-800/50"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {section === 'moderation' && (
        <div className="mt-8 flex flex-col gap-5">
          <div className="rounded-2xl border border-soil-700/60 bg-soil-900/40 p-6">
            <p className="eyebrow mb-5">Reported posts</p>
            {reports.length ? (
              <div className="flex flex-col gap-3">
                {reports.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-start gap-4 rounded-xl border border-terracotta/25 bg-terracotta/[0.06] px-4 py-4">
                    <Flag className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-soft" strokeWidth={1.7} />
                    <div className="min-w-[200px] flex-1">
                      <p className="text-[0.9rem] text-parchment">“{r.post}”</p>
                      <p className="mt-1 font-mono text-[0.6rem] tracking-wider text-parchment-dim">
                        {r.author} · {r.reason} · {r.count} reports
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setReports((x) => x.filter((y) => y.id !== r.id))}
                        className="flex items-center gap-1.5 rounded-full border border-soil-600 px-3.5 py-2 font-mono text-[0.58rem] tracking-[0.14em] uppercase text-parchment-muted hover:text-parchment"
                      >
                        <Check className="h-3 w-3" strokeWidth={2.2} />
                        Keep
                      </button>
                      <button
                        onClick={() => setReports((x) => x.filter((y) => y.id !== r.id))}
                        className="flex items-center gap-1.5 rounded-full border border-terracotta/45 px-3.5 py-2 font-mono text-[0.58rem] tracking-[0.14em] uppercase text-terracotta-soft hover:bg-terracotta/15"
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={2} />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-[0.88rem] text-parchment-dim">Queue is clear.</p>
            )}
          </div>

          <div className="rounded-2xl border border-soil-700/60 bg-soil-900/40 p-6">
            <p className="eyebrow mb-5">Live community posts · {posts.length}</p>
            <div className="flex flex-col gap-2.5">
              {posts.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-soil-700/70 bg-soil-950/50 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.86rem] text-parchment">{p.text}</p>
                    <p className="truncate font-mono text-[0.58rem] tracking-wider text-parchment-dim">
                      {p.author} · {p.likes} likes · {p.comments.length} replies
                    </p>
                  </div>
                  <button
                    onClick={() => setPosts((ps) => ps.filter((x) => x.id !== p.id))}
                    aria-label="Remove post"
                    className="rounded-full border border-soil-700 p-2 text-parchment-dim hover:border-terracotta/50 hover:text-terracotta"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {openId && <UserDrawer key="drawer" user={openUser} onClose={() => setOpenId(null)} onAction={act} />}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-6 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-gold-500/30 bg-soil-900 px-5 py-3 shadow-[0_18px_50px_-16px_rgba(0,0,0,0.9)]"
          >
            <Check className="h-3.5 w-3.5 text-moss-400" strokeWidth={2.4} />
            <span className="font-mono text-[0.66rem] tracking-wider text-parchment">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
