import React, { useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Heart,
  Sparkle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

/**
 * Deterministic compatibility score (0–100) from the two names.
 * Transparent by design: FNV-1a hash of the lowercased, letter-only names,
 * mapped into 30–100 so the result is always readable as a score. Same pair
 * of names always gives the same score. This is a for-fun toy, not a real
 * measure of compatibility.
 */
export function loveScore(nameA: string, nameB: string): number {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const a = clean(nameA);
  const b = clean(nameB);
  if (!a || !b) throw new Error('Enter two names to compare.');
  const combined = a.length <= b.length ? a + 'loves' + b : b + 'loves' + a;
  let hash = 0x811c9dc5;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  // Blend in a simple letter-sum so short names are not dominated by the hash.
  let letterSum = 0;
  for (const ch of combined) letterSum += ch.charCodeAt(0);
  const mixed = (hash + letterSum * 2654435761) >>> 0;
  return 30 + (mixed % 71); // 30–100
}

export function loveVerdict(score: number): string {
  if (score >= 90) return 'A legendary match — sparks everywhere!';
  if (score >= 75) return 'Strong chemistry — definitely worth a shot.';
  if (score >= 60) return 'A promising connection with real potential.';
  if (score >= 45) return 'A friendly spark — it could grow with time.';
  return 'More of a friendship vibe — and that is a fine thing too.';
}

export default function LoveCalculator({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [nameA, setNameA] = useState('');
  const [nameB, setNameB] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState('');

  const calculate = () => {
    setError('');
    try {
      const result = loveScore(nameA, nameB);
      setScore(result);
      if (result >= 75) {
        try { confetti({ particleCount: 80, spread: 70 }); } catch (e) {}
      }
      toast.success('Calculated', 'Compatibility score ready — for fun only!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not calculate.';
      setError(message);
      setScore(null);
      toast.error('Cannot Calculate', message);
    }
  };

  const clearAll = () => {
    setNameA('');
    setNameB('');
    setScore(null);
    setError('');
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="love-calculator-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Heart className="w-8 h-8 text-[#10b981]" />
            Compatibility Love Solver
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            A light-hearted name comparison for fun. It is a deterministic toy score — not a real measure of compatibility.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="love-name-a" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">First name</label>
            <input
              id="love-name-a"
              type="text"
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              placeholder="e.g. Alex"
              maxLength={40}
              className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="love-name-b" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Second name</label>
            <input
              id="love-name-b"
              type="text"
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              placeholder="e.g. Sam"
              maxLength={40}
              className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={calculate}
              className="flex-1 py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md"
            >
              <Heart className="w-4 h-4" /> Calculate Compatibility
            </button>
            <button
              onClick={clearAll}
              className="py-3 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowsCounterClockwise className="w-4 h-4" /> Clear
            </button>
          </div>
          {error && <p className="text-rose-400 text-sm bg-rose-950/20 border border-rose-900/40 rounded-xl px-4 py-3">{error}</p>}
          <p className="text-[10px] text-gray-500">
            How it works: both names are lowercased and hashed (FNV-1a) into a score from 30 to 100. The same two names always produce the same score — there is no randomness and no real compatibility analysis behind it.
          </p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[280px]">
          {score === null ? (
            <p className="text-gray-500 text-sm text-center max-w-sm">
              Enter two names and press Calculate. The result is just for fun — real relationships are built on far more than names.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">Compatibility score</span>
              </div>
              <div data-testid="love-score" className="text-6xl font-bold text-rose-400 font-mono">
                {score}%
              </div>
              <p className="text-base text-gray-200 font-semibold mt-3 text-center flex items-center gap-2">
                <Sparkle className="w-4 h-4 text-[#10b981]" />
                {loveVerdict(score)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {nameA.trim()} &hearts; {nameB.trim()}
              </p>
              <p className="text-[10px] text-gray-500 mt-6 bg-amber-950/20 border border-amber-900/40 rounded-lg px-3 py-2 text-center">
                For entertainment only. This score comes from a name hash, not from any real assessment of two people.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
