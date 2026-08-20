// Discovery pass: CC0 / public-domain / CC-BY only.
// BY-ND forbids the cropping and resizing this build needs; BY-SA would push
// share-alike onto adapted brand assets. Both are excluded deliberately.
const SLOTS = {
  soil: ['vermicompost', 'worm castings', 'humus soil texture', 'compost close up'],
  worms: ['earthworm compost', 'eisenia fetida', 'worms in soil'],
  beds: ['compost windrow', 'vermicomposting bed', 'compost pile farm', 'manure heap farm'],
  land: ['organic farm field rows', 'farm india agriculture', 'green field crop rows'],
  hands: ['hands holding soil', 'hand with compost', 'farmer hands soil'],
  window: ['indoor plants window light', 'potted plants windowsill', 'houseplant sunlight room'],
  monstera: ['monstera deliciosa', 'swiss cheese plant leaf'],
  snake: ['sansevieria trifasciata', 'snake plant pot'],
  peace: ['spathiphyllum flower', 'peace lily plant pot'],
  fiddle: ['ficus lyrata', 'fiddle leaf fig indoor'],
  tulsi: ['ocimum tenuiflorum', 'holy basil tulsi plant'],
  jute: ['jute sack burlap', 'kraft paper bag', 'hessian sack texture'],
  nursery: ['plant nursery greenhouse', 'seedling nursery tray'],
  leaf: ['green leaf macro water drops', 'leaf texture macro'],
}

const seen = new Set()

const fetchQ = async (query) => {
  const url =
    'https://api.openverse.org/v1/images/?' +
    new URLSearchParams({ q: query, license: 'cc0,pdm,by', page_size: '20', mature: 'false' })
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'ekva-build/1.0' } })
    if (!r.ok) return []
    return (await r.json()).results || []
  } catch {
    return []
  }
}

const score = (r, query) => {
  const words = query.toLowerCase().split(' ')
  const title = (r.title || '').toLowerCase()
  const hits = words.filter((w) => w.length > 3 && title.includes(w)).length
  const px = (r.width || 0) * (r.height || 0)
  const free = r.license === 'cc0' || r.license === 'pdm' ? 2 : 0
  return hits * 4 + free + Math.min(px / 4e6, 3)
}

for (const [slot, queries] of Object.entries(SLOTS)) {
  const pool = []
  for (const q of queries) {
    for (const r of await fetchQ(q)) {
      if (!r.url || (r.width || 0) < 1000) continue
      if (seen.has(r.url)) continue
      pool.push({ ...r, _q: q, _s: score(r, q) })
    }
  }
  pool.sort((a, b) => b._s - a._s)
  const top = pool.slice(0, 5)
  top.forEach((r) => seen.add(r.url))
  console.log(`\n### ${slot}`)
  top.forEach((r, i) =>
    console.log(
      `${i}. [${r.license}] ${r.width}x${r.height} :: ${(r.title || '').slice(0, 56)}\n   ${r.url}\n   by ${(r.creator || '?').slice(0, 34)} | src=${r.source}`,
    ),
  )
}
