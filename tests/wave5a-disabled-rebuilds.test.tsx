// Wave 5a disabled-tool rebuilds: password-gen, hash-generator, yaml-to-json,
// scientific-calc, bmr-calc, step-sim.
//
// Every tool here was disabled because its old implementation fabricated
// output or was unsafe. These tests exercise the pure logic exported by each
// new dedicated component (deterministic where possible) plus the render +
// core-action path of every component through jsdom.
//
// What is NOT covered here (needs a real browser):
// - clipboard writes (navigator.clipboard in the copy buttons)
// - crypto.getRandomValues entropy quality (only its use is asserted via the
//   injectable random source; the live path is verified in the Playwright run)
// Those paths are verified in the Playwright evidence run (see
// ~/workspace/omnitily-seo/checks/wave5a-disabled.md).
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// canvas-confetti schedules requestAnimationFrame work that throws in jsdom
// (no real canvas context); the components call it only as a celebration.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
import { ToastProvider } from '../src/components/Toast';
import PasswordGenerator, {
  CHAR_SETS,
  generatePassword,
  passwordEntropyBits,
} from '../src/components/PasswordGenerator';
import HashGenerator, { hashText, hashTextAll, HASH_HEX_LENGTHS } from '../src/components/HashGenerator';
import YamlToJson, { parseYaml, yamlToJson, YamlParseError } from '../src/components/YamlToJson';
import ScientificCalc, { evaluateExpression, formatResult } from '../src/components/ScientificCalc';
import BmrCalc, {
  ACTIVITY_LEVELS,
  calculateBmr,
  cmFromFeetInches,
  kgFromLb,
  maintenanceCalories,
} from '../src/components/BmrCalc';
import StepSim, { estimateSteps, metForSpeedKmh } from '../src/components/StepSim';

const renderTool = (component: ReactNode) => render(<ToastProvider>{component}</ToastProvider>);
const noop = () => {};

/** Deterministic stand-in for secureIntInRange: cycles through the range. */
function makeCyclingRandom() {
  let i = 0;
  return (maxExclusive: number) => {
    const value = i % maxExclusive;
    i += 1;
    return value;
  };
}

