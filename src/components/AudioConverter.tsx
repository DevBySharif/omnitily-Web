import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Download,
  MusicNotes,
  Shuffle,
  Sliders,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { formatFileSize } from '../lib/imageTools';
import {
  encodeWavPcm16,
  validateVideoMediaFile,
  validateWebmBytes
} from '../lib/toolTransforms';

export interface AudioConverterProps {
  onBack: () => void;
  initialFile?: File;
}

export type OutputFormatId = 'wav' | 'webm' | 'ogg' | 'mp3' | 'flac';

export interface OutputFormatOption {
  id: OutputFormatId;
  label: string;
  extension: string;
  mimeType: string;
  available: boolean;
  unavailableReason?: string;
}

/**
 * Which output formats this browser can actually produce, probed at runtime.
 * WAV is always available (hand-rolled 16-bit PCM encoder). WebM/OGG depend
 * on MediaRecorder support. MP3 and FLAC are never available: browsers ship
 * no MP3 or FLAC encoder, and encoding them would need a native codec
 * library (e.g. lamejs) — no new dependencies are added for this tool, so
 * they are shown as unavailable with the reason rather than faked.
 */
export function outputFormatOptions(
  isTypeSupported: (mimeType: string) => boolean
): OutputFormatOption[] {
  const safeCheck = (mimeType: string): boolean => {
    try {
      return isTypeSupported(mimeType);
    } catch (e) {
      return false;
    }
  };
  return [
    {
      id: 'wav',
      label: 'WAV (16-bit PCM)',
      extension: 'wav',
      mimeType: 'audio/wav',
      available: true,
    },
    {
      id: 'webm',
      label: 'WebM (Opus)',
      extension: 'webm',
      mimeType: 'audio/webm;codecs=opus',
      available: safeCheck('audio/webm;codecs=opus') || safeCheck('audio/webm'),
      unavailableReason: 'This browser cannot record WebM audio.',
    },
    {
      id: 'ogg',
      label: 'OGG (Opus)',
      extension: 'ogg',
      mimeType: 'audio/ogg;codecs=opus',
      available: safeCheck('audio/ogg;codecs=opus') || safeCheck('audio/ogg'),
      unavailableReason: 'This browser cannot record OGG audio (Firefox supports it).',
    },
    {
      id: 'mp3',
      label: 'MP3',
      extension: 'mp3',
      mimeType: 'audio/mpeg',
      available: false,
      unavailableReason: 'Browsers ship no MP3 encoder — MP3 output needs a native codec library, which this tool does not bundle.',
    },
    {
      id: 'flac',
      label: 'FLAC',
      extension: 'flac',
      mimeType: 'audio/flac',
      available: false,
      unavailableReason: 'Browsers ship no FLAC encoder — FLAC output needs a native codec library, which this tool does not bundle.',
    },
  ];
}

/** The MediaRecorder MIME type to use for a container format, or null. */
export function pickRecorderMimeType(
  format: OutputFormatId,
  isTypeSupported: (mimeType: string) => boolean
): string | null {
  const candidates =
    format === 'webm'
      ? ['audio/webm;codecs=opus', 'audio/webm']
      : format === 'ogg'
        ? ['audio/ogg;codecs=opus', 'audio/ogg']
        : [];
  for (const candidate of candidates) {
    try {
      if (isTypeSupported(candidate)) return candidate;
    } catch (e) {
      // Ignore a throwing probe and try the next candidate.
    }
  }
  return null;
}

