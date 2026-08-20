import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { MANIFEST } from './images.manifest.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const raw = resolve(root, '.image-cache')
mkdirSync(raw, { recursive: true })

const grab = async (url, tries = 3) => {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ekva-build/1.0)' },
      })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return Buffer.from(await r.arrayBuffer())
    } catch (e) {
      if (i === tries - 1) throw e
      await new Promise((r) => setTimeout(r, 900 * (i + 1)))
    }
  }
}

const results = []
const failed = []
for (const item of MANIFEST) {
  const file = resolve(raw, `${item.slot}.bin`)
  if (!existsSync(file)) {
    try {
      writeFileSync(file, await grab(item.url))
    } catch (e) {
      console.log(`FAIL ${item.slot.padEnd(13)} ${e.message}`)
      failed.push(item.slot)
      continue
    }
  }
  const meta = await sharp(file).metadata()
  results.push({ ...item, file, w: meta.width, h: meta.height })
  console.log(`ok   ${item.slot.padEnd(13)} ${meta.width}x${meta.height} ${meta.format}`)
}

// Contact sheet so the picks can be eyeballed before they ship.
const COLS = 5
const CELL = 300
const rows = Math.ceil(results.length / COLS)
const tiles = await Promise.all(
  results.map(async (r, i) => ({
    input: await sharp(r.file)
      .resize(CELL - 8, CELL - 8, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 78 })
      .toBuffer(),
    left: (i % COLS) * CELL + 4,
    top: Math.floor(i / COLS) * CELL + 4,
  })),
)

await sharp({
  create: { width: COLS * CELL, height: rows * CELL, channels: 3, background: '#100c0a' },
})
  .composite(tiles)
  .jpeg({ quality: 80 })
  .toFile(resolve(root, '.image-cache/contact-sheet.jpg'))

console.log(`\ncontact sheet: ${results.length} tiles, ${COLS} cols x ${rows} rows`)
console.log(results.map((r, i) => `${i}:${r.slot}`).join('  '))
if (failed.length) console.log(`\nFAILED: ${failed.join(', ')}`)
