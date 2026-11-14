import React, { useEffect, useState } from 'react';
import {
  CalendarBlank,
  Clock,
  Plus,
  Trash,
  WarningCircle
} from '@phosphor-icons/react';
import { useToast } from './Toast';

export interface PlannerTask {
  id: string;
  title: string;
  /** Start time as "HH:MM" (24-hour). */
  start: string;
  /** End time as "HH:MM" (24-hour). */
  end: string;
  note?: string;
}

/** "HH:MM" -> minutes since midnight. Throws on bad input. */
export function timeToMinutes(time: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) throw new Error(`"${time}" is not a valid time (use HH:MM, 24-hour).`);
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTime(minutes: number): string {
  const clamped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Two tasks overlap when their time ranges share any minute (touching ends do not overlap). */
export function tasksOverlap(a: PlannerTask, b: PlannerTask): boolean {
  const aStart = timeToMinutes(a.start);
  const aEnd = timeToMinutes(a.end);
  const bStart = timeToMinutes(b.start);
  const bEnd = timeToMinutes(b.end);
  return aStart < bEnd && bStart < aEnd;
}

export function sortPlannerTasks(tasks: PlannerTask[]): PlannerTask[] {
  return [...tasks].sort((a, b) => {
    const diff = timeToMinutes(a.start) - timeToMinutes(b.start);
    if (diff !== 0) return diff;
    return timeToMinutes(a.end) - timeToMinutes(b.end);
  });
}

export function validatePlannerTask(title: string, start: string, end: string): string | null {
  if (!title.trim()) return 'Give the task a title.';
  let s: number;
  let e: number;
  try {
    s = timeToMinutes(start);
    e = timeToMinutes(end);
  } catch (err) {
    return err instanceof Error ? err.message : 'Invalid time.';
  }
  if (e <= s) return 'End time must be after the start time.';
  return null;
}

const STORAGE_KEY = 'omnitily:planner';

function loadTasks(): PlannerTask[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlannerTask[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t) => t && typeof t.title === 'string' && typeof t.start === 'string' && typeof t.end === 'string'
        && validatePlannerTask(t.title, t.start, t.end) === null
    );
  } catch (e) {
    return [];
  }
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function Planner({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [tasks, setTasks] = useState<PlannerTask[]>(() => loadTasks());
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [note, setNote] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {}
  }, [tasks]);

  const addTask = () => {
    const problem = validatePlannerTask(title, start, end);
    if (problem) {
      toast.error('Cannot Add Task', problem);
      return;
    }
    const next: PlannerTask = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      start,
      end,
      note: note.trim() || undefined,
    };
    const conflict = tasks.find((t) => tasksOverlap(t, next));
    if (conflict) {
      toast.warning(
        'Overlapping Time',
        `"${next.title}" overlaps "${conflict.title}" (${conflict.start}–${conflict.end}). Added anyway.`
      );
    } else {
      toast.success('Task Added', `"${next.title}" scheduled ${next.start}–${next.end}.`);
    }
    setTasks((prev) => sortPlannerTasks([...prev, next]));
    setTitle('');
    setNote('');
  };

  const removeTask = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const clearTasks = () => setTasks([]);

  const sorted = sortPlannerTasks(tasks);
  const totalMinutes = tasks.reduce((sum, t) => sum + (timeToMinutes(t.end) - timeToMinutes(t.start)), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalRemainder = totalMinutes % 60;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="planner-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <CalendarBlank className="w-8 h-8 text-[#10b981]" />
            Hourly Daily Task Planner
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Plan your day in time blocks, spot overlapping tasks, and see everything on one timeline. Saved on this device only.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <h2 className="font-sans text-lg text-white">Add a Task</h2>
          <div className="flex flex-col gap-1">
            <label htmlFor="planner-title" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Task</label>
            <input
              id="planner-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Team standup"
              className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="planner-start" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Start</label>
              <input
                id="planner-start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="planner-end" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">End</label>
              <input
                id="planner-end"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="planner-note" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Note (optional)</label>
            <input
              id="planner-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Bring the report"
              className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
            />
          </div>
          <button
            onClick={addTask}
            className="w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
          <p className="text-[10px] text-gray-500 flex items-start gap-1.5">
            <WarningCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            Overlapping tasks are allowed but flagged — the timeline shows the clash.
          </p>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-sans text-lg text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#10b981]" /> Today&apos;s Schedule
              </h2>
              <span className="text-xs text-gray-400">
                {sorted.length} task{sorted.length === 1 ? '' : 's'} &middot; {totalHours}h {String(totalRemainder).padStart(2, '0')}m planned
              </span>
            </div>
            {sorted.length === 0 ? (
              <p className="text-gray-500 text-sm">No tasks yet. Add your first block — for example, &ldquo;Deep work&rdquo; from 09:00 to 10:30.</p>
            ) : (
              <ul data-testid="planner-task-list" className="flex flex-col gap-2">
                {sorted.map((task) => {
                  const conflict = sorted.some((other) => other.id !== task.id && tasksOverlap(task, other));
                  return (
                    <li
                      key={task.id}
                      className={`flex items-start justify-between gap-3 border rounded-lg px-4 py-3 bg-[#151515] ${
                        conflict ? 'border-amber-900/60' : 'border-[#2a2a2a]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{task.title}</span>
                          <span className="text-xs font-mono font-bold text-emerald-300">{task.start} – {task.end}</span>
                          {conflict && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-900/50 rounded px-1.5 py-0.5 uppercase tracking-wider">Overlaps</span>
                          )}
                        </div>
                        {task.note && <p className="text-xs text-gray-500 mt-0.5">{task.note}</p>}
                      </div>
                      <button
                        onClick={() => removeTask(task.id)}
                        aria-label={`Remove ${task.title}`}
                        className="p-1.5 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {sorted.length > 0 && (
              <button onClick={clearTasks} className="mt-4 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer">
                Clear all tasks
              </button>
            )}
          </div>

          {/* Day timeline */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Day Timeline (24h)</span>
            <div className="flex flex-col gap-1" data-testid="planner-timeline">
              {HOURS.map((hour) => {
                const hourTasks = sorted.filter((t) => {
                  const s = timeToMinutes(t.start);
                  const e = timeToMinutes(t.end);
                  return s < (hour + 1) * 60 && e > hour * 60;
                });
                return (
                  <div key={hour} className="flex items-center gap-3 text-xs">
                    <span className="w-10 shrink-0 font-mono text-gray-500 text-right">{String(hour).padStart(2, '0')}:00</span>
                    <div className="flex-1 h-6 rounded bg-[#151515] border border-[#1f1f1f] overflow-hidden flex items-center px-2">
                      {hourTasks.length > 0 ? (
                        <span className="truncate text-emerald-300 font-semibold">
                          {hourTasks.map((t) => t.title).join(' / ')}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
