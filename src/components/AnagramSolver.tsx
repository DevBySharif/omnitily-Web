import React, { useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  TextT,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

/**
 * Bundled word list (common English words, 2–8 letters). Every word returned
 * by the solver comes from this list — nothing is invented or fetched.
 */
export const WORD_LIST: string[] = [
  'act', 'age', 'ago', 'aid', 'aim', 'air', 'ale', 'all', 'and', 'ant', 'ape', 'apt', 'arc', 'are', 'arm', 'art', 'ash', 'ask', 'ate', 'awe',
  'bad', 'bag', 'bar', 'bat', 'bay', 'bed', 'bee', 'beg', 'bet', 'bid', 'big', 'bin', 'bit', 'bow', 'box', 'boy', 'bud', 'bug', 'bun', 'bus', 'but', 'buy',
  'cab', 'can', 'cap', 'car', 'care', 'cat', 'cod', 'cog', 'con', 'cow', 'cry', 'cup', 'cut',
  'dad', 'dam', 'dare', 'day', 'dear', 'den', 'dew', 'did', 'die', 'dig', 'dim', 'dip', 'dog', 'dot', 'dry', 'dusty', 'due', 'dug',
  'ear', 'earn', 'earth', 'east', 'eat', 'eel', 'egg', 'elf', 'elk', 'elm', 'end', 'era', 'eve', 'evil', 'eye',
  'fan', 'far', 'fat', 'fear', 'fee', 'few', 'fig', 'fin', 'fir', 'fit', 'fix', 'flu', 'fly', 'fog', 'for', 'fox', 'fun', 'fur',
  'gap', 'gas', 'gem', 'get', 'gig', 'gin', 'god', 'got', 'gum', 'gun', 'gut', 'guy',
  'ham', 'has', 'hat', 'hay', 'heart', 'hen', 'her', 'hey', 'hid', 'him', 'hip', 'his', 'hit', 'hog', 'hop', 'hot', 'how', 'hub', 'hue', 'hug', 'hum',
  'ice', 'ill', 'ink', 'inn', 'ion', 'its',
  'jam', 'jar', 'jaw', 'jet', 'job', 'jog', 'joy',
  'kept', 'key', 'kid', 'kin', 'kit', 'knee',
  'lad', 'lag', 'lap', 'law', 'lay', 'lea', 'led', 'leg', 'let', 'lid', 'lie', 'lip', 'lit', 'live', 'load', 'log', 'lot', 'low', 'luck',
  'mad', 'man', 'map', 'mat', 'may', 'men', 'met', 'mix', 'mob', 'mom', 'mood', 'moon', 'mop', 'mud', 'mug',
  'nap', 'net', 'new', 'nil', 'nod', 'nor', 'not', 'now', 'nut',
  'oak', 'oar', 'odd', 'off', 'oil', 'old', 'one', 'opt', 'orb', 'ore', 'our', 'out', 'owl', 'own',
  'pad', 'pan', 'par', 'part', 'pat', 'pay', 'pea', 'pen', 'per', 'pet', 'pie', 'pig', 'pin', 'pit', 'plea', 'poet', 'pop', 'post', 'pot', 'pots', 'pride',
  'quart', 'quit', 'quiz',
  'race', 'rag', 'ram', 'ran', 'rap', 'rat', 'raw', 'ray', 'read', 'red', 'rid', 'rig', 'rim', 'rip', 'roar', 'rod', 'rot', 'row', 'rub', 'rug', 'rum', 'run',
  'sad', 'sail', 'salt', 'sap', 'sat', 'saw', 'say', 'sea', 'see', 'set', 'sew', 'she', 'shy', 'sick', 'side', 'sigh', 'sight', 'silent', 'sin', 'sing', 'sip', 'sir', 'sit', 'six', 'ski', 'sky', 'slam', 'slap', 'sled', 'slip', 'sob', 'sock', 'son', 'song', 'soul', 'soup', 'sow', 'spa', 'span', 'spare', 'spear', 'spot', 'star', 'stay', 'stem', 'step', 'stew', 'stop', 'store', 'storm', 'story', 'stove', 'study', 'sun', 'sure',
  'tab', 'tag', 'tan', 'tap', 'tar', 'tea', 'tear', 'tell', 'ten', 'tent', 'the', 'thing', 'thin', 'tie', 'tin', 'tinsel', 'tip', 'tire', 'toad', 'toe', 'told', 'tone', 'tons', 'tool', 'top', 'tops', 'tore', 'torn', 'toy', 'trap', 'tray', 'tree', 'trek', 'trend', 'tried', 'trip', 'trot', 'true', 'try', 'tub', 'tug', 'tune', 'turn',
  'under', 'unit', 'upon', 'use',
  'van', 'vase', 'vast', 'veil', 'verb', 'very', 'vet', 'via', 'vile', 'vine',
  'wad', 'wag', 'war', 'warm', 'warn', 'was', 'wash', 'waste', 'watch', 'water', 'way', 'we', 'web', 'wed', 'wee', 'well', 'went', 'wet', 'what', 'when', 'whip', 'who', 'why', 'win', 'wind', 'wine', 'wing', 'wink', 'wipe', 'wire', 'wise', 'wish', 'wit', 'with', 'woe', 'wok', 'won', 'wood', 'wool', 'word', 'work', 'worm', 'worn', 'worth', 'wrap',
  'yard', 'yarn', 'yaw', 'yea', 'year', 'yell', 'yes', 'yet', 'yoga', 'yoke',
  'zap', 'zero', 'zest', 'zig', 'zip', 'zone', 'zoom',
  'angel', 'glean', 'enlist', 'listen', 'night', 'stressed', 'desserts',
];

export function letterCounts(word: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of word.toLowerCase().replace(/[^a-z]/g, '')) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  return counts;
}