export function buildConvertedFileName(originalName: string, extension: string): string {
  const base = (originalName.replace(/\.[^.]+$/, '') || 'audio').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${base}.${extension}`;
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
 * Audio Format Converter — fully client-side.
 *
 * Real conversions: any decodable input → WAV (16-bit PCM, always) and →
 * WebM/Opus or OGG/Opus via MediaRecorder re-encode when the browser
 * supports it. MP3 and FLAC are honestly unavailable in-browser (no native
 * encoder); the UI says so instead of producing a mislabeled file.
 */
export default function AudioConverter({ onBack, initialFile }: AudioConverterProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [duration, setDuration] = useState(0);
  const [formats, setFormats] = useState<OutputFormatOption[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<OutputFormatId>('wav');
  const [isDecoding, setIsDecoding] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFormat, setResultFormat] = useState<OutputFormatOption | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const resultUrlRef = useRef('');
  const bufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    resultUrlRef.current = resultUrl;
  }, [resultUrl]);

  useEffect(() => {
    bufferRef.current = buffer;
  }, [buffer]);

  useEffect(() => {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
      setFormats(outputFormatOptions((t) => MediaRecorder.isTypeSupported(t)));
    } else {
      setFormats(outputFormatOptions(() => false));
    }
  }, []);

  useEffect(() => {
    return () => {
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
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      setFile(selected);
      setBuffer(decoded);
      setDuration(decoded.duration);
      setResultUrl('');
      setResultBlob(null);
      setResultFormat(null);
    } catch (err) {
      console.error('Convert decode failed:', err);
      toast.error('Decode Failed', `"${selected.name}" could not be decoded by this browser.`);
    } finally {
      setIsDecoding(false);
    }
  };

  const clearFile = () => {
    if (resultUrlRef.current) {
      try { URL.revokeObjectURL(resultUrlRef.current); } catch (e) {}
      resultUrlRef.current = '';
    }
    setFile(null);
    setBuffer(null);
    setDuration(0);
    setResultUrl('');
    setResultBlob(null);
    setResultFormat(null);
  };

  const convertToWav = (decoded: AudioBuffer): Blob => {
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
      channels.push(decoded.getChannelData(ch).slice());
    }
    return new Blob([encodeWavPcm16(channels, decoded.sampleRate)], { type: 'audio/wav' });
  };

  const convertViaMediaRecorder = async (
    decoded: AudioBuffer,
    format: OutputFormatOption
  ): Promise<Blob> => {
    const ctx = audioCtxRef.current;
    if (!ctx) throw new Error('No audio context available.');
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('This browser does not support MediaRecorder.');
    }
    // The Convert click is a user gesture, so a suspended context can resume.
    try {
      if (ctx.state === 'suspended') await ctx.resume();
    } catch (e) {}
    const mimeType = pickRecorderMimeType(format.id, (t) => MediaRecorder.isTypeSupported(t));
    if (!mimeType) throw new Error(`${format.label} is not supported by this browser.`);
    const destination = ctx.createMediaStreamDestination();
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(destination);
    const recorder = new MediaRecorder(destination.stream, { mimeType });
    const chunks: Blob[] = [];
    const done = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.onerror = () => reject(new Error('MediaRecorder reported an error.'));
      // Safety timeout: never hang longer than the track + 10s.
      window.setTimeout(() => {
        if (recorder.state !== 'inactive') {
          try { recorder.stop(); } catch (e) {}
        }
      }, (decoded.duration + 10) * 1000);
    });
    recorder.start(250);
    source.start();
    source.onended = () => {
      // Give the recorder a moment to flush its final chunk.
      window.setTimeout(() => {
        try {
          if (recorder.state !== 'inactive') recorder.stop();
        } catch (e) {}
      }, 250);
    };
    const blob = await done;
    if (blob.size === 0) throw new Error('The conversion produced an empty file.');
    return blob;
  };

  const handleConvert = async () => {
    const decoded = bufferRef.current;
    const format = formats.find((f) => f.id === selectedFormat);
    if (!decoded || !file || !format) return;
    if (!format.available) {
      toast.error('Format Unavailable', format.unavailableReason ?? 'This format cannot be produced in your browser.');
      return;
    }
    setIsConverting(true);
    try {
      let blob: Blob;
      if (format.id === 'wav') {
        blob = convertToWav(decoded);
      } else {
        blob = await convertViaMediaRecorder(decoded, format);
        if (format.id === 'webm') {
          // Validate the container magic before offering the download.
          const bytes = new Uint8Array(await blob.arrayBuffer());
          validateWebmBytes(bytes);
        }
      }
      if (resultUrlRef.current) {
        try { URL.revokeObjectURL(resultUrlRef.current); } catch (e) {}
      }
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultBlob(blob);
      setResultFormat(format);
      try {
        confetti({ particleCount: 80, spread: 65 });
      } catch (e) {}
      toast.success('Converted', `${file.name} → ${format.label} (${formatFileSize(blob.size)}).`);
    } catch (err) {
      console.error('Conversion failed:', err);
      toast.error('Conversion Failed', err instanceof Error ? err.message : 'The file could not be converted.');
    } finally {
      setIsConverting(false);
    }
  };

  const triggerDownload = () => {
    if (!resultUrl || !file || !resultFormat) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = buildConvertedFileName(file.name, resultFormat.extension);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const selectedOption = formats.find((f) => f.id === selectedFormat);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="audio-converter-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Shuffle className="w-8 h-8 text-[#10b981]" />
            Audio Format Converter
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Convert audio files between formats entirely in your browser — no upload, no server.
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
            <h2 className="font-sans text-lg text-white">Output Format</h2>
          </div>

          <div className="flex flex-col gap-2">
            {formats.map((format) => (
              <button
                key={format.id}
                onClick={() => {
                  setSelectedFormat(format.id);
                  setResultUrl('');
                  setResultBlob(null);
                  setResultFormat(null);
                }}
                disabled={!format.available}
                aria-label={format.available ? `Convert to ${format.label}` : `${format.label} unavailable: ${format.unavailableReason ?? ''}`}
                className={`text-left px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                  selectedFormat === format.id && format.available
                    ? 'border-[#10b981] bg-[#10b981]/10 text-white'
                    : format.available
                      ? 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                      : 'border-[#2a2a2a] text-gray-600 bg-[#111111] cursor-not-allowed'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-2">
                  {format.label}
                  {!format.available && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded">
                      Unavailable
                    </span>
                  )}
                </div>
                {!format.available && format.unavailableReason && (
                  <div className="text-[11px] text-gray-500 mt-1 leading-relaxed">{format.unavailableReason}</div>
                )}
              </button>
            ))}
          </div>

          {file && buffer && (
            <div className="bg-[#151515] border border-[#2a2a2a] rounded p-3 text-xs flex flex-col gap-1.5 text-gray-400 font-medium font-mono">
              <div><span className="font-bold text-gray-300">Track:</span> {file.name}</div>
              <div><span className="font-bold text-gray-300">Input:</span> {file.type || 'audio'} · {formatFileSize(file.size)}</div>
              <div><span className="font-bold text-gray-300">Duration:</span> {formatTime(duration)}</div>
              <div><span className="font-bold text-gray-300">Channels:</span> {buffer.numberOfChannels} · {buffer.sampleRate} Hz</div>
            </div>
          )}

          <button
            onClick={() => void handleConvert()}
            disabled={!buffer || isConverting || isDecoding || !selectedOption?.available}
            className={`w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              !buffer || !selectedOption?.available
                ? 'bg-[#151515] text-gray-600 border border-[#2a2a2a] cursor-not-allowed shadow-none'
                : 'bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md'
            }`}
          >
            {isConverting ? (
              <>
                <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Converting…
              </>
            ) : (
              <>
                <Shuffle className="w-4 h-4" /> Convert to {selectedOption?.label ?? 'WAV'}
              </>
            )}
          </button>

          {resultUrl && resultBlob && resultFormat && file && (
            <div className="flex flex-col gap-2">
              <div className="bg-emerald-950/20 text-emerald-300 rounded p-3 text-xs flex items-center gap-2 border border-emerald-900/40">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">Converted — {resultFormat.label} · {formatFileSize(resultBlob.size)}</span>
              </div>
              <button
                onClick={triggerDownload}
                className="w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download .{resultFormat.extension}
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
              aria-label="Upload an audio file to convert. Drop a file or press Enter to browse."
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[220px] focus:outline-none focus:border-[#10b981]/70 ${
                isDragging ? 'border-[#10b981] bg-[#10b981]/10' : 'border-[#2a2a2a] hover:border-[#10b981]/40 bg-[#0d0d0d]'
              }`}
            >
              <input
                id="audio-converter-file-input"
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files) void handleFiles(Array.from(e.target.files));
                  e.target.value = '';
                }}
                accept="audio/*"
                aria-label="Choose an audio file to convert"
                className="hidden"
              />
              <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-3 group-hover:scale-105 transition-transform text-[#10b981]">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-white font-sans text-base">Drag &amp; drop your audio file</h3>
              <p className="text-gray-500 text-xs mt-1 mb-3">MP3, WAV, OGG, M4A, FLAC, AAC — decoded in your browser</p>
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
                    {formatTime(duration)} · {buffer?.numberOfChannels ?? 0}ch · {buffer?.sampleRate ?? 0} Hz · {formatFileSize(file.size)}
                  </div>
                </div>
              </div>
              {isDecoding && (
                <div className="flex items-center gap-2 text-[#10b981] text-xs font-semibold">
                  <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Decoding audio…
                </div>
              )}
              <p className="text-[11px] text-gray-500 leading-relaxed">
                WAV output is lossless PCM, re-encoded sample-for-sample from the decoded audio.
                WebM/OGG output is re-recorded through the browser&apos;s Opus encoder, so it is
                lossy — like any format conversion to a compressed codec.
              </p>
            </div>
          )}

          {file && !buffer && (
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3">
              <WarningCircle className="w-4 h-4 shrink-0" />
              Still decoding &ldquo;{file.name}&rdquo; — if this stays, the file may be corrupt.
            </div>
          )}

          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
              Why no MP3 / FLAC?
            </span>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Browsers can decode MP3 and FLAC but ship no encoder for them. Producing those
              formats client-side needs a native codec library bundled into the site, which this
              tool does not add. WAV (lossless) and WebM/Opus (small, widely playable) cover the
              conversions a browser can do honestly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
