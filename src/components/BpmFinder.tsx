import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Download,
  HandTap,
  MusicNotes,
  Pulse,
  Sliders,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { formatFileSize } from '../lib/imageTools';
import { validateVideoMediaFile } from '../lib/toolTransforms';

export interface BpmFinderProps {
  onBack: () => void;
  initialFile?: File;
}

export const BPM_MIN = 40;
export const BPM_MAX = 220;

/**
 * BPM from a series of tap timestamps (ms). Uses the median interval so one
 * mistimed tap does not wreck the reading. Needs at least 2 taps.
 */
export function bpmFromTapTimes(tapTimesMs: number[]): { bpm: number; taps: number } | null {
  if (!Array.isArray(tapTimesMs) || tapTimesMs.length < 2) return null;
  const intervals: number[] = [];
  for (let i = 1; i < tapTimesMs.length; i++) {
    const dt = tapTimesMs[i] - tapTimesMs[i - 1];
    if (Number.isFinite(dt) && dt >= 100 && dt <= 3000) intervals.push(dt);
  }
  if (intervals.length === 0) return null;
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const bpm = 60000 / median;
  if (!Number.isFinite(bpm)) return null;
  return { bpm: Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm))), taps: tapTimesMs.length };
}

/**
 * Onset-strength envelope: RMS energy per hop, half-wave-rectified difference.
 * Peaks mark note onsets / drum hits.
 */
export function computeOnsetEnvelope(
  data: Float32Array,
  hopSize = 512
): Float32Array {
  const frames = Math.max(0, Math.floor(data.length / hopSize));
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const start = f * hopSize;
    for (let i = 0; i < hopSize; i++) {
      const s = data[start + i] ?? 0;
      sum += s * s;
    }
    energy[f] = Math.sqrt(sum / hopSize);
  }
  const flux = new Float32Array(frames);
  for (let f = 1; f < frames; f++) {
    flux[f] = Math.max(0, energy[f] - energy[f - 1]);
  }
  return flux;
}

/**
 * Estimate BPM by autocorrelating the onset envelope over lags for 40–220
 * BPM. Among near-tied lags the fastest tempo is preferred, which corrects
 * the common half-tempo octave error (a 120 BPM track read as 60).
 * Returns null when there is no usable periodic signal.
 */
export function estimateBpm(
  flux: Float32Array,
  sampleRate: number,
  hopSize = 512
): { bpm: number; confidence: number } | null {
  if (!flux || flux.length < 32 || !Number.isFinite(sampleRate) || sampleRate <= 0) {
    return null;
  }
  const fps = sampleRate / hopSize; // envelope frames per second
  const minLag = Math.max(1, Math.floor((fps * 60) / BPM_MAX));
  const maxLag = Math.min(flux.length - 1, Math.ceil((fps * 60) / BPM_MIN));
  if (maxLag <= minLag) return null;

  // Mean-remove the envelope so the autocorrelation is not DC-dominated.
  let mean = 0;
  let maxFlux = 0;
  for (let i = 0; i < flux.length; i++) {
    mean += flux[i];
    if (flux[i] > maxFlux) maxFlux = flux[i];
  }
  mean /= flux.length;
  // Guard: a steady tone has only tiny ripple in its flux (max ≈ 3x the
  // mean), while real onsets spike far above the mean (50x+). Without this
  // the ripple itself autocorrelates and invents a tempo.
  if (maxFlux < 10 * mean || maxFlux <= 0) return null;
  let energy = 0;
  for (let i = 0; i < flux.length; i++) {
    const v = flux[i] - mean;
    energy += v * v;
  }
  if (energy <= 1e-12) return null;

  const scores = new Float32Array(maxLag + 1);
  let bestLag = minLag;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let dot = 0;
    const count = flux.length - lag;
    for (let i = 0; i < count; i++) {
      dot += (flux[i] - mean) * (flux[i + lag] - mean);
    }
    const score = dot / energy;
    scores[lag] = score;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  if (!Number.isFinite(bestScore) || bestScore <= 0.02) return null;

  // Octave correction: the true period is fractional in envelope frames,
  // so its score is smeared across neighbouring lags and the double-period
  // lag can outscore it. If the half-period lag still correlates well
  // (>= half the best score), the tempo is the faster one. A genuine slow
  // track scores ~0 at half its period, so this never invents a faster tempo.
  let chosenLag = bestLag;
  let currentBest = bestScore;
  for (;;) {
    const half = chosenLag / 2;
    if (half < minLag) break;
    const candidates = [Math.floor(half), Math.ceil(half)];
    let halfScore = -Infinity;
    let halfLag = -1;
    for (const candidate of candidates) {
      if (candidate >= minLag && candidate <= maxLag && scores[candidate] > halfScore) {
        halfScore = scores[candidate];
        halfLag = candidate;
      }
    }
    if (halfLag < 0 || halfScore < currentBest * 0.5) break;
    chosenLag = halfLag;
    currentBest = halfScore;
  }

  // Parabolic interpolation around the chosen lag: the true period is
  // fractional in envelope frames, so the integer lag alone reads ~1 BPM
  // off. This recovers the sub-frame period.
  let refinedLag = chosenLag;
  if (chosenLag > minLag && chosenLag < maxLag) {
    const s0 = scores[chosenLag - 1];
    const s1 = scores[chosenLag];
    const s2 = scores[chosenLag + 1];
    const denom = s0 - 2 * s1 + s2;
    if (Number.isFinite(denom) && Math.abs(denom) > 1e-9) {
      const delta = 0.5 * (s0 - s2) / denom;
      if (Number.isFinite(delta) && Math.abs(delta) <= 1) {
        refinedLag = chosenLag + delta;
      }
    }
  }
  const bpm = Math.round((60 * fps) / refinedLag);
  return {
    bpm: Math.min(BPM_MAX, Math.max(BPM_MIN, bpm)),
    confidence: Math.min(1, Math.max(0, bestScore)),
  };
}

