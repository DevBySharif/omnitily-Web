import React, { useState } from 'react';
import {
  ArrowsCounterClockwise,
  Calculator,
  CheckCircle,
  Code,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export function isBinaryString(value: string): boolean {
  return /^[01]+$/.test(value.trim());
}

/** Binary string -> BigInt (handles arbitrarily long inputs). */
export function binaryToDecimal(value: string): bigint {
  const cleaned = value.trim();
  if (!isBinaryString(cleaned)) throw new Error(`"${value}" is not a binary number (only 0s and 1s).`);
  return BigInt('0b' + cleaned);
}

/** Non-negative bigint -> binary string. Negative values get a leading '-'. */
export function decimalToBinary(value: bigint): string {
  if (value < 0n) return '-' + (-value).toString(2);
  return value.toString(2);
}

export function binaryAdd(a: string, b: string): string {
  return decimalToBinary(binaryToDecimal(a) + binaryToDecimal(b));
}

export function binarySubtract(a: string, b: string): string {
  return decimalToBinary(binaryToDecimal(a) - binaryToDecimal(b));
}

export function binaryMultiply(a: string, b: string): string {
  return decimalToBinary(binaryToDecimal(a) * binaryToDecimal(b));
}

export function binaryDivide(a: string, b: string): { quotient: string; remainder: string } {
  const divisor = binaryToDecimal(b);
  if (divisor === 0n) throw new Error('Division by zero is not allowed.');
  const dividend = binaryToDecimal(a);
  return {
    quotient: decimalToBinary(dividend / divisor),
    remainder: decimalToBinary(dividend % divisor),
  };
}

type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

const OPERATIONS: { id: Operation; label: string; symbol: string }[] = [
  { id: 'add', label: 'Add', symbol: '+' },
  { id: 'subtract', label: 'Subtract', symbol: '-' },
  { id: 'multiply', label: 'Multiply', symbol: 'x' },
  { id: 'divide', label: 'Divide', symbol: '/' },
];

export default function BinaryMath({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [inputA, setInputA] = useState('1010');
  const [inputB, setInputB] = useState('1100');
  const [operation, setOperation] = useState<Operation>('add');
  const [result, setResult] = useState<string>('');
  const [detail, setDetail] = useState<string>('');
  const [error, setError] = useState<string>('');

  const runCalculation = () => {
    setError('');
    setResult('');
    setDetail('');
    try {
      const a = inputA.trim();
      const b = inputB.trim();
      if (!isBinaryString(a)) throw new Error(`"${a}" is not a binary number (only 0s and 1s).`);
      if (!isBinaryString(b)) throw new Error(`"${b}" is not a binary number (only 0s and 1s).`);
      const decA = binaryToDecimal(a);
      const decB = binaryToDecimal(b);
      const op = OPERATIONS.find((o) => o.id === operation)!;
      let out: string;
      let detailText: string;
      if (operation === 'add') {
        out = binaryAdd(a, b);
        detailText = `${a} (${decA}) + ${b} (${decB}) = ${decA + decB} in decimal`;
      } else if (operation === 'subtract') {
        out = binarySubtract(a, b);
        detailText = `${a} (${decA}) - ${b} (${decB}) = ${decA - decB} in decimal`;
      } else if (operation === 'multiply') {
        out = binaryMultiply(a, b);
        detailText = `${a} (${decA}) x ${b} (${decB}) = ${decA * decB} in decimal`;
      } else {
        const { quotient, remainder } = binaryDivide(a, b);
        out = quotient;
        detailText = `${a} (${decA}) / ${b} (${decB}) = ${decA / decB} remainder ${decA % decB} in decimal (binary remainder ${remainder})`;
      }
      setResult(out);
      setDetail(detailText);
      try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
      toast.success('Calculated', `Binary ${op.label.toLowerCase()} completed.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not calculate.';
      setError(message);
      toast.error('Cannot Calculate', message);
    }
  };

  const clearAll = () => {
    setInputA('');
    setInputB('');
    setResult('');
    setDetail('');
    setError('');
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="binary-math-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Code className="w-8 h-8 text-[#10b981]" />
            Binary Mathematics Solver
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Add, subtract, multiply, or divide binary numbers — with the decimal values shown so you can check each step.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="binary-a" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">First binary number</label>
            <input
              id="binary-a"
              type="text"
              value={inputA}
              onChange={(e) => setInputA(e.target.value.replace(/[^01]/g, ''))}
              inputMode="numeric"
              spellCheck={false}
              placeholder="1010"
              className="w-full text-sm font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
            />
            <span className="text-[10px] text-gray-500">Only 0s and 1s. 1010 = 10 in decimal.</span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="binary-b" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Second binary number</label>
            <input
              id="binary-b"
              type="text"
              value={inputB}
              onChange={(e) => setInputB(e.target.value.replace(/[^01]/g, ''))}
              inputMode="numeric"
              spellCheck={false}
              placeholder="1100"
              className="w-full text-sm font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
            />
            <span className="text-[10px] text-gray-500">1100 = 12 in decimal.</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operation</span>
            <div className="grid grid-cols-4 gap-2">
              {OPERATIONS.map((op) => (
                <button
                  key={op.id}
                  onClick={() => setOperation(op.id)}
                  className={`py-2 px-2 text-xs font-semibold rounded border transition-all cursor-pointer text-center ${
                    operation === op.id
                      ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                      : 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                  }`}
                >
                  {op.label} ({op.symbol})
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={runCalculation}
              className="flex-1 py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md"
            >
              <Calculator className="w-4 h-4" /> Calculate
            </button>
            <button
              onClick={clearAll}
              className="py-3 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowsCounterClockwise className="w-4 h-4" /> Clear
            </button>
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Result</span>
          {error ? (
            <div className="flex items-start gap-2 text-rose-400 text-sm bg-rose-950/20 border border-rose-900/40 rounded-xl px-4 py-3">
              <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span data-testid="binary-error">{error}</span>
            </div>
          ) : result ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">Binary result</span>
              </div>
              <div data-testid="binary-result" className="w-full text-2xl font-mono font-bold border border-[#2a2a2a] rounded px-4 py-3 bg-[#151515] text-emerald-300 overflow-x-auto whitespace-nowrap">
                {result}
              </div>
              <p className="text-sm text-gray-400 mt-3">{detail}</p>
              {operation === 'divide' && (
                <p className="text-[11px] text-gray-500 mt-2">Division returns the whole-number quotient; the remainder is shown in the line above.</p>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-sm">Enter two binary numbers and press Calculate. Example: 1010 + 1100 = 10110 (10 + 12 = 22).</p>
          )}
          <p className="text-[10px] text-gray-500 mt-4">
            Computed with exact integer arithmetic (BigInt), so even very long binary numbers stay precise. Everything runs locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
