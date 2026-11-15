import { describe, expect, it } from 'vitest';
import { TOOL_CONTENT_VIDEO_IMAGE } from '../src/lib/toolContent-video-image';

const EXPECTED_IDS = [
  'video-splitter',
  'social-downloader',
  'youtube-downloader',
  'instagram-downloader',
  'tiktok-downloader',
  'facebook-downloader',
  'gif-maker',
  'video-to-audio',
  'frame-extractor',
  'video-speed',
  'video-muter',
  'video-compressor',
  'video-looper',
  'video-rotator',
  'video-resizer',
  'video-watermark',
  'subtitles-editor',
  'image-converter',
  'color-extractor',
  'image-compressor',
  'image-cropper',
  'pixel-art',
  'exif-viewer',
  'favicon-generator',
  'svg-optimizer',
  'image-resizer',
  'gradient-generator',
];

describe('Video + Image tool content', () => {
  it('covers exactly the 27 video and image tool ids', () => {
    expect(Object.keys(TOOL_CONTENT_VIDEO_IMAGE).sort()).toEqual([...EXPECTED_IDS].sort());
    for (const id of EXPECTED_IDS) {
      expect(TOOL_CONTENT_VIDEO_IMAGE[id].id).toBe(id);
    }
  });

  it.each(EXPECTED_IDS)('%s has exactly 3 how-to steps, 3-5 FAQs, and 3-5 features', (id) => {
    const content = TOOL_CONTENT_VIDEO_IMAGE[id];
    expect(content.howToSteps).toHaveLength(3);
    expect(content.faqs.length).toBeGreaterThanOrEqual(3);
    expect(content.faqs.length).toBeLessThanOrEqual(5);
    expect(content.features.length).toBeGreaterThanOrEqual(3);
    expect(content.features.length).toBeLessThanOrEqual(5);
  });

  it.each(EXPECTED_IDS)('%s has no empty strings and every FAQ question ends with ?', (id) => {
    const content = TOOL_CONTENT_VIDEO_IMAGE[id];
    expect(content.howToTitle.trim()).not.toBe('');
    expect(content.howToIntro.trim()).not.toBe('');
    for (const step of content.howToSteps) {
      expect(step.trim()).not.toBe('');
    }
    for (const faq of content.faqs) {
      expect(faq.question.trim()).not.toBe('');
      expect(faq.question.trim().endsWith('?')).toBe(true);
      expect(faq.answer.trim()).not.toBe('');
    }
    for (const feature of content.features) {
      expect(feature.trim()).not.toBe('');
    }
  });

  it.each(EXPECTED_IDS)('%s how-to intro is 40-100 words', (id) => {
    const words = TOOL_CONTENT_VIDEO_IMAGE[id].howToIntro.trim().split(/\s+/);
    expect(words.length).toBeGreaterThanOrEqual(40);
    expect(words.length).toBeLessThanOrEqual(100);
  });

  it('contains no raw HTML tags in any string', () => {
    for (const content of Object.values(TOOL_CONTENT_VIDEO_IMAGE)) {
      const strings = [
        content.howToTitle,
        content.howToIntro,
        ...content.howToSteps,
        ...content.faqs.flatMap((faq) => [faq.question, faq.answer]),
        ...content.features,
      ];
      for (const value of strings) {
        expect(value).not.toMatch(/<[a-z][^>]*>/i);
      }
    }
  });
});
