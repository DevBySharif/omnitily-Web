import { describe, expect, it } from 'vitest';
import { TOOL_CONTENT_DEVELOPER_MATH } from '../src/lib/toolContent-developer-math';

const TOOL_IDS = [
  'qr-generator',
  'json-formatter',
  'hash-generator',
  'uuid-generator',
  'yaml-to-json',
  'xml-beautifier',
  'jwt-debugger',
  'sql-formatter',
  'cron-parser',
  'color-blender',
  'contrast-checker',
  'base-converter',
  'user-agent',
  'mock-api',
  'scientific-calc',
  'unit-converter',
  'currency-converter',
  'percent-calc',
  'tip-calc',
  'matrix-calc',
  'binary-math',
  'fibonacci-gen',
] as const;

describe('P1 FAQ content — Developer Tools + Math & Finance', () => {
  it('covers exactly the 22 scoped tool ids', () => {
    expect(Object.keys(TOOL_CONTENT_DEVELOPER_MATH).sort()).toEqual([...TOOL_IDS].sort());
  });

  it('every entry has exactly 3 how-to steps', () => {
    for (const id of TOOL_IDS) {
      const entry = TOOL_CONTENT_DEVELOPER_MATH[id];
      expect(entry.id).toBe(id);
      expect(entry.howToSteps).toHaveLength(3);
    }
  });

  it('every entry has 3-5 FAQs and 3-5 features', () => {
    for (const id of TOOL_IDS) {
      const entry = TOOL_CONTENT_DEVELOPER_MATH[id];
      expect(entry.faqs.length).toBeGreaterThanOrEqual(3);
      expect(entry.faqs.length).toBeLessThanOrEqual(5);
      expect(entry.features.length).toBeGreaterThanOrEqual(3);
      expect(entry.features.length).toBeLessThanOrEqual(5);
    }
  });

  it('no empty strings anywhere', () => {
    for (const id of TOOL_IDS) {
      const entry = TOOL_CONTENT_DEVELOPER_MATH[id];
      expect(entry.howToTitle.trim()).toBeTruthy();
      expect(entry.howToIntro.trim()).toBeTruthy();
      for (const step of entry.howToSteps) expect(step.trim()).toBeTruthy();
      for (const faq of entry.faqs) {
        expect(faq.question.trim()).toBeTruthy();
        expect(faq.answer.trim()).toBeTruthy();
      }
      for (const feature of entry.features) expect(feature.trim()).toBeTruthy();
    }
  });

  it('every FAQ question ends with a question mark', () => {
    for (const id of TOOL_IDS) {
      for (const faq of TOOL_CONTENT_DEVELOPER_MATH[id].faqs) {
        expect(faq.question.trim().endsWith('?')).toBe(true);
      }
    }
  });

  it('every how-to intro is 40-100 words', () => {
    for (const id of TOOL_IDS) {
      const words = TOOL_CONTENT_DEVELOPER_MATH[id].howToIntro.trim().split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(40);
      expect(words).toBeLessThanOrEqual(100);
    }
  });
});
