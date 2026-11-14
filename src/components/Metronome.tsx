import React, { useEffect, useRef, useState } from 'react';
import {
  HandTap,
  Pause,
  Play,
  Sliders,
  Stop,
  Timer
} from '@phosphor-icons/react';
import { useToast } from './Toast';
import { bpmFromTapTimes } from './BpmFinder';

export interface MetronomeProps {
  onBack: () => void;
}

export const METRONOME_MIN_BPM = 40;
export const METRONOME_MAX_BPM = 208;

/** Milliseconds between beats at a given BPM. */
export function beatIntervalMs(bpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) return 0;
  return 60000 / bpm;
}

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return 120;
  return Math.min(METRONOME_MAX_BPM, Math.max(METRONOME_MIN_BPM, Math.round(bpm)));
}

/**
 * Beat schedule: given a start time (AudioContext clock), a BPM and a count,
 * return the absolute times of the next N beats. Pure — used by the scheduler
 * and by tests.
 */
export function nextBeatTimes(startTimeSeconds: number, bpm: number, count: number): number[] {
  const interval = beatIntervalMs(bpm) / 1000;
  if (interval <= 0 || count <= 0) return [];
  const times: number[] = [];
  for (let i = 0; i < count; i++) {
    times.push(startTimeSeconds + i * interval);
  }
  return times;
}

/** True when this beat (0-based) is the accented downbeat of its bar. */
export function isDownbeat(beatIndex: number, beatsPerBar: number): boolean {
  if (!Number.isFinite(beatsPerBar) || beatsPerBar < 1) return beatIndex === 0;
  return beatIndex % Math.floor(beatsPerBar) === 0;
}

const BEATS_PER_BAR_OPTIONS = [2, 3, 4, 6];

/**
 * Rhythm & Tempo Metronome — a lookahead-scheduled click clock.
 * Accent click 1568 Hz, regular click 1046 Hz, short gain envelope.
 * Visual flash follows the same beat counter the audio scheduler advances.
 */
