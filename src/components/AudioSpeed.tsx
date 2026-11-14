import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Download,
  Gauge,
  MusicNotes,
  Pause,
  Play,
  Sliders,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { formatFileSize } from '../lib/imageTools';
import { encodeWavPcm16, validateVideoMediaFile } from '../lib/toolTransforms';

export interface AudioSpeedProps {
  onBack: () => void;
  initialFile?: File;
}

export const SPEED_MIN = 0.5;
export const SPEED_MAX = 2.0;

export function clampSpeed(rate: number): number {
  if (!Number.isFinite(rate)) return 1;
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, rate));
}

export function formatSpeed(rate: number): string {
  return `${clampSpeed(rate).toFixed(2)}x`;
}

export function expectedOutputDuration(inputSeconds: number, rate: number): number {
  if (!Number.isFinite(inputSeconds) || inputSeconds <= 0) return 0;
  return inputSeconds / clampSpeed(rate);
}

/**
 * WSOLA (Waveform Similarity Overlap-Add) time-stretch of one channel.
 *
 * Changes tempo WITHOUT changing pitch: the output keeps the original
 * frequencies while its duration becomes input / rate. Each output frame is
 * overlap-added from the input at a position chosen by searching nearby for
 * the best waveform match, so periodic signals stay continuous. This is a
 * real pitch-preserving stretch — not a resample — but it is a basic WSOLA,
 * so dense polyphonic mixes can smear slightly at extreme rates.
 */
export function timeStretchWsola(
  input: Float32Array,
  rate: number,
  sampleRate: number
): Float32Array {
  const safeRate = clampSpeed(rate);
  if (input.length === 0) return new Float32Array(0);
  if (safeRate === 1) return input.slice();

  const WINDOW = 2048;
  const SYNTH_HOP = 512;
  const ANALYSIS_HOP = Math.max(1, Math.round(SYNTH_HOP * safeRate));
  const TOLERANCE = 256;
  const COMPARE = 512; // samples used to score candidate alignment

  // Hann window
  const win = new Float32Array(WINDOW);
  for (let i = 0; i < WINDOW; i++) {
    win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (WINDOW - 1)));
  }

  const targetLength = Math.max(1, Math.round(input.length / safeRate));
  const capacity = targetLength + WINDOW;
  const out = new Float32Array(capacity);
  const norm = new Float32Array(capacity);

  let inPos = 0;
  let outPos = 0;
  let firstFrame = true;

  const addFrame = (srcPos: number, dstPos: number) => {
    for (let i = 0; i < WINDOW; i++) {
      const src = srcPos + i;
      if (src >= input.length) break;
      const dst = dstPos + i;
      if (dst >= capacity) break;
      const w = win[i];
      out[dst] += input[src] * w;
      norm[dst] += w;
    }
  };

  while (inPos + WINDOW <= input.length && outPos + WINDOW <= capacity) {
    if (firstFrame) {
      addFrame(inPos, outPos);
      firstFrame = false;
    } else {
      const expected = inPos + ANALYSIS_HOP;
      // Search around the expected position for the best-matching segment.
      let bestDelta = 0;
      let bestScore = -Infinity;
      const lo = Math.max(0, expected - TOLERANCE);
      const hi = Math.min(input.length - WINDOW, expected + TOLERANCE);
      for (let cand = lo; cand <= hi; cand++) {
        let dot = 0;
        let energyIn = 0;
        let energyOut = 0;
        for (let i = 0; i < COMPARE; i++) {
          const a = input[cand + i];
          const b = out[outPos + i];
          dot += a * b;
          energyIn += a * a;
          energyOut += b * b;
        }
        const denom = Math.sqrt(energyIn * energyOut);
        const score = denom > 1e-12 ? dot / denom : 0;
        if (score > bestScore) {
          bestScore = score;
          bestDelta = cand - expected;
        }
      }
      // Overlap-add the chosen frame at the current synthesis position:
      // its first samples overlap the previous frame's tail (the region the
      // correlation search just scored), keeping periodic signals continuous.
      const chosen = expected + bestDelta;
      for (let i = 0; i < WINDOW; i++) {
        const src = chosen + i;
        if (src >= input.length) break;
        const dst = outPos + i;
        if (dst >= capacity) break;
        const w = win[i];
        out[dst] += input[src] * w;
        norm[dst] += w;
      }
      inPos = chosen;
    }
    outPos += SYNTH_HOP;
  }

  // Normalize by the accumulated window weights and trim to target length.
  const result = new Float32Array(targetLength);
  for (let i = 0; i < targetLength; i++) {
    result[i] = norm[i] > 1e-6 ? out[i] / norm[i] : 0;
  }
  return result;
}

