import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GuidesIndexView } from '../src/components/GuidesIndexView';
import { SeoManager } from '../src/components/SeoManager';
import { GUIDES, GUIDES_INDEX_DESCRIPTION, GUIDES_INDEX_TITLE } from '../src/lib/guides';

const DOMAIN = 'https://omnitily.vercel.app';

/** Parse every JSON-LD script block out of a prerendered HTML string. */
function jsonLdScripts(html: string): Record<string, unknown>[] {
  const matches = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)];
  return matches.map((m) => JSON.parse(m[1]) as Record<string, unknown>);
}

describe('Guides index — GuidesIndexView', () => {
  it('renders the H1 and links to all 8 guides with their titles and descriptions', () => {
    render(<GuidesIndexView guides={GUIDES} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Guides' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');

    for (const guide of GUIDES) {
      const link = screen.getByRole('link', {
        name: new RegExp(guide.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      });
      expect(link.getAttribute('href')).toBe(`/guides/${guide.slug}`);
      expect(screen.getByText(guide.description)).toBeInTheDocument();
    }
  });
});

describe('Guides index — SeoManager guidesIndex branch', () => {
  it('sets the index title, canonical, and CollectionPage + ItemList + BreadcrumbList JSON-LD', () => {
    render(<SeoManager toolId={null} isIndexable={true} guidesIndex={true} />);

    expect(document.title).toBe(GUIDES_INDEX_TITLE);
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    expect(canonical?.href).toBe(`${DOMAIN}/guides`);
    expect(
      document.querySelector('meta[name="description"]')?.getAttribute('content'),
    ).toBe(GUIDES_INDEX_DESCRIPTION);

    const scripts = [...document.querySelectorAll('script[data-seo="omnitily-jsonld"]')].map(
      (s) => JSON.parse(s.textContent || '{}') as Record<string, unknown>,
    );
    const types = scripts.map((s) => s['@type']);
    expect(types).toContain('CollectionPage');
    expect(types).toContain('ItemList');
    expect(types).toContain('BreadcrumbList');

    const collection = scripts.find((s) => s['@type'] === 'CollectionPage')!;
    expect(collection.name).toBe('Guides');
    expect(collection.url).toBe(`${DOMAIN}/guides`);

    const itemList = scripts.find((s) => s['@type'] === 'ItemList')!;
    const items = itemList.itemListElement as { position: number; name: string; url: string }[];
    expect(items).toHaveLength(GUIDES.length);
    items.forEach((item, index) => {
      expect(item.position).toBe(index + 1);
      expect(item.name).toBe(GUIDES[index].title);
      expect(item.url).toBe(`${DOMAIN}/guides/${GUIDES[index].slug}`);
    });

    const breadcrumb = scripts.find((s) => s['@type'] === 'BreadcrumbList')!;
    const crumbs = breadcrumb.itemListElement as { position: number; name: string; item: string }[];
    expect(crumbs).toHaveLength(2);
    expect(crumbs[1]).toEqual({ '@type': 'ListItem', position: 2, name: 'Guides', item: `${DOMAIN}/guides` });
  });
});

describe('Guides index — prerendered output', () => {
  it('dist/guides/index.html lists all 8 guides with CollectionPage + ItemList JSON-LD', () => {
    if (!existsSync('dist/guides/index.html')) return; // Run after build

    const html = readFileSync('dist/guides/index.html', 'utf8');
    expect(html).toContain(`<title>${GUIDES_INDEX_TITLE}</title>`);
    expect(html).toContain(`<link rel="canonical" href="${DOMAIN}/guides" />`);
    expect(html).toContain('<h1 class="text-3xl font-extrabold tracking-tight text-white">Guides</h1>');
    for (const guide of GUIDES) {
      expect(html).toContain(`href="/guides/${guide.slug}"`);
      expect(html).toContain(guide.title);
    }

    const schemas = jsonLdScripts(html);
    const types = schemas.map((s) => s['@type']);
    expect(types).toContain('CollectionPage');
    expect(types).toContain('ItemList');
    expect(types).toContain('BreadcrumbList');
    const itemList = schemas.find((s) => s['@type'] === 'ItemList')!;
    const items = itemList.itemListElement as { name: string; url: string }[];
    expect(items).toHaveLength(GUIDES.length);
    expect(items[0].url).toBe(`${DOMAIN}/guides/${GUIDES[0].slug}`);
  });
});