export default function Metronome({ onBack }: MetronomeProps) {
  const toast = useToast();
  const [bpm, setBpm] = useState(120);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [accentFirst, setAccentFirst] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isRunning, setIsRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [tapCount, setTapCount] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextNoteTimeRef = useRef(0);
  const beatRef = useRef(0);
  const volumeRef = useRef(volume);
  const bpmRef = useRef(bpm);
  const beatsPerBarRef = useRef(beatsPerBar);
  const accentFirstRef = useRef(accentFirst);
  const runningRef = useRef(false);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    beatsPerBarRef.current = beatsPerBar;
  }, [beatsPerBar]);

  useEffect(() => {
    accentFirstRef.current = accentFirst;
  }, [accentFirst]);

  useEffect(() => {
    return () => {
      stopMetronome();
      try {
        void audioCtxRef.current?.close();
      } catch (e) {}
    };
  }, []);

  const getAudioContext = (): AudioContext | null => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtxRef.current = new Ctor();
    return audioCtxRef.current;
  };

  const scheduleClick = (ctx: AudioContext, time: number, downbeat: boolean) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = downbeat ? 1568 : 1046;
    osc.type = 'sine';
    const vol = volumeRef.current;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.09);
  };

  const scheduleAhead = () => {
    const ctx = audioCtxRef.current;
    if (!ctx || !runningRef.current) return;
    // Schedule everything due in the next 120 ms.
    while (nextNoteTimeRef.current < ctx.currentTime + 0.12) {
      const time = nextNoteTimeRef.current;
      const beatIndex = beatRef.current;
      const downbeat = accentFirstRef.current && isDownbeat(beatIndex, beatsPerBarRef.current);
      scheduleClick(ctx, time, downbeat);
      // Flash the UI on the beat (slightly delayed so it lines up audibly).
      const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
      const capturedBeat = beatIndex;
      window.setTimeout(() => {
        if (runningRef.current) setCurrentBeat(capturedBeat);
      }, delayMs);
      nextNoteTimeRef.current += beatIntervalMs(bpmRef.current) / 1000;
      beatRef.current += 1;
    }
  };

  const startMetronome = async () => {
    const ctx = getAudioContext();
    if (!ctx) {
      toast.error('Audio Unsupported', 'This browser cannot play metronome clicks (no Web Audio API).');
      return;
    }
    try {
      if (ctx.state === 'suspended') await ctx.resume();
    } catch (e) {}
    beatRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.06;
    runningRef.current = true;
    setIsRunning(true);
    setCurrentBeat(0);
    scheduleAhead();
    timerRef.current = setInterval(scheduleAhead, 25);
  };

  const stopMetronome = () => {
    runningRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    setCurrentBeat(-1);
  };

  const handleTap = () => {
    const now = Date.now();
    const next = [...tapHistoryRef.current, now].slice(-8);
    tapHistoryRef.current = next;
    setTapCount(next.length);
    const result = bpmFromTapTimes(next);
    if (result) {
      setBpm(clampBpm(result.bpm));
      toast.info('Tap Tempo', `Set to ${clampBpm(result.bpm)} BPM from your taps.`);
    }
  };

  const tapHistoryRef = useRef<number[]>([]);

  const beatInBar = currentBeat >= 0 ? currentBeat % beatsPerBar : -1;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="metronome-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Timer className="w-8 h-8 text-[#10b981]" />
            Rhythm &amp; Tempo Metronome
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Keep perfect time with a customizable tick clock for instrument practice. Runs entirely in your browser.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a]">
            <Sliders className="w-5 h-5 text-[#10b981]" />
            <h2 className="font-sans text-lg text-white">Tempo Settings</h2>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label htmlFor="metronome-bpm" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tempo (BPM)</label>
              <span className="text-xs font-bold text-[#10b981]">{bpm} BPM</span>
            </div>
            <input
              id="metronome-bpm"
              type="range"
              min={METRONOME_MIN_BPM}
              max={METRONOME_MAX_BPM}
              step="1"
              value={bpm}
              onChange={(e) => setBpm(clampBpm(parseInt(e.target.value, 10)))}
              className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>40 · Largo</span>
              <span>120 · Moderato</span>
              <span>208 · Prestissimo</span>
            </div>
            <div className="flex gap-2 mt-1">
              <input
                type="number"
                aria-label="Tempo in beats per minute"
                min={METRONOME_MIN_BPM}
                max={METRONOME_MAX_BPM}
                value={bpm}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  if (Number.isFinite(parsed)) setBpm(clampBpm(parsed));
                }}
                className="w-24 text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
              />
              <button
                onClick={handleTap}
                className="flex-1 py-2 px-3 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-300 bg-[#151515] hover:border-[#10b981]/40 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                aria-label="Tap to set tempo"
              >
                <HandTap className="w-4 h-4" /> Tap Tempo{tapCount > 1 ? ` (${tapCount})` : ''}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Beats Per Bar</label>
            <div className="grid grid-cols-4 gap-2">
              {BEATS_PER_BAR_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setBeatsPerBar(n)}
                  className={`py-2 px-2 text-xs font-semibold rounded border transition-all cursor-pointer ${
                    beatsPerBar === n
                      ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                      : 'border-[#2a2a2a] hover:border-[#10b981]/40 text-gray-400 bg-transparent'
                  }`}
                >
                  {n}/4
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={accentFirst}
              onChange={(e) => setAccentFirst(e.target.checked)}
              className="accent-[#10b981] w-4 h-4 cursor-pointer"
            />
            Accent the first beat of each bar (higher click)
          </label>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label htmlFor="metronome-volume" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Click Volume</label>
              <span className="text-xs font-bold text-[#10b981]">{Math.round(volume * 100)}%</span>
            </div>
            <input
              id="metronome-volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
            />
          </div>

          <div className="bg-[#151515] border border-[#2a2a2a] rounded p-3 text-xs flex flex-col gap-1.5 text-gray-400 font-medium font-mono">
            <div><span className="font-bold text-gray-300">Beat interval:</span> {beatIntervalMs(bpm).toFixed(0)} ms</div>
            <div><span className="font-bold text-gray-300">Bar:</span> {beatsPerBar} beats · {(beatIntervalMs(bpm) * beatsPerBar / 1000).toFixed(2)}s per bar</div>
          </div>

          {!isRunning ? (
            <button
              onClick={() => void startMetronome()}
              className="w-full py-3 px-4 bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" /> Start Metronome
            </button>
          ) : (
            <button
              onClick={stopMetronome}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Stop className="w-4 h-4" /> Stop
            </button>
          )}
        </div>

        <div className="lg:col-span-2 flex flex-col items-center justify-center gap-8 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-8 shadow-sm min-h-[320px]">
          <div className="flex items-center gap-4" aria-label="Beat indicator">
            {Array.from({ length: beatsPerBar }, (_, i) => (
              <div
                key={i}
                data-testid={`metronome-beat-${i}`}
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all duration-75 ${
                  currentBeat >= 0 && beatInBar === i
                    ? i === 0 && accentFirst
                      ? 'bg-[#10b981] border-[#10b981] text-[#0a0a0a] scale-110'
                      : 'bg-[#10b981]/70 border-[#10b981] text-[#0a0a0a] scale-110'
                    : 'bg-[#151515] border-[#2a2a2a] text-gray-500'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div className="text-center">
            <div className="text-5xl font-mono font-bold text-white tabular-nums" data-testid="metronome-bpm-display">
              {bpm}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">BPM · {beatsPerBar}/4 time</div>
            <div className="text-sm text-gray-400 mt-3">
              {isRunning ? (
                <>
                  Beat {currentBeat + 1} · {beatInBar === 0 && accentFirst ? 'downbeat' : `beat ${beatInBar + 1} of ${beatsPerBar}`}
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 inline mr-1" /> Stopped — press Start to begin
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
