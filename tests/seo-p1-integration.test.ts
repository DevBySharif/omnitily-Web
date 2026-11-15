import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FUNCTIONAL_TOOLS, TOOL_REGISTRY } from '../src/toolsData';
import { TOOL_CONTENT_VIDEO_IMAGE } from '../src/lib/toolContent-video-image';
import { TOOL_CONTENT_DOCUMENT_AUDIO_TEXT } from '../src/lib/toolContent-document-audio-text';
import { TOOL_CONTENT_DEVELOPER_MATH } from '../src/lib/toolContent-developer-math';
import { TOOL_CONTENT_HEALTH_FUN_TEXT } from '../src/lib/toolContent-health-fun-text';
import { TOOL_SEO_TITLES } from '../src/lib/toolSeoTitles';
import { CATEGORY_HUBS } from '../src/lib/categoryHubs';
import { ABOUT_PAGE } from '../src/lib/aboutContent';

/** The four Phase 1 content maps merged exactly as scripts/prerender.ts does. */
const TOOL_CONTENT = {
  ...TOOL_CONTENT_VIDEO_IMAGE,
  ...TOOL_CONTENT_DOCUMENT_AUDIO_TEXT,
  ...TOOL_CONTENT_DEVELOPER_MATH,
  ...TOOL_CONTENT_HEALTH_FUN_TEXT,
};

describe('SEO P1 integration — merged FAQ content', () => {
  it('covers all 101 functional tool ids with a complete HowTo / FAQ / features shape', () => {
    expect(Object.keys(TOOL_CONTENT)).toHaveLength(FUNCTIONAL_TOOLS.length);
    for (const tool of FUNCTIONAL_TOOLS) {
      const content = TOOL_CONTENT[tool.id];
      expect(content, tool.id).toBeDefined();
      expect(content.id).toBe(tool.id);
      expect(content.howToTitle.trim().length, tool.id).toBeGreaterThan(0);
      expect(content.howToIntro.trim().length, tool.id).toBeGreaterThan(0);
      expect(content.howToSteps, tool.id).toHaveLength(3);
      for (const step of content.howToSteps) {
        expect(step.trim().length, tool.id).toBeGreaterThan(0);
      }
      expect(content.faqs.length, tool.id).toBeGreaterThanOrEqual(3);
      expect(content.faqs.length, tool.id).toBeLessThanOrEqual(5);
      for (const faq of content.faqs) {
        expect(faq.question.trim().length, tool.id).toBeGreaterThan(0);
        expect(faq.answer.trim().length, tool.id).toBeGreaterThan(0);
      }
      expect(content.features.length, tool.id).toBeGreaterThanOrEqual(3);
      expect(content.features.length, tool.id).toBeLessThanOrEqual(5);
    }
    const functionalIds = new Set<string>(FUNCTIONAL_TOOLS.map((t) => t.id));
    for (const id of Object.keys(TOOL_CONTENT)) {
      expect(functionalIds.has(id), id).toBe(true);
    }
  });

  it('every SEO title is non-empty and at most 65 characters', () => {
    for (const tool of FUNCTIONAL_TOOLS) {
      const title = TOOL_SEO_TITLES[tool.id];
      expect(title, tool.id).toBeDefined();
      expect(title.trim().length, tool.id).toBeGreaterThan(0);
      expect(title.length, `${tool.id}: "${title}"`).toBeLessThanOrEqual(65);
    }
  });
});

describe('SEO P1 integration — category hubs', () => {
  it('has 9 hubs with unique slugs, and every hub category exists in toolsData.ts', () => {
    expect(CATEGORY_HUBS).toHaveLength(9);
    expect(new Set(CATEGORY_HUBS.map((h) => h.slug)).size).toBe(9);
    const registryCategories = new Set<string>(TOOL_REGISTRY.map((t) => t.category));
    for (const hub of CATEGORY_HUBS) {
      expect(registryCategories.has(hub.category), hub.slug).toBe(true);
      expect(hub.title.trim().length, hub.slug).toBeGreaterThan(0);
      expect(hub.description.trim().length, hub.slug).toBeGreaterThan(0);
    }
  });
});

describe('SEO P1 integration — About page', () => {
  it('ABOUT_PAGE has slug "about" with non-empty title, description, intro, and sections', () => {
    expect(ABOUT_PAGE.slug).toBe('about');
    expect(ABOUT_PAGE.title.trim().length).toBeGreaterThan(0);
    expect(ABOUT_PAGE.description.trim().length).toBeGreaterThan(0);
    expect(ABOUT_PAGE.intro.length).toBeGreaterThanOrEqual(1);
    expect(ABOUT_PAGE.sections.length).toBeGreaterThanOrEqual(1);
    for (const section of ABOUT_PAGE.sections) {
      expect(section.heading.trim().length).toBeGreaterThan(0);
      expect(section.blocks.length).toBeGreaterThan(0);
    }
  });
});

describe('SEO P1 integration — prerendered output', () => {
  it('a tool page carries FAQPage JSON-LD, the HowTo section, and its SEO title', () => {
    if (!existsSync('dist/tools/tiktok-downloader/index.html')) return; // Run after build

    const html = readFileSync('dist/tools/tiktok-downloader/index.html', 'utf8');
    expect(html).toContain('<title>Download TikTok Videos Without Watermark | Omnitily</title>');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('Frequently asked questions');
    expect(html).toContain(TOOL_CONTENT['tiktok-downloader'].howToSteps[0]);
    expect(html).toContain('"isAccessibleForFree":true');
  });

  it('a hub page and the About page are prerendered', () => {
    if (!existsSync('dist/tools/video/index.html')) return; // Run after build

    const hubHtml = readFileSync('dist/tools/video/index.html', 'utf8');
    expect(hubHtml).toContain('<title>Free Video Tools Online | Omnitily</title>');
    expect(hubHtml).toContain('<link rel="canonical" href="https://omnitily.vercel.app/tools/video" />');
    expect(hubHtml).toContain('/tools/tiktok-downloader');

    expect(existsSync('dist/about/index.html')).toBe(true);
    const aboutHtml = readFileSync('dist/about/index.html', 'utf8');
    expect(aboutHtml).toContain('<title>About Omnitily - Omnitily</title>');
    expect(aboutHtml).toContain('<link rel="canonical" href="https://omnitily.vercel.app/about" />');
    expect(aboutHtml).toContain('About Omnitily');
  });

  it('the homepage has no Google Fonts references and uses the PNG og:image', () => {
    if (!existsSync('dist/index.html')) return; // Run after build

    const html = readFileSync('dist/index.html', 'utf8');
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
    expect(html).toContain('https://omnitily.vercel.app/og-image.png');
    expect(html).toContain('"@type":"WebApplication"');
    expect(html).toContain('/tools/video');
  });

  it('the sitemap lists 114 URLs, each with a lastmod, including hubs and /about', () => {
    expect(existsSync('public/sitemap.xml')).toBe(true);
    const content = readFileSync('public/sitemap.xml', 'utf8');
    const urls = content.match(/<url>/g) || [];
    expect(urls).toHaveLength(114);
    const lastmods = content.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) || [];
    expect(lastmods).toHaveLength(114);
    for (const hub of CATEGORY_HUBS) {
      expect(content).toContain(`<loc>https://omnitily.vercel.app/tools/${hub.slug}</loc>`);
    }
    expect(content).toContain('<loc>https://omnitily.vercel.app/about</loc>');
  });
});
