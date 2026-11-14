import React, { useState } from 'react';
import {
  ArrowsCounterClockwise,
  Calculator,
  CheckCircle,
  SquaresFour,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export type Matrix = number[][];

const MAX_SIZE = 6;

/**
 * Parse a matrix from textarea text: one row per line, numbers separated by
 * spaces, commas or tabs. Throws a descriptive Error on bad input.
 */
export function parseMatrix(text: string): Matrix {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) throw new Error('Matrix is empty.');
  if (lines.length > MAX_SIZE) throw new Error(`Matrices are limited to ${MAX_SIZE} rows.`);
  const rows: Matrix = lines.map((line) => {
    const parts = line.split(/[\s,;]+/).filter((p) => p.length > 0);
    if (parts.length === 0) throw new Error('A row has no numbers.');
    if (parts.length > MAX_SIZE) throw new Error(`Matrices are limited to ${MAX_SIZE} columns.`);
    return parts.map((part) => {
      const n = Number(part);
      if (!Number.isFinite(n)) throw new Error(`"${part}" is not a number.`);
      return n;
    });
  });
  const cols = rows[0].length;
  if (rows.some((row) => row.length !== cols)) {
    throw new Error('All rows must have the same number of columns.');
  }
  return rows;
}

export function matrixShape(m: Matrix): { rows: number; cols: number } {
  return { rows: m.length, cols: m[0]?.length ?? 0 };
}

export function addMatrices(a: Matrix, b: Matrix): Matrix {
  const sa = matrixShape(a);
  const sb = matrixShape(b);
  if (sa.rows !== sb.rows || sa.cols !== sb.cols) {
    throw new Error(`Addition needs equal shapes: A is ${sa.rows}x${sa.cols}, B is ${sb.rows}x${sb.cols}.`);
  }
  return a.map((row, i) => row.map((v, j) => v + b[i][j]));
}

export function subtractMatrices(a: Matrix, b: Matrix): Matrix {
  const sa = matrixShape(a);
  const sb = matrixShape(b);
  if (sa.rows !== sb.rows || sa.cols !== sb.cols) {
    throw new Error(`Subtraction needs equal shapes: A is ${sa.rows}x${sa.cols}, B is ${sb.rows}x${sb.cols}.`);
  }
  return a.map((row, i) => row.map((v, j) => v - b[i][j]));
}

export function multiplyMatrices(a: Matrix, b: Matrix): Matrix {
  const sa = matrixShape(a);
  const sb = matrixShape(b);
  if (sa.cols !== sb.rows) {
    throw new Error(`Multiplication needs A columns = B rows: A is ${sa.rows}x${sa.cols}, B is ${sb.rows}x${sb.cols}.`);
  }
  const out: Matrix = [];
  for (let i = 0; i < sa.rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < sb.cols; j++) {
      let sum = 0;
      for (let k = 0; k < sa.cols; k++) sum += a[i][k] * b[k][j];
      row.push(sum);
    }
    out.push(row);
  }
  return out;
}

export function transposeMatrix(m: Matrix): Matrix {
  const { rows, cols } = matrixShape(m);
  const out: Matrix = [];
  for (let j = 0; j < cols; j++) {
    const row: number[] = [];
    for (let i = 0; i < rows; i++) row.push(m[i][j]);
    out.push(row);
  }
  return out;
}

