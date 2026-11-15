import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ABOUT_PAGE } from '../src/lib/aboutContent';

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function allText(page: typeof ABOUT_PAGE): string {
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

/** Read width/height straight out of the PNG IHDR chunk — no new dependency. */
function pngDimensions(buf: Buffer): { width: number; height: number } {
  expect(buf.subarray(0, 8)).toEqual(PNG_SIGNATURE);
  expect(buf.toString('ascii', 12, 16)).toBe('IHDR');
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

describe('SEO P1: og:image PNG + About page', () => {
  it('public/og-image.png is a real PNG, exactly 1200x630, under 300 KB', () => {
    const path = 'public/og-image.png';
    expect(existsSync(path)).toBe(true);

    const buf = readFileSync(path);
    const { width, height } = pngDimensions(buf);
    expect(width).toBe(1200);
    expect(height).toBe(630);

    const size = statSync(path).size;
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThan(300 * 1024);
  });

  it('ABOUT_PAGE has slug "about" with non-empty title, description, intro, and sections', () => {
    expect(ABOUT_PAGE.slug).toBe('about');
    expect(ABOUT_PAGE.title).toBe('About Omnitily');
    expect(ABOUT_PAGE.description.length).toBeGreaterThan(15);
    expect(ABOUT_PAGE.lastUpdated).toBeTruthy();
    expect(ABOUT_PAGE.intro.length).toBeGreaterThanOrEqual(1);
    for (const paragraph of ABOUT_PAGE.intro) {
      expect(paragraph.length).toBeGreaterThan(0);
    }
    expect(ABOUT_PAGE.sections.length).toBeGreaterThanOrEqual(6);
    for (const section of ABOUT_PAGE.sections) {
      expect(section.heading.length).toBeGreaterThan(0);
      expect(section.blocks.length).toBeGreaterThan(0);
    }
  });

  it('About text links the live site and never invents a contact email address', () => {
    const text = allText(ABOUT_PAGE);
    expect(text).toContain('omnitily.vercel.app');
    expect(text).not.toMatch(EMAIL_RE);
  });

  it('About text states the real catalogue size (117 tools, 101 functional)', () => {
    const text = allText(ABOUT_PAGE);
    expect(text).toContain('117');
    expect(text).toContain('101');
  });
});