function canForm(word: string, available: Map<string, number>): boolean {
  const needed = letterCounts(word);
  for (const [ch, count] of needed) {
    if ((available.get(ch) ?? 0) < count) return false;
  }
  return true;
}

function cleanLetters(input: string): string {
  return input.toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Words that use exactly all of the given letters (true anagrams).
 * Sorted alphabetically; the input itself is included when it is a word.
 */
export function findExactAnagrams(letters: string, wordList: string[] = WORD_LIST): string[] {
  const cleaned = cleanLetters(letters);
  if (cleaned.length < 2) return [];
  const target = letterCounts(cleaned);
  const out: string[] = [];
  for (const word of wordList) {
    if (word.length !== cleaned.length) continue;
    const counts = letterCounts(word);
    let same = counts.size === target.size;
    if (same) {
      for (const [ch, count] of target) {
        if (counts.get(ch) !== count) { same = false; break; }
      }
    }
    if (same) out.push(word);
  }
  return out.sort();
}

/**
 * All words that can be spelled from the given letters (subsets allowed),
 * longest first, then alphabetical. `minLength` defaults to 3.
 */
export function findWordsFromLetters(letters: string, wordList: string[] = WORD_LIST, minLength = 3): string[] {
  const cleaned = cleanLetters(letters);
  if (cleaned.length < 2) return [];
  const available = letterCounts(cleaned);
  const out: string[] = [];
  for (const word of wordList) {
    if (word.length < minLength || word.length > cleaned.length) continue;
    if (canForm(word, available)) out.push(word);
  }
  return out.sort((a, b) => b.length - a.length || a.localeCompare(b));
}

type Mode = 'exact' | 'words';

export default function AnagramSolver({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [letters, setLetters] = useState('listen');
  const [mode, setMode] = useState<Mode>('exact');
  const [results, setResults] = useState<string[] | null>(null);
  const [searched, setSearched] = useState('');
  const [error, setError] = useState('');

  const solve = () => {
    setError('');
    const cleaned = cleanLetters(letters);
    if (cleaned.length < 2) {
      const message = 'Enter at least 2 letters to unscramble.';
      setError(message);
      toast.error('Cannot Solve', message);
      return;
    }
    if (cleaned.length > 12) {
      const message = 'Keep it to 12 letters or fewer for a fast answer.';
      setError(message);
      toast.error('Too Long', message);
      return;
    }
    const found = mode === 'exact' ? findExactAnagrams(cleaned) : findWordsFromLetters(cleaned);
    setResults(found);
    setSearched(cleaned);
    if (found.length > 0) {
      try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
      toast.success(
        found.length === 1 ? '1 word found' : `${found.length} words found`,
        mode === 'exact' ? `Anagrams of "${cleaned}".` : `Words you can spell from "${cleaned}".`
      );
    } else {
      toast.info('No Matches', `No words in the built-in list match "${cleaned}".`);
    }
  };

  const clearAll = () => {
    setLetters('');
    setResults(null);
    setSearched('');
    setError('');
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="anagram-solver-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <TextT className="w-8 h-8 text-[#10b981]" />
            Word Anagram Solver
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Unscramble letters into real words from a built-in English word list. Find exact anagrams, or every word the letters can spell.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="anagram-letters" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Scrambled letters (2–12)</label>
            <input
              id="anagram-letters"
              type="text"
              value={letters}
              onChange={(e) => setLetters(e.target.value.replace(/[^a-zA-Z]/g, ''))}
              maxLength={12}
              spellCheck={false}
              placeholder="listen"
              className="w-full text-sm font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] uppercase tracking-widest"
            />
            <span className="text-[10px] text-gray-500">Try &ldquo;listen&rdquo;, &ldquo;stop&rdquo;, &ldquo;heart&rdquo; or &ldquo;night&rdquo;.</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'exact', label: 'Exact anagrams' },
              { id: 'words', label: 'All words from letters' },
            ] as const).map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`py-2 px-3 text-xs font-semibold rounded border transition-all cursor-pointer text-center ${
                  mode === m.id
                    ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                    : 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={solve}
              className="flex-1 py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md"
            >
              <TextT className="w-4 h-4" /> Solve Anagram
            </button>
            <button
              onClick={clearAll}
              className="py-3 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowsCounterClockwise className="w-4 h-4" /> Clear
            </button>
          </div>
          {error && (
            <p className="text-rose-400 text-sm bg-rose-950/20 border border-rose-900/40 rounded-xl px-4 py-3 flex items-start gap-2">
              <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </p>
          )}
          <p className="text-[10px] text-gray-500">
            The solver checks a built-in list of {WORD_LIST.length} common English words, entirely offline. A word is only shown when it is really in the list.
          </p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Results</span>
          {results === null ? (
            <p className="text-gray-500 text-sm">Enter letters and press Solve. Example: &ldquo;listen&rdquo; unscrambles to enlist, listen, silent and tinsel.</p>
          ) : results.length === 0 ? (
            <p className="text-gray-500 text-sm">No words in the built-in list match &ldquo;{searched}&rdquo;. Try different letters, or switch to &ldquo;All words from letters&rdquo;.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">
                  {results.length} word{results.length === 1 ? '' : 's'} {mode === 'exact' ? 'using all letters' : 'from'} &ldquo;{searched}&rdquo;
                </span>
              </div>
              <div data-testid="anagram-results" className="flex flex-wrap gap-2 max-h-80 overflow-y-auto">
                {results.map((word) => (
                  <span key={word} className="px-3 py-1.5 rounded-lg border border-[#2a2a2a] bg-[#151515] text-sm font-mono font-bold text-emerald-300">
                    {word}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
