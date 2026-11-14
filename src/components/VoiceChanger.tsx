import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Download,
  MusicNotes,
  Pause,
  Play,
  Radio,
  Sliders,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { formatFileSize } from '../lib/imageTools';
import { encodeWavPcm16, validateVideoMediaFile } from '../lib/toolTransforms';

export interface VoiceChangerProps {
  onBack: () => void;
  initialFile?: File;
}

export type VoicePreset = 'chipmunk' | 'deep' | 'robot' | 'echo' | 'darth';

export const VOICE_PRESETS: Array<{
  id: VoicePreset;
  label: string;
  description: string;
}> = [
  { id: 'chipmunk', label: 'Chipmunk', description: 'High-pitched and fast, +8 semitones.' },
  { id: 'deep', label: 'Deep Voice', description: 'Low and slow, −7 semitones.' },
  { id: 'darth', label: 'Darth Vader', description: 'Very low, −12 semitones, with echo.' },
  { id: 'robot', label: 'Robot', description: 'Metallic ring-modulated voice.' },
  { id: 'echo', label: 'Cathedral Echo', description: 'Spacious repeating echoes.' },
];

/** Semitone shift → resample factor (2^(n/12)). Factor > 1 = higher + faster. */
export function semitonesToRate(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

/**
 * Linear-interpolation resample by a factor: output length = input / factor.
 * Factor > 1 raises pitch and shortens duration (chipmunk); factor < 1
 * lowers pitch and lengthens it. Pitch and tempo change together — a true
 * pitch-only shift needs a phase vocoder, which no browser ships natively.
 */
export function resampleByFactor(data: Float32Array, factor: number): Float32Array {
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new Error('Resampling needs a positive factor.');
  }
  if (factor === 1) return data.slice();
  const outLength = Math.max(1, Math.round(data.length / factor));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * factor;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = data[Math.min(idx, data.length - 1)];
    const b = data[Math.min(idx + 1, data.length - 1)];
    out[i] = a + (b - a) * frac;
  }
  return out;
}

/** Ring modulation: multiply by a carrier sine. Sounds metallic/robotic. */
export function applyRingModulation(
  data: Float32Array,
  sampleRate: number,
  carrierHz = 45
): Float32Array {
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    out[i] = data[i] * Math.sin(2 * Math.PI * carrierHz * t);
  }
  return out;
}

/** Add decaying delayed repeats of the signal onto itself. */
export function applyEcho(
  data: Float32Array,
  sampleRate: number,
  delaySeconds = 0.28,
  decay = 0.45,
  repeats = 4
): Float32Array {
  const delaySamples = Math.max(1, Math.round(delaySeconds * sampleRate));
  const out = new Float32Array(data.length + delaySamples * repeats);
  out.set(data, 0);
  let gain = decay;
  for (let r = 1; r <= repeats; r++) {
    for (let i = 0; i < data.length; i++) {
      out[i + delaySamples * r] += data[i] * gain;
    }
    gain *= decay;
  }
  // Normalize if the echoes pushed the peak past full scale.
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 1) {
    for (let i = 0; i < out.length; i++) out[i] /= peak;
  }
  return out;
}

export interface VoiceEffectResult {
  channels: Float32Array[];
  sampleRate: number;
  durationSeconds: number;
}

/** Apply one preset to decoded channel data. Pure — no browser APIs. */
export function applyVoicePreset(
  channels: Float32Array[],
  sampleRate: number,
  preset: VoicePreset
): VoiceEffectResult {
  const processOne = (data: Float32Array): Float32Array => {
    switch (preset) {
      case 'chipmunk':
        return resampleByFactor(data, semitonesToRate(8));
      case 'deep':
        return resampleByFactor(data, semitonesToRate(-7));
      case 'darth': {
        const lowered = resampleByFactor(data, semitonesToRate(-12));
        return applyEcho(lowered, sampleRate, 0.22, 0.35, 2);
      }
      case 'robot':
        return applyRingModulation(data, sampleRate, 45);
      case 'echo':
        return applyEcho(data, sampleRate, 0.28, 0.45, 4);
      default:
        return data.slice();
    }
  };
  const outChannels = channels.map(processOne);
  return {
    channels: outChannels,
    sampleRate,
    durationSeconds: outChannels[0].length / sampleRate,
  };
}

