import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATEGORY_HUBS } from '../src/lib/categoryHubs';
import { GUIDES } from '../src/lib/guides';
import { INDEXABLE_TOOLS } from '../src/toolsData';

// llms.txt + llms-full.txt (AEO files) must stay in sync with the tool registry:
// every functional tool listed, no invented tool ids, no placeholder text.

const LLMS_PATH = join(__dirname, '..', 'public', 'llms.txt');
const LLMS_FULL_PATH = join(__dirname, '..', 'public', 'llms-full.txt');
const TOOL_URL = 'https://omnitily.vercel.app/tools/';

const read = (path: string): string => readFileSync(path, 'utf8');

const toolSlugsIn = (text: string): string[] =>
  [...text.matchAll(/https:\/\/omnitily\.vercel\.app\/tools\/([a-z0-9-]+)/g)].map(
    (match) => match[1],
  );

describe('llms.txt / llms-full.txt', () => {
  it('both files exist and are non-empty', () => {
    expect(existsSync(LLMS_PATH)).toBe(true);
    expect(existsSync(LLMS_FULL_PATH)).toBe(true);
    expect(read(LLMS_PATH).trim().length).toBeGreaterThan(0);
    expect(read(LLMS_FULL_PATH).trim().length).toBeGreaterThan(0);
  });

  it('llms.txt contains a URL for every indexable tool', () => {
    const text = read(LLMS_PATH);
    expect(INDEXABLE_TOOLS.length).toBe(101);
    for (const tool of INDEXABLE_TOOLS) {
      expect(text).toContain(`${TOOL_URL}${tool.id}`);
    }
  });

  it('llms.txt contains no tool slug outside the registry or the category hubs', () => {
    const allowed = new Set([
      ...INDEXABLE_TOOLS.map((tool) => tool.id),
      ...CATEGORY_HUBS.map((hub) => hub.slug),
    ]);
    const slugs = toolSlugsIn(read(LLMS_PATH));
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      expect(allowed.has(slug)).toBe(true);
    }
  });

  it('llms-full.txt mentions every functional tool id', () => {
    const text = read(LLMS_FULL_PATH);
    for (const tool of INDEXABLE_TOOLS) {
      expect(text).toContain(`${TOOL_URL}${tool.id}`);
    }
  });

  it('llms-full.txt contains no tool slug outside the registry or the category hubs', () => {
    const allowed = new Set([
      ...INDEXABLE_TOOLS.map((tool) => tool.id),
      ...CATEGORY_HUBS.map((hub) => hub.slug),
    ]);
    const slugs = toolSlugsIn(read(LLMS_FULL_PATH));
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      expect(allowed.has(slug)).toBe(true);
    }
  });

  it('neither file contains placeholder text', () => {
    for (const path of [LLMS_PATH, LLMS_FULL_PATH]) {
      const text = read(path);
      expect(text).not.toMatch(/TODO|FIXME|\bTBD\b|XXX|\[insert|\[TODO/i);
    }
  });

  it('both files list every guide', () => {
    expect(GUIDES.length).toBe(8);
    for (const path of [LLMS_PATH, LLMS_FULL_PATH]) {
      const text = read(path);
      for (const guide of GUIDES) {
        expect(text).toContain(
          `https://omnitily.vercel.app/guides/${guide.slug}`,
        );
        expect(text).toContain(guide.title);
      }
    }
  });
});
