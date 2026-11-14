import React, { useMemo, useState } from 'react';
import {
  CheckCircle,
  Clock,
  Copy,
} from '@phosphor-icons/react';
import { useToast } from './Toast';

export interface CronField {
  raw: string;
  values: Set<number>;
  isWildcard: boolean;
}

export interface ParsedCron {
  expression: string;
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}

export type CronParseResult =
  | { ok: true; parsed: ParsedCron; human: string }
  | { ok: false; error: string };

const MONTH_NAMES: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

const DAY_NAMES: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

const FIELD_RANGES: [number, number][] = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day of month
  [1, 12], // month
  [0, 7], // day of week (0 and 7 both = Sunday)
];

const FIELD_LABELS = ['minute', 'hour', 'day of month', 'month', 'day of week'];

function parseFieldValue(token: string, names: Record<string, number> | null): number | null {
  const upper = token.toUpperCase();
  if (names && upper in names) return names[upper];
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  return null;
}

function parseField(raw: string, index: number): CronField | string {
  const [min, max] = FIELD_RANGES[index];
  const names = index === 3 ? MONTH_NAMES : index === 4 ? DAY_NAMES : null;
  const values = new Set<number>();
  const isWildcard = raw === '*' || raw === '?';
  if (isWildcard) {
    for (let v = min; v <= max; v++) values.add(v);
    return { raw, values, isWildcard: true };
  }
  for (const part of raw.split(',')) {
    const stepSplit = part.split('/');
    if (stepSplit.length > 2) return `Invalid step in ${FIELD_LABELS[index]} field: "${part}".`;
    const step = stepSplit.length === 2 ? parseInt(stepSplit[1], 10) : 1;
    if (!Number.isFinite(step) || step < 1) {
      return `Invalid step in ${FIELD_LABELS[index]} field: "${part}".`;
    }
    const base = stepSplit[0];
    let rangeMin: number;
    let rangeMax: number;
    if (base === '*') {
      rangeMin = min;
      rangeMax = max;
    } else if (base.includes('-')) {
      const [a, b] = base.split('-');
      const va = parseFieldValue(a, names);
      const vb = parseFieldValue(b, names);
      if (va === null || vb === null) {
        return `Invalid ${FIELD_LABELS[index]} value: "${part}".`;
      }
      rangeMin = va;
      rangeMax = vb;
    } else {
      const v = parseFieldValue(base, names);
      if (v === null) return `Invalid ${FIELD_LABELS[index]} value: "${part}".`;
      rangeMin = v;
      rangeMax = v;
    }
    if (rangeMin < min || rangeMax > max || rangeMin > rangeMax) {
      return `${FIELD_LABELS[index]} must be between ${min} and ${max}: "${part}".`;
    }
    for (let v = rangeMin; v <= rangeMax; v += step) values.add(v);
  }
  if (values.size === 0) return `Empty ${FIELD_LABELS[index]} field.`;
  return { raw, values, isWildcard: false };
}

function describeField(field: CronField, index: number): string {
  if (field.isWildcard) return ['every minute', 'every hour', 'every day', 'every month', 'every day'][index];
  const sorted = [...field.values].sort((a, b) => a - b);
  if (index === 4) {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `on ${sorted.map((v) => names[v % 7]).join(', ')}`;
  }
  if (index === 3) {
    const names = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `in ${sorted.map((v) => names[v]).join(', ')}`;
  }
  return `at ${sorted.join(', ')}`;
}

/**
 * Parse a 5-field cron expression (minute hour day-of-month month day-of-week).
 * Supports *, lists, ranges, steps (e.g. every 15 minutes) and JAN-DEC / SUN-SAT names.
 */
export function parseCron(expression: string): CronParseResult {
  const trimmed = expression.trim();
  if (!trimmed) return { ok: false, error: 'Enter a cron expression.' };
  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) {
    return { ok: false, error: `A cron expression has 5 fields (minute hour day-of-month month day-of-week) — got ${fields.length}.` };
  }
  const parsedFields: CronField[] = [];
  for (let i = 0; i < 5; i++) {
    const result = parseField(fields[i], i);
    if (typeof result === 'string') return { ok: false, error: result };
    parsedFields.push(result);
  }
  const parsed: ParsedCron = {
    expression: trimmed,
    minute: parsedFields[0],
    hour: parsedFields[1],
    dayOfMonth: parsedFields[2],
    month: parsedFields[3],
    dayOfWeek: parsedFields[4],
  };
  // Day-of-week 7 is Sunday in cron.
  if (parsed.dayOfWeek.values.has(7)) parsed.dayOfWeek.values.add(0);
  const human =
    `Runs ${describeField(parsed.minute, 0)}, ${describeField(parsed.hour, 1)}, ` +
    `${describeField(parsed.dayOfMonth, 2)}, ${describeField(parsed.month, 3)}, ${describeField(parsed.dayOfWeek, 4)}.`;
  return { ok: true, parsed, human };
}

