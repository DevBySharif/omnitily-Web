import React, { useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Pulse,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export const MAX_TERMS = 500;

/** The nth Fibonacci number (F(0) = 0, F(1) = 1, F(10) = 55). Exact via BigInt. */
export function fibonacciNth(n: number): bigint {
  if (!Number.isInteger(n) || n < 0) throw new Error('n must be a non-negative whole number.');
  if (n === 0) return 0n;
  if (n === 1) return 1n;
  let a = 0n;
  let b = 1n;
  for (let i = 2; i <= n; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b;
}

/** The first `count` Fibonacci numbers, F(0) through F(count - 1). */
export function fibonacciSequence(count: number): bigint[] {
  if (!Number.isInteger(count) || count < 1) throw new Error('Count must be a whole number of at least 1.');
  if (count > MAX_TERMS) throw new Error(`Count is limited to ${MAX_TERMS} terms.`);
  const seq: bigint[] = [];
  let a = 0n;
  let b = 1n;
  for (let i = 0; i < count; i++) {
    seq.push(a);
    const next = a + b;
    a = b;
    b = next;
  }
  return seq;
}

/** Ratio F(n) / F(n-1); converges to the golden ratio (~1.6180339887) as n grows. */
export function goldenRatioApprox(n: number): number {
  if (n < 2) throw new Error('The golden-ratio approximation needs n of at least 2.');
  const fn = fibonacciNth(n);
  const fnMinus1 = fibonacciNth(n - 1);
  return Number(fn) / Number(fnMinus1);
}

export const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

export default function FibonacciGen({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [countInput, setCountInput] = useState('10');
  const [nthInput, setNthInput] = useState('10');
  const [sequence, setSequence] = useState<bigint[] | null>(null);
  const [nthResult, setNthResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const generateSequence = () => {
    setError('');
    const count = Number(countInput);
    try {
      if (!Number.isInteger(count)) throw new Error('Enter a whole number for the term count.');
      const seq = fibonacciSequence(count);
      setSequence(seq);
      try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
      toast.success('Sequence Generated', `${count} Fibonacci terms generated.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not generate the sequence.';
      setError(message);
      toast.error('Cannot Generate', message);
    }
  };

  const findNth = () => {
    setError('');
    const n = Number(nthInput);
    try {
      if (!Number.isInteger(n)) throw new Error('Enter a whole number for the position.');
      if (n > 5000) throw new Error('Position is limited to 5,000.');
      const value = fibonacciNth(n);
      setNthResult(`F(${n}) = ${value.toString()}`);
      toast.success('Term Found', `F(${n}) computed.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not compute the term.';
      setError(message);
      toast.error('Cannot Compute', message);
    }
  };

  const clearAll = () => {
    setSequence(null);
    setNthResult('');
    setError('');
  };

  const lastIndex = sequence ? sequence.length - 1 : 0;
  const ratio = sequence && sequence.length >= 2
    ? Number(sequence[lastIndex]) / Number(sequence[lastIndex - 1])
    : null;
  const sum = sequence ? sequence.reduce((acc, v) => acc + v, 0n) : 0n;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="fibonacci-gen-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Pulse className="w-8 h-8 text-[#10b981]" />
            Fibonacci Sequence Solver
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Generate the Fibonacci sequence, find any term by position, and watch the ratio converge to the golden ratio (1.618...).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="fib-count" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">How many terms? (1–{MAX_TERMS})</label>
            <div className="flex gap-2">
              <input
                id="fib-count"
                type="number"
                min={1}
                max={MAX_TERMS}
                step={1}
                value={countInput}
                onChange={(e) => setCountInput(e.target.value)}
                className="flex-1 text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
              />
              <button
                onClick={generateSequence}
                className="py-2 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-all cursor-pointer"
              >
                Generate
              </button>
            </div>
            <span className="text-[10px] text-gray-500">F(0) = 0, F(1) = 1, each next term is the sum of the previous two.</span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="fib-nth" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Find a term by position (n)</label>
            <div className="flex gap-2">
              <input
                id="fib-nth"
                type="number"
                min={0}
                max={5000}
                step={1}
                value={nthInput}
                onChange={(e) => setNthInput(e.target.value)}
                className="flex-1 text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
              />
              <button
                onClick={findNth}
                className="py-2 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer"
              >
                Find F(n)
              </button>
            </div>
            {nthResult && (
              <span data-testid="fib-nth-result" className="text-sm font-mono font-bold text-emerald-300">{nthResult}</span>
            )}
          </div>

          <button
            onClick={clearAll}
            className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowsCounterClockwise className="w-4 h-4" /> Clear
          </button>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Sequence</span>
          {error ? (
            <div className="flex items-start gap-2 text-rose-400 text-sm bg-rose-950/20 border border-rose-900/40 rounded-xl px-4 py-3">
              <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span data-testid="fib-error">{error}</span>
            </div>
          ) : sequence ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">
                  {sequence.length} terms {sequence.length > 1 ? `— sum ${sum.toString()}` : ''}
                </span>
              </div>
              {ratio !== null && (
                <p className="text-sm text-gray-400 mb-3">
                  Last ratio F({lastIndex}) / F({lastIndex - 1}) = <span className="font-mono font-bold text-emerald-300">{ratio.toFixed(10)}</span>
                  {' '} (golden ratio = {GOLDEN_RATIO.toFixed(10)})
                </p>
              )}
              <div data-testid="fib-sequence" className="max-h-80 overflow-y-auto border border-[#2a2a2a] rounded px-4 py-3 bg-[#151515]">
                {sequence.map((value, i) => (
                  <div key={i} className="flex justify-between gap-3 text-sm font-mono py-0.5 border-b border-[#1f1f1f] last:border-b-0">
                    <span className="text-gray-500 shrink-0">F({i})</span>
                    <span className="text-emerald-300 break-all text-right">{value.toString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-sm">Press Generate to see the sequence. Example: 10 terms are 0, 1, 1, 2, 3, 5, 8, 13, 21, 34 — and F(10) = 55.</p>
          )}
          <p className="text-[10px] text-gray-500 mt-4">
            Computed with exact BigInt arithmetic, so large terms stay precise. Everything runs locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
