import { mkdirSync, writeFileSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cache = resolve(root, '.image-cache')
const out = resolve(root, 'src/assets')
mkdirSync(out, { recursive: true })

// sat: per-image saturation pull. Photos arrive from a dozen different cameras;
// the shared grade is what makes them read as one brand rather than a stock grid.
const ASSETS = [
  { slot: 'soil', src: 'vermicompost.bin', w: 1400, h: 950, sat: 0.78, lic: 'CC BY 2.0', by: 'SuSanA Secretariat' },
  { slot: 'worms', src: 'worms.bin', w: 1000, h: 750, sat: 0.8, lic: 'CC BY 2.0', by: 'SuSanA Secretariat' },
  { slot: 'beds', src: 'cand/land-4.bin', w: 1300, h: 850, sat: 0.74, lic: 'CC BY 2.0', by: 'Ian Sane' },
  { slot: 'land', src: 'cand/land-5.bin', w: 1400, h: 800, sat: 0.72, lic: 'CC BY 2.0', by: 'Pierre Bédat' },
  { slot: 'hands', src: 'hands.bin', w: 1100, h: 760, sat: 0.82, lic: 'CC0', by: 'rawpixel' },
  { slot: 'interior', src: 'cand/interior-9.bin', w: 1100, h: 820, sat: 0.76, lic: 'CC BY 2.0', by: 'Orin Zebest' },
  { slot: 'jungle', src: 'jungle.bin', w: 820, h: 1020, sat: 0.76, lic: 'CC0', by: 'WordPress Photo Directory' },
  { slot: 'sack', src: 'cand/sack-13.bin', w: 900, h: 900, sat: 0.7, lic: 'CC BY 2.0', by: 'Ava' },
  { slot: 'leaf', src: 'leaf.bin', w: 950, h: 620, sat: 0.7, lic: 'CC0', by: 'rawpixel' },
  { slot: 'monstera', src: 'monstera.bin', w: 720, h: 900, sat: 0.8, lic: 'CC0', by: 'rawpixel' },
  { slot: 'snake', src: 'snake2.bin', w: 720, h: 900, sat: 0.78, lic: 'CC0', by: 'Mohammed Kateregga' },
  { slot: 'peace', src: 'cand/peace-23.bin', w: 720, h: 900, sat: 0.78, lic: 'CC BY 3.0', by: 'Vaikoovery' },
  { slot: 'fiddle', src: 'fiddle.bin', w: 720, h: 900, sat: 0.78, lic: 'CC0', by: 'spandankarki' },
  { slot: 'tulsi', src: 'tulsi.bin', w: 720, h: 900, sat: 0.76, lic: 'CC0', by: 'Wikimedia Commons' },
]

const warm = (w, h) =>
  sharp({ create: { width: w, height: h, channels: 4, background: { r: 122, g: 88, b: 48, alpha: 0.17 } } })
    .png()
    .toBuffer()

let total = 0
const credits = []
for (const a of ASSETS) {
  const overlay = await warm(a.w, a.h)
  const file = resolve(out, `${a.slot}.webp`)
  await sharp(resolve(cache, a.src))
    .resize(a.w, a.h, { fit: 'cover', position: 'attention' })
    .modulate({ saturation: a.sat })
    .linear(1.05, -9)
    .composite([{ input: overlay, blend: 'soft-light' }])
    .webp({ quality: 72, effort: 5 })
    .toFile(file)
  const kb = statSync(file).size / 1024
  total += kb
  credits.push({ slot: a.slot, lic: a.lic, by: a.by })
  console.log(`${a.slot.padEnd(10)} ${a.w}x${a.h}  ${kb.toFixed(0)} KB`)
}

writeFileSync(
  resolve(out, 'credits.json'),
  JSON.stringify(
    credits.filter((c) => c.lic !== 'CC0'),
    null,
    2,
  ),
)

console.log(`\ntotal ${total.toFixed(0)} KB across ${ASSETS.length} images`)

// Review sheet of the graded output.
const COLS = 5
const CELL = 300
const rows = Math.ceil(ASSETS.length / COLS)
const tiles = []
for (let i = 0; i < ASSETS.length; i++) {
  tiles.push({
    input: await sharp(resolve(out, `${ASSETS[i].slot}.webp`))
      .resize(CELL - 6, CELL - 32, { fit: 'cover' })
      .jpeg({ quality: 78 })
      .toBuffer(),
    left: (i % COLS) * CELL + 3,
    top: Math.floor(i / COLS) * CELL + 3,
  })
  tiles.push({
    input: Buffer.from(
      `<svg width="${CELL - 6}" height="24"><rect width="100%" height="100%" fill="#100c0a"/><text x="5" y="17" font-family="monospace" font-size="14" fill="#D4AF37">${ASSETS[i].slot}</text></svg>`,
    ),
    left: (i % COLS) * CELL + 3,
    top: Math.floor(i / COLS) * CELL + CELL - 28,
  })
}
await sharp({ create: { width: COLS * CELL, height: rows * CELL, channels: 3, background: '#1c1613' } })
  .composite(tiles)
  .jpeg({ quality: 82 })
  .toFile(resolve(cache, 'final-sheet.jpg'))
