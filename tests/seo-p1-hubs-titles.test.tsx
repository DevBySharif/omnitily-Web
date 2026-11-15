import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FUNCTIONAL_TOOLS, TOOL_REGISTRY } from '../src/toolsData';
import { TOOL_SEO_TITLES } from '../src/lib/toolSeoTitles';
import { CATEGORY_HUBS } from '../src/lib/categoryHubs';
import { CategoryHubView } from '../src/components/CategoryHubView';

const EMOJI_RE =
  // eslint-disable-next-line no-misleading-character-class -- \u{FE0F} (variation selector) is intentionally matched on its own here.
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;
const STOPWORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'into',
  'your',
  'you',
  'per',
  'vs',
]);

/** Significant words of a tool name: 3+ letter words, minus stopwords. */
function significantWords(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

describe('SEO P1 — tool SEO titles', () => {
  it('has an SEO title for every functional tool and no extras', () => {
    expect(Object.keys(TOOL_SEO_TITLES)).toHaveLength(FUNCTIONAL_TOOLS.length);
    for (const tool of FUNCTIONAL_TOOLS) {
      expect(TOOL_SEO_TITLES[tool.id]).toBeDefined();
    }
    const functionalIds = new Set<string>(FUNCTIONAL_TOOLS.map((t) => t.id));
    for (const id of Object.keys(TOOL_SEO_TITLES)) {
      expect(functionalIds.has(id)).toBe(true);
    }
  });

  it('every title is non-empty, at most 65 characters, unique, and emoji-free', () => {
    const titles = Object.values(TOOL_SEO_TITLES);
    expect(new Set(titles).size).toBe(titles.length);
    for (const [id, title] of Object.entries(TOOL_SEO_TITLES)) {
      expect(title.trim().length, id).toBeGreaterThan(0);
      expect(title.length, `${id}: "${title}"`).toBeLessThanOrEqual(65);
      expect(title, id).not.toMatch(EMOJI_RE);
    }
  });

  it('every title contains the tool’s recognizable name or its core phrase', () => {
    for (const tool of FUNCTIONAL_TOOLS) {
      const title = TOOL_SEO_TITLES[tool.id].toLowerCase();
      const words = significantWords(tool.name);
      expect(words.length).toBeGreaterThan(0);
      expect(
        words.some((w) => title.includes(w)),
        `${tool.id} ("${tool.name}"): no name word in "${TOOL_SEO_TITLES[tool.id]}"`,
      ).toBe(true);
    }
  });
});

describe('SEO P1 — category hubs', () => {
  it('defines exactly 9 hubs with unique slugs', () => {
    expect(CATEGORY_HUBS).toHaveLength(9);
    expect(new Set(CATEGORY_HUBS.map((h) => h.slug)).size).toBe(9);
    expect(CATEGORY_HUBS.map((h) => h.slug)).toEqual([
      'video',
      'image',
      'document',
      'audio',
      'text-writing',
      'developer-tools',
      'math-finance',
      'health-lifestyle',
      'fun-games',
    ]);
  });

  it('every hub category exists in toolsData.ts and has tools', () => {
    const registryCategories = new Set<string>(TOOL_REGISTRY.map((t) => t.category));
    for (const hub of CATEGORY_HUBS) {
      expect(registryCategories.has(hub.category), hub.slug).toBe(true);
      const tools = FUNCTIONAL_TOOLS.filter((t) => t.category === hub.category);
      expect(tools.length, hub.slug).toBeGreaterThan(0);
    }
  });

  it('every hub has a non-empty title and description, and a 60–100 word intro', () => {
    for (const hub of CATEGORY_HUBS) {
      expect(hub.title.trim().length, hub.slug).toBeGreaterThan(0);
      expect(hub.description.trim().length, hub.slug).toBeGreaterThan(0);
      const words = wordCount(hub.intro);
      expect(words, `${hub.slug} intro is ${words} words`).toBeGreaterThanOrEqual(60);
      expect(words, `${hub.slug} intro is ${words} words`).toBeLessThanOrEqual(100);
    }
  });
});

describe('SEO P1 — CategoryHubView', () => {
  it('renders the hub title, intro, and links to every tool in the category', () => {
    const hub = CATEGORY_HUBS.find((h) => h.slug === 'video');
    expect(hub).toBeDefined();
    const tools = FUNCTIONAL_TOOLS.filter((t) => t.category === 'Video').map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
    }));

    render(<CategoryHubView hub={hub!} tools={tools} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Video' })).toBeInTheDocument();
    expect(screen.getByText(hub!.intro)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();

    for (const tool of tools) {
      const link = screen.getByRole('link', { name: new RegExp(tool.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
      expect(link.getAttribute('href')).toBe(`/tools/${tool.id}`);
    }
    expect(screen.getByRole('link', { name: /Video Splitting/ })).toHaveAttribute(
      'href',
      '/tools/video-splitter',
    );
  });

  it('renders the tool count for a small category', () => {
    const hub = CATEGORY_HUBS.find((h) => h.slug === 'document');
    expect(hub).toBeDefined();
    const tools = FUNCTIONAL_TOOLS.filter((t) => t.category === 'Document').map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
    }));

    render(<CategoryHubView hub={hub!} tools={tools} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Document' })).toBeInTheDocument();
    expect(screen.getByText(/Document Tools \(8\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /PDF File Merger/ })).toHaveAttribute(
      'href',
      '/tools/pdf-merger',
    );
  });
});
