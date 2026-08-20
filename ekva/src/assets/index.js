// Vite inlines these as data URIs (assetsInlineLimit is raised in vite.config.js),
// so the published single-file build carries its own photography.
// Swap any file in this folder to rebrand — no other change needed.
import soil from './soil.webp'
import worms from './worms.webp'
import beds from './beds.webp'
import land from './land.webp'
import hands from './hands.webp'
import interior from './interior.webp'
import jungle from './jungle.webp'
import sack from './sack.webp'
import leaf from './leaf.webp'
import monstera from './monstera.webp'
import snake from './snake.webp'
import peace from './peace.webp'
import fiddle from './fiddle.webp'
import tulsi from './tulsi.webp'

export const IMG = {
  soil, worms, beds, land, hands, interior, jungle, sack, leaf,
  monstera, snake, peace, fiddle, tulsi,
}

export const PHOTO_CREDITS = [
  ['Vermicompost & earthworm beds', 'SuSanA Secretariat', 'CC BY 2.0'],
  ['Field rows & sanctuary land', 'Ian Sane, Pierre Bédat', 'CC BY 2.0'],
  ['Window light study', 'Orin Zebest', 'CC BY 2.0'],
  ['Hessian pouch material', 'Ava', 'CC BY 2.0'],
  ['Spathiphyllum wallisii', 'Vaikoovery', 'CC BY 3.0'],
]
