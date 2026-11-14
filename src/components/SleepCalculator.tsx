import React, { useState } from 'react';
import {
  CheckCircle,
  Moon,
  Sun
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export const CYCLE_MINUTES = 90;
export const FALL_ASLEEP_MINUTES = 15;

/** Minutes since midnight (0–1439) -> "9:45 PM". */
export function formatTime12h(minutes: number): string {
  const clamped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(clamped / 60);
  const m = clamped % 60;
  const period = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** "HH:MM" (24-hour) -> minutes since midnight. Throws on bad input. */
export function parseTime24h(time: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) throw new Error(`"${time}" is not a valid time (use HH:MM, 24-hour).`);
  return Number(match[1]) * 60 + Number(match[2]);
}

export interface SleepOption {
  bedtimeMinutes: number;
  wakeMinutes: number;
  cycles: number;
  /** Total time in bed including the ~15 minutes to fall asleep. */
  totalMinutes: number;
  bedtimeLabel: string;
  wakeLabel: string;
}

/**
 * Bedtimes that land on whole 90-minute sleep cycles before a target wake
 * time, allowing ~15 minutes to fall asleep. Returns options for 6 down to
 * 1 cycles (most sleep first).
 */
export function bedtimesForWakeTime(wakeMinutes: number, maxCycles = 6): SleepOption[] {
  const options: SleepOption[] = [];
  for (let cycles = maxCycles; cycles >= 1; cycles--) {
    const bedtime = wakeMinutes - cycles * CYCLE_MINUTES - FALL_ASLEEP_MINUTES;
    options.push({
      bedtimeMinutes: ((bedtime % 1440) + 1440) % 1440,
      wakeMinutes: ((wakeMinutes % 1440) + 1440) % 1440,
      cycles,
      totalMinutes: cycles * CYCLE_MINUTES + FALL_ASLEEP_MINUTES,
      bedtimeLabel: formatTime12h(bedtime),
      wakeLabel: formatTime12h(wakeMinutes),
    });
  }
  return options;
}

/**
 * Wake times if you go to bed now: whole 90-minute cycles after bedtime,
 * again allowing ~15 minutes to fall asleep first.
 */
export function wakeTimesFromBedtime(bedtimeMinutes: number, maxCycles = 6): SleepOption[] {
  const options: SleepOption[] = [];
  for (let cycles = 1; cycles <= maxCycles; cycles++) {
    const wake = bedtimeMinutes + FALL_ASLEEP_MINUTES + cycles * CYCLE_MINUTES;
    options.push({
      bedtimeMinutes: ((bedtimeMinutes % 1440) + 1440) % 1440,
      wakeMinutes: ((wake % 1440) + 1440) % 1440,
      cycles,
      totalMinutes: cycles * CYCLE_MINUTES + FALL_ASLEEP_MINUTES,
      bedtimeLabel: formatTime12h(bedtimeMinutes),
      wakeLabel: formatTime12h(wake),
    });
  }
  return options;
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

type Mode = 'wake' | 'sleep-now';

export default function SleepCalculator({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('wake');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [options, setOptions] = useState<SleepOption[] | null>(null);
  const [optionsHeading, setOptionsHeading] = useState('');
  const [error, setError] = useState('');

  const calculateFromWake = () => {
    setError('');
    try {
      const wake = parseTime24h(wakeTime);
      const computed = bedtimesForWakeTime(wake);
      setOptions(computed);
      setOptionsHeading(`To wake up at ${formatTime12h(wake)}, go to bed at:`);
      try { confetti({ particleCount: 30, spread: 40 }); } catch (e) {}
      toast.success('Sleep Times Ready', 'Bedtimes calculated for whole sleep cycles.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not calculate.';
      setError(message);
      toast.error('Cannot Calculate', message);
    }
  };

  const calculateFromNow = () => {
    setError('');
    const now = new Date();
    const bedtime = now.getHours() * 60 + now.getMinutes();
    const computed = wakeTimesFromBedtime(bedtime);
    setOptions(computed);
    setOptionsHeading(`If you go to bed now (${formatTime12h(bedtime)}), wake up at:`);
    try { confetti({ particleCount: 30, spread: 40 }); } catch (e) {}
    toast.success('Sleep Times Ready', 'Wake times calculated for whole sleep cycles.');
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="sleep-calculator-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Moon className="w-8 h-8 text-[#10b981]" />
            Optimal Sleep Stage Planner
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Sleep runs in ~90-minute cycles. Waking between cycles — not mid-cycle — is what makes mornings feel easier. Plan around your wake time, or from right now.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'wake', label: 'I want to wake up at…' },
              { id: 'sleep-now', label: 'I want to sleep now' },
            ] as const).map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setOptions(null); setError(''); }}
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

          {mode === 'wake' ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="sleep-wake-time" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-gray-500" /> Wake-up time
              </label>
              <input
                id="sleep-wake-time"
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
              />
              <button
                onClick={calculateFromWake}
                className="mt-2 w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md"
              >
                <Moon className="w-4 h-4" /> Calculate Bedtimes
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-400">
                Uses your device&apos;s current time as bedtime and shows wake-up times at the end of whole sleep cycles.
              </p>
              <button
                onClick={calculateFromNow}
                className="mt-2 w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md"
              >
                <Moon className="w-4 h-4" /> Calculate Wake Times
              </button>
            </div>
          )}

          {error && (
            <p className="text-rose-400 text-sm bg-rose-950/20 border border-rose-900/40 rounded-xl px-4 py-3">{error}</p>
          )}
          <p className="text-[10px] text-gray-500">
            Each option is a whole number of 90-minute sleep cycles plus ~15 minutes to fall asleep. Most adults need 5–6 cycles (7.5–9 hours in bed). This is general guidance, not medical advice.
          </p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Your Sleep Options</span>
          {options ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">{optionsHeading}</span>
              </div>
              <ul data-testid="sleep-options" className="flex flex-col gap-2">
                {options.map((option) => (
                  <li
                    key={option.cycles}
                    className={`flex items-center justify-between gap-3 border rounded-lg px-4 py-3 bg-[#151515] ${
                      option.cycles === 5 || option.cycles === 6 ? 'border-emerald-900/60' : 'border-[#2a2a2a]'
                    }`}
                  >
                    <span className="text-sm text-gray-200">
                      <span className="font-mono font-bold text-emerald-300 text-base">
                        {mode === 'wake' ? option.bedtimeLabel : option.wakeLabel}
                      </span>
                      {(option.cycles === 5 || option.cycles === 6) && (
                        <span className="ml-2 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded px-1.5 py-0.5 uppercase tracking-wider">Recommended</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400 text-right shrink-0">
                      {option.cycles} cycle{option.cycles === 1 ? '' : 's'} &middot; {formatDuration(option.totalMinutes)} in bed
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-gray-500 text-sm">Pick a mode and calculate. Example: to wake at 7:00 AM, the 6-cycle bedtime is 9:45 PM and the 5-cycle bedtime is 11:15 PM.</p>
          )}
        </div>
      </div>
    </div>
  );
}
