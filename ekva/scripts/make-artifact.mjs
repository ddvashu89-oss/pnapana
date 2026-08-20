import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// The Artifact host supplies its own <!doctype>/<html>/<head>/<body> skeleton,
// so flatten Vite's document into a body-safe fragment.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const html = readFileSync(resolve(root, 'dist/index.html'), 'utf8')

const all = (re) => [...html.matchAll(re)].map((m) => m[0])

const title = all(/<title>[\s\S]*?<\/title>/gi)
const links = all(/<link\b[^>]*>/gi).filter((t) => !/rel=["']?(icon|manifest)/i.test(t))
const styles = all(/<style\b[^>]*>[\s\S]*?<\/style>/gi)
const scripts = all(/<script\b[^>]*>[\s\S]*?<\/script>/gi)

if (!title.length || !styles.length || !scripts.length)
  throw new Error(`incomplete extraction: ${title.length}/${styles.length}/${scripts.length}`)

// React DOM embeds a literal "<script" inside a string, so count real closers only.
const closers = (html.match(/<\/script>/gi) || []).length
if (closers !== scripts.length)
  throw new Error(`script extraction incomplete: ${closers} closers vs ${scripts.length} matched`)

const out = [...title, ...links, ...styles, '<div id="root"></div>', ...scripts].join('\n') + '\n'

writeFileSync(resolve(root, 'dist/artifact.html'), out)
console.log(`artifact.html — ${(Buffer.byteLength(out) / 1024).toFixed(0)} KB`)
