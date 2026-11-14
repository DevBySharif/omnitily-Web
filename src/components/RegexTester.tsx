import React, { useMemo, useState } from 'react';
import {
  CheckCircle,
  Copy,
  MagnifyingGlass,
  Sparkle,
  Trash,
} from '@phosphor-icons/react';
import { useToast } from './Toast';

export interface RegexMatch {
  match: string;
  index: number;
  groups: (string | undefined)[];
}

export type RegexTestResult =
  | { ok: true; matches: RegexMatch[] }
  | { ok: false; error: string };

const FLAG_OPTIONS = [
  { flag: 'g', label: 'Global (g)', hint: 'Find all matches, not just the first' },
  { flag: 'i', label: 'Case-insensitive (i)', hint: 'Match upper and lower case alike' },
  { flag: 'm', label: 'Multiline (m)', hint: '^ and $ match at line boundaries' },
  { flag: 's', label: 'Dot-all (s)', hint: '. matches newlines too' },
  { flag: 'u', label: 'Unicode (u)', hint: 'Full Unicode matching' },
] as const;

/**
 * Run a user-supplied pattern against text. Always iterates globally so every
 * match is reported, and guards against zero-length matches looping forever.
 */
export function testRegex(pattern: string, flags: string, text: string): RegexTestResult {
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid regular expression.' };
  }
  const matches: RegexMatch[] = [];
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(text)) !== null) {
    matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
    if (m[0] === '') re.lastIndex++;
    if (++guard > 10000) break;
  }
  return { ok: true, matches };
}

/** Split text into highlighted / plain segments for the match highlighter. */
export function highlightSegments(
  text: string,
  matches: RegexMatch[]
): { text: string; matched: boolean }[] {
  const segments: { text: string; matched: boolean }[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.index > cursor) segments.push({ text: text.slice(cursor, m.index), matched: false });
    if (m.match.length > 0) segments.push({ text: m.match, matched: true });
    cursor = m.index + m.match.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), matched: false });
  return segments;
}

export const SAMPLE_PATTERN = '\\b\\w+@\\w+\\.\\w+\\b';
export const SAMPLE_TEXT = `Contact us at hello@example.com or support@omnitily.app.
Not an email: user@ or @example.com — but admin@site.org works too.`;

const CHEAT_SHEET: [string, string][] = [
  ['.', 'Any character except newline'],
  ['\\d', 'Digit (0-9)'],
  ['\\w', 'Word character (letter, digit, _)'],
  ['\\s', 'Whitespace'],
  ['*', 'Zero or more'],
  ['+', 'One or more'],
  ['?', 'Zero or one'],
  ['{n,m}', 'Between n and m times'],
  ['[abc]', 'One of a, b, c'],
  ['[^abc]', 'Not a, b, or c'],
  ['(a|b)', 'a or b'],
  ['^ / $', 'Start / end of string (or line with m)'],
  ['\\b', 'Word boundary'],
  ['(x)', 'Capture group'],
];