export function buildVoiceChangedFileName(originalName: string, preset: VoicePreset): string {
  const base = (originalName.replace(/\.[^.]+$/, '') || 'audio').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${base}_${preset}.wav`;
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
 * Real-time voice modulator (file-based).
 *
 * Honest limitation, shown in the UI: pitch presets work by resampling, so
 * pitch and tempo shift together (chipmunk is faster, deep is slower). A
 * pitch-only shift needs a phase vocoder — no browser ships one natively and
 * this tool adds no new dependencies. Robot (ring modulation) and echo are
 * true DSP effects applied at the original tempo.
 */
export default function VoiceChanger({ onBack, initialFile }: VoiceChangerProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [channels, setChannels] = useState<Float32Array[] | null>(null);
  const [sampleRate, setSampleRate] = useState(0);
  const [duration, setDuration] = useState(0);
  const [preset, setPreset] = useState<VoicePreset>('chipmunk');
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
  const fileRef = useRef<File | null>(null);

  useEffect(() => {
    fileRef.current = file;
  }, [file]);

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
      console.error('Voice decode failed:', err);
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
        const result = applyVoicePreset(channels, sampleRate, preset);
        const wavBuffer = encodeWavPcm16(result.channels, result.sampleRate);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        if (resultUrlRef.current) {
          try { URL.revokeObjectURL(resultUrlRef.current); } catch (e) {}
        }
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
        setResultBlob(blob);
        setResultDuration(result.durationSeconds);
        try {
          confetti({ particleCount: 80, spread: 65 });
        } catch (e) {}
        toast.success('Voice Changed', `${VOICE_PRESETS.find((p) => p.id === preset)?.label} applied — now ${formatTime(result.durationSeconds)}.`);
      } catch (err) {
        console.error('Voice change failed:', err);
        toast.error('Effect Failed', err instanceof Error ? err.message : 'The effect could not be applied.');
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  };

  const triggerDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = buildVoiceChangedFileName(file.name, preset);
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

  const presetInfo = VOICE_PRESETS.find((p) => p.id === preset);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="voice-changer-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Radio className="w-8 h-8 text-[#10b981]" />
            Real-Time Voice Modulator
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Pitch-shift a voice or add robot and cathedral effects. Processed entirely in your browser.
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
            <h2 className="font-sans text-lg text-white">Voice Effect</h2>
          </div>

          <div className="flex flex-col gap-2">
            {VOICE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPreset(p.id);
                  setResultUrl('');
                  setResultBlob(null);
                }}
                className={`text-left px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                  preset === p.id
                    ? 'border-[#10b981] bg-[#10b981]/10 text-white'
                    : 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                }`}
              >
                <div className="text-xs font-bold">{p.label}</div>
                <div className="text-[11px] text-gray-500">{p.description}</div>
              </button>
            ))}
          </div>

          {presetInfo && (
            <div className="bg-[#151515] border border-[#2a2a2a] rounded p-3 text-[11px] text-gray-400 leading-relaxed">
              {(preset === 'chipmunk' || preset === 'deep' || preset === 'darth') && (
                <>Pitch presets resample the audio, so pitch and speed change together — the clip gets
                {preset === 'chipmunk' ? ' shorter and higher' : ' longer and lower'}. A pitch-only shift
                needs a phase vocoder, which browsers don&apos;t ship natively.</>
              )}
              {(preset === 'robot' || preset === 'echo') && (
                <>This effect is applied at the original tempo and duration.</>
              )}
            </div>
          )}

          {file && channels && (
            <div className="bg-[#151515] border border-[#2a2a2a] rounded p-3 text-xs flex flex-col gap-1.5 text-gray-400 font-medium font-mono">
              <div><span className="font-bold text-gray-300">Track:</span> {file.name}</div>
              <div><span className="font-bold text-gray-300">Duration:</span> {formatTime(duration)}</div>
              <div><span className="font-bold text-gray-300">Channels:</span> {channels.length} · {sampleRate} Hz</div>
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
                <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Applying…
              </>
            ) : (
              <>
                <Radio className="w-4 h-4" /> Apply {presetInfo?.label} Effect
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
                <Download className="w-4 h-4" /> Download Changed Voice (WAV)
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
              aria-label="Upload a voice recording to change. Drop a file or press Enter to browse."
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[220px] focus:outline-none focus:border-[#10b981]/70 ${
                isDragging ? 'border-[#10b981] bg-[#10b981]/10' : 'border-[#2a2a2a] hover:border-[#10b981]/40 bg-[#0d0d0d]'
              }`}
            >
              <input
                id="voice-changer-file-input"
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files) void handleFiles(Array.from(e.target.files));
                  e.target.value = '';
                }}
                accept="audio/*"
                aria-label="Choose a voice recording to change"
                className="hidden"
              />
              <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-3 group-hover:scale-105 transition-transform text-[#10b981]">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-white font-sans text-base">Drag &amp; drop a voice clip</h3>
              <p className="text-gray-500 text-xs mt-1 mb-3">MP3, WAV, OGG, M4A — best on clean speech or singing</p>
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
                Pick an effect on the left, then apply it. The result is exported as a 16-bit WAV —
                the same quality as the decoded source, with no upload anywhere.
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
