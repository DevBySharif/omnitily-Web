import { describe, expect, it } from 'vitest';
import { GUIDES } from '../src/lib/guides';
import { TOOL_BY_ID, isToolId } from '../src/toolsData';

const EXPECTED_SLUGS = [
  'how-to-download-tiktok-videos-without-watermark',
  'how-to-download-instagram-reels',
  'how-to-convert-video-to-mp3',
  'how-to-compress-a-video-online',
  'how-to-split-a-pdf-online',
  'how-to-merge-pdf-files-online',
  'how-to-convert-png-to-jpg',
  'how-to-compress-images-online',
];

const PLACEHOLDER = /lorem ipsum|placeholder|todo|xxx|tbd/i;

const wordCount = (text: string): number =>
  text.split(/\s+/).filter(Boolean).length;

describe('Guides content', () => {
  it('has exactly the 8 expected guides', () => {
    expect(GUIDES).toHaveLength(8);
    expect(GUIDES.map((guide) => guide.slug).sort()).toEqual([...EXPECTED_SLUGS].sort());
  });

  it('has unique kebab-case slugs', () => {
    const slugs = GUIDES.map((guide) => guide.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it.each(GUIDES)('$slug has a title of at most 60 chars', (guide) => {
    expect(guide.title.trim().length).toBeGreaterThan(0);
    expect(guide.title.length).toBeLessThanOrEqual(60);
  });

  it.each(GUIDES)('$slug has a description of 120-170 chars', (guide) => {
    expect(guide.description.length).toBeGreaterThanOrEqual(120);
    expect(guide.description.length).toBeLessThanOrEqual(170);
  });

  it.each(GUIDES)('$slug has 2-3 intro paragraphs and 150-250 words of intro + steps', (guide) => {
    expect(guide.intro.length).toBeGreaterThanOrEqual(2);
    expect(guide.intro.length).toBeLessThanOrEqual(3);
    for (const paragraph of guide.intro) {
      expect(paragraph.trim()).not.toBe('');
    }
    const bodyWords =
      guide.intro.reduce((total, paragraph) => total + wordCount(paragraph), 0) +
      guide.steps.reduce((total, step) => total + wordCount(step), 0);
    expect(bodyWords).toBeGreaterThanOrEqual(150);
    expect(bodyWords).toBeLessThanOrEqual(250);
  });

  it.each(GUIDES)('$slug has non-empty steps and 3-5 FAQs', (guide) => {
    expect(guide.steps.length).toBeGreaterThanOrEqual(3);
    for (const step of guide.steps) {
      expect(step.trim()).not.toBe('');
    }
    expect(guide.faqs.length).toBeGreaterThanOrEqual(3);
    expect(guide.faqs.length).toBeLessThanOrEqual(5);
    for (const faq of guide.faqs) {
      expect(faq.question.trim()).not.toBe('');
      expect(faq.question.trim().endsWith('?')).toBe(true);
      expect(faq.answer.trim()).not.toBe('');
    }
  });

  it.each(GUIDES)('$slug links 1-3 real functional tools', (guide) => {
    expect(guide.relatedToolIds.length).toBeGreaterThanOrEqual(1);
    expect(guide.relatedToolIds.length).toBeLessThanOrEqual(3);
    for (const toolId of guide.relatedToolIds) {
      expect(isToolId(toolId)).toBe(true);
      if (isToolId(toolId)) {
        expect(TOOL_BY_ID[toolId].status).toBe('functional');
      }
    }
  });

  it.each(GUIDES)('$slug is dated 2026-11-16', (guide) => {
    expect(guide.lastUpdated).toBe('2026-11-16');
  });

  it('has no placeholder or lorem text anywhere', () => {
    for (const guide of GUIDES) {
      const allText = [
        guide.slug,
        guide.title,
        guide.description,
        ...guide.intro,
        ...guide.steps,
        ...guide.faqs.flatMap((faq) => [faq.question, faq.answer]),
      ].join('\n');
      expect(allText).not.toMatch(PLACEHOLDER);
    }
  });
});
