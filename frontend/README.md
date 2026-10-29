# Pnapana frontend

Pnapana uses Next.js App Router, React, CSS Modules, Lucide icons, and Framer Motion. The frontend is exported as static files for the PHP/cPanel deployment; the API lives in `../backend/api`.

## Run and build

```bash
npm run dev
npm run lint
npm run build
```

Development runs at `http://localhost:3000`. Configure the local PHP API with `NEXT_PUBLIC_API_URL` in `.env.local` (see `.env.example`). Production uses `/backend/api`. A production build writes the deployable site to `out/`, which is tracked for direct cPanel deployment.

## Project map

- `src/app`: public pages, authentication, dashboard, plant details, care, exploration, rituals, community, account, subscriptions, and admin routes.
- `src/components/Sidebar.tsx`: shared app header, desktop navigation, and five-tab mobile navigation. Garden and Rewards open dashboard sections; Scan opens the existing plant-identification dialog.
- `src/components/WeatherCard.tsx`: shared weather overview and plant-care panel. Weather comes from Open-Meteo; watering dates come from the plant's saved schedule. Dashboard scan labels and the photo streak use saved scan history. If location access is unavailable, the card explicitly identifies its Bengaluru fallback.
- `src/lib/api.ts`: local/production API routing and authenticated requests.
- `src/lib/i18n`: the existing English/Hindi language provider and translations.
- `public/`: source plant images copied into each static export. Keep assets here rather than adding them only to `out/`.

## Theme

`src/app/globals.css` owns the shared palette: warm cream backgrounds, white cards, forest-green actions, sage highlights, pastel weather panels, and muted terracotta details. It also defines typefaces, borders, radii, focus states, reduced motion, and the navigation spacing. Fraunces and Karla are bundled under `public/fonts/` with their licenses, so local and production previews use the same fonts.

Page-specific layout belongs in the adjacent CSS Module. Use `--text-primary` for body text and `--on-accent` for text on filled green buttons. Reuse the shared tokens when adding pages so public, account, and administrative screens remain consistent.
