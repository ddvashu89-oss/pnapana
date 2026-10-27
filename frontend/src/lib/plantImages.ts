/**
 * Plant Image Resolver & Fallback Utility
 * Ensures every plant photo is 100% visible and gracefully handles broken external URLs.
 */

export const DEFAULT_PLANT_FALLBACK = 'https://images.unsplash.com/photo-1512428813834-c702c7702b78?w=600&q=80';

// Verified, permanent high-resolution botanical photo dictionary
export const BOTANICAL_PHOTO_MAP: Record<string, string> = {
  gerbera: 'https://images.unsplash.com/photo-1572454591674-2739f30d8c40?w=600&q=80',
  rose: 'https://images.unsplash.com/photo-1533616688419-b7a585564566?w=600&q=80',
  banana: 'https://images.unsplash.com/photo-1567689265664-1c48de61db0b?w=600&q=80',
  fern: 'https://images.unsplash.com/photo-1512428813834-c702c7702b78?w=600&q=80',
  dahlia: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&q=80',
  jade: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=600&q=80',
  succulent: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=600&q=80',
  echeveria: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=600&q=80',
  monstera: '/monstera.png',
  tulsi: '/tulsi.png',
  snake: '/snake.png',
  peace: '/peace.png',
  areca: '/areca.png',
  palm: '/areca.png',
  aloe: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=600&q=80',
  fiddle: '/fiddle.png',
};

// Known stale or 404 Unsplash photo replacements
const BROKEN_URL_REPLACEMENTS: Record<string, string> = {
  'photo-1593691509543-c55fb32e7355': 'https://images.unsplash.com/photo-1572454591674-2739f30d8c40?w=600&q=80',
  'photo-1548625361-195fe5795df5': 'https://images.unsplash.com/photo-1533616688419-b7a585564566?w=600&q=80',
  'photo-1596724817796-0158df95c474': 'https://images.unsplash.com/photo-1567689265664-1c48de61db0b?w=600&q=80',
};

export function getPlantImageUrl(url?: string | null, plantName?: string): string {
  if (url && typeof url === 'string') {
    const trimmed = url.trim();

    // Check broken replacements
    for (const [brokenKey, replacement] of Object.entries(BROKEN_URL_REPLACEMENTS)) {
      if (trimmed.includes(brokenKey)) {
        return replacement;
      }
    }

    // Direct data URI or valid local public / http path
    if (
      trimmed.startsWith('data:image/') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://')
    ) {
      return trimmed;
    }
  }

  // Fallback by plant name matching
  if (plantName) {
    const lower = plantName.toLowerCase();
    for (const [key, photoUrl] of Object.entries(BOTANICAL_PHOTO_MAP)) {
      if (lower.includes(key)) {
        return photoUrl;
      }
    }
  }

  return DEFAULT_PLANT_FALLBACK;
}

export function handlePlantImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const target = e.currentTarget;
  if (target.src !== DEFAULT_PLANT_FALLBACK) {
    target.src = DEFAULT_PLANT_FALLBACK;
  }
}
