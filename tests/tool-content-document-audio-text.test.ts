import { describe, expect, it } from 'vitest';
import { TOOL_CONTENT_DOCUMENT_AUDIO_TEXT } from '../src/lib/toolContent-document-audio-text';

const EXPECTED_TOOL_IDS = [
  'pdf-compiler',
  'pdf-to-txt',
  'txt-to-pdf',
  'pdf-splitter',
  'epub-to-pdf',
  'excel-to-csv',
  'pdf-merger',
  'pdf-rotator',
  'sound-recorder',
  'audio-merger',
  'voice-changer',
  'vocal-remover',
  'silence-remover',
  'audio-speed',
  'bpm-finder',
  'metronome',
  'audio-converter',
  'word-counter',
  'case-converter',
  'base64-coder',
  'url-coder',
  'markdown-editor',
  'regex-tester',
  'text-diff',
  'find-replace',
  'slug-generator',
  'lorem-ipsum',
];

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

describe('P1-B Document / Audio / Text tool content', () => {
  it('covers exactly the 27 Document, Audio, and Text top-10 tools', () => {
    const entries = Object.values(TOOL_CONTENT_DOCUMENT_AUDIO_TEXT);
    expect(entries).toHaveLength(27);
    expect(Object.keys(TOOL_CONTENT_DOCUMENT_AUDIO_TEXT).sort()).toEqual([...EXPECTED_TOOL_IDS].sort());
    for (const entry of entries) {
      expect(EXPECTED_TOOL_IDS).toContain(entry.id);
    }
  });

  it('every entry has exactly 3 how-to steps', () => {
    for (const entry of Object.values(TOOL_CONTENT_DOCUMENT_AUDIO_TEXT)) {
      expect(entry.howToSteps, `${entry.id}: howToSteps`).toHaveLength(3);
    }
  });

  it('every entry has 3-5 FAQs', () => {
    for (const entry of Object.values(TOOL_CONTENT_DOCUMENT_AUDIO_TEXT)) {
      expect(entry.faqs.length, `${entry.id}: faqs`).toBeGreaterThanOrEqual(3);
      expect(entry.faqs.length, `${entry.id}: faqs`).toBeLessThanOrEqual(5);
    }
  });

  it('every entry has 3-5 features', () => {
    for (const entry of Object.values(TOOL_CONTENT_DOCUMENT_AUDIO_TEXT)) {
      expect(entry.features.length, `${entry.id}: features`).toBeGreaterThanOrEqual(3);
      expect(entry.features.length, `${entry.id}: features`).toBeLessThanOrEqual(5);
    }
  });

  it('no string is empty', () => {
    for (const entry of Object.values(TOOL_CONTENT_DOCUMENT_AUDIO_TEXT)) {
      expect(entry.howToTitle.trim(), `${entry.id}: howToTitle`).not.toBe('');
      expect(entry.howToIntro.trim(), `${entry.id}: howToIntro`).not.toBe('');
      for (const step of entry.howToSteps) {
        expect(step.trim(), `${entry.id}: howToStep`).not.toBe('');
      }
      for (const faq of entry.faqs) {
        expect(faq.question.trim(), `${entry.id}: faq question`).not.toBe('');
        expect(faq.answer.trim(), `${entry.id}: faq answer`).not.toBe('');
      }
      for (const feature of entry.features) {
        expect(feature.trim(), `${entry.id}: feature`).not.toBe('');
      }
    }
  });

  it('every FAQ question ends with a question mark', () => {
    for (const entry of Object.values(TOOL_CONTENT_DOCUMENT_AUDIO_TEXT)) {
      for (const faq of entry.faqs) {
        expect(faq.question.trim().endsWith('?'), `${entry.id}: "${faq.question}"`).toBe(true);
      }
    }
  });

  it('every how-to intro is 40-100 words', () => {
    for (const entry of Object.values(TOOL_CONTENT_DOCUMENT_AUDIO_TEXT)) {
      const count = wordCount(entry.howToIntro);
      expect(count, `${entry.id}: howToIntro word count ${count}`).toBeGreaterThanOrEqual(40);
      expect(count, `${entry.id}: howToIntro word count ${count}`).toBeLessThanOrEqual(100);
    }
  });

  it('content contains no raw HTML markup', () => {
    const allStrings = Object.values(TOOL_CONTENT_DOCUMENT_AUDIO_TEXT).flatMap((entry) => [
      entry.howToTitle,
      entry.howToIntro,
      ...entry.howToSteps,
      ...entry.faqs.flatMap((faq) => [faq.question, faq.answer]),
      ...entry.features,
    ]);
    for (const text of allStrings) {
      expect(text).not.toMatch(/<[a-z][^>]*>/i);
    }
  });
});
