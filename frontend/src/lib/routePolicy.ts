// Routes that render their own footer (Landing.module.css-based pages) and should
// get the shared <Footer /> injected by the root layout instead of duplicating it inline.
const SHARED_FOOTER_ROUTES = ['/', '/about', '/contact', '/privacy-policy', '/terms-of-service', '/care-guide'];
const APP_SHELL_PREFIXES = ['/dashboard', '/explore', '/rituals', '/care', '/you', '/plant', '/settings', '/community'];

export function isPublicMarketingRoute(pathname: string): boolean {
  return SHARED_FOOTER_ROUTES.includes(pathname);
}

export function isAppShellRoute(pathname: string): boolean {
  return APP_SHELL_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}
