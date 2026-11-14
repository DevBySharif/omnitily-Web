import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle,
  Download,
  MusicNotes,
  Sliders,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { formatFileSize } from '../lib/imageTools';
import { encodeWavPcm16 } from '../lib/toolTransforms';

/**
 * Vocal reducer — an HONEST approximate effect, not true vocal removal.
 *
 * True vocal removal (source separation) needs a trained model and cannot
 * run in a browser without one. What this tool does is the classic
 * center-channel extraction ("karaoke effect"): in a stereo mix, sounds
 * panned dead-center — usually the lead vocal, but also kick, bass and
 * snare — are identical in both channels. Subtracting one channel from the
 * other cancels whatever is identical, leaving the "side" signal:
 *   outL = (L − R) / 2,  outR = (R − L) / 2.
 *
 * The UI calls this a "vocal reducer" and states the limits up front:
 * centered instruments are reduced along with the vocal; vocals with
 * stereo reverb, chorus, doubling, or off-center panning survive in part;
 * mono files have no stereo center to extract and are refused honestly.
 * The tool never claims separation it does not perform.
 */

export interface VocalReductionStats {
  /** Fraction of the mix's energy that is center (identical) content, 0–1. */
  centerEnergyShare: number;
  /** RMS of the side (kept) signal relative to the original mix RMS. */
  keptEnergyRatio: number;
}

/** The side signal: everything NOT identical in both channels. */
export function extractSideChannels(left: Float32Array, right: Float32Array): { left: Float32Array; right: Float32Array } {
  const length = Math.min(left.length, right.length);
  const outLeft = new Float32Array(length);
  const outRight = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const side = (left[i] - right[i]) / 2;
    outLeft[i] = side;
    outRight[i] = -side;
  }
  return { left: outLeft, right: outRight };
}

/** The center signal (what is removed): the part identical in both channels. */
export function extractCenterMono(left: Float32Array, right: Float32Array): Float32Array {
  const length = Math.min(left.length, right.length);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = (left[i] + right[i]) / 2;
  return out;
}

export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

/**
 * Measure how much of the mix is center content. A high center share
 * (e.g. > 0.5) means the mix is mostly centered material, so the reducer
 * will eat a lot of the music too — the UI warns about exactly that.
 */
