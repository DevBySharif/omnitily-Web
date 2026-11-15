import { describe, expect, it } from 'vitest';
import { TOOL_CONTENT_HEALTH_FUN_TEXT } from '../src/lib/toolContent-health-fun-text';

const EXPECTED_IDS = [
  'bmi-calc',
  'bmr-calc',
  'calorie-counter',
  'planner',
  'breath-guide',
  'step-sim',
  'habit-tracker',
  'water-tracker',
  'sleep-calculator',
  'password-gen',
  'dice-roller',
  'rock-paper-scissors',
  'tic-tac-toe',
  'name-picker',
  'love-calculator',
  'trivia-quiz',
  'reaction-test',
  'anagram-solver',
  'sudoku-solver',
  'morse-translator',
  'html-entities',
  'text-reverser',
  'line-remover',
  'sentence-generator',
  'text-sorter',
];

describe('Health, Fun & Text tool content', () => {
  it('covers exactly the 25 expected tool ids', () => {
    expect(Object.keys(TOOL_CONTENT_HEALTH_FUN_TEXT).sort()).toEqual([...EXPECTED_IDS].sort());
    for (const [key, entry] of Object.entries(TOOL_CONTENT_HEALTH_FUN_TEXT)) {
      expect(entry.id).toBe(key);
    }
  });

  it('every entry has exactly 3 how-to steps', () => {
    for (const entry of Object.values(TOOL_CONTENT_HEALTH_FUN_TEXT)) {
      expect(entry.howToSteps).toHaveLength(3);
    }
  });

  it('every entry has 3-5 FAQs', () => {
    for (const entry of Object.values(TOOL_CONTENT_HEALTH_FUN_TEXT)) {
      expect(entry.faqs.length).toBeGreaterThanOrEqual(3);
      expect(entry.faqs.length).toBeLessThanOrEqual(5);
    }
  });

  it('every entry has 3-5 features', () => {
    for (const entry of Object.values(TOOL_CONTENT_HEALTH_FUN_TEXT)) {
      expect(entry.features.length).toBeGreaterThanOrEqual(3);
      expect(entry.features.length).toBeLessThanOrEqual(5);
    }
  });

  it('no empty strings anywhere', () => {
    for (const entry of Object.values(TOOL_CONTENT_HEALTH_FUN_TEXT)) {
      expect(entry.howToTitle.trim()).not.toBe('');
      expect(entry.howToIntro.trim()).not.toBe('');
      for (const step of entry.howToSteps) expect(step.trim()).not.toBe('');
      for (const faq of entry.faqs) {
        expect(faq.question.trim()).not.toBe('');
        expect(faq.answer.trim()).not.toBe('');
      }
      for (const feature of entry.features) expect(feature.trim()).not.toBe('');
    }
  });

  it('every FAQ question ends with ?', () => {
    for (const entry of Object.values(TOOL_CONTENT_HEALTH_FUN_TEXT)) {
      for (const faq of entry.faqs) {
        expect(faq.question.trim().endsWith('?')).toBe(true);
      }
    }
  });

  it('every how-to intro is 40-100 words', () => {
    for (const entry of Object.values(TOOL_CONTENT_HEALTH_FUN_TEXT)) {
      const words = entry.howToIntro.trim().split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(40);
      expect(words).toBeLessThanOrEqual(100);
    }
  });
});