// ---------------------------------------------------------------------------
// password-gen — secureRandom() based, never Math.random
// ---------------------------------------------------------------------------
describe('password-gen', () => {
  it('generates a password of the requested length from the selected sets', () => {
    const random = makeCyclingRandom();
    const pass = generatePassword({ length: 16, sets: ['lower', 'upper', 'digits', 'symbols'], excludeAmbiguous: false }, random);
    expect(pass).toHaveLength(16);
    const pool = new Set([...CHAR_SETS.lower, ...CHAR_SETS.upper, ...CHAR_SETS.digits, ...CHAR_SETS.symbols]);
    for (const ch of pass) expect(pool.has(ch)).toBe(true);
  });

  it('guarantees at least one character from each selected set', () => {
    for (let trial = 0; trial < 20; trial++) {
      const pass = generatePassword(
        { length: 12, sets: ['lower', 'upper', 'digits'], excludeAmbiguous: false },
        makeCyclingRandom(),
      );
      expect(/[a-z]/.test(pass)).toBe(true);
      expect(/[A-Z]/.test(pass)).toBe(true);
      expect(/[0-9]/.test(pass)).toBe(true);
    }
  });

  it('excludes ambiguous characters when asked and shrinks the pool', () => {
    const pass = generatePassword(
      { length: 24, sets: ['lower', 'upper', 'digits', 'symbols'], excludeAmbiguous: true },
      makeCyclingRandom(),
    );
    expect(pass).not.toMatch(/[0O1lI]/);
    const bits = passwordEntropyBits({ length: 16, sets: ['lower', 'upper', 'digits', 'symbols'], excludeAmbiguous: true });
    // pool: 25 lower + 24 upper + 8 digits + 26 symbols = 83
    expect(bits).toBeCloseTo(16 * Math.log2(83), 10);
  });

  it('reports entropy from the real pool size (88 chars across all four sets)', () => {
    const bits = passwordEntropyBits({ length: 16, sets: ['lower', 'upper', 'digits', 'symbols'], excludeAmbiguous: false });
    expect(bits).toBeCloseTo(16 * Math.log2(88), 10);
  });

  it('rejects impossible lengths instead of producing a short password', () => {
    expect(() => generatePassword({ length: 3, sets: ['lower'], excludeAmbiguous: false })).toThrow(/between 4 and 128/);
    expect(() => generatePassword({ length: 200, sets: ['lower'], excludeAmbiguous: false })).toThrow(/between 4 and 128/);
  });

  it('renders and generates a 16-char password with all sets', () => {
    renderTool(<PasswordGenerator onBack={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /generate password/i }));
    const output = screen.getByTestId('pw-output');
    expect(output.textContent).toMatch(/^[A-Za-z0-9!@#$%^&*()_+\-=[\]{}|;:,.<>?]{16}$/);
    expect(screen.getByTestId('pw-entropy').textContent).toMatch(/103\.4 bits/);
  });
});

// ---------------------------------------------------------------------------
// hash-generator — real WebCrypto digests; MD5 deliberately not offered
// ---------------------------------------------------------------------------
describe('hash-generator', () => {
  it('matches the known SHA-256 vector for "abc"', async () => {
    await expect(hashText('abc', 'SHA-256')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('matches the known SHA-512 vector for "abc"', async () => {
    await expect(hashText('abc', 'SHA-512')).resolves.toBe(
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
    );
  });

  it('matches the known SHA-384 vector for "abc"', async () => {
    await expect(hashText('abc', 'SHA-384')).resolves.toBe(
      'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
    );
  });

  it('matches the known SHA-1 vector for "abc" (legacy algorithm only)', async () => {
    await expect(hashText('abc', 'SHA-1')).resolves.toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
  });

  it('returns digests of the correct hex length for every algorithm', async () => {
    const all = await hashTextAll('hello');
    for (const [algo, hex] of Object.entries(all)) {
      expect(hex).toHaveLength(HASH_HEX_LENGTHS[algo as keyof typeof HASH_HEX_LENGTHS]);
      expect(hex).toMatch(/^[0-9a-f]+$/);
    }
  });

  it('renders and computes the SHA-256 of "abc" through the UI', async () => {
    renderTool(<HashGenerator onBack={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /compute hashes/i }));
    const digest = await screen.findByTestId('hash-SHA-256');
    expect(digest.textContent).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

// ---------------------------------------------------------------------------
// yaml-to-json — real subset parser, loud errors instead of guesses
// ---------------------------------------------------------------------------
describe('yaml-to-json', () => {
  const DOC = `name: Ada Lovelace
age: 36
admin: true
website: ~
tags:
  - math
  - code
address:
  city: London
  zip: "00123"`;

  it('converts a known document exactly', () => {
    expect(parseYaml(DOC)).toEqual({
      name: 'Ada Lovelace',
      age: 36,
      admin: true,
      website: null,
      tags: ['math', 'code'],
      address: { city: 'London', zip: '00123' },
    });
    expect(yamlToJson('a: 1\nb: two')).toBe('{\n  "a": 1,\n  "b": "two"\n}');
  });

  it('parses sequences of mappings and flow collections', () => {
    expect(
      parseYaml('users:\n  - name: Ada\n    age: 36\n  - name: Grace\n    age: 30\nnums: [1, 2.5, -3]\nmap: {a: 1, b: two}'),
    ).toEqual({
      users: [
        { name: 'Ada', age: 36 },
        { name: 'Grace', age: 30 },
      ],
      nums: [1, 2.5, -3],
      map: { a: 1, b: 'two' },
    });
  });

  it('handles quoted scalars, escapes, comments and empty values', () => {
    expect(parseYaml("a: 'it''s' # comment\nb: \"line\\nbreak\"\nc:\n# full-line comment\nd: 1.5e3")).toEqual({
      a: "it's",
      b: 'line\nbreak',
      c: null,
      d: 1500,
    });
  });

  it('allows a block sequence at the same indent as its key', () => {
    expect(parseYaml('tags:\n- one\n- two')).toEqual({ tags: ['one', 'two'] });
  });

  it('rejects tabs, duplicate keys, anchors, block scalars and bad indentation', () => {
    expect(() => parseYaml('a:\n\tb: 1')).toThrow(YamlParseError);
    expect(() => parseYaml('a: 1\na: 2')).toThrow(/Duplicate key/);
    expect(() => parseYaml('a: &x 1')).toThrow(/Anchors/);
    expect(() => parseYaml('a: |\n  multi')).toThrow(/Block scalars/);
    expect(() => parseYaml('a: 1\n b: 2')).toThrow(YamlParseError);
    expect(() => parseYaml('')).toThrow(/empty/);
  });

  it('renders and converts the sample document through the UI', () => {
    renderTool(<YamlToJson onBack={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /convert to json/i }));
    const output = screen.getByTestId('yaml-output');
    expect(output.textContent).toContain('"name": "Ada Lovelace"');
    expect(output.textContent).toContain('"zip": "00123"');
    expect(output.textContent).toContain('"tags": [\n    "math",\n    "code"\n  ]');
  });

  it('shows a clear error for unsupported YAML in the UI', () => {
    renderTool(<YamlToJson onBack={noop} />);
    fireEvent.change(screen.getByLabelText(/yaml input/i), { target: { value: 'a: &anchor 1' } });
    fireEvent.click(screen.getByRole('button', { name: /convert to json/i }));
    expect(screen.getByTestId('yaml-error').textContent).toMatch(/Anchors/);
  });
});

// ---------------------------------------------------------------------------
// scientific-calc — tokenizer + recursive descent; no eval / Function
// ---------------------------------------------------------------------------
describe('scientific-calc', () => {
  it('evaluates the headline example 2*(3+4)^2 = 98', () => {
    expect(evaluateExpression('2*(3+4)^2')).toBe(98);
  });

  it('handles functions, constants, precedence and right-associative powers', () => {
    expect(evaluateExpression('sqrt(16) + sin(30)')).toBeCloseTo(4.5, 10);
    expect(evaluateExpression('log(100)')).toBe(2);
    expect(evaluateExpression('ln(e)')).toBeCloseTo(1, 10);
    expect(evaluateExpression('2^3^2')).toBe(512);
    expect(evaluateExpression('10%3')).toBe(1);
    expect(evaluateExpression('(-2)^2')).toBe(4);
    expect(evaluateExpression('pi')).toBeCloseTo(Math.PI, 12);
    expect(evaluateExpression('cos(60)')).toBeCloseTo(0.5, 10);
    expect(evaluateExpression('sin(1.5707963267948966)', 'radians')).toBeCloseTo(1, 10);
    expect(evaluateExpression('1e3 + 2')).toBe(1002);
  });

  it('rejects invalid input with readable errors instead of executing it', () => {
    expect(() => evaluateExpression('1/0')).toThrow(/Division by zero/);
    expect(() => evaluateExpression('sqrt(-1)')).toThrow(/sqrt/);
    expect(() => evaluateExpression('log(0)')).toThrow(/log/);
    expect(() => evaluateExpression('foo(2)')).toThrow(/Unknown name/);
    expect(() => evaluateExpression('2*(3+4')).toThrow(/Missing closing/);
    expect(() => evaluateExpression('2+')).toThrow();
    expect(() => evaluateExpression('process.exit()')).toThrow();
    expect(() => evaluateExpression('')).toThrow(/Enter an expression/);
  });

  it('formats integers whole and rounds long decimals', () => {
    expect(formatResult(98)).toBe('98');
    expect(formatResult(0.5)).toBe('0.5');
    expect(formatResult(1 / 3)).toBe('0.3333333333');
  });

  it('renders and evaluates the default expression through the UI', () => {
    renderTool(<ScientificCalc onBack={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /^calculate$/i }));
    expect(screen.getByTestId('calc-result').textContent).toBe('98');
  });

  it('shows a readable error for a bad expression in the UI', () => {
    renderTool(<ScientificCalc onBack={noop} />);
    fireEvent.change(screen.getByLabelText(/expression/i), { target: { value: '1/0' } });
    fireEvent.click(screen.getByRole('button', { name: /^calculate$/i }));
    expect(screen.getByTestId('calc-error').textContent).toMatch(/Division by zero/);
  });
});

// ---------------------------------------------------------------------------
// bmr-calc — Mifflin-St Jeor, labelled as an estimate
// ---------------------------------------------------------------------------
describe('bmr-calc', () => {
  it('computes Mifflin-St Jeor for a man: 10W + 6.25H - 5A + 5', () => {
    // 10*70 + 6.25*175 - 5*30 + 5 = 1648.75
    expect(calculateBmr({ ageYears: 30, sex: 'male', weightKg: 70, heightCm: 175 })).toBeCloseTo(1648.75, 10);
  });

  it('computes Mifflin-St Jeor for a woman: same formula with -161', () => {
    // 1648.75 - 166 = 1482.75
    expect(calculateBmr({ ageYears: 30, sex: 'female', weightKg: 70, heightCm: 175 })).toBeCloseTo(1482.75, 10);
  });

  it('multiplies BMR by the activity factor for maintenance calories', () => {
    expect(maintenanceCalories(1648.75, 1.55)).toBeCloseTo(2555.5625, 10);
    expect(ACTIVITY_LEVELS.map((a) => a.multiplier)).toEqual([1.2, 1.375, 1.55, 1.725, 1.9]);
  });

  it('converts lb and ft/in to kg and cm', () => {
    expect(kgFromLb(154)).toBeCloseTo(69.8532, 3);
    expect(cmFromFeetInches(5, 9)).toBeCloseTo(175.26, 2);
  });

  it('rejects out-of-range inputs instead of fabricating a number', () => {
    expect(() => calculateBmr({ ageYears: 5, sex: 'male', weightKg: 70, heightCm: 175 })).toThrow(/Age/);
    expect(() => calculateBmr({ ageYears: 30, sex: 'male', weightKg: 10, heightCm: 175 })).toThrow(/Weight/);
    expect(() => calculateBmr({ ageYears: 30, sex: 'male', weightKg: 70, heightCm: 50 })).toThrow(/Height/);
  });

  it('renders the default example (30M, 70 kg, 175 cm) through the UI', () => {
    renderTool(<BmrCalc onBack={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /estimate bmr/i }));
    expect(screen.getByTestId('bmr-result').textContent).toBe('1,649 kcal/day');
    // Moderate activity (x1.55): 1648.75 * 1.55 = 2555.56 -> 2,556
    expect(screen.getByTestId('bmr-maintenance').textContent).toBe('2,556 kcal/day');
  });
});

// ---------------------------------------------------------------------------
// step-sim — stated formulas: stride, distance, cadence time, MET calories
// ---------------------------------------------------------------------------
describe('step-sim', () => {
  it('estimates the headline example: 10,000 steps at 175 cm / 70 kg / 100 spm', () => {
    const r = estimateSteps({ steps: 10000, heightCm: 175, weightKg: 70, cadenceSpm: 100 });
    expect(r.strideCm).toBeCloseTo(72.45, 10);
    expect(r.distanceKm).toBeCloseTo(7.245, 10);
    expect(r.distanceMiles).toBeCloseTo(4.5018, 3);
    expect(r.durationMin).toBe(100);
    expect(r.avgSpeedKmh).toBeCloseTo(4.347, 2);
    expect(r.met).toBe(3.5);
    expect(r.caloriesKcal).toBeCloseTo(408.33, 1);
    expect(r.goalPct).toBe(100);
  });

  it('picks MET from speed: 2.8 / 3.5 / 4.3 / 5.0 bands', () => {
    expect(metForSpeedKmh(2)).toBe(2.8);
    expect(metForSpeedKmh(3.2)).toBe(3.5);
    expect(metForSpeedKmh(5)).toBe(4.3);
    expect(metForSpeedKmh(7)).toBe(5.0);
  });

  it('honours a measured stride instead of estimating from height', () => {
    const r = estimateSteps({ steps: 10000, heightCm: 175, weightKg: 70, cadenceSpm: 100, strideCm: 80 });
    expect(r.strideCm).toBe(80);
    expect(r.strideEstimated).toBe(false);
    expect(r.distanceKm).toBe(8);
  });

  it('rejects out-of-range inputs instead of fabricating estimates', () => {
    expect(() => estimateSteps({ steps: -1, heightCm: 175, weightKg: 70, cadenceSpm: 100 })).toThrow(/Steps/);
    expect(() => estimateSteps({ steps: 5000, heightCm: 175, weightKg: 70, cadenceSpm: 10 })).toThrow(/Cadence/);
  });

  it('renders the default example through the UI', () => {
    renderTool(<StepSim onBack={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /estimate walk/i }));
    expect(screen.getByTestId('steps-distance').textContent).toBe('7.25 km (4.50 mi)');
    expect(screen.getByTestId('steps-calories').textContent).toBe('408 kcal');
    expect(screen.getByTestId('steps-duration').textContent).toBe('1 h 40 min');
    expect(screen.getByTestId('steps-goal').textContent).toBe('100% of 10,000 steps');
  });
});