/** Apply WSOLA to every channel of a decoded buffer. Pure. */
export function timeStretchChannels(
  channels: Float32Array[],
  rate: number,
  sampleRate: number
): Float32Array[] {
  return channels.map((ch) => timeStretchWsola(ch, rate, sampleRate));
}

/** Estimate the dominant frequency of a (near-)periodic signal via zero crossings. */
export function dominantFrequencyByZeroCrossing(data: Float32Array, sampleRate: number): number {
  let crossings = 0;
  for (let i = 1; i < data.length; i++) {
    if ((data[i - 1] < 0 && data[i] >= 0) || (data[i - 1] >= 0 && data[i] < 0)) {
      crossings++;
    }
  }
  const seconds = data.length / sampleRate;
  if (seconds <= 0 || crossings < 2) return 0;
  return crossings / 2 / seconds;
}

export function buildSpeedFileName(originalName: string, rate: number): string {
  const base = (originalName.replace(/\.[^.]+$/, '') || 'audio').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${base}_${formatSpeed(rate).replace('.', 'p')}.wav`;
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

const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

/**
 * Audio speed changer — WSOLA time-stretch, pitch preserved.
 * Output is a 16-bit WAV. See timeStretchWsola for the honest quality note.
 */
export default function AudioSpeed({ onBack, initialFile }: AudioSpeedProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [channels, setChannels] = useState<Float32Array[] | null>(null);
  const [sampleRate, setSampleRate] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1.25);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultDuration, setResultDuration] = useState(0);
  const [playing, setPlaying] = useState<'original' | 'result' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const originalUrlRef = useRef('');
  const resultUrlRef = useRef('');
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    resultUrlRef.current = resultUrl;
  }, [resultUrl]);

  useEffect(() => {
    return () => {
      if (originalUrlRef.current) {
        try { URL.revokeObjectURL(originalUrlRef.current); } catch (e) {}
      }
      if (resultUrlRef.current) {
        try { URL.revokeObjectURL(resultUrlRef.current); } catch (e) {}
      }
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

  const handleFiles = async (fileList: File[]) => {
    const selected = fileList[0];
    if (!selected) return;
    const validation = validateVideoMediaFile(selected, ['audio']);
    if (!validation.ok) {
      toast.error('Unsupported File', validation.message);
      return;
    }
    setIsDecoding(true);
    try {
      if (!audioCtxRef.current) audioCtxRef.current = getAudioContext();
      const ctx = audioCtxRef.current;
      if (!ctx) {
        toast.error('Audio Unsupported', 'This browser cannot decode audio (no Web Audio API).');
        return;
      }
      const arrayBuffer = await selected.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      const decoded: Float32Array[] = [];
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        decoded.push(buffer.getChannelData(ch).slice());
      }
      if (originalUrlRef.current) {
        try { URL.revokeObjectURL(originalUrlRef.current); } catch (e) {}
      }
      originalUrlRef.current = URL.createObjectURL(selected);
      setFile(selected);
      setChannels(decoded);
      setSampleRate(buffer.sampleRate);
      setDuration(buffer.duration);
      setResultUrl('');
      setResultBlob(null);
      setResultDuration(0);
    } catch (err) {
      console.error('Speed decode failed:', err);
      toast.error('Decode Failed', `"${selected.name}" could not be decoded by this browser.`);
    } finally {
      setIsDecoding(false);
    }
  };

  const clearFile = () => {
    audioElRef.current?.pause();
    setPlaying(null);
    if (originalUrlRef.current) {
      try { URL.revokeObjectURL(originalUrlRef.current); } catch (e) {}
      originalUrlRef.current = '';
    }
    if (resultUrlRef.current) {
      try { URL.revokeObjectURL(resultUrlRef.current); } catch (e) {}
      resultUrlRef.current = '';
    }
    setFile(null);
    setChannels(null);
    setSampleRate(0);
    setDuration(0);
    setResultUrl('');
    setResultBlob(null);
    setResultDuration(0);
  };

  const handleApply = () => {
    if (!channels || !file) return;
    setIsProcessing(true);
    setTimeout(() => {
      try {
        const stretched = timeStretchChannels(channels, rate, sampleRate);
        const wavBuffer = encodeWavPcm16(stretched, sampleRate);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        if (resultUrlRef.current) {
          try { URL.revokeObjectURL(resultUrlRef.current); } catch (e) {}
        }
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
        setResultBlob(blob);
        setResultDuration(stretched[0].length / sampleRate);
        try {
          confetti({ particleCount: 80, spread: 65 });
        } catch (e) {}
        toast.success(
          'Speed Changed',
          `${formatTime(duration)} at ${formatSpeed(rate)} → ${formatTime(stretched[0].length / sampleRate)}. Pitch preserved.`
        );
      } catch (err) {
        console.error('Speed change failed:', err);
        toast.error('Speed Change Failed', err instanceof Error ? err.message : 'The speed could not be changed.');
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  };

  const triggerDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = buildSpeedFileName(file.name, rate);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const togglePlay = (which: 'original' | 'result') => {
    const url = which === 'original' ? originalUrlRef.current : resultUrl;
    if (!url) return;
    if (playing === which) {
      audioElRef.current?.pause();
      setPlaying(null);
      return;
    }
    audioElRef.current?.pause();
    const audio = new Audio(url);
    audioElRef.current = audio;
    audio.onended = () => setPlaying(null);
    void audio.play().catch(() => setPlaying(null));
    setPlaying(which);
  };

  const outDuration = expectedOutputDuration(duration, rate);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="audio-speed-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Gauge className="w-8 h-8 text-[#10b981]" />
            Audio Speed Changer
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Speed audio up or slow it down from 0.5x to 2.0x — pitch stays the same, thanks to WSOLA time-stretching.
          </p>
        </div>
        {file && (
          <button
            onClick={clearFile}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
          >
            Clear Audio
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a]">
            <Sliders className="w-5 h-5 text-[#10b981]" />
            <h2 className="font-sans text-lg text-white">Speed Settings</h2>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label htmlFor="speed-rate" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Playback Speed</label>
              <span className="text-xs font-bold text-[#10b981]">{formatSpeed(rate)}</span>
            </div>
            <input
              id="speed-rate"
              type="range"
              min={SPEED_MIN}
              max={SPEED_MAX}
              step="0.05"
              value={rate}
              onChange={(e) => {
                setRate(clampSpeed(parseFloat(e.target.value)));
                setResultUrl('');
                setResultBlob(null);
              }}
              className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>0.5x slower</span>
              <span>1.0x</span>
              <span>2.0x faster</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quick Presets</label>
            <div className="grid grid-cols-3 gap-2">
              {SPEED_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setRate(preset);
                    setResultUrl('');
                    setResultBlob(null);
                  }}
                  className={`py-2 px-2 text-xs font-semibold rounded border transition-all cursor-pointer ${
                    rate === preset
                      ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                      : 'border-[#2a2a2a] hover:border-[#10b981]/40 text-gray-400 bg-transparent'
                  }`}
                >
                  {preset.toFixed(2)}x
                </button>
              ))}
            </div>
          </div>

          {file && channels && (
            <div className="bg-[#151515] border border-[#2a2a2a] rounded p-3 text-xs flex flex-col gap-1.5 text-gray-400 font-medium font-mono">
              <div><span className="font-bold text-gray-300">Track:</span> {file.name}</div>
              <div><span className="font-bold text-gray-300">Original:</span> {formatTime(duration)}</div>
              <div>
                <span className="font-bold text-[#10b981]">Output at {formatSpeed(rate)}:</span> {formatTime(outDuration)}
              </div>
              <div><span className="font-bold text-gray-300">Method:</span> WSOLA time-stretch (pitch-preserving)</div>
            </div>
          )}

          <button
            onClick={handleApply}
            disabled={!channels || isProcessing || isDecoding}
            className={`w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              !channels
                ? 'bg-[#151515] text-gray-600 border border-[#2a2a2a] cursor-not-allowed shadow-none'
                : 'bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md'
            }`}
          >
            {isProcessing ? (
              <>
                <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Stretching…
              </>
            ) : (
              <>
                <Gauge className="w-4 h-4" /> Change Speed to {formatSpeed(rate)}
              </>
            )}
          </button>

          {resultUrl && resultBlob && file && (
            <div className="flex flex-col gap-2">
              <div className="bg-emerald-950/20 text-emerald-300 rounded p-3 text-xs flex items-center gap-2 border border-emerald-900/40">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">Done — {formatTime(resultDuration)} · {formatFileSize(resultBlob.size)}</span>
              </div>
              <button
                onClick={() => togglePlay('result')}
                className="w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-white bg-[#151515] hover:bg-[#1d1d1d] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {playing === 'result' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {playing === 'result' ? 'Pause Result' : 'Play Result'}
              </button>
              <button
                onClick={triggerDownload}
                className="w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download {formatSpeed(rate)} WAV
              </button>
            </div>
          )}
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
              aria-label="Upload audio to change speed. Drop a file or press Enter to browse."
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[220px] focus:outline-none focus:border-[#10b981]/70 ${
                isDragging ? 'border-[#10b981] bg-[#10b981]/10' : 'border-[#2a2a2a] hover:border-[#10b981]/40 bg-[#0d0d0d]'
              }`}
            >
              <input
                id="audio-speed-file-input"
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files) void handleFiles(Array.from(e.target.files));
                  e.target.value = '';
                }}
                accept="audio/*"
                aria-label="Choose an audio file to change speed"
                className="hidden"
              />
              <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-3 group-hover:scale-105 transition-transform text-[#10b981]">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-white font-sans text-base">Drag &amp; drop your audio</h3>
              <p className="text-gray-500 text-xs mt-1 mb-3">MP3, WAV, OGG, M4A — lectures, podcasts, songs</p>
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
                    {formatTime(duration)} · {channels?.length ?? 0}ch · {sampleRate} Hz · {formatFileSize(file.size)}
                  </div>
                </div>
                <button
                  onClick={() => togglePlay('original')}
                  className="p-2.5 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] rounded transition-colors cursor-pointer"
                  aria-label={playing === 'original' ? 'Pause original' : 'Play original'}
                >
                  {playing === 'original' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              {isDecoding && (
                <div className="flex items-center gap-2 text-[#10b981] text-xs font-semibold">
                  <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Decoding audio…
                </div>
              )}
              <p className="text-[11px] text-gray-500 leading-relaxed">
                WSOLA keeps the pitch intact while the tempo changes, so a 1.5x lecture still sounds
                like the same speaker. Dense music can smear slightly at extreme rates — that is the
                honest trade-off of doing this entirely client-side with no extra libraries.
              </p>
            </div>
          )}

          {file && !channels && (
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3">
              <WarningCircle className="w-4 h-4 shrink-0" />
              Still decoding &ldquo;{file.name}&rdquo; — if this stays, the file may be corrupt.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