export function measureCenterShare(left: Float32Array, right: Float32Array): VocalReductionStats {
  const center = extractCenterMono(left, right);
  const side = extractSideChannels(left, right);
  const centerRms = rms(center);
  const sideRms = rms(side.left);
  const origRms = Math.sqrt((rms(left) ** 2 + rms(right) ** 2) / 2);
  const totalEnergy = centerRms ** 2 + sideRms ** 2;
  const centerEnergyShare = totalEnergy > 0 ? centerRms ** 2 / totalEnergy : 0;
  const keptEnergyRatio = origRms > 0 ? sideRms / origRms : 0;
  return { centerEnergyShare, keptEnergyRatio };
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function buildVocalReducedFileName(originalName: string): string {
  const base = (originalName.replace(/\.[^.]+$/, '') || 'audio').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${base}_vocal-reduced.wav`;
}

interface DecodedStereo {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
  durationSeconds: number;
}

export default function VocalRemover({ onBack, initialFile }: { onBack: () => void; initialFile?: File }) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [decoded, setDecoded] = useState<DecodedStereo | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<VocalReductionStats | null>(null);
  const [resultUrl, setResultUrl] = useState('');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAudio = async (selected: File) => {
    setError('');
    setStats(null);
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
        if (audioBuffer.numberOfChannels < 2) {
          throw new Error('This is a mono file. Center-channel extraction needs stereo audio — a mono file has no left/right difference to work with.');
        }
        if (audioBuffer.length === 0) throw new Error('The file decoded to empty audio.');
        const left = new Float32Array(audioBuffer.getChannelData(0));
        const right = new Float32Array(audioBuffer.getChannelData(1));
        setFile(selected);
        setDecoded({ left, right, sampleRate: audioBuffer.sampleRate, durationSeconds: audioBuffer.length / audioBuffer.sampleRate });
        setStats(measureCenterShare(left, right));
      } finally {
        try { await ctx.close(); } catch (e) {}
      }
    } catch (err) {
      setError(err instanceof Error ? `Could not process "${selected.name}": ${err.message}` : 'Could not decode this audio file.');
    } finally {
      setIsDecoding(false);
    }
  };

  useEffect(() => {
    if (initialFile) loadAudio(initialFile);
  }, [initialFile]);

  const handleReduce = () => {
    if (!decoded) return;
    try {
      const side = extractSideChannels(decoded.left, decoded.right);
      const wav = encodeWavPcm16([side.left, side.right], decoded.sampleRate);
      const blob = new Blob([wav], { type: 'audio/wav' });
      if (resultUrl) {
        try { URL.revokeObjectURL(resultUrl); } catch (e) {}
      }
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultBlob(blob);
      try { confetti({ particleCount: 80, spread: 60 }); } catch (e) {}
      toast.success('Vocal Reduction Done', 'Center content was removed with the (L − R) / 2 side signal. Listen to the result — some vocal reverb may remain.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The reduced WAV could not be encoded.');
    }
  };

  const downloadResult = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = buildVocalReducedFileName(file.name);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="vocal-remover-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <MusicNotes className="w-8 h-8 text-[#10b981]" />
            Vocal Reducer
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Approximate center-channel extraction (the classic karaoke effect) for stereo mixes. This is <strong className="text-white">not</strong> true vocal separation — see the limits below.
          </p>
        </div>
        {file && (
          <button
            onClick={() => { setFile(null); setDecoded(null); setStats(null); setResultUrl(''); setResultBlob(null); }}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
          >
            Clear Audio
          </button>
        )}
      </div>

      <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3 mb-8 text-xs text-amber-200 leading-relaxed flex items-start gap-2">
        <WarningCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          <strong>Honest limits:</strong> true vocal removal needs AI source separation, which no browser does on its own. This tool subtracts the two stereo channels (L − R), which cancels whatever is panned dead-center — usually the lead vocal, but also centered kick, bass and snare. Vocals with stereo reverb, chorus, doubling or off-center panning will partly survive, and the result is mono-like by nature. Best on studio stereo mixes with a centered vocal; useless on mono files.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a]">
            <Sliders className="w-5 h-5 text-[#10b981]" />
            <h2 className="font-sans text-lg text-white">Reduce Vocals</h2>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            className="border-2 border-dashed border-[#2a2a2a] hover:border-[#10b981]/50 rounded-xl p-6 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group"
          >
            <input
              id="vocal-file-input"
              data-testid="vocal-file-input"
              type="file"
              ref={fileInputRef}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadAudio(f); }}
              accept="audio/*"
              className="hidden"
            />
            <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-2 group-hover:scale-105 transition-transform text-[#10b981]">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-white font-sans text-sm">{file ? file.name : 'Upload a stereo audio file'}</h3>
            <p className="text-gray-500 text-xs mt-1">{file ? formatFileSize(file.size) : 'WAV, MP3, WebM, OGG and more — stereo only'}</p>
          </div>

          <button
            onClick={handleReduce}
            disabled={!decoded || isDecoding}
            data-testid="vocal-reduce"
            className="w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDecoding ? 'Decoding Audio…' : 'Reduce Center Vocals & Make WAV'}
          </button>

          {resultUrl && resultBlob && (
            <button
              onClick={downloadResult}
              data-testid="vocal-download"
              className="w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Reduced WAV ({formatFileSize(resultBlob.size)})
            </button>
          )}
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          {error && (
            <div data-testid="vocal-error" className="p-4 rounded-xl border border-rose-900/50 bg-rose-950/10 text-rose-300 text-xs flex items-start gap-2">
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
              <p className="text-xs max-w-sm">Upload a stereo song to measure how much of it is center content, then reduce the center channel and download the result as WAV.</p>
            </div>
          )}
          {decoded && stats && (
            <div data-testid="vocal-result" className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a] mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h2 className="font-sans text-lg text-white">Stereo Mix Analyzed</h2>
                <span className="text-xs text-gray-400 ml-auto">
                  {decoded.durationSeconds.toFixed(2)} s · stereo · {decoded.sampleRate} Hz
                </span>
              </div>
              <dl className="flex flex-col divide-y divide-[#1a1a1a]">
                <div className="flex items-start justify-between gap-4 py-2.5">
                  <dt className="text-xs text-gray-400 font-semibold">Center content (what gets reduced)</dt>
                  <dd className="text-xs text-white font-mono text-right">{formatPercent(stats.centerEnergyShare)} of the mix energy</dd>
                </div>
                <div className="flex items-start justify-between gap-4 py-2.5">
                  <dt className="text-xs text-gray-400 font-semibold">Side content kept (relative loudness)</dt>
                  <dd className="text-xs text-white font-mono text-right">{formatPercent(stats.keptEnergyRatio)} of the original RMS</dd>
                </div>
              </dl>
              {stats.centerEnergyShare > 0.5 && (
                <p className="text-amber-300 text-xs mt-3 flex items-start gap-2">
                  <WarningCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  Over half of this mix is center content — reducing it will also thin out the kick, bass and other centered instruments, not just the vocal.
                </p>
              )}
              {resultUrl && (
                <p className="text-emerald-400 text-xs font-semibold mt-4">
                  Reduced WAV ready — center channel removed with the (L − R) / 2 side signal. Download it from the left panel.
                </p>
              )}
            </div>
          )}
          <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-5 text-xs text-gray-400 font-medium leading-relaxed">
            <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest block mb-2 font-mono">How It Works</span>
            In a stereo mix, a sound panned dead-center is identical in both channels. Subtracting the right channel from the left cancels that identical part and leaves the “side” signal — the stereo difference. The output is that side signal as a WAV. It is a well-known karaoke effect, not AI separation, and the result should be judged by listening, not by the name of the button.
          </div>
        </div>
      </div>
    </div>
  );
}