export default function RegexTester({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [pattern, setPattern] = useState(SAMPLE_PATTERN);
  const [text, setText] = useState(SAMPLE_TEXT);
  const [flags, setFlags] = useState<Record<string, boolean>>({ g: true, i: false, m: false, s: false, u: false });
  const [isCopied, setIsCopied] = useState(false);

  const flagString = useMemo(
    () => FLAG_OPTIONS.filter((f) => flags[f.flag]).map((f) => f.flag).join(''),
    [flags]
  );

  const result = useMemo(() => testRegex(pattern, flagString, text), [pattern, flagString, text]);
  const segments = useMemo(
    () => (result.ok ? highlightSegments(text, result.matches) : []),
    [result, text]
  );

  const toggleFlag = (flag: string) => setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));

  const copyMatches = async () => {
    if (!result.ok) return;
    const payload = result.matches.map((m) => m.match).join('\n');
    try {
      await navigator.clipboard.writeText(payload);
      setIsCopied(true);
      toast.success('Matches Copied', `${result.matches.length} match(es) copied to your clipboard.`);
      window.setTimeout(() => setIsCopied(false), 1500);
    } catch (e) {
      toast.error('Copy Failed', 'Your browser blocked clipboard access.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="regex-tester-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Sparkle className="w-8 h-8 text-[#10b981]" />
            Interactive RegEx Tester
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Test a regular expression against sample text and see every match highlighted with its groups.
          </p>
        </div>
        <button
          onClick={() => { setPattern(SAMPLE_PATTERN); setText(SAMPLE_TEXT); }}
          className="text-xs font-semibold text-[#10b981] hover:text-[#059669] hover:bg-[#10b981]/10 px-3 py-1.5 rounded border border-emerald-900/50 transition-colors cursor-pointer"
        >
          Load Sample
        </button>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="regex-pattern" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Regular Expression
          </label>
          <div className="flex items-stretch gap-2">
            <span className="flex items-center px-3 rounded border border-[#2a2a2a] bg-[#151515] text-gray-500 font-mono text-sm">/</span>
            <input
              id="regex-pattern"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="e.g. \b\w+@\w+\.\w+\b"
              spellCheck={false}
              className="flex-1 text-sm font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
            />
            <span className="flex items-center px-3 rounded border border-[#2a2a2a] bg-[#151515] text-gray-500 font-mono text-sm">
              /{flagString || '—'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {FLAG_OPTIONS.map((f) => (
              <button
                key={f.flag}
                onClick={() => toggleFlag(f.flag)}
                title={f.hint}
                className={`text-xs font-semibold px-3 py-1.5 rounded border transition-colors cursor-pointer ${
                  flags[f.flag]
                    ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                    : 'border-[#2a2a2a] text-gray-400 hover:border-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="regex-text" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Test String
          </label>
          <textarea
            id="regex-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the text to test against…"
            spellCheck={false}
            className="w-full h-32 text-sm font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] resize-y"
          />
        </div>

        {result.ok ? (
          <>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <MagnifyingGlass className="w-4 h-4 text-[#10b981]" />
                {result.matches.length} match{result.matches.length === 1 ? '' : 'es'} found
              </span>
              {result.matches.length > 0 && (
                <button
                  onClick={copyMatches}
                  className="ml-auto text-xs font-semibold text-[#10b981] hover:text-[#059669] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {isCopied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? 'Copied!' : 'Copy Matches'}
                </button>
              )}
            </div>
            <div
              data-testid="regex-highlight"
              className="text-sm font-mono leading-7 border border-[#2a2a2a] rounded-lg px-4 py-3 bg-[#151515] text-gray-300 whitespace-pre-wrap break-all"
            >
              {segments.length === 0 ? (
                <span className="text-gray-500">No matches — try a different pattern.</span>
              ) : (
                segments.map((seg, idx) =>
                  seg.matched ? (
                    <mark key={idx} className="bg-[#10b981] text-[#0a0a0a] rounded px-0.5 font-bold">
                      {seg.text}
                    </mark>
                  ) : (
                    <span key={idx}>{seg.text}</span>
                  )
                )
              )}
            </div>
            {result.matches.length > 0 && (
              <div data-testid="regex-match-list" className="flex flex-col gap-2">
                {result.matches.map((m, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515]">
                    <span className="font-mono font-bold text-emerald-300">#{idx + 1} “{m.match}”</span>
                    <span className="text-gray-500">at index {m.index}</span>
                    {m.groups.length > 0 && (
                      <span className="text-gray-400">
                        groups: {m.groups.map((g, gi) => `$${gi + 1}=${g === undefined ? '—' : `“${g}”`}`).join(', ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div data-testid="regex-error" className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3">
            <span className="font-bold">Invalid pattern: </span>
            {result.error}
          </div>
        )}
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-sans text-lg text-white">Quick Reference</h2>
          <button
            onClick={() => { setPattern(''); setText(''); }}
            className="text-xs font-semibold text-gray-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Trash className="w-3.5 h-3.5" /> Clear All
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {CHEAT_SHEET.map(([token, meaning]) => (
            <button
              key={token}
              onClick={() => setPattern((prev) => prev + token)}
              title="Click to append to your pattern"
              className="text-left border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515] hover:border-[#10b981]/50 transition-colors cursor-pointer"
            >
              <span className="block font-mono text-sm font-bold text-emerald-300">{token}</span>
              <span className="block text-[11px] text-gray-400 mt-0.5">{meaning}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
