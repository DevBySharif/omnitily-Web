import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LEGAL_PAGE_LIST, PRIVACY_PAGE, TERMS_PAGE } from '../src/lib/legalContent';
import { LegalPageView } from '../src/components/LegalPageView';

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

function allText(page: typeof PRIVACY_PAGE): string {
  return [
    page.title,
    page.description,
    ...page.intro,
    ...page.sections.flatMap((s) => [
      s.heading,
      ...s.blocks.flatMap((b) => (b.kind === 'paragraph' ? [b.text] : b.items)),
    ]),
  ].join('\n');
}

describe('Legal pages (Privacy Policy / Terms of Service)', () => {
  it('defines exactly two legal pages with unique slugs, titles, and descriptions', () => {
    expect(LEGAL_PAGE_LIST).toHaveLength(2);
    expect(LEGAL_PAGE_LIST.map((p) => p.slug)).toEqual(['privacy', 'terms']);
    expect(new Set(LEGAL_PAGE_LIST.map((p) => p.title)).size).toBe(2);
    expect(new Set(LEGAL_PAGE_LIST.map((p) => p.description)).size).toBe(2);
    for (const page of LEGAL_PAGE_LIST) {
      expect(page.description.length).toBeGreaterThan(15);
      expect(page.lastUpdated).toBeTruthy();
      expect(page.sections.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('never invents a contact email address anywhere in the legal text', () => {
    for (const page of LEGAL_PAGE_LIST) {
      expect(allText(page)).not.toMatch(EMAIL_RE);
    }
  });

  it('privacy policy discloses analytics, advertising, and every third-party service the tools use', () => {
    render(<LegalPageView page={PRIVACY_PAGE} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText(/Last updated: 15 November 2026/)).toBeInTheDocument();

    const text = document.body.textContent ?? '';
    expect(text).toContain('Google Analytics 4');
    expect(text).toContain('Google Tag Manager');
    expect(text).toContain('Google AdSense');
    expect(text).toContain('DoubleClick');
    expect(text).toContain('Cobalt');
    expect(text).toContain('Frankfurter');
    expect(text).toContain('api.qrserver.com');
    expect(text).toContain('media-proxy');
    expect(text).toContain('Google Fonts');
    expect(text).toContain('We do not require you to create an account');
    expect(text).toContain('local storage');
    expect(text).toContain('Children');
    expect(text).toContain('https://omnitily.vercel.app');
  });

  it('terms of service covers as-is use, acceptable use, IP, liability, and governing law', () => {
    render(<LegalPageView page={TERMS_PAGE} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getByText(/Last updated: 15 November 2026/)).toBeInTheDocument();

    const text = document.body.textContent ?? '';
    expect(text).toContain('as is');
    expect(text).toContain('Acceptable Use');
    expect(text).toContain('copyrighted material');
    expect(text).toContain('Intellectual Property');
    expect(text).toContain('Limitation of Liability');
    expect(text).toContain('Governing Law');
    expect(text).toContain('Bangladesh');
    expect(text).toContain('https://omnitily.vercel.app');
  });

  it('prerendered dist/privacy/index.html contains real policy content, not shell copy', () => {
    if (!existsSync('dist/privacy/index.html')) return; // Run after build

    const html = readFileSync('dist/privacy/index.html', 'utf8');
    expect(html).toContain('<title>Privacy Policy - Omnitily</title>');
    expect(html).toContain('<link rel="canonical" href="https://omnitily.vercel.app/privacy" />');
    expect(html).toContain('<meta name="robots" content="index, follow" />');
    expect(html).toContain('<h1 class="text-3xl font-extrabold tracking-tight text-white">Privacy Policy</h1>');
    expect(html).toContain('Google Analytics 4');
    expect(html).toContain('Google AdSense');
    expect(html).toContain('api.qrserver.com');
    expect(html).toContain('"@type":"WebPage"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).not.toContain('<title>Omnitily — Free Online Tools: Video, Image, PDF, Text &amp; Developer Utilities</title>');
  });

  it('prerendered dist/terms/index.html contains real terms content, not shell copy', () => {
    if (!existsSync('dist/terms/index.html')) return; // Run after build

    const html = readFileSync('dist/terms/index.html', 'utf8');
    expect(html).toContain('<title>Terms of Service - Omnitily</title>');
    expect(html).toContain('<link rel="canonical" href="https://omnitily.vercel.app/terms" />');
    expect(html).toContain('<meta name="robots" content="index, follow" />');
    expect(html).toContain('<h1 class="text-3xl font-extrabold tracking-tight text-white">Terms of Service</h1>');
    expect(html).toContain('Acceptable Use');
    expect(html).toContain('Limitation of Liability');
    expect(html).toContain('"@type":"WebPage"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).not.toContain('<title>Omnitily — Free Online Tools: Video, Image, PDF, Text &amp; Developer Utilities</title>');
  });
});
