// Secure Password Generator — rebuilt (Wave 5a).
//
// The previous implementation used Math.random and did not meet its
// secure-password claim, so the tool was disabled. This version draws every
// character through `secureRandom()` / `secureIntInRange()` from
// src/lib/toolTransforms.ts, which use crypto.getRandomValues (rejection
// sampling, so there is no modulo bias). No Math.random is used anywhere
// in this file.

import React, { useState } from 'react';
import { CheckCircle, Copy, Key, Plus, WarningCircle } from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { secureIntInRange } from '../lib/toolTransforms';

export const CHAR_SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

export type CharSetKey = keyof typeof CHAR_SETS;

/** Characters that are easy to confuse (0/O, 1/l/I) — excluded on request. */
export const AMBIGUOUS_CHARS = new Set(['0', 'O', '1', 'l', 'I']);

export interface PasswordOptions {
  length: number;
  sets: CharSetKey[];
  excludeAmbiguous: boolean;
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 16,
  sets: ['lower', 'upper', 'digits', 'symbols'],
  excludeAmbiguous: false,
};

/**
 * Generate a password with the given options.
 * Every pick goes through `random` (default: secureIntInRange, i.e.
 * crypto.getRandomValues with rejection sampling). Guarantees at least one
 * character from each selected set, then shuffles the result with the same
 * secure source so the guaranteed characters are not in predictable slots.
 */
export function generatePassword(
  options: PasswordOptions,
  random: (maxExclusive: number) => number = secureIntInRange,
): string {
  const sets = options.sets.length > 0 ? options.sets : (['lower'] as CharSetKey[]);
  if (!Number.isInteger(options.length) || options.length < 4 || options.length > 128) {
    throw new Error('Password length must be a whole number between 4 and 128.');
  }
  if (options.length < sets.length) {
    throw new Error(`Length must be at least ${sets.length} to include one character from each selected set.`);
  }
  const pools = sets.map((key) => {
    const chars = CHAR_SETS[key].split('').filter((c) => !(options.excludeAmbiguous && AMBIGUOUS_CHARS.has(c)));
    if (chars.length === 0) throw new Error(`Character set "${key}" is empty after exclusions.`);
    return chars;
  });
  const pool = pools.flat();
  const chars: string[] = pools.map((setChars) => setChars[random(setChars.length)]);
  while (chars.length < options.length) {
    chars.push(pool[random(pool.length)]);
  }
  // Fisher-Yates shuffle with the same secure source.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Theoretical entropy in bits: log2(poolSize ^ length). */
export function passwordEntropyBits(options: PasswordOptions): number {
  const sets = options.sets.length > 0 ? options.sets : (['lower'] as CharSetKey[]);
  const poolSize = sets.reduce((total, key) => {
    const chars = CHAR_SETS[key].split('').filter((c) => !(options.excludeAmbiguous && AMBIGUOUS_CHARS.has(c)));
    return total + chars.length;
  }, 0);
  return options.length * Math.log2(poolSize);
}

export function strengthLabel(bits: number): string {
  if (bits < 40) return 'Weak';
  if (bits < 60) return 'Fair';
  if (bits < 80) return 'Strong';
  return 'Very strong';
}

export default function PasswordGenerator({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [length, setLength] = useState(16);
  const [selected, setSelected] = useState<Record<CharSetKey, boolean>>({
    lower: true,
    upper: true,
    digits: true,
    symbols: true,
  });
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [password, setPassword] = useState('');
  const [entropy, setEntropy] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const activeSets = (Object.keys(selected) as CharSetKey[]).filter((k) => selected[k]);

  const toggleSet = (key: CharSetKey) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const generate = () => {
    setError('');
    setCopied(false);
    try {
      const options: PasswordOptions = { length, sets: activeSets, excludeAmbiguous };
      const pass = generatePassword(options);
      setPassword(pass);
      setEntropy(passwordEntropyBits(options));
      try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
      toast.success('Password Generated', 'Generated with crypto.getRandomValues — never leaves your browser.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not generate a password.';
      setError(message);
      toast.error('Cannot Generate', message);
    }
  };

  const copyPassword = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success('Copied', 'Password copied to clipboard.');
    } catch (e) {
      toast.error('Copy Failed', 'Your browser blocked clipboard access — select and copy manually.');
    }
  };

  const setLabels: Record<CharSetKey, string> = {
    lower: 'Lowercase (a–z)',
    upper: 'Uppercase (A–Z)',
    digits: 'Digits (0–9)',
    symbols: 'Symbols (!@#$…)',
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="password-gen-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Key className="w-8 h-8 text-[#10b981]" />
            Secure Password Generator
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Random passwords drawn from your browser&apos;s cryptographic random source (crypto.getRandomValues). Nothing is sent anywhere.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="pw-length" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Password length</label>
              <span className="text-[#10b981] font-mono font-bold text-xs">{length} characters</span>
            </div>
            <input
              id="pw-length"
              type="range"
              min={4}
              max={64}
              step={1}
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value, 10) || 4)}
              className="w-full accent-[#10b981]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Character sets</span>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(setLabels) as CharSetKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSet(key)}
                  aria-pressed={selected[key]}
                  className={`p-2 rounded text-xs font-bold border transition-all cursor-pointer ${
                    selected[key] ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-black border-[#222] text-gray-500'
                  }`}
                >
                  {setLabels[key]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setExcludeAmbiguous((v) => !v)}
              aria-pressed={excludeAmbiguous}
              className={`p-2 rounded text-xs font-bold border transition-all cursor-pointer text-left ${
                excludeAmbiguous ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-black border-[#222] text-gray-500'
              }`}
            >
              Exclude ambiguous characters (0 O 1 l I)
            </button>
          </div>

          <button
            onClick={generate}
            className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Generate Password
          </button>
          {error && (
            <div className="flex items-start gap-2 text-rose-400 text-sm bg-rose-950/20 border border-rose-900/40 rounded-xl px-4 py-3">
              <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span data-testid="pw-error">{error}</span>
            </div>
          )}
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Your password</span>
          {password ? (
            <>
              <div className="bg-black border border-[#222] p-4 rounded-lg flex items-center justify-between gap-3">
                <span data-testid="pw-output" className="text-[#10b981] text-sm font-mono font-bold break-all">{password}</span>
                <button onClick={copyPassword} aria-label="Copy password" className="text-[#10b981] hover:text-white cursor-pointer shrink-0">
                  {copied ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              {entropy !== null && (
                <p className="text-sm text-gray-400 mt-3">
                  Estimated entropy: <span data-testid="pw-entropy" className="font-mono font-bold text-emerald-300">{entropy.toFixed(1)} bits</span>
                  {' '}— <span className="font-bold text-white">{strengthLabel(entropy)}</span>
                </p>
              )}
              <p className="text-[10px] text-gray-500 mt-4">
                At least one character from each selected set is guaranteed. Randomness comes from crypto.getRandomValues via the shared
                secureRandom() helper (rejection sampling, no modulo bias) — never Math.random.
              </p>
            </>
          ) : (
            <p className="text-gray-500 text-sm">Choose your options and press Generate. Example: 16 characters across all four sets is about 103 bits of entropy.</p>
          )}
        </div>
      </div>
    </div>
  );
}
