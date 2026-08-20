import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, MessageCircle, Image as ImageIcon, Send, Users, Sparkles, LifeBuoy,
  Sprout, X, MapPin,
} from 'lucide-react'
import { Button, Eyebrow, Pill, Reveal } from './ui.jsx'
import { SEED_POSTS } from './data.js'

const TABS = [
  { id: 'all', label: 'Latest', icon: Sparkles },
  { id: 'win', label: 'Wins', icon: Sprout },
  { id: 'help', label: 'Help needed', icon: LifeBuoy },
]

const TAG_TONE = { win: 'good', help: 'warn', soil: 'gold' }
const TAG_LABEL = { win: 'Win', help: 'Help needed', soil: 'Soil' }

const initials = (name) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

function Avatar({ name, size = 40 }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-gold-500/25 bg-gradient-to-br from-moss-800 to-soil-800 font-mono text-[0.68rem] tracking-wider text-gold-400"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

function Composer({ onPost }) {
  const [text, setText] = useState('')
  const [tag, setTag] = useState('win')
  const [img, setImg] = useState(null)
  const fileRef = useRef(null)

  const pick = (f) => {
    if (!f || !f.type.startsWith('image/')) return
    const r = new FileReader()
    r.onload = () => setImg(r.result)
    r.readAsDataURL(f)
  }

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onPost({ text: text.trim(), tag, img })
    setText('')
    setImg(null)
  }

  return (
    <form onSubmit={submit} className="glass hairline rounded-2xl p-5">
      <div className="flex gap-4">
        <Avatar name="You There" />
        <div className="min-w-0 flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="What did your soil do this week?"
            aria-label="Write a post"
            className="w-full resize-none rounded-xl border border-soil-700 bg-soil-900/50 px-4 py-3 text-[0.92rem] leading-relaxed text-parchment placeholder:text-parchment-dim/60 focus:border-gold-500/60"
          />

          {img && (
            <div className="relative mt-3 inline-block">
              <img src={img} alt="Attached" className="h-28 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => setImg(null)}
                aria-label="Remove image"
                className="absolute -right-2 -top-2 rounded-full border border-soil-600 bg-soil-950 p-1 text-parchment-muted hover:text-terracotta"
              >
                <X className="h-3 w-3" strokeWidth={2.4} />
              </button>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-full border border-soil-700 px-3.5 py-2 font-mono text-[0.6rem] tracking-[0.14em] uppercase text-parchment-dim transition-colors hover:border-gold-500/50 hover:text-gold-400"
            >
              <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.7} />
              Photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only"
              onChange={(e) => pick(e.target.files?.[0])} />

            {Object.keys(TAG_LABEL).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                aria-pressed={tag === t}
                className={`rounded-full border px-3.5 py-2 font-mono text-[0.6rem] tracking-[0.14em] uppercase transition-colors ${
                  tag === t
                    ? 'border-gold-500/60 bg-gold-500/10 text-gold-400'
                    : 'border-soil-700 text-parchment-dim hover:text-parchment-muted'
                }`}
              >
                {TAG_LABEL[t]}
              </button>
            ))}

            <Button type="submit" disabled={!text.trim()} className="ml-auto !px-5 !py-2.5 !text-[0.65rem]">
              <Send className="h-3.5 w-3.5" strokeWidth={1.8} />
              Post
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

function Post({ post, onLike, onComment }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-soil-700/60 bg-soil-900/40 transition-colors hover:border-gold-500/25"
    >
      <div className="flex items-center gap-3 px-5 pt-5">
        <Avatar name={post.author} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.92rem] text-parchment">{post.author}</p>
          <p className="flex items-center gap-1.5 truncate font-mono text-[0.58rem] tracking-wider uppercase text-parchment-dim">
            <MapPin className="h-2.5 w-2.5" strokeWidth={2} />
            {post.city} · {post.time}
          </p>
        </div>
        <Pill tone={TAG_TONE[post.tag] || 'neutral'}>{TAG_LABEL[post.tag] || post.tag}</Pill>
      </div>

      <p className="px-5 pt-4 text-[0.94rem] leading-[1.72] text-parchment-muted">{post.text}</p>

      {post.plant && (
        <p className="px-5 pt-3 font-display text-sm italic text-moss-400">{post.plant}</p>
      )}

      {post.img && (
        <img src={post.img} alt="" className="mt-4 max-h-[420px] w-full object-cover" />
      )}

      <div className="flex items-center gap-1 px-3 py-3">
        <button
          onClick={() => onLike(post.id)}
          aria-pressed={!!post.liked}
          className={`flex items-center gap-2 rounded-full px-3.5 py-2 font-mono text-[0.62rem] tracking-wider transition-colors ${
            post.liked ? 'text-terracotta-soft' : 'text-parchment-dim hover:text-parchment'
          }`}
        >
          <Heart className={`h-4 w-4 ${post.liked ? 'fill-current' : ''}`} strokeWidth={1.7} />
          <span className="tnum">{post.likes}</span>
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full px-3.5 py-2 font-mono text-[0.62rem] tracking-wider text-parchment-dim transition-colors hover:text-parchment"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={1.7} />
          <span className="tnum">{post.comments.length}</span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-soil-800"
          >
            <div className="flex flex-col gap-3 p-5">
              {post.comments.map((c, i) => (
                <div key={i} className="flex gap-3">
                  <Avatar name={c.by} size={28} />
                  <div className="min-w-0">
                    <p className="text-[0.8rem] text-parchment">{c.by}</p>
                    <p className="text-[0.85rem] leading-relaxed text-parchment-muted">{c.text}</p>
                  </div>
                </div>
              ))}
              {!post.comments.length && (
                <p className="text-[0.82rem] text-parchment-dim">No replies yet. Be the first.</p>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!draft.trim()) return
                  onComment(post.id, draft.trim())
                  setDraft('')
                }}
                className="mt-1 flex gap-2"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a reply…"
                  aria-label="Write a reply"
                  className="flex-1 rounded-full border border-soil-700 bg-soil-900/60 px-4 py-2.5 text-[0.85rem] text-parchment placeholder:text-parchment-dim/60 focus:border-gold-500/60"
                />
                <Button type="submit" variant="ghost" className="!px-4 !py-2.5" disabled={!draft.trim()}>
                  <Send className="h-3.5 w-3.5" strokeWidth={1.8} />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

