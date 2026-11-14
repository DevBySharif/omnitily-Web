import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowsLeftRight,
  CheckCircle,
  Copy,
  Shuffle,
  Trash,
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export type DiffLineType = 'same' | 'add' | 'remove';

export interface DiffLine {
  type: DiffLineType;
  text: string;
}

export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
}

/**
 * Line-level diff via a longest-common-subsequence dynamic program.
 * Lines are compared exactly (no trimming), so whitespace changes show up.
 */
export function diffLines(left: string, right: string): DiffLine[] {
  const a = left === '' ? [] : left.split('\n');
  const b = right === '' ? [] : right.split('\n');
  const m = a.length;
  const n = b.length;
  // dp[i][j] = LCS length of a[i..] and b[j..]
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'remove', text: a[i] });
      i++;
    } else {
      out.push({ type: 'add', text: b[j] });
      j++;
    }
  }
  while (i < m) out.push({ type: 'remove', text: a[i++] });
  while (j < n) out.push({ type: 'add', text: b[j++] });
  return out;
}

export function diffStats(lines: DiffLine[]): DiffStats {
  return {
    added: lines.filter((l) => l.type === 'add').length,
    removed: lines.filter((l) => l.type === 'remove').length,
    unchanged: lines.filter((l) => l.type === 'same').length,
  };
}

export const SAMPLE_LEFT = `The quick brown fox
jumps over the lazy dog
and runs into the forest.`;

export const SAMPLE_RIGHT = `The quick brown fox
leaps over the lazy dog
and runs into the dark forest.
A rabbit follows.`;

const LINE_COLORS: Record<DiffLineType, string> = {
  same: 'bg-transparent text-gray-300',
  add: 'bg-emerald-500/10 text-emerald-300',
  remove: 'bg-rose-500/10 text-rose-300',
};

export default function TextDiff({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [left, setLeft] = useState(SAMPLE_LEFT);
  const [right, setRight] = useState(SAMPLE_RIGHT);
  const [isCopied, setIsCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  const lines = useMemo(() => diffLines(left, right), [left, right]);
  const stats = useMemo(() => diffStats(lines), [lines]);

  const diffText = useMemo(
    () =>
      lines
        .map((l) => (l.type === 'add' ? `+ ${l.text}` : l.type === 'remove' ? `- ${l.text}` : `  ${l.text}`))
        .join('\n'),
    [lines]
  );

  const copyDiff = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(diffText);
      ok = true;
    } catch (e) {
      ok = false;
    }
    if (ok) {
      setIsCopied(true);
      toast.success('Diff Copied', 'The unified diff is on your clipboard.');
      try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = window.setTimeout(() => setIsCopied(false), 1500);
    } else {
      toast.error('Copy Failed', 'Your browser blocked clipboard access — select the diff and copy it manually.');
    }
  };

  const clearAll = () => {
    setLeft('');
    setRight('');
    toast.info('Cleared', 'Both text boxes are empty.');
  };

  const loadSample = () => {
    setLeft(SAMPLE_LEFT);
    setRight(SAMPLE_RIGHT);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="text-diff-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Shuffle className="w-8 h-8 text-[#10b981]" />
            Text Diff Checker
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Compare two texts side-by-side to pinpoint line-by-line additions and removals.
          </p>
        </div>
        <button
          onClick={loadSample}
          className="text-xs font-semibold text-[#10b981] hover:text-[#059669] hover:bg-[#10b981]/10 px-3 py-1.5 rounded border border-emerald-900/50 transition-colors cursor-pointer"
        >
          Load Sample
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="diff-left" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Original Text
          </label>
          <textarea
            id="diff-left"
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            placeholder="Paste the original text here…"
            spellCheck={false}
            className="w-full h-48 text-sm font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] resize-y"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="diff-right" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Changed Text
          </label>
          <textarea
            id="diff-right"
            value={right}
            onChange={(e) => setRight(e.target.value)}
            placeholder="Paste the changed text here…"
            spellCheck={false}
            className="w-full h-48 text-sm font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] resize-y"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
          + {stats.added} added
        </span>
        <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full px-3 py-1">
          − {stats.removed} removed
        </span>
        <span className="text-xs font-semibold text-gray-400 bg-[#151515] border border-[#2a2a2a] rounded-full px-3 py-1">
          {stats.unchanged} unchanged
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={clearAll}
            className="text-xs font-semibold text-gray-400 hover:text-rose-400 px-3 py-1.5 rounded border border-[#2a2a2a] hover:border-rose-500/40 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Trash className="w-3.5 h-3.5" /> Clear
          </button>
          <button
            onClick={copyDiff}
            className="text-xs font-semibold text-[#0a0a0a] bg-[#10b981] hover:bg-[#059669] px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1"
          >
            {isCopied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {isCopied ? 'Copied!' : 'Copy Diff'}
          </button>
        </div>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a] mb-3">
          <ArrowsLeftRight className="w-5 h-5 text-[#10b981]" />
          <h2 className="font-sans text-lg text-white">Diff Result</h2>
        </div>
        {lines.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Both texts are empty — paste something above to compare.</p>
        ) : (
          <div data-testid="diff-output" className="font-mono text-sm leading-6 overflow-x-auto">
            {lines.map((line, idx) => (
              <div key={idx} className={`flex gap-2 px-2 rounded ${LINE_COLORS[line.type]}`}>
                <span className="w-4 shrink-0 text-center opacity-70 select-none">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}
                </span>
                <span className="whitespace-pre-wrap break-all">{line.text === '' ? ' ' : line.text}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-gray-500 mt-3">
          Green lines exist only in the changed text, red lines only in the original. Comparison is exact — including
          whitespace.
        </p>
      </div>
    </div>
  );
}
