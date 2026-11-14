import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Download,
  FilePlus,
  MusicNotes,
  Play,
  Pause,
  Sliders,
  Trash,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { formatFileSize } from '../lib/imageTools';
import { encodeWavPcm16, validateVideoMediaFile } from '../lib/toolTransforms';

export interface AudioMergerProps {
  onBack: () => void;
  initialFile?: File;
}

export interface DecodedTrack {
  name: string;
  size: number;
  channels: Float32Array[];
  sampleRate: number;
  durationSeconds: number;
}

/**
 * Linear-interpolation resample of one channel from one sample rate to another.
 * Used so tracks recorded at different sample rates can still be merged.
 */
export function resampleChannel(data: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (!Number.isFinite(fromRate) || fromRate <= 0 || !Number.isFinite(toRate) || toRate <= 0) {
    throw new Error('Resampling needs valid sample rates.');
  }
  if (fromRate === toRate) return data.slice();
  const outLength = Math.max(1, Math.round((data.length * toRate) / fromRate));
  const out = new Float32Array(outLength);
  const ratio = fromRate / toRate;
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = data[Math.min(idx, data.length - 1)];
    const b = data[Math.min(idx + 1, data.length - 1)];
    out[i] = a + (b - a) * frac;
  }
  return out;
}

/**
 * Concatenate decoded tracks end-to-end (mono/stereo preserved per track;
 * a mono track merged into a stereo output is duplicated to both channels).
 * `gapSeconds` of digital silence is inserted between tracks.
 */
export function concatenateTracks(
  tracks: DecodedTrack[],
  gapSeconds = 0
): { channels: Float32Array[]; sampleRate: number; durationSeconds: number } {
  if (tracks.length === 0) {
    throw new Error('Nothing to merge: add at least one audio track.');
  }
  const sampleRate = tracks[0].sampleRate;
  const channelCount = Math.max(...tracks.map((t) => t.channels.length));
  const gapFrames = Math.max(0, Math.round(gapSeconds * sampleRate));
  const resampledLength = (track: DecodedTrack): number =>
    track.sampleRate === sampleRate
      ? track.channels[0].length
      : Math.max(1, Math.round((track.channels[0].length * sampleRate) / track.sampleRate));
  let totalFrames = 0;
  for (let i = 0; i < tracks.length; i++) {
    totalFrames += resampledLength(tracks[i]);
    if (i < tracks.length - 1) totalFrames += gapFrames;
  }
  const out: Float32Array[] = Array.from({ length: channelCount }, () => new Float32Array(totalFrames));
  let writePos = 0;
  for (let t = 0; t < tracks.length; t++) {
    const track = tracks[t];
    const frames = resampledLength(track);
    for (let ch = 0; ch < channelCount; ch++) {
      const source = track.channels[Math.min(ch, track.channels.length - 1)];
      const resampled = track.sampleRate === sampleRate ? source : resampleChannel(source, track.sampleRate, sampleRate);
      out[ch].set(resampled.subarray(0, frames), writePos);
    }
    writePos += frames;
    if (t < tracks.length - 1) writePos += gapFrames;
  }
  return { channels: out, sampleRate, durationSeconds: totalFrames / sampleRate };
}

