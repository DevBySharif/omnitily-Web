import React, { useRef, useState } from 'react';
import {
  CheckCircle,
  Copy,
  Download,
  DiceFive,
  Sparkle,
  Trash,
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export type SentenceKind = 'statement' | 'question' | 'exclamation' | 'story-prompt' | 'random';

export const SENTENCE_KINDS: { value: SentenceKind; label: string }[] = [
  { value: 'statement', label: 'Statement' },
  { value: 'question', label: 'Question' },
  { value: 'exclamation', label: 'Exclamation' },
  { value: 'story-prompt', label: 'Story Prompt' },
  { value: 'random', label: 'Surprise Me' },
];

const SUBJECTS = [
  'The old lighthouse keeper', 'A curious fox', 'The last librarian', 'A sleepy dragon',
  'The wandering robot', 'A brave young sailor', 'The midnight baker', 'An ancient oak tree',
  'The clever inventor', 'A lonely astronaut', 'The talking cat', 'A retired pirate',
  'The mountain climber', 'A mischievous ghost', 'The time traveller', 'A tiny wizard',
];

const VERBS = [
  'discovered', 'painted', 'built', 'whispered to', 'chased', 'mapped', 'sang to',
  'unlocked', 'followed', 'traded stories with', 'repaired', 'planted',
];

const OBJECTS = [
  'a brass key that hummed', 'the hidden staircase', 'a map of forgotten islands',
  'a garden of glass flowers', 'the town\'s oldest clock', 'a letter from the future',
  'a song nobody had heard', 'the last train to nowhere', 'a pocketful of stars',
  'a door that appeared at dawn', 'the river\'s secret name', 'a lighthouse made of paper',
];

const SETTINGS = [
  'beneath the northern lights', 'in a village that only appears on Tuesdays',
  'at the edge of the desert', 'inside a library that grows by itself',
  'on the roof of the world', 'during the longest night of the year',
  'in a harbour full of paper boats', 'under a sky of green fire',
];

const TWISTS = [
  'but the map changed every time someone blinked.',
  'and nobody believed them until the bell rang backwards.',
  'right before the whole town woke up.',
  'even though the moon was watching.',
  'and that was only the beginning.',
  'while the clock in the square counted down to nothing.',
];

const QUESTIONS = [
  'What would you do if the sea suddenly started whispering your name?',
  'Why does the old clock tower ring thirteen times on the first of March?',
  'If you found a door in the forest that wasn\'t there yesterday, would you open it?',
  'What hides in the attic of the house that moves when nobody is looking?',
  'How did the lighthouse keeper lose the light — and where did it go?',
  'What happens when a dragon dreams in colour for the very first time?',
];

const PROMPTS = [
  'Write about a town where it rains upward — and the one person who remembers when it started.',
  'A letter arrives addressed to you, written in your own handwriting, dated ten years from now. What does it say?',
  'The last book in the library is blank, but when you open it, the pages start writing themselves.',
  'Every mirror in the city shows a different version of you. One of them is waving. Tell the story.',
  'A gardener plants a seed that grows into a staircase. Describe what is at the top.',
  'Your grandmother\'s radio picks up a station that broadcasts tomorrow\'s news. What do you hear first?',
];

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

/**
 * Generate one sentence of the requested kind. A `rand` function can be
 * injected (defaults to Math.random) so output is deterministic in tests.
 */
export function generateSentence(
  kind: SentenceKind,
  rand: () => number = Math.random
): string {
  const effective = kind === 'random'
    ? (['statement', 'question', 'exclamation', 'story-prompt'] as const)[Math.floor(rand() * 4)]
    : kind;
  switch (effective) {
    case 'question':
      return pick(QUESTIONS, rand);
    case 'story-prompt':
      return pick(PROMPTS, rand);
    case 'exclamation': {
      const s = pick(SUBJECTS, rand);
      const v = pick(VERBS, rand);
      const o = pick(OBJECTS, rand);
      const set = pick(SETTINGS, rand);
      return `${s} ${v} ${o} ${set} — what a day!`;
    }
    case 'statement':
    default: {
      const s = pick(SUBJECTS, rand);
      const v = pick(VERBS, rand);
      const o = pick(OBJECTS, rand);
      const set = pick(SETTINGS, rand);
      const twist = pick(TWISTS, rand);
      return `${s} ${v} ${o} ${set}, ${twist}`;
    }
  }
}

export function generateSentences(
  count: number,
  kind: SentenceKind,
  rand: () => number = Math.random
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < count && guard < count * 20) {
    const s = generateSentence(kind, rand);
    guard++;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export default function SentenceGenerator({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [kind, setKind] = useState<SentenceKind>('statement');
  const [count, setCount] = useState(5);
  const [sentences, setSentences] = useState<string[]>(() => generateSentences(5, 'statement'));
  const [isCopied, setIsCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  const generate = () => {
    setSentences(generateSentences(count, kind));
    try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
    toast.success('Sentences Generated', `${count} fresh ${SENTENCE_KINDS.find((k) => k.value === kind)?.label.toLowerCase() ?? 'sentence'}(s) ready.`);
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(sentences.join('\n'));
      setIsCopied(true);
      toast.success('Copied', `${sentences.length} sentence(s) copied to your clipboard.`);
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = window.setTimeout(() => setIsCopied(false), 1500);
    } catch (e) {
      toast.error('Copy Failed', 'Your browser blocked clipboard access.');
    }
  };

  const downloadAll = () => {
    try {
      const blob = new Blob([sentences.join('\n\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sentences.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 1000);
      toast.success('Downloaded', 'Saved as sentences.txt.');
    } catch (e) {
      toast.error('Download Failed', 'The file could not be generated in this browser.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="sentence-generator-tool">
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
            Creative Prompt Generator
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Generate random sentence prompts and vocabulary combinations for writing exercises.
          </p>
        </div>
        <button
          onClick={generate}
          className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-colors cursor-pointer flex items-center gap-2"
        >
          <DiceFive className="w-4 h-4" /> Generate
        </button>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="sentence-kind" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prompt Type</label>
            <select
              id="sentence-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as SentenceKind)}
              className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] cursor-pointer"
            >
              {SENTENCE_KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label htmlFor="sentence-count" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">How Many</label>
              <span className="text-xs font-bold text-[#10b981]">{count}</span>
            </div>
            <input
              id="sentence-count"
              type="range"
              min="1"
              max="10"
              step="1"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
            />
          </div>
        </div>

        {sentences.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Press Generate to create your first prompts.</p>
        ) : (
          <div data-testid="sentence-list" className="flex flex-col gap-2">
            {sentences.map((s, idx) => (
              <div key={`${idx}-${s.slice(0, 12)}`} className="flex gap-3 border border-[#2a2a2a] rounded-lg px-4 py-3 bg-[#151515]">
                <span className="text-xs font-mono font-bold text-[#10b981] shrink-0 pt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                <p className="text-sm text-gray-200 leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={copyAll}
            disabled={sentences.length === 0}
            className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {isCopied ? 'Copied!' : 'Copy All'}
          </button>
          <button
            onClick={downloadAll}
            disabled={sentences.length === 0}
            className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-300 hover:border-gray-600 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> Download .txt
          </button>
          <button
            onClick={() => setSentences([])}
            className="ml-auto text-xs font-semibold text-gray-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Trash className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>
      <p className="text-[10px] text-gray-500 mt-3">
        Prompts are assembled locally from curated word banks — nothing is generated by an AI service.
      </p>
    </div>
  );
}