function matchesCron(parsed: ParsedCron, date: Date): boolean {
  if (!parsed.minute.values.has(date.getMinutes())) return false;
  if (!parsed.hour.values.has(date.getHours())) return false;
  if (!parsed.month.values.has(date.getMonth() + 1)) return false;
  const domRestricted = !parsed.dayOfMonth.isWildcard;
  const dowRestricted = !parsed.dayOfWeek.isWildcard;
  const domMatch = parsed.dayOfMonth.values.has(date.getDate());
  const dowMatch = parsed.dayOfWeek.values.has(date.getDay());
  if (domRestricted && dowRestricted) {
    // Standard cron: when both are restricted, either may match.
    if (!domMatch && !dowMatch) return false;
  } else if (domRestricted) {
    if (!domMatch) return false;
  } else if (dowRestricted) {
    if (!dowMatch) return false;
  }
  return true;
}

/**
 * Compute the next `count` run times after `from` (exclusive), scanning
 * minute by minute. Scans at most ~4 years ahead, so impossible schedules
 * (e.g. Feb 31) return fewer runs rather than looping forever.
 */
export function getNextCronRuns(expression: string, from: Date, count = 5): Date[] {
  const parsedResult = parseCron(expression);
  if (!parsedResult.ok) return [];
  const parsed = parsedResult.parsed;
  const runs: Date[] = [];
  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  const maxMinutes = 60 * 24 * 366 * 4;
  for (let i = 0; i < maxMinutes && runs.length < count; i++) {
    if (matchesCron(parsed, cursor)) runs.push(new Date(cursor.getTime()));
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return runs;
}

export function describeNextRun(from: Date, next: Date | undefined): string {
  if (!next) return 'No upcoming run found in the next 4 years — the schedule may never match (e.g. February 31).';
  const diffMs = next.getTime() - from.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  return `Next run in ${parts.join(', ')}.`;
}

export const SAMPLE_CRONS = [
  { expr: '0 9 * * MON-FRI', label: 'Weekdays at 9:00 AM' },
  { expr: '*/15 * * * *', label: 'Every 15 minutes' },
  { expr: '0 0 1 * *', label: 'Midnight on the 1st of each month' },
  { expr: '30 2 * * SUN', label: 'Sundays at 2:30 AM' },
];

export default function CronParser({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [expression, setExpression] = useState('0 9 * * MON-FRI');
  const [referenceDate, setReferenceDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => parseCron(expression), [expression]);
  const runs = useMemo(() => {
    if (!parsed.ok) return [];
    const from = referenceDate ? new Date(referenceDate) : new Date();
    if (Number.isNaN(from.getTime())) return [];
    return getNextCronRuns(expression, from, 5);
  }, [parsed, expression, referenceDate]);

  const fromDate = useMemo(() => {
    const d = referenceDate ? new Date(referenceDate) : new Date();
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [referenceDate]);

  const copyRuns = async () => {
    try {
      await navigator.clipboard.writeText(runs.map((r) => r.toLocaleString()).join('\n'));
      setCopied(true);
      toast.success('Copied', 'The next run times are on your clipboard.');
      window.setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      toast.error('Copy Failed', 'Your browser blocked clipboard access.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="cron-parser-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Clock className="w-8 h-8 text-[#10b981]" />
            Cron Expression Checker
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Check a cron schedule and see exactly when it will run next — in plain English.
          </p>
        </div>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="cron-expression" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Cron Expression — minute hour day-of-month month day-of-week
          </label>
          <input
            id="cron-expression"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="0 9 * * MON-FRI"
            spellCheck={false}
            className="w-full text-base font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
          />
          <div className="flex flex-wrap gap-2">
            {SAMPLE_CRONS.map((s) => (
              <button
                key={s.expr}
                onClick={() => setExpression(s.expr)}
                title={s.label}
                className="text-xs font-mono font-semibold text-gray-300 bg-[#151515] border border-[#2a2a2a] hover:border-[#10b981]/50 rounded-full px-3 py-1 transition-colors cursor-pointer"
              >
                {s.expr}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="cron-from" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Calculate Runs From (local time)
          </label>
          <input
            id="cron-from"
            type="datetime-local"
            value={referenceDate}
            onChange={(e) => setReferenceDate(e.target.value)}
            className="w-full sm:w-72 text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] cursor-pointer [color-scheme:dark]"
          />
        </div>

        {parsed.ok ? (
          <>
            <div data-testid="cron-human" className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
              {parsed.human}
              <span className="block text-gray-300 mt-1">{describeNextRun(fromDate, runs[0])}</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Next 5 Runs</span>
                <button
                  onClick={copyRuns}
                  className="text-[11px] font-semibold text-[#10b981] hover:text-[#059669] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy Times'}
                </button>
              </div>
              {runs.length === 0 ? (
                <p className="text-sm text-amber-300">No runs in the next 4 years — this schedule may never match (for example, February 31).</p>
              ) : (
                <div data-testid="cron-runs" className="flex flex-col gap-1">
                  {runs.map((run, idx) => (
                    <div key={idx} className="flex gap-3 text-sm border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515]">
                      <span className="font-mono font-bold text-[#10b981]">#{idx + 1}</span>
                      <span className="text-gray-200">{run.toLocaleString()}</span>
                      <span className="text-gray-500 ml-auto hidden sm:inline">{run.toLocaleDateString(undefined, { weekday: 'long' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div data-testid="cron-error" className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3">
            <span className="font-bold">Invalid expression: </span>
            {parsed.error}
          </div>
        )}
      </div>
      <p className="text-[10px] text-gray-500 mt-3">
        Standard 5-field cron. When both day-of-month and day-of-week are restricted, a run happens when
        either one matches — the classic cron rule.
      </p>
    </div>
  );
}