export default function Community({ posts, setPosts }) {
  const [tab, setTab] = useState('all')

  const visible = useMemo(
    () => (tab === 'all' ? posts : posts.filter((p) => p.tag === tab)),
    [posts, tab],
  )

  const like = (id) =>
    setPosts((ps) =>
      ps.map((p) => (p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p)),
    )

  const comment = (id, text) =>
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, comments: [...p.comments, { by: 'You', text }] } : p)))

  const post = ({ text, tag, img }) =>
    setPosts((ps) => [
      { id: 'c' + Date.now(), author: 'You', city: 'Delhi NCR', time: 'now', text, tag, img, plant: null, likes: 0, comments: [] },
      ...ps,
    ])

  const stats = [
    ['4,180', 'growers'],
    ['61', 'cities'],
    ['12.4k', 'scans logged'],
  ]

  return (
    <div className="mx-auto max-w-[1320px] px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
      <Reveal>
        <Eyebrow icon={Users}>The Commons</Eyebrow>
        <h1 className="mt-5 max-w-[22ch] font-display text-[2.2rem] leading-[1.06] text-parchment sm:text-[3rem]">
          Balconies comparing <span className="text-gold-500">notes.</span>
        </h1>
      </Reveal>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_290px]">
        <div className="flex flex-col gap-4">
          <Reveal>
            <Composer onPost={post} />
          </Reveal>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 font-mono text-[0.62rem] tracking-[0.14em] uppercase transition-colors ${
                  tab === t.id
                    ? 'border-gold-500/60 bg-gold-500/10 text-gold-400'
                    : 'border-soil-700 text-parchment-dim hover:text-parchment-muted'
                }`}
              >
                <t.icon className="h-3.5 w-3.5" strokeWidth={1.7} />
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="popLayout">
            {visible.map((p) => (
              <Post key={p.id} post={p} onLike={like} onComment={comment} />
            ))}
          </AnimatePresence>

          {!visible.length && (
            <p className="py-16 text-center text-[0.9rem] text-parchment-dim">
              Nothing filed under this yet.
            </p>
          )}
        </div>

        <aside className="hidden flex-col gap-4 lg:flex">
          <div className="glass hairline sticky top-28 rounded-2xl p-6">
            <p className="eyebrow mb-4">The Commons</p>
            <div className="flex flex-col gap-4">
              {stats.map(([n, l]) => (
                <div key={l} className="flex items-baseline justify-between border-b border-soil-800 pb-3 last:border-0">
                  <span className="text-[0.82rem] text-parchment-dim">{l}</span>
                  <span className="tnum font-display text-xl text-gold-500">{n}</span>
                </div>
              ))}
            </div>

            <p className="eyebrow mb-3 mt-7">House rules</p>
            <ul className="flex flex-col gap-2.5">
              {[
                'Post the reading, not just the photo.',
                'No product spam. We remove it same day.',
                'Say when something failed. It helps more.',
              ].map((r) => (
                <li key={r} className="text-[0.82rem] leading-relaxed text-parchment-muted">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
