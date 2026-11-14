// Google Analytics 4 loader.
//
// GA4 loads ONLY when a measurement ID is configured at build time via the
// VITE_GA_MEASUREMENT_ID environment variable (set in Vercel, then redeploy).
// When the variable is unset or malformed, nothing is injected: no script,
// no network request, no cookies. This keeps the site tracking-free by
// default while letting the owner opt into measurement with one env var.
//
// GA4 was chosen over Plausible/Umami as the default because it is free and
// pairs directly with Google Search Console data. See
// omnitily-seo/GSC_SETUP_STEPS.md for the owner-side setup steps.

const GA_SCRIPT_ID = 'omnitily-ga4-loader';

/** Returns the configured GA4 measurement ID, or null when unset/malformed. */
export function getGaMeasurementId(env: Record<string, string | undefined>): string | null {
  const raw = env.VITE_GA_MEASUREMENT_ID?.trim();
  if (!raw) return null;
  return /^G-[A-Z0-9]{4,20}$/.test(raw) ? raw : null;
}

/** The gtag.js URL for a measurement ID. */
export function gaScriptUrl(measurementId: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Injects the GA4 gtag.js script when a measurement ID is configured.
 * Safe to call on every load: it is a no-op without an ID and injects the
 * script only once. Returns true when GA4 is active after the call.
 */
export function initAnalytics(env: Record<string, string | undefined> = import.meta.env): boolean {
  if (typeof document === 'undefined') return false;
  const measurementId = getGaMeasurementId(env);
  if (!measurementId) return false;
  if (document.getElementById(GA_SCRIPT_ID)) return true;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId);

  const script = document.createElement('script');
  script.id = GA_SCRIPT_ID;
  script.async = true;
  script.src = gaScriptUrl(measurementId);
  document.head.appendChild(script);
  return true;
}
