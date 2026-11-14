import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle,
  Copy,
  Download,
  MagnifyingGlass,
  Trash,
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export interface FindReplaceOptions {
  caseSensitive: boolean;
  useRegex: boolean;
  wholeWord: boolean;
}

export interface Occurrence {
  index: number;
  length: number;
  match: string;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildFindPattern(query: string, options: FindReplaceOptions): RegExp | null {
  if (!query) return null;
  try {
    let source = options.useRegex ? query : escapeRegExp(query);
    if (options.wholeWord) source = `\\b(?:${source})\\b`;
    return new RegExp(source, options.caseSensitive ? 'g' : 'gi');
  } catch (e) {
    return null;
  }
}

/** Every occurrence of the query in the text, in order. */
export function findOccurrences(
  text: string,
  query: string,
  options: FindReplaceOptions
): { occurrences: Occurrence[]; error: string | null } {
  if (!query) return { occurrences: [], error: null };
  const re = buildFindPattern(query, options);
  if (!re) return { occurrences: [], error: 'Invalid regular expression.' };
  const occurrences: Occurrence[] = [];
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(text)) !== null) {
    occurrences.push({ index: m.index, length: m[0].length, match: m[0] });
    if (m[0] === '') re.lastIndex++;
    if (++guard > 10000) break;
  }
  return { occurrences, error: null };
}

/**
 * Replace every occurrence. In regex mode, $1 / $& group references in the
 * replacement are honoured; in literal mode the replacement is verbatim.
 */
export function replaceAllOccurrences(
  text: string,
  query: string,
  replacement: string,
  options: FindReplaceOptions
): { result: string; replaced: number; error: string | null } {
  if (!query) return { result: text, replaced: 0, error: null };
  const re = buildFindPattern(query, options);
  if (!re) return { result: text, replaced: 0, error: 'Invalid regular expression.' };
  const { occurrences } = findOccurrences(text, query, options);
  const result = options.useRegex
    ? text.replace(re, replacement)
    : text.replace(re, () => replacement);
  return { result, replaced: occurrences.length, error: null };
}

export function highlightSegments(
  text: string,
  occurrences: Occurrence[]
): { text: string; matched: boolean }[] {
  const segments: { text: string; matched: boolean }[] = [];
  let cursor = 0;
  for (const occ of occurrences) {
    if (occ.index > cursor) segments.push({ text: text.slice(cursor, occ.index), matched: false });
    if (occ.length > 0) segments.push({ text: text.slice(occ.index, occ.index + occ.length), matched: true });
    cursor = occ.index + occ.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), matched: false });
  return segments;
}

export const SAMPLE_TEXT = `The cat sat on the mat.
The cat chased the dog, and the dog chased the cat.
Cats and dogs live together in the house.`;

export default function FindReplace({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [text, setText] = useState(SAMPLE_TEXT);
  const [find, setFind] = useState('cat');
  const [replace, setReplace] = useState('fox');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  const options: FindReplaceOptions = { caseSensitive, useRegex, wholeWord };
  const { occurrences, error } = useMemo(() => findOccurrences(text, find, options), [text, find, options]);
  const segments = useMemo(() => highlightSegments(text, occurrences), [text, occurrences]);

  const applyReplaceAll = () => {
    const { result, replaced, error: replaceError } = replaceAllOccurrences(text, find, replace, options);
    if (replaceError) {
      toast.error('Replace Failed', replaceError);
      return;
    }
    if (replaced === 0) {
      toast.info('Nothing Replaced', 'No matches were found.');
      return;
    }
    setText(result);
    try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
    toast.success('Replaced', `${replaced} occurrence${replaced === 1 ? '' : 's'} replaced.`);
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success('Text Copied', 'The current text is on your clipboard.');
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = window.setTimeout(() => setIsCopied(false), 1500);
    } catch (e) {
      toast.error('Copy Failed', 'Your browser blocked clipboard access.');
    }
  };

  const downloadResult = () => {
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'find-replace-result.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 1000);
      toast.success('Downloaded', 'Saved as find-replace-result.txt.');
    } catch (e) {
      toast.error('Download Failed', 'The file could not be generated in this browser.');
    }
  };

  const toggleButton = (
    label: string,
    active: boolean,
    onClick: () => void
  ) => (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3 py-1.5 rounded border transition-colors cursor-pointer ${
        active
          ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
          : 'border-[#2a2a2a] text-gray-400 hover:border-gray-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="find-replace-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <MagnifyingGlass className="w-8 h-8 text-[#10b981]" />
            Find &amp; Replace Text Engine
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Find every occurrence of a string or pattern and replace it globally — with case, regex, and
            whole-word rules.
          </p>
        </div>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="find-query" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Find</label>
            <input
              id="find-query"
              value={find}
              onChange={(e) => setFind(e.target.value)}
              placeholder="Text or pattern to find…"
              spellCheck={false}
              className="w-full text-sm font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="replace-with" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Replace With {useRegex && <span className="normal-case text-gray-500">($1, $&amp; supported)</span>}
            </label>
            <input
              id="replace-with"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="Replacement text…"
              spellCheck={false}
              className="w-full text-sm font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {toggleButton('Aa Case-sensitive', caseSensitive, () => setCaseSensitive((v) => !v))}
          {toggleButton('.* Regular expression', useRegex, () => setUseRegex((v) => !v))}
          {toggleButton('Whole word', wholeWord, () => setWholeWord((v) => !v))}
          <button
            onClick={() => { setText(SAMPLE_TEXT); setFind('cat'); setReplace('fox'); }}
            className="ml-auto text-xs font-semibold text-[#10b981] hover:text-[#059669] transition-colors cursor-pointer"
          >
            Load Sample
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="find-replace-text" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Your Text
            </label>
            <span className="text-xs font-bold text-white">
              {error ? (
                <span className="text-rose-400">{error}</span>
              ) : (
                <span data-testid="find-replace-count">
                  {occurrences.length} match{occurrences.length === 1 ? '' : 'es'}
                </span>
              )}
            </span>
          </div>
          <textarea
            id="find-replace-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here…"
            spellCheck={false}
            className="w-full h-44 text-sm font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] resize-y"
          />
        </div>

        {occurrences.length > 0 && (
          <div
            data-testid="find-replace-highlight"
            className="text-sm font-mono leading-7 border border-[#2a2a2a] rounded-lg px-4 py-3 bg-[#151515] text-gray-300 whitespace-pre-wrap break-all"
          >
            {segments.map((seg, idx) =>
              seg.matched ? (
                <mark key={idx} className="bg-[#10b981] text-[#0a0a0a] rounded px-0.5 font-bold">{seg.text}</mark>
              ) : (
                <span key={idx}>{seg.text}</span>
              )
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={applyReplaceAll}
            disabled={occurrences.length === 0}
            className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Replace All ({occurrences.length})
          </button>
          <button
            onClick={copyResult}
            className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-colors cursor-pointer flex items-center gap-2"
          >
            {isCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {isCopied ? 'Copied!' : 'Copy Text'}
          </button>
          <button
            onClick={downloadResult}
            className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-300 hover:border-gray-600 transition-colors cursor-pointer flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Download .txt
          </button>
          <button
            onClick={() => setText('')}
            className="ml-auto text-xs font-semibold text-gray-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Trash className="w-3.5 h-3.5" /> Clear Text
          </button>
        </div>
      </div>
    </div>
  );
}