/** Build a synthetic click train (used by tests and the demo). */
export function buildClickTrain(
  bpm: number,
  seconds: number,
  sampleRate: number
): Float32Array {
  const length = Math.max(1, Math.round(seconds * sampleRate));
  const out = new Float32Array(length);
  const periodSamples = (60 / bpm) * sampleRate;
  const clickLen = Math.min(2000, Math.round(0.02 * sampleRate));
  for (let beat = 0; ; beat++) {
    const start = Math.round(beat * periodSamples);
    if (start >= length) break;
    for (let i = 0; i < clickLen && start + i < length; i++) {
      out[start + i] = Math.sin((2 * Math.PI * 1200 * i) / sampleRate) * (1 - i / clickLen);
    }
  }
  return out;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getAudioContext(): AudioContext | null {
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  return new Ctor();
}

/**
 * Tap Tempo & BPM Counter.
 *
 * Two real methods: tap along to a track, or drop an audio file in for an
 * onset-autocorrelation estimate. The file analysis works best on percussive
 * music with a clear beat; ambient, rubato, or speech-heavy audio has weak
 * onsets and the tool says so via its confidence score instead of faking a
 * precise answer.
 */
export default function BpmFinder({ onBack, initialFile }: BpmFinderProps) {
  const toast = useToast();
  const [mode, setMode] = useState<'tap' | 'analyze'>('tap');
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [tapBpm, setTapBpm] = useState<{ bpm: number; taps: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [analysis, setAnalysis] = useState<{ bpm: number; confidence: number } | null>(null);
  const [duration, setDuration] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const decodedRef = useRef<Float32Array | null>(null);
  const decodedRateRef = useRef(0);
  const tapTimesRef = useRef<number[]>([]);

  useEffect(() => {
    tapTimesRef.current = tapTimes;
  }, [tapTimes]);

  useEffect(() => {
    return () => {
      try {
        void audioCtxRef.current?.close();
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
    if (initialFile) {
      void handleFiles([initialFile]);
    }
  }, [initialFile]);

  const handleTap = () => {
    const now = Date.now();
    const next = [...tapTimesRef.current, now].slice(-16);
    tapTimesRef.current = next;
    setTapTimes(next);
    const result = bpmFromTapTimes(next);
    if (result) setTapBpm(result);
  };

  const resetTaps = () => {
    tapTimesRef.current = [];
    setTapTimes([]);
    setTapBpm(null);
  };

  const handleFiles = async (fileList: File[]) => {
    const selected = fileList[0];
    if (!selected) return;
    const validation = validateVideoMediaFile(selected, ['audio']);
    if (!validation.ok) {
      toast.error('Unsupported File', validation.message);
      return;
    }
    setIsDecoding(true);
    setAnalysis(null);
    try {
      if (!audioCtxRef.current) audioCtxRef.current = getAudioContext();
      const ctx = audioCtxRef.current;
      if (!ctx) {
        toast.error('Audio Unsupported', 'This browser cannot decode audio (no Web Audio API).');
        return;
      }
      const arrayBuffer = await selected.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      // Mix down to mono for the onset analysis.
      const mono = new Float32Array(buffer.length);
      const channels = buffer.numberOfChannels;
      for (let ch = 0; ch < channels; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < buffer.length; i++) mono[i] += data[i] / channels;
      }
      decodedRef.current = mono;
      decodedRateRef.current = buffer.sampleRate;
      setFile(selected);
      setDuration(buffer.duration);
    } catch (err) {
      console.error('BPM decode failed:', err);
      toast.error('Decode Failed', `"${selected.name}" could not be decoded by this browser.`);
    } finally {
      setIsDecoding(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    decodedRef.current = null;
    setAnalysis(null);
    setDuration(0);
  };

  const handleAnalyze = () => {
    const mono = decodedRef.current;
    if (!mono || !file) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      try {
        const flux = computeOnsetEnvelope(mono, 512);
        const result = estimateBpm(flux, decodedRateRef.current, 512);
        if (result) {
          setAnalysis(result);
          try {
            confetti({ particleCount: 60, spread: 50 });
          } catch (e) {}
          toast.success(
            'Tempo Found',
            result.confidence >= 0.5
              ? `Estimated ${result.bpm} BPM (${Math.round(result.confidence * 100)}% confidence).`
              : `Weak beat detected — best guess ${result.bpm} BPM, only ${Math.round(result.confidence * 100)}% confidence. Try a more percussive track.`
          );
        } else {
          setAnalysis(null);
          toast.error(
            'No Beat Found',
            'No periodic beat could be detected in this audio. It works best on percussive music with a steady tempo.'
          );
        }
      } catch (err) {
        console.error('BPM analysis failed:', err);
        toast.error('Analysis Failed', err instanceof Error ? err.message : 'The tempo could not be analyzed.');
      } finally {
        setIsAnalyzing(false);
      }
    }, 50);
  };

  const downloadReport = () => {
    if (!analysis || !file) return;
    const text = [
      `BPM Analysis — ${file.name}`,
      `Estimated tempo: ${analysis.bpm} BPM`,
      `Confidence: ${Math.round(analysis.confidence * 100)}%`,
      `Track duration: ${formatTime(duration)}`,
      `Method: onset-envelope autocorrelation (client-side, no upload)`,
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace(/\.[^.]+$/, '')}_bpm.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch (e) {}
    }, 1000);
  };

  const tapBpmValue = tapBpm?.bpm ?? null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="bpm-finder-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Pulse className="w-8 h-8 text-[#10b981]" />
            Tap Tempo &amp; BPM Counter
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Tap along to any track, or drop an audio file in for an automatic beat analysis. Everything runs locally.
          </p>
        </div>
      </div>

      <div className="flex border border-[#1a1a1a] bg-[#0d0d0d] p-1 rounded-lg max-w-md w-full mb-8">
        <button
          onClick={() => setMode('tap')}
          className={`flex-1 py-2 rounded font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            mode === 'tap' ? 'bg-[#10b981] text-[#0a0a0a]' : 'text-gray-400 hover:text-white bg-transparent'
          }`}
        >
          Tap Tempo
        </button>
        <button
          onClick={() => setMode('analyze')}
          className={`flex-1 py-2 rounded font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            mode === 'analyze' ? 'bg-[#10b981] text-[#0a0a0a]' : 'text-gray-400 hover:text-white bg-transparent'
          }`}
        >
          Analyze Audio File
        </button>
      </div>

      {mode === 'tap' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
            <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a]">
              <Sliders className="w-5 h-5 text-[#10b981]" />
              <h2 className="font-sans text-lg text-white">How To Tap</h2>
            </div>
            <ol className="text-xs text-gray-400 leading-relaxed list-decimal list-inside flex flex-col gap-2">
              <li>Play your track on any device.</li>
              <li>Tap the big button on every beat — at least 4 taps.</li>
              <li>The median interval is used, so one mistimed tap won&apos;t wreck the reading.</li>
              <li>Keep tapping to refine it; reset to start over.</li>
            </ol>
            <button
              onClick={resetTaps}
              disabled={tapTimes.length === 0}
              className="text-xs font-semibold text-gray-400 hover:text-white border border-[#2a2a2a] rounded px-3 py-2 transition-colors cursor-pointer disabled:opacity-40"
            >
              Reset Taps
            </button>
          </div>
          <div className="lg:col-span-2 flex flex-col items-center gap-6 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-8 shadow-sm">
            <div className="text-center">
              <div className="text-6xl font-mono font-bold text-white tabular-nums" data-testid="tap-bpm-value">
                {tapBpmValue ?? '—'}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Beats Per Minute</div>
              <div className="text-xs text-gray-500 mt-2">
                {tapTimes.length === 0
                  ? 'Tap the button to the beat'
                  : `${tapTimes.length} tap${tapTimes.length > 1 ? 's' : ''} recorded${tapBpm ? ` · median interval ${Math.round(60000 / tapBpm.bpm)} ms` : ''}`}
              </div>
            </div>
            <button
              onClick={handleTap}
              aria-label="Tap to the beat"
              className="w-56 h-56 rounded-full bg-[#10b981] hover:bg-[#059669] active:scale-95 text-[#0a0a0a] font-bold text-xl uppercase tracking-widest shadow-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <HandTap className="w-10 h-10" />
              Tap
            </button>
            <div className="flex gap-1.5 flex-wrap justify-center max-w-xs" aria-label="Tap history">
              {tapTimes.slice(-16).map((t, i) => (
                <span key={`${t}-${i}`} className="w-2.5 h-2.5 rounded-full bg-[#10b981]/60" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
            <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a]">
              <Sliders className="w-5 h-5 text-[#10b981]" />
              <h2 className="font-sans text-lg text-white">File Analysis</h2>
            </div>
            {file && (
              <div className="bg-[#151515] border border-[#2a2a2a] rounded p-3 text-xs flex flex-col gap-1.5 text-gray-400 font-medium font-mono">
                <div><span className="font-bold text-gray-300">Track:</span> {file.name}</div>
                <div><span className="font-bold text-gray-300">Duration:</span> {formatTime(duration)}</div>
                <div><span className="font-bold text-gray-300">Size:</span> {formatFileSize(file.size)}</div>
              </div>
            )}
            <button
              onClick={handleAnalyze}
              disabled={!file || isAnalyzing || isDecoding}
              className={`w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !file
                  ? 'bg-[#151515] text-gray-600 border border-[#2a2a2a] cursor-not-allowed shadow-none'
                  : 'bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Analyzing…
                </>
              ) : (
                <>
                  <Pulse className="w-4 h-4" /> Detect BPM
                </>
              )}
            </button>
            {analysis && (
              <div className="flex flex-col gap-2">
                <div className="bg-emerald-950/20 text-emerald-300 rounded p-3 text-xs flex items-center gap-2 border border-emerald-900/40">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">
                    {analysis.bpm} BPM · {Math.round(analysis.confidence * 100)}% confidence
                  </span>
                </div>
                {analysis.confidence < 0.5 && (
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3">
                    <WarningCircle className="w-4 h-4 shrink-0" />
                    Low confidence — this track may have a weak or unsteady beat. The number is a best guess, not a measurement.
                  </div>
                )}
                <button
                  onClick={downloadReport}
                  className="w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download BPM Report
                </button>
              </div>
            )}
            <p className="text-[11px] text-gray-500 leading-relaxed">
              The analyzer measures onsets (drum hits, note attacks) and autocorrelates them —
              it finds the repeating period of the beat. Best on percussive music with a steady
              tempo; ambient or rubato audio reports low confidence instead of a fake precise number.
            </p>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files) void handleFiles(Array.from(e.dataTransfer.files));
                }}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Upload an audio track to analyze. Drop a file or press Enter to browse."
                className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[220px] focus:outline-none focus:border-[#10b981]/70 ${
                  isDragging ? 'border-[#10b981] bg-[#10b981]/10' : 'border-[#2a2a2a] hover:border-[#10b981]/40 bg-[#0d0d0d]'
                }`}
              >
                <input
                  id="bpm-finder-file-input"
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files) void handleFiles(Array.from(e.target.files));
                    e.target.value = '';
                  }}
                  accept="audio/*"
                  aria-label="Choose an audio track to analyze"
                  className="hidden"
                />
                <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-3 group-hover:scale-105 transition-transform text-[#10b981]">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-white font-sans text-base">Drag &amp; drop a track</h3>
                <p className="text-gray-500 text-xs mt-1 mb-3">MP3, WAV, OGG, M4A — percussive music with a steady beat works best</p>
                <span className="text-[11px] font-bold text-[#0a0a0a] bg-[#10b981] px-3 py-1.5 rounded uppercase tracking-wider hover:bg-[#059669] transition-all">
                  Select File
                </span>
              </div>
            ) : (
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-xl text-[#10b981]">
                    <MusicNotes className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{file.name}</div>
                    <div className="text-xs text-gray-500 font-mono">
                      {formatTime(duration)} · {formatFileSize(file.size)}
                    </div>
                  </div>
                  <button
                    onClick={clearFile}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                {isDecoding && (
                  <div className="flex items-center gap-2 text-[#10b981] text-xs font-semibold">
                    <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Decoding audio…
                  </div>
                )}
                {analysis && (
                  <div className="text-center py-4 border-t border-[#2a2a2a]">
                    <div className="text-6xl font-mono font-bold text-white tabular-nums" data-testid="analysis-bpm-value">
                      {analysis.bpm}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Beats Per Minute</div>
                    <div className="text-xs text-gray-500 mt-2">
                      Confidence {Math.round(analysis.confidence * 100)}% · beat every {(60 / analysis.bpm).toFixed(2)}s
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