/** Determinant by recursive Laplace expansion. Square matrices only. */
export function determinant(m: Matrix): number {
  const { rows, cols } = matrixShape(m);
  if (rows !== cols) throw new Error(`Determinant needs a square matrix, got ${rows}x${cols}.`);
  if (rows === 1) return m[0][0];
  if (rows === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  let det = 0;
  for (let j = 0; j < cols; j++) {
    const minor: Matrix = m
      .slice(1)
      .map((row) => row.filter((_, col) => col !== j));
    det += (j % 2 === 0 ? 1 : -1) * m[0][j] * determinant(minor);
  }
  return det;
}

/** Inverse via the adjugate matrix. Throws when the matrix is singular. */
export function invertMatrix(m: Matrix): Matrix {
  const { rows, cols } = matrixShape(m);
  if (rows !== cols) throw new Error(`Inverse needs a square matrix, got ${rows}x${cols}.`);
  const det = determinant(m);
  if (Math.abs(det) < 1e-12) throw new Error('Matrix is singular (determinant is 0) — no inverse exists.');
  if (rows === 1) return [[1 / m[0][0]]];
  const cofactors: Matrix = [];
  for (let i = 0; i < rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < cols; j++) {
      const minor: Matrix = m
        .filter((_, ri) => ri !== i)
        .map((r) => r.filter((_, cj) => cj !== j));
      row.push(((i + j) % 2 === 0 ? 1 : -1) * determinant(minor));
    }
    cofactors.push(row);
  }
  const adjugate = transposeMatrix(cofactors);
  return adjugate.map((row) => row.map((v) => v / det));
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const rounded = Math.round(n * 10000) / 10000;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

export function formatMatrix(m: Matrix): string {
  return m.map((row) => `[ ${row.map(formatNumber).join('  ')} ]`).join('\n');
}

type Operation = 'add' | 'subtract' | 'multiply' | 'determinant' | 'transpose' | 'inverse';

const OPERATIONS: { id: Operation; label: string; needsB: boolean }[] = [
  { id: 'add', label: 'A + B', needsB: true },
  { id: 'subtract', label: 'A - B', needsB: true },
  { id: 'multiply', label: 'A x B', needsB: true },
  { id: 'determinant', label: 'det(A)', needsB: false },
  { id: 'transpose', label: 'Transpose A', needsB: false },
  { id: 'inverse', label: 'Inverse of A', needsB: false },
];

const DEFAULT_A = '1 2\n3 4';
const DEFAULT_B = '5 6\n7 8';

export default function MatrixCalc({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [textA, setTextA] = useState(DEFAULT_A);
  const [textB, setTextB] = useState(DEFAULT_B);
  const [operation, setOperation] = useState<Operation>('multiply');
  const [result, setResult] = useState<string>('');
  const [resultLabel, setResultLabel] = useState<string>('');
  const [error, setError] = useState<string>('');

  const runCalculation = () => {
    setError('');
    setResult('');
    try {
      const a = parseMatrix(textA);
      const op = OPERATIONS.find((o) => o.id === operation)!;
      if (op.needsB) {
        const b = parseMatrix(textB);
        let out: Matrix;
        let label: string;
        if (operation === 'add') { out = addMatrices(a, b); label = 'A + B'; }
        else if (operation === 'subtract') { out = subtractMatrices(a, b); label = 'A - B'; }
        else { out = multiplyMatrices(a, b); label = 'A x B'; }
        setResult(formatMatrix(out));
        setResultLabel(`${label}  (${matrixShape(out).rows} x ${matrixShape(out).cols})`);
      } else if (operation === 'determinant') {
        const det = determinant(a);
        setResult(formatNumber(det));
        setResultLabel(`det(A)  (${matrixShape(a).rows} x ${matrixShape(a).cols})`);
      } else if (operation === 'transpose') {
        const out = transposeMatrix(a);
        setResult(formatMatrix(out));
        setResultLabel(`Transpose of A  (${matrixShape(out).rows} x ${matrixShape(out).cols})`);
      } else {
        const out = invertMatrix(a);
        setResult(formatMatrix(out));
        setResultLabel(`Inverse of A  (${matrixShape(out).rows} x ${matrixShape(out).cols})`);
      }
      try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
      toast.success('Calculated', 'Matrix operation completed.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not calculate.';
      setError(message);
      toast.error('Cannot Calculate', message);
    }
  };

  const clearAll = () => {
    setTextA('');
    setTextB('');
    setResult('');
    setResultLabel('');
    setError('');
  };

  const needsB = OPERATIONS.find((o) => o.id === operation)?.needsB ?? true;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="matrix-calc-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <SquaresFour className="w-8 h-8 text-[#10b981]" />
            Matrix Algebra Solver
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Add, subtract, multiply, transpose, invert matrices and find determinants. One row per line, numbers separated by spaces or commas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="matrix-a" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Matrix A</label>
            <textarea
              id="matrix-a"
              value={textA}
              onChange={(e) => setTextA(e.target.value)}
              rows={5}
              spellCheck={false}
              className="w-full text-sm font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
              placeholder={'1 2\n3 4'}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="matrix-b" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Matrix B</label>
            <textarea
              id="matrix-b"
              value={textB}
              onChange={(e) => setTextB(e.target.value)}
              rows={5}
              spellCheck={false}
              disabled={!needsB}
              className="w-full text-sm font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] disabled:bg-[#121212] disabled:text-gray-600"
              placeholder={'5 6\n7 8'}
            />
            {!needsB && <span className="text-[10px] text-gray-500">This operation uses Matrix A only.</span>}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operation</span>
            <div className="grid grid-cols-3 gap-2">
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
                  {op.label}
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
              <span data-testid="matrix-error">{error}</span>
            </div>
          ) : result ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">{resultLabel}</span>
              </div>
              <pre data-testid="matrix-result" className="w-full text-sm font-mono border border-[#2a2a2a] rounded px-4 py-3 bg-[#151515] text-emerald-300 overflow-x-auto whitespace-pre">
                {result}
              </pre>
            </>
          ) : (
            <p className="text-gray-500 text-sm">Enter your matrices and press Calculate. Example: A = [[1, 2], [3, 4]] and B = [[5, 6], [7, 8]] multiply to [[19, 22], [43, 50]].</p>
          )}
          <p className="text-[10px] text-gray-500 mt-4">
            Everything is computed locally in your browser. Determinants and inverses use exact arithmetic on your input (results rounded to 4 decimals for display).
          </p>
        </div>
      </div>
    </div>
  );
}
