import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';
import { SeoManager } from '../src/components/SeoManager';
import { GuideView } from '../src/components/GuideView';
import { GUIDES } from '../src/lib/guides';
import { TOOL_BY_ID, isToolId, type ToolId } from '../src/toolsData';

const DOMAIN = 'https://omnitily.vercel.app';

/** Parse every JSON-LD script block out of a prerendered HTML string. */
function jsonLdScripts(html: string): Record<string, unknown>[] {
  const matches = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)];
  return matches.map((m) => JSON.parse(m[1]) as Record<string, unknown>);
}

/** Resolve a guide's related tool ids to the { id, name, description } rows GuideView takes. */
function guideTools(slug: string) {
  const guide = GUIDES.find((g) => g.slug === slug)!;
  return guide.relatedToolIds
    .filter((id): id is ToolId => isToolId(id))
    .map((id) => {
      const tool = TOOL_BY_ID[id];
      return { id: tool.id, name: tool.name, description: tool.description };
    });
}

describe('Guides integration — GuideView', () => {
  it('renders the guide title, intro, steps, FAQ, and links to every related tool', () => {
    const guide = GUIDES.find((g) => g.slug === 'how-to-split-a-pdf-online')!;
    render(<GuideView guide={guide} tools={guideTools(guide.slug)} />);

    expect(screen.getByRole('heading', { level: 1, name: guide.title })).toBeInTheDocument();
    expect(screen.getByText(guide.description)).toBeInTheDocument();
    expect(screen.getByText(guide.intro[0])).toBeInTheDocument();
    expect(screen.getByText(guide.steps[0])).toBeInTheDocument();
    expect(screen.getByText(guide.faqs[0].question)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Omnitily/ })).toBeInTheDocument();

    for (const tool of guideTools(guide.slug)) {
      const link = screen.getByRole('link', {
        name: new RegExp(tool.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      });
      expect(link.getAttribute('href')).toBe(`/tools/${tool.id}`);
    }
    expect(screen.getByRole('link', { name: /PDF File Merger/ })).toHaveAttribute(
      'href',
      '/tools/pdf-merger',
    );
  });
});

describe('Guides integration — SeoManager guide branch', () => {
  it('sets the guide title, canonical, and Article + HowTo JSON-LD', () => {
    const guide = GUIDES.find((g) => g.slug === 'how-to-split-a-pdf-online')!;
    render(<SeoManager toolId={null} isIndexable={true} guideSlug={guide.slug} />);

    expect(document.title).toBe(`${guide.title} | Omnitily`);
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    expect(canonical?.href).toBe(`${DOMAIN}/guides/${guide.slug}`);
    expect(
      document.querySelector('meta[name="description"]')?.getAttribute('content'),
    ).toBe(guide.description);

    const scripts = [...document.querySelectorAll('script[data-seo="omnitily-jsonld"]')].map(
      (s) => JSON.parse(s.textContent || '{}') as Record<string, unknown>,
    );
    const types = scripts.map((s) => s['@type']);
    expect(types).toContain('Article');
    expect(types).toContain('HowTo');
    expect(types).toContain('BreadcrumbList');

    const article = scripts.find((s) => s['@type'] === 'Article')!;
    expect(article.headline).toBe(guide.title);
    expect(article.datePublished).toBe('2026-11-16');
    expect(article.dateModified).toBe(guide.lastUpdated);

    const howTo = scripts.find((s) => s['@type'] === 'HowTo')!;
    expect(howTo.name).toBe(guide.title);
    expect((howTo.step as { text: string }[]).map((s) => s.text)).toEqual(guide.steps);

    // No /guides index page exists, so the "Guides" breadcrumb crumb
    // points at the homepage.
    const breadcrumb = scripts.find((s) => s['@type'] === 'BreadcrumbList')!;
    const items = breadcrumb.itemListElement as { position: number; name: string; item: string }[];
    expect(items).toHaveLength(3);
    expect(items[1]).toEqual({ '@type': 'ListItem', position: 2, name: 'Guides', item: `${DOMAIN}/` });
    expect(items[2].item).toBe(`${DOMAIN}/guides/${guide.slug}`);
  });
});

describe('Guides integration — App routing', () => {
  it('resolves a known guide slug to the guide article', async () => {
    window.history.pushState({}, '', '/guides/how-to-compress-images-online');
    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'How to Compress Images Online for Free' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Smart Image Compressor/ }),
    ).toHaveAttribute('href', '/tools/image-compressor');
  });

  it('404s an unknown guide slug', async () => {
    window.history.pushState({}, '', '/guides/not-a-real-guide');
    render(<App />);

    expect(await screen.findByTestId('tool-not-found')).toBeInTheDocument();
  });
});

describe('Guides integration — prerendered output', () => {
  it('every guide is prerendered with Article + HowTo JSON-LD, FAQ text, and tool links', () => {
    if (!existsSync('dist/guides/how-to-split-a-pdf-online/index.html')) return; // Run after build

    for (const guide of GUIDES) {
      const path = `dist/guides/${guide.slug}/index.html`;
      expect(existsSync(path), guide.slug).toBe(true);
    }

    const guide = GUIDES.find((g) => g.slug === 'how-to-split-a-pdf-online')!;
    const html = readFileSync('dist/guides/how-to-split-a-pdf-online/index.html', 'utf8');
    expect(html).toContain(`<title>${guide.title} | Omnitily</title>`);
    expect(html).toContain(
      `<link rel="canonical" href="${DOMAIN}/guides/${guide.slug}" />`,
    );
    expect(html).toContain(guide.faqs[0].question);
    expect(html).toContain(guide.steps[0]);
    expect(html).toContain('/tools/pdf-merger');

    const schemas = jsonLdScripts(html);
    const types = schemas.map((s) => s['@type']);
    expect(types).toContain('Article');
    expect(types).toContain('HowTo');
    expect(types).toContain('BreadcrumbList');
    const article = schemas.find((s) => s['@type'] === 'Article')!;
    expect(article.headline).toBe(guide.title);
    expect(article.datePublished).toBe('2026-11-16');
    const howTo = schemas.find((s) => s['@type'] === 'HowTo')!;
    expect((howTo.step as { text: string }[]).map((s) => s.text)).toEqual(guide.steps);
    const breadcrumb = schemas.find((s) => s['@type'] === 'BreadcrumbList')!;
    const items = breadcrumb.itemListElement as { name: string; item: string }[];
    expect(items[1]).toEqual({ '@type': 'ListItem', position: 2, name: 'Guides', item: `${DOMAIN}/` });
  });

  it('the sitemap lists 122 URLs, including all 8 guide URLs (monthly, 0.7)', () => {
    expect(existsSync('public/sitemap.xml')).toBe(true);
    const content = readFileSync('public/sitemap.xml', 'utf8');
    const urls = content.match(/<url>/g) || [];
    expect(urls).toHaveLength(122);
    for (const guide of GUIDES) {
      const block = content.match(
        new RegExp(`<url>\\s*<loc>${DOMAIN}/guides/${guide.slug}</loc>[\\s\\S]*?</url>`),
      );
      expect(block, guide.slug).not.toBeNull();
      expect(block![0]).toContain('<changefreq>monthly</changefreq>');
      expect(block![0]).toContain('<priority>0.7</priority>');
    }
  });
});
