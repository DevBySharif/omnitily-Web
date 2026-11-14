import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle,
  Download,
  MusicNotes,
  Scissors,
  Sliders,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { formatFileSize } from '../lib/imageTools';
import { encodeWavPcm16 } from '../lib/toolTransforms';

/**
 * Silence remover — real silence detection + cutting, in the browser.
 *
 * The decoded audio is split into short windows; each window's RMS level is
 * compared against a threshold (dBFS, adjustable). Runs of quiet windows
 * longer than the minimum silence length are silent regions; those regions
 * are cut out (keeping a short padding of speech on each side so words are
 * not clipped), and the remaining audio is exported as a 16-bit PCM WAV
 * with the hand-rolled encoder in lib/toolTransforms. The detection result
 * (regions, seconds removed, output duration) is shown before any export,
 * so the cut is checkable, not taken on trust.
 */

export interface SilenceRegion {
  startSeconds: number;
  endSeconds: number;
}

export interface SilenceOptions {
  thresholdDb: number; // RMS below this is silence, e.g. -40
  windowMs: number; // RMS window, default 10 ms
  minSilenceMs: number; // a quiet run must last at least this long to count
  paddingMs: number; // speech kept on each side of a cut, default 100 ms
}

export const DEFAULT_SILENCE_OPTIONS: SilenceOptions = {
  thresholdDb: -40,
  windowMs: 10,
  minSilenceMs: 300,
  paddingMs: 100,
};

export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/** RMS level of one window of samples. */
export function windowRms(samples: Float32Array, start: number, end: number): number {
  let sum = 0;
  const n = Math.max(1, end - start);
  for (let i = start; i < end; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / n);
}

/**
 * Detect silent regions in mono (or mixed-down) samples. Returns regions in
 * seconds, merged across adjacent quiet windows and filtered by the minimum
 * silence length.
 */
export function detectSilentRegions(
  samples: Float32Array,
  sampleRate: number,
  options: SilenceOptions = DEFAULT_SILENCE_OPTIONS
): SilenceRegion[] {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || samples.length === 0) return [];
  const windowFrames = Math.max(1, Math.round((options.windowMs / 1000) * sampleRate));
  const threshold = dbToLinear(options.thresholdDb);
  const minWindows = Math.max(1, Math.ceil(options.minSilenceMs / options.windowMs));
  const regions: SilenceRegion[] = [];
  let runStart: number | null = null;
  let windowIndex = 0;
  for (let start = 0; start < samples.length; start += windowFrames, windowIndex++) {
    const end = Math.min(samples.length, start + windowFrames);
    const quiet = windowRms(samples, start, end) < threshold;
    if (quiet && runStart === null) runStart = windowIndex;
    if (!quiet && runStart !== null) {
      const runLength = windowIndex - runStart;
      if (runLength >= minWindows) {
        regions.push({
          startSeconds: (runStart * windowFrames) / sampleRate,
          endSeconds: (windowIndex * windowFrames) / sampleRate,
        });
      }
      runStart = null;
    }
  }
  if (runStart !== null) {
    const runLength = windowIndex - runStart;
    if (runLength >= minWindows) {
      regions.push({
        startSeconds: (runStart * windowFrames) / sampleRate,
        endSeconds: samples.length / sampleRate,
      });
    }
  }
  return regions;
}

/**
 * Cut silent regions out of every channel, keeping `paddingMs` of audio on
 * each side of each cut. Returns new channel arrays; the originals are
 * untouched. All channels must have the same length.
 */
