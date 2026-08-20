import type { NextConfig } from "next";

// Static export: `npm run build` emits plain HTML/CSS/JS to ./out, which any
// PHP/shared host serves without Node.js. The app is a pure client-side SPA
// (every page is 'use client', no route handlers, middleware, or server
// actions), so nothing is lost by pre-rendering it.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
