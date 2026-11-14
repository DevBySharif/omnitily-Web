import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowsCounterClockwise,
  Crown,
  Shuffle,
  Users
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

/** One name per line; trims, drops empties, removes duplicates (first occurrence kept). */
export function parseNames(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const name = line.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Index in [0, count) from a 0–1 random value. Pure and testable. */
export function pickWinnerIndex(count: number, randomValue: number): number {
  if (!Number.isInteger(count) || count <= 0) throw new Error('Need at least one name to pick from.');
  const safe = Math.min(0.999999999, Math.max(0, randomValue));
  return Math.floor(safe * count);
}

/** Cryptographically backed random in [0, 1), with a Math.random fallback. */
export function secureRandom01(): number {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] / 4294967296;
    }
  } catch (e) {}
  return Math.random();
}

const SPIN_TICKS = 18;
const SPIN_INTERVAL_MS = 70;

export default function NamePicker({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [text, setText] = useState('Alice\nBob\nCarol\nDave');
  const [names, setNames] = useState<string[]>(() => parseNames('Alice\nBob\nCarol\nDave'));
  const [spinning, setSpinning] = useState(false);
  const [highlight, setHighlight] = useState<number>(-1);
  const [winner, setWinner] = useState<string>('');
  const [rounds, setRounds] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  const updateNames = (value: string) => {
    setText(value);
    setNames(parseNames(value));
    setWinner('');
    setHighlight(-1);
  };

  const pickWinner = () => {
    if (names.length === 0) {
      toast.error('No Names', 'Enter at least one name, one per line.');
      return;
    }
    if (names.length === 1) {
      setWinner(names[0]);
      setRounds((r) => r + 1);
      try { confetti({ particleCount: 80, spread: 70 }); } catch (e) {}
      toast.success('Winner!', `${names[0]} is the pick.`);
      return;
    }
    if (spinning) return;
    setWinner('');
    setSpinning(true);
    const target = pickWinnerIndex(names.length, secureRandom01());
    let tick = 0;
    timerRef.current = window.setInterval(() => {
      tick += 1;
      // Cycle quickly at first, then land exactly on the chosen winner.
      setHighlight(tick >= SPIN_TICKS ? target : (tick * 2 + 1) % names.length);
      if (tick >= SPIN_TICKS) {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setSpinning(false);
        setWinner(names[target]);
        setRounds((r) => r + 1);
        try { confetti({ particleCount: 100, spread: 80 }); } catch (e) {}
        toast.success('Winner!', `${names[target]} is the pick.`);
      }
    }, SPIN_INTERVAL_MS);
  };

  const clearAll = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setText('');
    setNames([]);
    setWinner('');
    setHighlight(-1);
    setSpinning(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="name-picker-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-[#10b981]" />
            Random Selector Wheel
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Enter names or choices, one per line, and let the wheel pick a winner. Great for giveaways, teams, and deciding who goes first.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="name-picker-input" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Names or choices (one per line) — {names.length} entered
            </label>
            <textarea
              id="name-picker-input"
              value={text}
              onChange={(e) => updateNames(e.target.value)}
              rows={8}
              spellCheck={false}
              placeholder={'Alice\nBob\nCarol\nDave'}
              className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={pickWinner}
              disabled={spinning || names.length === 0}
              className={`flex-1 py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                spinning || names.length === 0
                  ? 'bg-[#151515] text-gray-600 border border-[#2a2a2a] cursor-not-allowed shadow-none'
                  : 'bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md'
              }`}
            >
              <Shuffle className="w-4 h-4" /> {spinning ? 'Picking…' : 'Pick a Winner'}
            </button>
            <button
              onClick={clearAll}
              className="py-3 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowsCounterClockwise className="w-4 h-4" /> Clear
            </button>
          </div>
          <p className="text-[10px] text-gray-500">
            The pick uses a cryptographically secure random source (crypto.getRandomValues) — every name has an equal chance.
          </p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">
            The Wheel {rounds > 0 ? `— ${rounds} pick${rounds === 1 ? '' : 's'} so far` : ''}
          </span>
          {names.length === 0 ? (
            <p className="text-gray-500 text-sm">Add some names to start picking.</p>
          ) : (
            <ul data-testid="name-picker-list" className="flex flex-col gap-2">
              {names.map((name, i) => {
                const isWinner = winner !== '' && name === winner;
                const isHighlighted = spinning && highlight === i;
                return (
                  <li
                    key={`${name}-${i}`}
                    className={`flex items-center justify-between rounded-lg px-4 py-3 border transition-all ${
                      isWinner
                        ? 'bg-[#10b981]/15 border-[#10b981]'
                        : isHighlighted
                          ? 'bg-[#10b981]/10 border-[#10b981]/60'
                          : 'bg-[#151515] border-[#2a2a2a]'
                    }`}
                  >
                    <span className={`text-sm font-semibold ${isWinner || isHighlighted ? 'text-emerald-300' : 'text-gray-200'}`}>
                      {name}
                    </span>
                    {isWinner && (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        <Crown className="w-4 h-4" /> Winner
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {winner && (
            <div data-testid="name-picker-winner" className="mt-4 text-center border border-emerald-900/60 bg-emerald-950/20 rounded-xl px-4 py-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Winner</span>
              <span className="text-2xl font-bold text-emerald-300">{winner}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