export function buildMergedFileName(names: string[]): string {
  const first = (names[0] || 'audio').replace(/\.[^.]+$/, '') || 'audio';
  const sanitized = first.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${sanitized}_merged_${names.length}tracks.wav`;
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

export default function AudioMerger({ onBack, initialFile }: AudioMergerProps) {
  const toast = useToast();
  const [tracks, setTracks] = useState<DecodedTrack[]>([]);
  const [gapSeconds, setGapSeconds] = useState(0);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mergedUrl, setMergedUrl] = useState('');
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [mergedDuration, setMergedDuration] = useState(0);
  const [mergedName, setMergedName] = useState('');
  const [playingName, setPlayingName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mergedUrlRef = useRef('');
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef<DecodedTrack[]>([]);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    mergedUrlRef.current = mergedUrl;
  }, [mergedUrl]);

  useEffect(() => {
    return () => {
      if (mergedUrlRef.current) {
        try { URL.revokeObjectURL(mergedUrlRef.current); } catch (e) {}
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
    const valid: File[] = [];
    for (const file of fileList) {
      const validation = validateVideoMediaFile(file, ['audio']);
      if (!validation.ok) {
        toast.error('Skipped File', validation.message);
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) return;
    setIsDecoding(true);
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = getAudioContext();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) {
        toast.error('Audio Unsupported', 'This browser cannot decode audio (no Web Audio API).');
        return;
      }
      const decoded: DecodedTrack[] = [];
      for (const file of valid) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = await ctx.decodeAudioData(arrayBuffer);
          const channels: Float32Array[] = [];
          for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
            channels.push(buffer.getChannelData(ch).slice());
          }
          decoded.push({
            name: file.name,
            size: file.size,
            channels,
            sampleRate: buffer.sampleRate,
            durationSeconds: buffer.duration,
          });
        } catch (err) {
          console.error('Decode failed for', file.name, err);
          toast.error('Decode Failed', `"${file.name}" could not be decoded by this browser.`);
        }
      }
      if (decoded.length > 0) {
        setTracks((prev) => [...prev, ...decoded]);
        setMergedUrl('');
        setMergedBlob(null);
        toast.success('Tracks Added', `${decoded.length} track${decoded.length > 1 ? 's' : ''} decoded and ready to merge.`);
      }
    } finally {
      setIsDecoding(false);
    }
  };

  const removeTrack = (index: number) => {
    setTracks((prev) => prev.filter((_, i) => i !== index));
    setMergedUrl('');
    setMergedBlob(null);
  };

  const moveTrack = (index: number, direction: -1 | 1) => {
    setTracks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setMergedUrl('');
    setMergedBlob(null);
  };

  const clearAll = () => {
    setTracks([]);
    setMergedUrl('');
    setMergedBlob(null);
    setMergedDuration(0);
  };

  const handleMerge = () => {
    if (tracks.length < 2) {
      toast.error('Need More Tracks', 'Add at least two audio tracks to merge.');
      return;
    }
    setIsMerging(true);
    setTimeout(() => {
      try {
        const merged = concatenateTracks(tracks, gapSeconds);
        const wavBuffer = encodeWavPcm16(merged.channels, merged.sampleRate);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        if (mergedUrlRef.current) {
          try { URL.revokeObjectURL(mergedUrlRef.current); } catch (e) {}
        }
        const url = URL.createObjectURL(blob);
        setMergedUrl(url);
        setMergedBlob(blob);
        setMergedDuration(merged.durationSeconds);
        setMergedName(buildMergedFileName(tracks.map((t) => t.name)));
        try {
          confetti({ particleCount: 80, spread: 65 });
        } catch (e) {}
        toast.success('Tracks Merged', `${tracks.length} tracks combined into ${formatTime(merged.durationSeconds)} of audio.`);
      } catch (err) {
        console.error('Merge failed:', err);
        toast.error('Merge Failed', err instanceof Error ? err.message : 'The tracks could not be merged.');
      } finally {
        setIsMerging(false);
      }
    }, 50);
  };

  const triggerDownload = () => {
    if (!mergedUrl) return;
    const a = document.createElement('a');
    a.href = mergedUrl;
    a.download = mergedName || 'merged.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const togglePreview = () => {
    if (!mergedUrl) return;
    if (playingName === 'merged') {
      audioElRef.current?.pause();
      setPlayingName(null);
      return;
    }
    audioElRef.current?.pause();
    const audio = new Audio(mergedUrl);
    audioElRef.current = audio;
    audio.onended = () => setPlayingName(null);
    void audio.play().catch(() => setPlayingName(null));
    setPlayingName('merged');
  };

  const totalDuration = tracks.reduce((sum, t) => sum + t.durationSeconds, 0) + Math.max(0, tracks.length - 1) * gapSeconds;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="audio-merger-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <FilePlus className="w-8 h-8 text-[#10b981]" />
            Audio Clip Merger
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Glue multiple audio clips into one track, in order, with optional silence between them. Everything runs locally.
          </p>
        </div>
        {tracks.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a]">
            <Sliders className="w-5 h-5 text-[#10b981]" />
            <h2 className="font-sans text-lg text-white">Merge Settings</h2>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label htmlFor="merge-gap" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Silence Between Tracks</label>
              <span className="text-xs font-bold text-[#10b981]">{gapSeconds.toFixed(1)}s</span>
            </div>
            <input
              id="merge-gap"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={gapSeconds}
              onChange={(e) => {
                setGapSeconds(parseFloat(e.target.value));
                setMergedUrl('');
                setMergedBlob(null);
              }}
              className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
            />
            <span className="text-[11px] text-gray-500">Digital silence inserted between each pair of tracks.</span>
          </div>

          <div className="bg-[#151515] border border-[#2a2a2a] rounded p-3 text-xs flex flex-col gap-1.5 text-gray-400 font-medium font-mono">
            <div><span className="font-bold text-gray-300">Tracks:</span> {tracks.length}</div>
            <div><span className="font-bold text-gray-300">Total duration:</span> {formatTime(totalDuration)}</div>
            <div><span className="font-bold text-gray-300">Output:</span> WAV 16-bit PCM</div>
          </div>

          <button
            onClick={handleMerge}
            disabled={tracks.length < 2 || isMerging || isDecoding}
            className={`w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              tracks.length < 2
                ? 'bg-[#151515] text-gray-600 border border-[#2a2a2a] cursor-not-allowed shadow-none'
                : 'bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md'
            }`}
          >
            {isMerging ? (
              <>
                <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Merging…
              </>
            ) : (
              <>
                <FilePlus className="w-4 h-4" /> Merge ({tracks.length}) Tracks
              </>
            )}
          </button>

          {mergedUrl && mergedBlob && (
            <div className="flex flex-col gap-2">
              <div className="bg-emerald-950/20 text-emerald-300 rounded p-3 text-xs flex items-center gap-2 border border-emerald-900/40">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">Merged — {formatTime(mergedDuration)} · {formatFileSize(mergedBlob.size)}</span>
              </div>
              <button
                onClick={togglePreview}
                className="w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-white bg-[#151515] hover:bg-[#1d1d1d] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {playingName === 'merged' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {playingName === 'merged' ? 'Pause Preview' : 'Play Merged Track'}
              </button>
              <button
                onClick={triggerDownload}
                className="w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Merged WAV
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
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
            aria-label="Upload audio tracks to merge. Drop files or press Enter to browse."
            className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[180px] focus:outline-none focus:border-[#10b981]/70 ${
              isDragging ? 'border-[#10b981] bg-[#10b981]/10' : 'border-[#2a2a2a] hover:border-[#10b981]/40 bg-[#0d0d0d]'
            }`}
          >
            <input
              id="audio-merger-file-input"
              type="file"
              ref={fileInputRef}
              multiple
              onChange={(e) => {
                if (e.target.files) void handleFiles(Array.from(e.target.files));
                e.target.value = '';
              }}
              accept="audio/*"
              aria-label="Choose audio files to merge"
              className="hidden"
            />
            <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-3 group-hover:scale-105 transition-transform text-[#10b981]">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-white font-sans text-base">Drop audio tracks here</h3>
            <p className="text-gray-500 text-xs mt-1 mb-3">MP3, WAV, OGG, M4A, FLAC — add as many as you like, in merge order</p>
            <span className="text-[11px] font-bold text-[#0a0a0a] bg-[#10b981] px-3 py-1.5 rounded uppercase tracking-wider hover:bg-[#059669] transition-all">
              Select Files
            </span>
          </div>

          {isDecoding && (
            <div className="flex items-center gap-2 text-[#10b981] text-xs font-semibold">
              <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Decoding audio…
            </div>
          )}

          {tracks.length === 0 ? (
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 text-center text-gray-500 text-xs">
              <MusicNotes className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              No tracks yet — upload at least two to merge.
            </div>
          ) : (
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 shadow-sm flex flex-col gap-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Merge Order (top plays first)</span>
              {tracks.map((track, idx) => (
                <div key={`${track.name}-${idx}`} className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-3 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#10b981]/10 text-[#10b981] text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{track.name}</div>
                    <div className="text-[11px] text-gray-500 font-mono">
                      {formatTime(track.durationSeconds)} · {track.channels.length}ch · {track.sampleRate} Hz · {formatFileSize(track.size)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveTrack(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Move ${track.name} up`}
                      className="px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveTrack(idx, 1)}
                      disabled={idx === tracks.length - 1}
                      aria-label={`Move ${track.name} down`}
                      className="px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeTrack(idx)}
                      aria-label={`Remove ${track.name}`}
                      className="p-1.5 text-gray-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tracks.length > 0 && tracks.length < 2 && (
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3">
              <WarningCircle className="w-4 h-4 shrink-0" />
              Add one more track — merging needs at least two.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
