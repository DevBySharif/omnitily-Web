import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Download,
  Microphone,
  Pause,
  Play,
  Record,
  Stop,
  Trash,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { formatFileSize } from '../lib/imageTools';

export interface SoundRecorderProps {
  onBack: () => void;
}

/**
 * Pick the best MediaRecorder MIME type this browser can actually record.
 * Chromium records audio/webm (Opus); Firefox also supports audio/ogg.
 * Returns null when MediaRecorder has no usable audio type.
 */
export function pickRecorderMimeType(
  isTypeSupported: (mimeType: string) => boolean
): string | null {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
    'audio/wav',
  ];
  for (const candidate of candidates) {
    try {
      if (isTypeSupported(candidate)) return candidate;
    } catch (e) {
      // Ignore a throwing probe and try the next candidate.
    }
  }
  return null;
}

/** Extension that matches a recorder MIME type. */
export function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

export function buildRecordingFileName(mimeType: string, recordedAt: Date = new Date()): string {
  const stamp = recordedAt
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
  return `recording_${stamp}.${extensionForMimeType(mimeType)}`;
}

export function formatRecorderTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export interface Recording {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  durationSeconds: number;
  url: string;
  blob: Blob;
}

export default function SoundRecorder({ onBack }: SoundRecorderProps) {
  const toast = useToast();
  const [micState, setMicState] = useState<'idle' | 'requesting' | 'ready' | 'denied' | 'unsupported'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meterFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const pausedTotalRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const recordingsRef = useRef<Recording[]>([]);

  useEffect(() => {
    recordingsRef.current = recordings;
  }, [recordings]);

  useEffect(() => {
    return () => {
      stopMeter();
      if (timerRef.current) clearInterval(timerRef.current);
      try {
        if (recorderRef.current?.state !== 'inactive') {
          recorderRef.current?.stop();
        }
      } catch (e) {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        void audioCtxRef.current?.close();
      } catch (e) {}
      recordingsRef.current.forEach((r) => {
        try { URL.revokeObjectURL(r.url); } catch (e) {}
      });
    };
  }, []);

  const stopMeter = () => {
    if (meterFrameRef.current !== null) {
      cancelAnimationFrame(meterFrameRef.current);
      meterFrameRef.current = null;
    }
    setLevel(0);
  };

  const startMeter = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      setLevel(Math.min(1, Math.sqrt(sum / data.length) * 3));
      meterFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const requestMic = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicState('unsupported');
      toast.error('Microphone Unavailable', 'This browser does not expose microphone capture.');
      return false;
    }
    setMicState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        const ctx = new Ctor();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;
      }
      setMicState('ready');
      return true;
    } catch (err) {
      console.error('Microphone access failed:', err);
      setMicState('denied');
      toast.error(
        'Microphone Blocked',
        'Allow microphone access in the browser prompt to record. Check the site permission if the prompt never appeared.'
      );
      return false;
    }
  };

  const startRecording = async () => {
    if (isRecording) return;
    let stream = streamRef.current;
    if (!stream || micState !== 'ready') {
      const ok = await requestMic();
      if (!ok) return;
      stream = streamRef.current;
      if (!stream) return;
    }
    if (typeof MediaRecorder === 'undefined') {
      toast.error('Recording Unsupported', 'This browser does not support MediaRecorder.');
      return;
    }
    const mimeType = pickRecorderMimeType((t) => MediaRecorder.isTypeSupported(t));
    if (!mimeType) {
      toast.error('Recording Unsupported', 'This browser cannot record audio in any known format.');
      return;
    }
    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const durationSeconds = Math.max(0, (Date.now() - startedAtRef.current - pausedTotalRef.current) / 1000);
        if (blob.size > 0) {
          const name = buildRecordingFileName(mimeType);
          const rec: Recording = {
            id: Math.random().toString(36).substring(2, 9),
            name,
            mimeType,
            size: blob.size,
            durationSeconds,
            url: URL.createObjectURL(blob),
            blob,
          };
          setRecordings((prev) => [rec, ...prev]);
          try {
            confetti({ particleCount: 60, spread: 50 });
          } catch (e) {}
          toast.success('Recording Saved', `"${name}" — ${formatRecorderTime(durationSeconds)} (${formatFileSize(blob.size)}).`);
        } else {
          toast.error('Empty Recording', 'No audio was captured — the microphone may have produced no input.');
        }
        setIsRecording(false);
        setIsPaused(false);
        setElapsed(0);
        stopMeter();
      };
      recorder.onerror = () => {
        toast.error('Recording Failed', 'The recorder reported an error and stopped.');
        setIsRecording(false);
        setIsPaused(false);
      };
      recorder.start(250);
      startedAtRef.current = Date.now();
      pausedTotalRef.current = 0;
      pausedAtRef.current = null;
      setIsRecording(true);
      setIsPaused(false);
      setElapsed(0);
      startMeter();
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - startedAtRef.current - pausedTotalRef.current) / 1000);
      }, 200);
    } catch (err) {
      console.error('MediaRecorder start failed:', err);
      toast.error('Recording Failed', 'The recorder could not start with this microphone.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch (e) {
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const togglePause = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    try {
      if (recorder.state === 'recording') {
        recorder.pause();
        pausedAtRef.current = Date.now();
        setIsPaused(true);
        stopMeter();
      } else if (recorder.state === 'paused') {
        recorder.resume();
        if (pausedAtRef.current !== null) {
          pausedTotalRef.current += Date.now() - pausedAtRef.current;
          pausedAtRef.current = null;
        }
        setIsPaused(false);
        startMeter();
      }
    } catch (e) {
      toast.error('Pause Failed', 'This browser could not pause the recording.');
    }
  };

  const downloadRecording = (rec: Recording) => {
    const a = document.createElement('a');
    a.href = rec.url;
    a.download = rec.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const deleteRecording = (id: string) => {
    setRecordings((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) {
        try { URL.revokeObjectURL(target.url); } catch (e) {}
      }
      return prev.filter((r) => r.id !== id);
    });
    if (playingId === id) setPlayingId(null);
  };

  const togglePlay = (rec: Recording) => {
    if (playingId === rec.id) {
      audioElRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
    }
    const audio = new Audio(rec.url);
    audioElRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      setPlayingId(null);
      toast.error('Playback Failed', 'This browser could not play back the recording.');
    };
    void audio.play().catch(() => {
      setPlayingId(null);
      toast.error('Playback Failed', 'This browser could not play back the recording.');
    });
    setPlayingId(rec.id);
  };

  const micSupported =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="sound-recorder-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Microphone className="w-8 h-8 text-[#10b981]" />
            High-Fidelity Voice Recorder
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Record vocal memos and sound feeds straight from your microphone. Everything stays on your device.
          </p>
        </div>
      </div>

      {!micSupported && (
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3 mb-6">
          <WarningCircle className="w-4 h-4 shrink-0" />
          This browser or page context does not expose microphone capture, so recording is unavailable here.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col items-center gap-4 pt-2">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all ${
                isRecording
                  ? 'border-red-500 bg-red-950/40 text-red-400'
                  : 'border-[#2a2a2a] bg-[#151515] text-[#10b981]'
              }`}
              aria-label={isRecording ? 'Recording in progress' : 'Recorder idle'}
            >
              <Microphone className={`w-10 h-10 ${isRecording && !isPaused ? 'animate-pulse' : ''}`} />
            </div>
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-white tabular-nums" data-testid="recorder-timer">
                {formatRecorderTime(elapsed)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {isRecording ? (isPaused ? 'Paused' : 'Recording…') : micState === 'denied' ? 'Microphone blocked' : 'Ready'}
              </div>
            </div>

            {/* Live input level */}
            <div className="w-full">
              <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                <span>Input Level</span>
                <span>{Math.round(level * 100)}%</span>
              </div>
              <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden" aria-label="Microphone input level">
                <div
                  className={`h-full transition-all duration-100 ${level > 0.85 ? 'bg-red-500' : 'bg-[#10b981]'}`}
                  style={{ width: `${Math.round(level * 100)}%` }}
                />
              </div>
            </div>

            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={micState === 'requesting' || !micSupported}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 disabled:bg-[#1a1a1a] disabled:text-gray-600 text-white rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {micState === 'requesting' ? (
                  <>
                    <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Requesting Mic…
                  </>
                ) : (
                  <>
                    <Record className="w-4 h-4" /> Start Recording
                  </>
                )}
              </button>
            ) : (
              <div className="w-full flex flex-col gap-2">
                <button
                  onClick={togglePause}
                  className="w-full py-3 px-4 bg-[#151515] hover:bg-[#1d1d1d] border border-[#2a2a2a] text-white rounded font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4" /> Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" /> Pause
                    </>
                  )}
                </button>
                <button
                  onClick={stopRecording}
                  className="w-full py-3 px-4 bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Stop className="w-4 h-4" /> Stop &amp; Save
                </button>
              </div>
            )}
            <p className="text-[11px] text-gray-500 text-center leading-relaxed">
              Recordings are captured with MediaRecorder in your browser&apos;s native format
              (usually WebM / Opus). Grant microphone permission when prompted.
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a]">
              <CheckCircle className="w-5 h-5 text-[#10b981]" />
              <h2 className="font-sans text-lg text-white">Your Recordings ({recordings.length})</h2>
            </div>
            {recordings.length === 0 ? (
              <div className="py-12 text-center text-gray-500 flex flex-col items-center gap-2">
                <Microphone className="w-8 h-8 text-gray-600" />
                <span className="text-xs font-medium">No recordings yet</span>
                <span className="text-[11px] text-gray-600 px-6">
                  Press Start Recording, speak, then stop — your take appears here for playback and download.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-4">
                {recordings.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-3 flex items-center gap-3"
                    data-testid={`recording-${rec.id}`}
                  >
                    <button
                      onClick={() => togglePlay(rec)}
                      aria-label={playingId === rec.id ? `Pause ${rec.name}` : `Play ${rec.name}`}
                      className="p-2.5 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] rounded transition-colors cursor-pointer shrink-0"
                    >
                      {playingId === rec.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{rec.name}</div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        {formatRecorderTime(rec.durationSeconds)} · {formatFileSize(rec.size)} · {rec.mimeType}
                      </div>
                    </div>
                    <button
                      onClick={() => downloadRecording(rec)}
                      aria-label={`Download ${rec.name}`}
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer shrink-0"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRecording(rec.id)}
                      aria-label={`Delete ${rec.name}`}
                      className="p-2 text-gray-500 hover:text-rose-400 cursor-pointer shrink-0"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
