import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HIDDEN_TOOLS, INDEXABLE_TOOLS, TOOL_REGISTRY } from '../src/toolsData';
import { LEGAL_PAGE_LIST } from '../src/lib/legalContent';
import { GUIDES } from '../src/lib/guides';

describe('P1-A2 Production SEO Rendering & Static Prerendering', () => {
  it('robots.txt points to canonical sitemap URL on omnitily.vercel.app', () => {
    expect(existsSync('public/robots.txt')).toBe(true);
    const content = readFileSync('public/robots.txt', 'utf8');
    expect(content).toContain('User-agent: *');
    expect(content).toContain('Allow: /');
    expect(content).toContain('Sitemap: https://omnitily.vercel.app/sitemap.xml');
    expect(content).not.toContain('omnitily.com');
  });

  it('sitemap.xml contains exactly 1 home + legal + hub + guide + guides index + about + indexable-tool canonical URLs on omnitily.vercel.app', () => {
    expect(existsSync('public/sitemap.xml')).toBe(true);
    const content = readFileSync('public/sitemap.xml', 'utf8');
    expect(content).not.toContain('omnitily.com');

    const locs = content.match(/<loc>(https:\/\/omnitily\.vercel\.app\/[^<]*)<\/loc>/g) || [];
    expect(locs).toHaveLength(1 + INDEXABLE_TOOLS.length + LEGAL_PAGE_LIST.length + 9 + GUIDES.length + 1 + 1); // 1 homepage + indexable (public functional) tools + legal pages + 9 category hubs + guides + guides index + about
    expect(locs[0]).toContain('<loc>https://omnitily.vercel.app/</loc>');

    // Every entry carries a <lastmod> build date.
    const lastmods = content.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) || [];
    expect(lastmods).toHaveLength(locs.length);

    for (const tool of INDEXABLE_TOOLS) {
      expect(content).toContain(`<loc>https://omnitily.vercel.app/tools/${tool.id}</loc>`);
    }

    for (const page of LEGAL_PAGE_LIST) {
      expect(content).toContain(`<loc>https://omnitily.vercel.app/${page.slug}</loc>`);
    }

    for (const slug of ['video', 'image', 'document', 'audio', 'text-writing', 'developer-tools', 'math-finance', 'health-lifestyle', 'fun-games']) {
      expect(content).toContain(`<loc>https://omnitily.vercel.app/tools/${slug}</loc>`);
    }
    expect(content).toContain('<loc>https://omnitily.vercel.app/about</loc>');

    for (const guide of GUIDES) {
      expect(content).toContain(`<loc>https://omnitily.vercel.app/guides/${guide.slug}</loc>`);
    }
    expect(content).toContain('<loc>https://omnitily.vercel.app/guides</loc>');
  });

  it('index.html template contains lang="en", theme-color, canonical, Open Graph, and Twitter metadata', () => {
    expect(existsSync('index.html')).toBe(true);
    const html = readFileSync('index.html', 'utf8');

    expect(html).toMatch(/<html[^>]*lang="en"/);
    expect(html).toContain('<meta name="theme-color" content="#07080a" />');
    expect(html).toContain('<link rel="canonical" href="https://omnitily.vercel.app/" />');
    expect(html).toContain('<meta property="og:site_name" content="Omnitily" />');
    expect(html).toContain('<meta property="og:type" content="website" />');
    expect(html).toContain('<meta property="og:url" content="https://omnitily.vercel.app/" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
  });

  it('prerendered dist/index.html contains WebSite and Organization JSON-LD and initial HTML grid', () => {
    if (!existsSync('dist/index.html')) return; // Run after build

    const html = readFileSync('dist/index.html', 'utf8');
    expect(html).toContain('<title>Omnitily — Free Online Tools: Video, Image, PDF, Text &amp; Developer Utilities</title>');
    expect(html).toContain('<link rel="canonical" href="https://omnitily.vercel.app/" />');
    expect(html).toContain('application/ld+json');

    const jsonMatches = html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs) || [];
    expect(jsonMatches.length).toBeGreaterThanOrEqual(2);

    const parsedSchemas = jsonMatches.map((m) => JSON.parse(m.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')));
    const types = parsedSchemas.map((s) => s['@type']);

    expect(types).toContain('WebSite');
    expect(types).toContain('Organization');
    expect(html).toContain('Free Online Tools, All in One Place');
    expect(html).toContain('/tools/image-converter');
  });

  it('prerendered dist/tools/image-converter/index.html contains tool-specific metadata, H1, and schemas', () => {
    if (!existsSync('dist/tools/image-converter/index.html')) return; // Run after build

    const html = readFileSync('dist/tools/image-converter/index.html', 'utf8');
    expect(html).toContain('<title>Convert Images Online — Image Converter | Omnitily</title>');
    expect(html).toContain('<link rel="canonical" href="https://omnitily.vercel.app/tools/image-converter" />');
    expect(html).toContain('<meta name="robots" content="index, follow" />');
    expect(html).toContain('<h1 class="text-3xl font-extrabold text-white tracking-tight mb-2">Image Format Converter</h1>');

    const jsonMatches = html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs) || [];
    expect(jsonMatches.length).toBe(3);

    const parsedSchemas = jsonMatches.map((m) => JSON.parse(m.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')));
    const types = parsedSchemas.map((s) => s['@type']);

    expect(types).toContain('WebApplication');
    expect(types).toContain('FAQPage');
    expect(types).toContain('BreadcrumbList');
  });

  it('prerendered dist/tools/pdf-compiler/index.html contains tool-specific metadata and H1', () => {
    if (!existsSync('dist/tools/pdf-compiler/index.html')) return; // Run after build

    const html = readFileSync('dist/tools/pdf-compiler/index.html', 'utf8');
    expect(html).toContain('<title>JPG to PDF Online Free — Images to PDF | Omnitily</title>');
    expect(html).toContain('<link rel="canonical" href="https://omnitily.vercel.app/tools/pdf-compiler" />');
    expect(html).toContain('<h1 class="text-3xl font-extrabold text-white tracking-tight mb-2">PDF Compiler (Images to PDF)</h1>');
  });

  it('prerendered dist/tools/json-formatter/index.html contains tool-specific metadata and H1', () => {
    if (!existsSync('dist/tools/json-formatter/index.html')) return; // Run after build

    const html = readFileSync('dist/tools/json-formatter/index.html', 'utf8');
    expect(html).toContain('<title>JSON Formatter Online Free | Omnitily</title>');
    expect(html).toContain('<link rel="canonical" href="https://omnitily.vercel.app/tools/json-formatter" />');
    expect(html).toContain('<h1 class="text-3xl font-extrabold text-white tracking-tight mb-2">JSON Beautifier &amp; Validator</h1>');
  });

  it(`all ${INDEXABLE_TOOLS.length} indexable tools have unique titles and non-empty descriptions`, () => {
    const titles = new Set(INDEXABLE_TOOLS.map((t) => t.name));
    const descriptions = new Set(INDEXABLE_TOOLS.map((t) => t.description));

    expect(titles.size).toBe(INDEXABLE_TOOLS.length);
    expect(descriptions.size).toBe(INDEXABLE_TOOLS.length);

    for (const tool of INDEXABLE_TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(15);
      expect(tool.category).toBeTruthy();
    }
  });

  it('beta, coming-soon and disabled tools stay noindex and excluded from the sitemap', () => {
    const nonIndexable = TOOL_REGISTRY.filter((t) => t.status !== 'functional');
    expect(nonIndexable.length).toBe(16); // 14 beta + 1 coming-soon + 1 disabled

    for (const tool of nonIndexable) {
      expect(tool.isIndexable).toBe(false);
      expect(tool.isFeatured).toBe(false);
    }
  });

  it('prerendered hidden tool HTML is noindex and never leaks homepage metadata', () => {
    if (!existsSync('dist/tools/gif-maker/index.html')) return; // Run after build

    for (const tool of HIDDEN_TOOLS) {
      const html = readFileSync(`dist/tools/${tool.id}/index.html`, 'utf8');
      expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
      expect(html).toContain(`<link rel="canonical" href="https://omnitily.vercel.app/tools/${tool.id}" />`);
      expect(html).not.toContain('<title>Omnitily — Free Online Tools: Video, Image, PDF, Text &amp; Developer Utilities</title>');
      expect(html).not.toContain('<link rel="canonical" href="https://omnitily.vercel.app/" />');
      expect(html).not.toContain('"@type":"WebSite"');
    }
  });

  it('prerendered 404 HTML is noindex and has no canonical URL', () => {
    if (!existsSync('dist/404.html')) return; // Run after build

    const html = readFileSync('dist/404.html', 'utf8');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).toContain('<title>Page Not Found - Omnitily</title>');
    expect(html).not.toContain('<link rel="canonical"');
    expect(html).not.toContain('<title>Omnitily — Free Online Tools: Video, Image, PDF, Text &amp; Developer Utilities</title>');
    expect(html).not.toContain('"@type":"WebSite"');
  });
});
