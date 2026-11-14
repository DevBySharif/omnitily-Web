import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Lightning,
  Play,
  Timer,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

/** Human-readable verdict for a reaction time in milliseconds. */
export function reactionRating(ms: number): string {
  if (ms < 150) return 'Suspiciously fast — did you anticipate it?';
  if (ms < 200) return 'Lightning fast — elite reflexes!';
  if (ms < 250) return 'Excellent — faster than most people.';
  if (ms < 350) return 'Good — right around the human average.';
  if (ms < 500) return 'A little slow — try staying focused on the screen.';
  return 'Slow — maybe you blinked. Try again!';
}

export function averageMs(attempts: number[]): number {
  if (attempts.length === 0) return 0;
  return Math.round(attempts.reduce((sum, v) => sum + v, 0) / attempts.length);
}

export const MIN_WAIT_MS = 1000;
export const MAX_WAIT_MS = 4000;

type Phase = 'idle' | 'waiting' | 'ready' | 'too-soon' | 'result';

export default function ReactionTest({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>('idle');
  const [attempts, setAttempts] = useState<number[]>([]);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const greenAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const startTest = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setLastMs(null);
    setPhase('waiting');
    const delay = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);
    timerRef.current = window.setTimeout(() => {
      greenAtRef.current = Date.now();
      setPhase('ready');
    }, delay);
  };

  const handleClick = () => {
    if (phase === 'waiting') {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setPhase('too-soon');
      toast.warning('Too Soon!', 'You clicked before the screen turned green. Wait for green, then click.');
      return;
    }
    if (phase === 'ready') {
      const ms = Date.now() - greenAtRef.current;
      setLastMs(ms);
      setAttempts((prev) => [ms, ...prev].slice(0, 5));
      setPhase('result');
      const best = attempts.length === 0 ? ms : Math.min(ms, ...attempts);
      if (ms <= best && ms < 250) {
        try { confetti({ particleCount: 60, spread: 60 }); } catch (e) {}
      }
      toast.success(`${ms} ms`, reactionRating(ms));
    }
  };

  const resetAll = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setAttempts([]);
    setLastMs(null);
    setPhase('idle');
  };

  const best = attempts.length > 0 ? Math.min(...attempts) : null;
  const average = attempts.length > 0 ? averageMs(attempts) : null;

  const panelClasses =
    phase === 'ready'
      ? 'bg-emerald-500 border-emerald-400 cursor-pointer'
      : phase === 'waiting'
        ? 'bg-rose-600 border-rose-500 cursor-pointer'
        : phase === 'too-soon'
          ? 'bg-amber-600 border-amber-500 cursor-pointer'
          : 'bg-[#151515] border-[#2a2a2a]';

  const panelText =
    phase === 'idle'
      ? 'Press Start, then wait…'
      : phase === 'waiting'
        ? 'Wait for green…'
        : phase === 'ready'
          ? 'CLICK NOW!'
          : phase === 'too-soon'
            ? 'Too soon! Click to try again.'
            : 'Click to start again';

  const clickAction = () => {
    if (phase === 'waiting' || phase === 'ready') handleClick();
    else if (phase === 'too-soon' || phase === 'result') startTest();
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="reaction-test-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Lightning className="w-8 h-8 text-[#10b981]" />
            Reaction Time Tester
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Press start, wait for the screen to turn green, then click as fast as you can. Your time is measured in exact milliseconds. Average human reaction is around 250 ms.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <button
            onClick={clickAction}
            aria-label={panelText}
            data-testid="reaction-panel"
            className={`w-full min-h-[280px] rounded-xl border-2 transition-colors flex flex-col items-center justify-center gap-3 select-none ${panelClasses}`}
          >
            {phase === 'idle' && <Timer className="w-10 h-10 text-[#10b981]" />}
            {phase === 'waiting' && <WarningCircle className="w-10 h-10 text-white" />}
            {phase === 'ready' && <Lightning className="w-12 h-12 text-white" weight="fill" />}
            {phase === 'too-soon' && <WarningCircle className="w-10 h-10 text-white" />}
            {phase === 'result' && lastMs !== null && <CheckCircle className="w-10 h-10 text-white" />}
            <span className="text-2xl font-bold text-white text-center px-4">{panelText}</span>
            {phase === 'result' && lastMs !== null && (
              <span data-testid="reaction-result" className="text-5xl font-mono font-bold text-white">
                {lastMs} ms
              </span>
            )}
            {phase === 'result' && lastMs !== null && (
              <span className="text-sm text-white/90 text-center px-4">{reactionRating(lastMs)}</span>
            )}
          </button>

          <div className="flex gap-2">
            {(phase === 'idle' || phase === 'result' || phase === 'too-soon') && (
              <button
                onClick={startTest}
                className="flex-1 py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md"
              >
                <Play className="w-4 h-4" /> {phase === 'idle' ? 'Start Test' : 'Try Again'}
              </button>
            )}
            {attempts.length > 0 && (
              <button
                onClick={resetAll}
                className="py-3 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowsCounterClockwise className="w-4 h-4" /> Reset
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-500">
            Tip: keep your hand on the mouse and your eyes on the panel. Clicking before green counts as a false start, not a reaction.
          </p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Your Attempts (last 5)</span>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-lg p-3 text-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Best</div>
              <div className="text-lg font-bold text-emerald-300">{best !== null ? `${best} ms` : '—'}</div>
            </div>
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-lg p-3 text-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Average</div>
              <div className="text-lg font-bold text-white">{average !== null ? `${average} ms` : '—'}</div>
            </div>
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-lg p-3 text-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Attempts</div>
              <div className="text-lg font-bold text-white">{attempts.length}</div>
            </div>
          </div>
          {attempts.length === 0 ? (
            <p className="text-gray-500 text-sm">No attempts yet. Your last five times will appear here.</p>
          ) : (
            <ul data-testid="reaction-attempts" className="flex flex-col gap-2">
              {attempts.map((ms, i) => (
                <li key={`${ms}-${i}`} className="flex items-center justify-between border border-[#2a2a2a] rounded-lg px-4 py-2 bg-[#151515]">
                  <span className="text-sm text-gray-300">Attempt {attempts.length - i}</span>
                  <span className="text-sm font-mono font-bold text-emerald-300">{ms} ms</span>
                </li>
              ))}
            </ul>
          )}
          <h2 className="font-sans text-lg text-white mt-6 mb-2">What the numbers mean</h2>
          <ul className="text-sm text-gray-400 flex flex-col gap-1">
            <li><span className="font-mono font-bold text-emerald-300">Under 200 ms</span> — elite, faster than most people.</li>
            <li><span className="font-mono font-bold text-emerald-300">200–250 ms</span> — excellent, about the average for young adults.</li>
            <li><span className="font-mono font-bold text-emerald-300">250–350 ms</span> — good, typical for most adults.</li>
            <li><span className="font-mono font-bold text-emerald-300">Over 500 ms</span> — slow; try again with full focus.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