export function removeSilentRegions(
  channels: Float32Array[],
  sampleRate: number,
  regions: SilenceRegion[],
  paddingMs: number = DEFAULT_SILENCE_OPTIONS.paddingMs
): Float32Array[] {
  const totalFrames = channels.length > 0 ? channels[0].length : 0;
  if (channels.length === 0 || totalFrames === 0) return channels.map(() => new Float32Array(0));
  const paddingFrames = Math.max(0, Math.round((paddingMs / 1000) * sampleRate));
  // Kept intervals = complement of (region shrunk by padding on each side).
  const kept: { start: number; end: number }[] = [];
  let cursor = 0;
  const sorted = [...regions].sort((a, b) => a.startSeconds - b.startSeconds);
  for (const region of sorted) {
    const cutStart = Math.min(totalFrames, Math.max(0, Math.round(region.startSeconds * sampleRate) + paddingFrames));
    const cutEnd = Math.min(totalFrames, Math.max(0, Math.round(region.endSeconds * sampleRate) - paddingFrames));
    if (cutEnd <= cutStart) continue;
    if (cutStart > cursor) kept.push({ start: cursor, end: cutStart });
    cursor = Math.max(cursor, cutEnd);
  }
  if (cursor < totalFrames) kept.push({ start: cursor, end: totalFrames });
  const keptFrames = kept.reduce((sum, k) => sum + (k.end - k.start), 0);
  return channels.map((channel) => {
    const out = new Float32Array(keptFrames);
    let at = 0;
    for (const k of kept) {
      out.set(channel.subarray(k.start, k.end), at);
      at += k.end - k.start;
    }
    return out;
  });
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0.00 s';
  return `${seconds.toFixed(2)} s`;
}

