import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, '.image-cache/cand')
mkdirSync(dir, { recursive: true })

const SLOTS = {
  beds: ['compost windrow rows', 'vermicompost farm bed', 'compost turning facility', 'organic fertilizer production'],
  land: ['green crop field rows', 'farm landscape green fields', 'agricultural land green india', 'paddy field green'],
  interior: ['houseplant window light', 'plant near window home', 'monstera window interior', 'plants sunny room'],
  sack: ['burlap texture', 'hessian sackcloth', 'kraft paper texture', 'brown paper bag'],
  snake: ['sansevieria plant interior', 'snake plant white background', 'sansevieria pot home'],
  peace: ['spathiphyllum white flower', 'peace lily white spathe', 'spathiphyllum plant indoor'],
}

const grab = async (url) => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ekva-build/1.0)' } })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return Buffer.from(await r.arrayBuffer())
    } catch (e) {
      if (i === 2) return null
      await new Promise((r) => setTimeout(r, 800))
    }
  }
}

const picked = []
for (const [slot, queries] of Object.entries(SLOTS)) {
  const pool = []
  const seen = new Set()
  for (const q of queries) {
    const u = 'https://api.openverse.org/v1/images/?' + new URLSearchParams({ q, license: 'cc0,pdm,by', page_size: '14', mature: 'false' })
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'ekva-build/1.0' } })
      if (!r.ok) continue
      for (const x of (await r.json()).results || []) {
        if (!x.url || (x.width || 0) < 900 || seen.has(x.url)) continue
        seen.add(x.url)
        pool.push(x)
      }
    } catch {}
  }
  for (const c of pool.slice(0, 4)) {
    const id = `${slot}-${picked.length}`
    const f = resolve(dir, id + '.bin')
    if (!existsSync(f)) {
      const b = await grab(c.url)
      if (!b) continue
      writeFileSync(f, b)
    }
    try {
      await sharp(f).metadata()
      picked.push({ id, slot, file: f, url: c.url, license: c.license, credit: c.creator, title: c.title })
    } catch {}
  }
}

const COLS = 6
const CELL = 260
const rows = Math.ceil(picked.length / COLS)
const tiles = []
for (let i = 0; i < picked.length; i++) {
  tiles.push({
    input: await sharp(picked[i].file).resize(CELL - 6, CELL - 34, { fit: 'cover' }).jpeg({ quality: 76 }).toBuffer(),
    left: (i % COLS) * CELL + 3,
    top: Math.floor(i / COLS) * CELL + 3,
  })
  const label = `${i} ${picked[i].slot}`
  tiles.push({
    input: Buffer.from(
      `<svg width="${CELL - 6}" height="26"><rect width="100%" height="100%" fill="#100c0a"/><text x="4" y="18" font-family="monospace" font-size="15" fill="#D4AF37">${label}</text></svg>`,
    ),
    left: (i % COLS) * CELL + 3,
    top: Math.floor(i / COLS) * CELL + CELL - 30,
  })
}

await sharp({ create: { width: COLS * CELL, height: rows * CELL, channels: 3, background: '#1c1613' } })
  .composite(tiles)
  .jpeg({ quality: 80 })
  .toFile(resolve(root, '.image-cache/candidates.jpg'))

writeFileSync(resolve(root, '.image-cache/candidates.json'), JSON.stringify(picked, null, 1))
console.log(picked.map((p, i) => `${i} ${p.slot} [${p.license}] ${(p.title || '').slice(0, 46)}`).join('\n'))
