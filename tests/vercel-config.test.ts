import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface HeaderRule { source: string; headers: Array<{ key: string; value: string }> }
interface Rewrite { source: string; destination: string }

const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  functions: Record<string, { maxDuration: number }>;
  headers: HeaderRule[];
  rewrites: Rewrite[];
};

describe('Vercel deployment contract', () => {
  it('keeps the API function duration and route precedence explicit', () => {
    expect(config.functions['api/index.ts'].maxDuration).toBe(30);
    expect(config.rewrites).toEqual([
      { source: '/api/:path*', destination: '/api/index.ts' },
    ]);
    expect(config.rewrites.some((rewrite) => rewrite.source.startsWith('/tools/'))).toBe(false);
  });

  it('uses strict document headers and immutable caching only for assets', () => {
    const root = config.headers.find((rule) => rule.source === '/')!;
    const tools = config.headers.find((rule) => rule.source === '/tools/(.*)')!;
    const assets = config.headers.find((rule) => rule.source === '/assets/(.*)')!;
    for (const rule of [root, tools]) {
      const headers = Object.fromEntries(rule.headers.map(({ key, value }) => [key.toLowerCase(), value]));
      expect(headers['content-security-policy']).toContain("script-src 'self'");
      expect(headers['content-security-policy']).toContain("worker-src 'self' blob:");
      // Currency converter fetches live rates from Frankfurter; the CSP must
      // allow the current host (api.frankfurter.dev/v1) — the old
      // api.frankfurter.app host 301-redirects without CORS headers.
      expect(headers['content-security-policy']).toContain('connect-src \'self\' https://api.frankfurter.dev');
      expect(headers['content-security-policy']).not.toContain('api.frankfurter.app');
      expect(headers['content-security-policy']).not.toMatch(/script-src[^;]*unsafe-inline|unsafe-eval/);
      expect(headers['strict-transport-security']).toContain('max-age=31536000');
      expect(headers['cache-control']).toContain('must-revalidate');
    }
    expect(Object.fromEntries(assets.headers.map(({ key, value }) => [key.toLowerCase(), value]))['cache-control']).toContain('immutable');
  });

  it('lets GTM + GA4 load while keeping the lockdown directives', () => {
    const root = config.headers.find((rule) => rule.source === '/')!;
    const tools = config.headers.find((rule) => rule.source === '/tools/(.*)')!;
    for (const rule of [root, tools]) {
      const headers = Object.fromEntries(rule.headers.map(({ key, value }) => [key.toLowerCase(), value]));
      const csp = headers['content-security-policy'];
      // gtm.js and gtag.js both load from www.googletagmanager.com.
      expect(csp).toContain("script-src 'self' https://www.googletagmanager.com");
      // GA4 collect beacons go to google-analytics.com (incl. the regional host).
      expect(csp).toContain('https://www.google-analytics.com');
      expect(csp).toContain('https://region1.google-analytics.com');
      // The GTM noscript iframe (ns.html) needs frame-src; without it the
      // iframe falls back to default-src 'self' and is blocked.
      expect(csp).toContain('frame-src https://www.googletagmanager.com');
      // GA4 may also send beacons as image pixels.
      expect(csp).toContain('https://www.google-analytics.com');
      // The currency converter's Frankfurter allowance must survive.
      expect(csp).toContain('https://api.frankfurter.dev');
      // Lockdown stays: no wildcards, no eval, no object embeds, no framing.
      expect(csp).not.toContain('*');
      expect(csp).not.toMatch(/script-src[^;]*unsafe-eval/);
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
    }
  });
});