export function buildSilenceRemovedFileName(originalName: string): string {
  const base = (originalName.replace(/\.[^.]+$/, '') || 'audio').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${base}_silence-removed.wav`;
}

interface DecodedAudio {
  channels: Float32Array[];
  sampleRate: number;
  durationSeconds: number;
}

export default function SilenceRemover({ onBack, initialFile }: { onBack: () => void; initialFile?: File }) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [decoded, setDecoded] = useState<DecodedAudio | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [error, setError] = useState('');
  const [thresholdDb, setThresholdDb] = useState(-40);
  const [minSilenceMs, setMinSilenceMs] = useState(300);
  const [paddingMs, setPaddingMs] = useState(100);
  const [regions, setRegions] = useState<SilenceRegion[] | null>(null);
  const [resultUrl, setResultUrl] = useState('');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultSeconds, setResultSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialFile) loadAudio(initialFile);
  }, [initialFile]);

  const loadAudio = async (selected: File) => {
    setError('');
    setRegions(null);
    setResultUrl('');
    setResultBlob(null);
    if (selected.size === 0) {
      setError('The selected file is 0 bytes.');
      return;
    }
    setIsDecoding(true);
    try {
      if (typeof AudioContext === 'undefined') {
        throw new Error('This browser has no Web Audio API, so audio cannot be decoded here.');
      }
      const arrayBuffer = await selected.arrayBuffer();
      const ctx = new AudioContext();
      try {
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (audioBuffer.numberOfChannels < 1 || audioBuffer.length === 0) {
          throw new Error('The file decoded to empty audio.');
        }
        const channels: Float32Array[] = [];
        for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
          channels.push(new Float32Array(audioBuffer.getChannelData(c)));
        }
        setFile(selected);
        setDecoded({ channels, sampleRate: audioBuffer.sampleRate, durationSeconds: audioBuffer.length / audioBuffer.sampleRate });
      } finally {
        try { await ctx.close(); } catch (e) {}
      }
    } catch (err) {
      setError(err instanceof Error ? `Could not decode "${selected.name}": ${err.message}` : 'Could not decode this audio file.');
    } finally {
      setIsDecoding(false);
    }
  };

  const handleDetect = () => {
    if (!decoded) return;
    // Detect on a mono mixdown so a quiet channel cannot fake silence.
    const frames = decoded.channels[0].length;
    const mono = new Float32Array(frames);
    for (let i = 0; i < frames; i++) {
      let sum = 0;
      for (const ch of decoded.channels) sum += ch[i];
      mono[i] = sum / decoded.channels.length;
    }
    const found = detectSilentRegions(mono, decoded.sampleRate, {
      thresholdDb,
      windowMs: DEFAULT_SILENCE_OPTIONS.windowMs,
      minSilenceMs,
      paddingMs,
    });
    setRegions(found);
    setResultUrl('');
    setResultBlob(null);
    if (found.length === 0) {
      toast.info('No Silence Found', `No quiet run longer than ${minSilenceMs} ms below ${thresholdDb} dB was found. Try a higher (less negative) threshold.`);
    } else {
      const removed = found.reduce((sum, r) => sum + (r.endSeconds - r.startSeconds), 0);
      toast.success('Silence Detected', `${found.length} silent region${found.length === 1 ? '' : 's'} — ${formatDuration(removed)} of silence in ${formatDuration(decoded.durationSeconds)}.`);
    }
  };

  const handleRemove = () => {
    if (!decoded || !regions) return;
    try {
      const trimmed = removeSilentRegions(decoded.channels, decoded.sampleRate, regions, paddingMs);
      const seconds = trimmed[0].length / decoded.sampleRate;
      const wav = encodeWavPcm16(trimmed, decoded.sampleRate);
      const blob = new Blob([wav], { type: 'audio/wav' });
      if (resultUrl) {
        try { URL.revokeObjectURL(resultUrl); } catch (e) {}
      }
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultBlob(blob);
      setResultSeconds(seconds);
      try { confetti({ particleCount: 80, spread: 60 }); } catch (e) {}
      toast.success('Silence Removed', `Output is ${formatDuration(seconds)} (was ${formatDuration(decoded.durationSeconds)}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The trimmed WAV could not be encoded.');
    }
  };

  const downloadResult = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = buildSilenceRemovedFileName(file.name);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const removedSeconds = regions && decoded
    ? regions.reduce((sum, r) => sum + (r.endSeconds - r.startSeconds), 0)
    : 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="silence-remover-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Scissors className="w-8 h-8 text-[#10b981]" />
            Silence Remover
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Detects real quiet passages by RMS level and cuts them out, keeping a short padding so words are not clipped. Exports a 16-bit PCM WAV. Everything runs locally.
          </p>
        </div>
        {file && (
          <button
            onClick={() => { setFile(null); setDecoded(null); setRegions(null); setResultUrl(''); setResultBlob(null); }}
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
            <h2 className="font-sans text-lg text-white">Detection Settings</h2>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            className="border-2 border-dashed border-[#2a2a2a] hover:border-[#10b981]/50 rounded-xl p-6 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group"
          >
            <input
              id="silence-file-input"
              data-testid="silence-file-input"
              type="file"
              ref={fileInputRef}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadAudio(f); }}
              accept="audio/*"
              className="hidden"
            />
            <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-2 group-hover:scale-105 transition-transform text-[#10b981]">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-white font-sans text-sm">{file ? file.name : 'Upload an audio file'}</h3>
            <p className="text-gray-500 text-xs mt-1">{file ? formatFileSize(file.size) : 'WAV, MP3, WebM, OGG and more'}</p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label htmlFor="silence-threshold" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Silence Threshold</label>
              <span className="text-xs font-bold text-[#10b981]">{thresholdDb} dB</span>
            </div>
            <input
              id="silence-threshold"
              data-testid="silence-threshold"
              type="range"
              min="-60"
              max="-20"
              step="1"
              value={thresholdDb}
              onChange={(e) => { setThresholdDb(parseInt(e.target.value, 10)); setRegions(null); setResultUrl(''); }}
              className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
            />
            <span className="text-[10px] text-gray-500">Audio quieter than this counts as silence. −40 dB is a good start for speech; raise it (toward −20) for noisy recordings.</span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label htmlFor="silence-min" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Minimum Silence</label>
              <span className="text-xs font-bold text-[#10b981]">{minSilenceMs} ms</span>
            </div>
            <input
              id="silence-min"
              data-testid="silence-min"
              type="range"
              min="100"
              max="2000"
              step="50"
              value={minSilenceMs}
              onChange={(e) => { setMinSilenceMs(parseInt(e.target.value, 10)); setRegions(null); setResultUrl(''); }}
              className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
            />
            <span className="text-[10px] text-gray-500">Quiet runs shorter than this are kept — natural pauses between words survive.</span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label htmlFor="silence-padding" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Padding Kept</label>
              <span className="text-xs font-bold text-[#10b981]">{paddingMs} ms</span>
            </div>
            <input
              id="silence-padding"
              data-testid="silence-padding"
              type="range"
              min="0"
              max="500"
              step="10"
              value={paddingMs}
              onChange={(e) => { setPaddingMs(parseInt(e.target.value, 10)); setResultUrl(''); }}
              className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
            />
            <span className="text-[10px] text-gray-500">Audio kept on each side of a cut, so the start of a word is never clipped.</span>
          </div>

          <button
            onClick={handleDetect}
            disabled={!decoded || isDecoding}
            data-testid="silence-detect"
            className="w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDecoding ? 'Decoding Audio…' : 'Detect Silence'}
          </button>

          {regions && regions.length > 0 && (
            <button
              onClick={handleRemove}
              data-testid="silence-remove"
              className="w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Scissors className="w-4 h-4" /> Remove Silence &amp; Make WAV
            </button>
          )}
          {resultUrl && resultBlob && (
            <button
              onClick={downloadResult}
              data-testid="silence-download"
              className="w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Trimmed WAV ({formatFileSize(resultBlob.size)})
            </button>
          )}
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          {error && (
            <div data-testid="silence-error" className="p-4 rounded-xl border border-rose-900/50 bg-rose-950/10 text-rose-300 text-xs flex items-start gap-2">
              <WarningCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block uppercase tracking-wider mb-1 text-[10px]">Audio Error</span>
                {error}
              </div>
            </div>
          )}
          {!decoded && !isDecoding && (
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-10 text-center flex flex-col items-center justify-center min-h-[220px] text-gray-500">
              <MusicNotes className="w-10 h-10 stroke-1 mb-3" />
              <p className="text-xs max-w-sm">Upload an audio file, then detect silence. Long pauses, dead air at the start/end, and gaps between takes are cut out.</p>
            </div>
          )}
          {decoded && (
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a] mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h2 className="font-sans text-lg text-white">Loaded Audio</h2>
                <span className="text-xs text-gray-400 ml-auto">
                  {formatDuration(decoded.durationSeconds)} · {decoded.channels.length} channel{decoded.channels.length === 1 ? '' : 's'} · {decoded.sampleRate} Hz
                </span>
              </div>
              {regions === null ? (
                <p className="text-gray-400 text-sm">Press “Detect Silence” to measure the quiet passages in this file.</p>
              ) : regions.length === 0 ? (
                <p className="text-gray-400 text-sm">No silent region longer than {minSilenceMs} ms below {thresholdDb} dB was found in this file.</p>
              ) : (
                <div data-testid="silence-result">
                  <p className="text-sm text-white mb-3">
                    <span className="text-[#10b981] font-bold">{regions.length} silent region{regions.length === 1 ? '' : 's'}</span>
                    {' '}— {formatDuration(removedSeconds)} of silence detected; output will be about{' '}
                    <span className="font-bold">{formatDuration(Math.max(0, decoded.durationSeconds - removedSeconds + (regions.length * 2 * paddingMs) / 1000))}</span>{' '}
                    with {paddingMs} ms padding kept per cut.
                  </p>
                  <ul className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-1">
                    {regions.map((r, i) => (
                      <li key={i} className="flex justify-between text-xs bg-[#151515] border border-[#2a2a2a] rounded px-3 py-2">
                        <span className="text-gray-400">Silence {i + 1}</span>
                        <span className="text-white font-mono">{r.startSeconds.toFixed(2)} s → {r.endSeconds.toFixed(2)} s ({(r.endSeconds - r.startSeconds).toFixed(2)} s)</span>
                      </li>
                    ))}
                  </ul>
                  {resultUrl && (
                    <p className="text-emerald-400 text-xs font-semibold mt-4">
                      Trimmed WAV ready — {formatDuration(resultSeconds)}. Download it from the left panel.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-5 text-xs text-gray-400 font-medium leading-relaxed">
            <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest block mb-2 font-mono">How Detection Works</span>
            The file is split into 10 ms windows and each window's RMS loudness is measured. Windows quieter than the threshold form silent regions; only regions longer than the minimum silence are cut. Nothing is re-encoded or guessed — the kept audio is the original decoded samples, exported as lossless WAV.
          </div>
        </div>
      </div>
    </div>
  );
}
