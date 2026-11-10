import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FilmStrip,
  Pause,
  Play,
  Plus,
  Scissors,
  Sliders,
  Sparkle,
  SpeakerHigh,
  Trash,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { buildVideoOutputFilename, reencodeVideo, validateVideoSegments } from '../lib/toolTransforms';

interface VideoSplitterProps {
  onBack: () => void;
  initialFile?: File;
}

interface VideoSegment {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
  trimmedUrl: string | null;
}

export default function VideoSplitter({ onBack, initialFile }: VideoSplitterProps) {
  const toast = useToast();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  
  // Single Trim export states
  const [splitProgress, setSplitProgress] = useState<number>(0);
  const [splitStatus, setSplitStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [splitLogs, setSplitLogs] = useState<string[]>([]);
  const [trimmedVideoUrl, setTrimmedVideoUrl] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0.8);

  // Multi-Segment Split states
  const [splitMode, setSplitMode] = useState<'trim' | 'batch'>('trim');
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);

  // Abort handle for the currently running re-encode (trim or batch).
  const splitAbortRef = useRef<AbortController | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial file if provided
  useEffect(() => {
    if (initialFile) {
      loadVideo(initialFile);
    }
  }, [initialFile]);

  // Sync timelines
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime >= endTime && isPlaying && splitMode === 'trim') {
        video.pause();
        setIsPlaying(false);
        video.currentTime = startTime;
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setEndTime(video.duration);
      setStartTime(0);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoSrc, startTime, endTime, isPlaying, splitMode]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      loadVideo(e.target.files[0]);
    }
  };

  const loadVideo = (file: File) => {
    if (!file.type.startsWith('video/')) return;
    setVideoFile(file);
    const src = URL.createObjectURL(file);
    setVideoSrc(src);
    setTrimmedVideoUrl(null);
    setSplitStatus('idle');
    setSplitLogs([]);
    setSplitProgress(0);
    setIsPlaying(false);
    setSegments([]);
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      if (video.currentTime >= endTime || video.currentTime < startTime) {
        video.currentTime = startTime;
      }
      video.play().then(() => setIsPlaying(true));
    }
  };

  const scrubTo = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleStartChange = (val: number) => {
    const newStart = Math.min(val, endTime - 0.2);
    setStartTime(newStart);
    scrubTo(newStart);
  };

  const handleEndChange = (val: number) => {
    const newEnd = Math.max(val, startTime + 0.2);
    setEndTime(newEnd);
    scrubTo(newEnd);
  };

  const addLog = (msg: string) => {
    setSplitLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Add current active slider range as a segment
  const addSegment = () => {
    const id = Math.random().toString(36).substring(2, 9);
    const name = `Segment ${segments.length + 1} (${formatTime(startTime)} - ${formatTime(endTime)})`;
    const newSeg: VideoSegment = {
      id,
      name,
      startTime,
      endTime,
      status: 'idle',
      progress: 0,
      trimmedUrl: null
    };
    setSegments(prev => [...prev, newSeg]);
  };

  const removeSegment = (id: string) => {
    setSegments(prev => {
      const target = prev.find(seg => seg.id === id);
      if (target?.trimmedUrl) URL.revokeObjectURL(target.trimmedUrl);
      return prev.filter(seg => seg.id !== id);
    });
  };

  const clearSegments = () => {
    segments.forEach(seg => {
      if (seg.trimmedUrl) URL.revokeObjectURL(seg.trimmedUrl);
    });
    setSegments([]);
  };

  // Trims video client-side with a real re-encode: the selected range is
  // decoded, drawn to a canvas and recorded with MediaRecorder into a
  // verified WebM file. There is deliberately NO byte-slicing path — cutting
  // container bytes by time-ratio produces structurally invalid files.
  const handleSplitVideo = async () => {
    if (!videoFile || !videoRef.current) return;
    setSplitStatus('processing');
    setSplitProgress(0);
    setSplitLogs([]);
    setTrimmedVideoUrl(null);

    addLog('Starting trim — re-encoding in your browser (WebM output)...');
    addLog(`Target segment: ${formatTime(startTime)} to ${formatTime(endTime)} (${formatTime(endTime - startTime)} duration)`);

    const controller = new AbortController();
    splitAbortRef.current = controller;
    try {
      const result = await reencodeVideo({
        file: videoFile,
        startTime,
        endTime,
        onProgress: (fraction) => setSplitProgress(Math.round(fraction * 95)),
        signal: controller.signal,
      });
      const url = URL.createObjectURL(result.blob);
      setTrimmedVideoUrl(url);
      setSplitStatus('completed');
      setSplitProgress(100);
      const verifiedDuration = result.outputDurationSeconds ?? result.recordedWallSeconds;
      addLog(`Verified WebM output: ${result.width}x${result.height}, ${verifiedDuration.toFixed(1)}s${result.hasAudio ? ', audio kept' : ', no audio track captured'}.`);
      addLog('Trimmed video package created successfully!');
      confetti({ particleCount: 100, spread: 70 });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        addLog('Trim cancelled. No file was produced.');
      } else {
        addLog(`Trim failed: ${err instanceof Error ? err.message : 'Unknown error'}. No file was produced.`);
      }
      setSplitStatus('failed');
      setSplitProgress(0);
    } finally {
      splitAbortRef.current = null;
    }
  };

  // Batch: each segment is re-encoded for real, one after another, and only
  // a verified WebM output is marked completed. No timers, no byte slicing.
  const handleBatchSplit = async () => {
    if (segments.length === 0 || !videoFile) return;
    try {
      validateVideoSegments(
        segments.map((seg) => ({ startTime: seg.startTime, endTime: seg.endTime })),
        duration
      );
    } catch (err) {
      toast.error('Invalid Segments', err instanceof Error ? err.message : 'Check the segment ranges.');
      return;
    }
    setIsBatchProcessing(true);

    let successCount = 0;
    let errorCount = 0;
    const controller = new AbortController();
    splitAbortRef.current = controller;

    const pendingSegments = segments.filter(seg => seg.status !== 'completed');

    for (const seg of pendingSegments) {
      if (controller.signal.aborted) break;
      // Mark processing
      setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, status: 'processing', progress: 10 } : s));

      try {
        const result = await reencodeVideo({
          file: videoFile,
          startTime: seg.startTime,
          endTime: seg.endTime,
          onProgress: (fraction) => setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, progress: Math.round(10 + fraction * 85) } : s)),
          signal: controller.signal,
        });
        const trimmedUrl = URL.createObjectURL(result.blob);
        setSegments(prev => prev.map(s => s.id === seg.id ? {
          ...s,
          status: 'completed',
          progress: 100,
          trimmedUrl
        } : s));
        successCount++;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') break;
        console.error(err);
        setSegments(prev => prev.map(s => s.id === seg.id ? {
          ...s,
          status: 'failed',
          progress: 0
        } : s));
        errorCount++;
      }
    }

    splitAbortRef.current = null;
    setIsBatchProcessing(false);
    if (controller.signal.aborted) {
      toast.toast({
        title: 'Batch Video Splitting Cancelled',
        description: `Stopped early: ${successCount} segment${successCount !== 1 ? 's' : ''} completed, ${errorCount} failed.`,
        type: 'warning'
      });
      return;
    }
    if (errorCount === 0 && successCount > 0) {
      confetti({ particleCount: 100, spread: 80 });
    }

    if (errorCount === 0) {
      toast.success(
        'Batch Video Splitting Complete',
        `Successfully trimmed and re-encoded ${successCount} video clip${successCount !== 1 ? 's' : ''} (verified WebM files).`
      );
    } else if (successCount === 0) {
      toast.error(
        'Batch Video Splitting Failed',
        `Failed to process ${errorCount} video segment${errorCount !== 1 ? 's' : ''}. No output was produced for the failed segments.`
      );
    } else {
      toast.toast({
        title: 'Batch Video Splitting Finished',
        description: `Successfully re-encoded ${successCount} segment${successCount !== 1 ? 's' : ''}, but failed for ${errorCount} segment${errorCount !== 1 ? 's' : ''}.`,
        type: 'warning'
      });
    }
  };

  const triggerDownloadSeg = (seg: VideoSegment) => {
    if (!seg.trimmedUrl) return;
    const a = document.createElement('a');
    a.href = seg.trimmedUrl;
    a.download = buildVideoOutputFilename(videoFile?.name ?? 'video', `split-${seg.startTime.toFixed(1)}-${seg.endTime.toFixed(1)}`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const triggerDownloadAllSegs = () => {
    segments.forEach(seg => {
      if (seg.trimmedUrl) {
        triggerDownloadSeg(seg);
      }
    });
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const removeVideo = () => {
    splitAbortRef.current?.abort();
    splitAbortRef.current = null;
    if (trimmedVideoUrl) URL.revokeObjectURL(trimmedVideoUrl);
    clearSegments();
    setVideoFile(null);
    setVideoSrc('');
    setTrimmedVideoUrl(null);
    setSplitStatus('idle');
    setSplitProgress(0);
    setSplitLogs([]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="video-splitter-tool">
      {/* Header */}
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
            Video Splitting & Cutting
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Visual range trimmer with client-side multi-segment batch splitting. Every export is re-encoded in your browser and verified as a valid WebM file (max 5 min / 150 MB).
          </p>
        </div>
        {videoFile && (
          <button
            onClick={removeVideo}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
          >
            Clear Video
          </button>
        )}
      </div>

      {!videoFile ? (
        /* Video Upload Prompt */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#2a2a2a] hover:border-[#10b981]/50 bg-[#0d0d0d] rounded-xl p-12 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[300px]"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="video/*"
            className="hidden"
          />
          <div className="p-4 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-4 group-hover:scale-105 transition-transform text-[#10b981]">
            <FilmStrip className="w-8 h-8" />
          </div>
          <h3 className="text-white font-sans text-lg">Drag & drop your video</h3>
          <p className="text-gray-500 text-xs mt-1 mb-4">Supports MP4, WebM, MOV, OGG containers up to 150MB and 5 minutes. Exports are re-encoded WebM files, verified before download.</p>
          <span className="text-xs font-bold text-[#0a0a0a] bg-[#10b981] px-4 py-2 rounded uppercase tracking-wider hover:bg-[#059669] transition-colors">
            Select Video File
          </span>
        </div>
      ) : (
        /* Editor Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Video Screen & Slider (Left Col - 2 spans) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-black rounded-xl overflow-hidden aspect-video relative group flex items-center justify-center shadow-lg border border-[#1a1a1a]">
              <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-contain"
                crossOrigin="anonymous"
                onClick={handlePlayPause}
              />
              
              {/* Play Pause Overlay */}
              {!isPlaying && (
                <button 
                  onClick={handlePlayPause}
                  className="absolute p-4 rounded-full bg-[#10b981]/90 hover:bg-[#10b981] text-[#0a0a0a] shadow-md transform transition-all hover:scale-110 active:scale-95 cursor-pointer"
                >
                  <Play className="w-6 h-6 fill-current text-[#0a0a0a]" />
                </button>
              )}
            </div>

            {/* Mode selector tab bar */}
            <div className="flex border border-[#1a1a1a] bg-[#0d0d0d] p-1.5 rounded-lg max-w-sm w-full mx-auto">
              <button
                onClick={() => setSplitMode('trim')}
                className={`flex-1 py-2 rounded font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  splitMode === 'trim'
                    ? 'bg-[#10b981] text-[#0a0a0a]'
                    : 'text-gray-400 hover:text-white bg-transparent'
                }`}
              >
                Single Trim Mode
              </button>
              <button
                onClick={() => setSplitMode('batch')}
                className={`flex-1 py-2 rounded font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  splitMode === 'batch'
                    ? 'bg-[#10b981] text-[#0a0a0a]'
                    : 'text-gray-400 hover:text-white bg-transparent'
                }`}
              >
                Multi-Split Batch Mode
              </button>
            </div>

            {/* Range Slider controls */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-5">
              <div className="flex items-center justify-between font-mono text-xs text-gray-400 font-bold uppercase tracking-wider">
                <span className="text-[#10b981] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Start: {formatTime(startTime)}
                </span>
                <span className="text-gray-500">
                  Current: {formatTime(currentTime)}
                </span>
                <span className="text-[#059669] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> End: {formatTime(endTime)}
                </span>
              </div>

              {/* Slider UI */}
              <div className="relative pt-4 pb-2">
                {/* Visual timeline backgrounds */}
                <div className="h-2 bg-[#1a1a1a] rounded-full w-full relative">
                  {/* Selected Trim Range Indicator */}
                  <div 
                    className="absolute h-full bg-[#10b981] rounded-full"
                    style={{
                      left: `${(startTime / duration) * 100}%`,
                      width: `${((endTime - startTime) / duration) * 100}%`
                    }}
                  />
                  {/* Current Position Marker */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 bg-white border border-[#0a0a0a] rounded shadow z-10"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                  />
                </div>

                {/* Range inputs overlay */}
                <div className="relative -mt-2">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.01"
                    value={startTime}
                    onChange={(e) => handleStartChange(parseFloat(e.target.value))}
                    className="absolute w-full accent-[#10b981] h-1.5 opacity-0 cursor-pointer pointer-events-auto"
                    style={{ zIndex: 3 }}
                  />
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.01"
                    value={endTime}
                    onChange={(e) => handleEndChange(parseFloat(e.target.value))}
                    className="absolute w-full accent-[#10b981] h-1.5 opacity-0 cursor-pointer pointer-events-auto"
                    style={{ zIndex: 3 }}
                  />
                </div>
              </div>

              {/* Player control bar */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a] mt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePlayPause}
                    className="p-2 bg-[#151515] hover:bg-[#1a1a1a] text-[#10b981] rounded border border-[#2a2a2a] transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <span className="text-xs font-semibold text-gray-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {splitMode === 'batch' && (
                  <button
                    onClick={addSegment}
                    className="px-3.5 py-1.5 bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/30 text-[#10b981] rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Segment
                  </button>
                )}

                {/* Volume slider */}
                <div className="flex items-center gap-2">
                  <SpeakerHigh className="w-4 h-4 text-gray-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      if (videoRef.current) videoRef.current.volume = v;
                    }}
                    className="w-16 accent-[#10b981] h-1 bg-[#1a1a1a] rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Splicing Panel Options (Right Col) */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {splitMode === 'trim' ? (
              /* Single Trim Sidebar panel */
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a]">
                  <Sliders className="w-5 h-5 text-[#10b981]" />
                  <h2 className="font-sans text-lg text-white">Cutting Options</h2>
                </div>

                {/* Export note: a single real re-encode path, verified output. */}
                <div className="bg-[#151515] rounded border border-[#2a2a2a] p-3 text-xs flex flex-col gap-1.5 text-gray-400">
                  <div><span className="font-bold text-gray-500 uppercase tracking-widest text-[9px] block">Export</span> Re-encoded WebM — the selected range is recorded in real time and verified (container header + duration) before download.</div>
                </div>

                {/* File Info */}
                <div className="bg-[#151515] rounded border border-[#2a2a2a] p-3 text-xs flex flex-col gap-1.5 text-gray-400">
                  <div><span className="font-bold text-gray-500 uppercase tracking-widest text-[9px] block">File</span> {videoFile.name}</div>
                  <div><span className="font-bold text-gray-500 uppercase tracking-widest text-[9px] block">Original Size</span> {Math.round(videoFile.size / 1024 / 1024 * 100) / 100} MB</div>
                  <div><span className="font-bold text-gray-500 uppercase tracking-widest text-[9px] block">Duration</span> {formatTime(duration)}</div>
                  <div className="border-t border-[#2a2a2a] my-1 pt-2">
                    <span className="font-semibold text-[#10b981]">Export Segment:</span> {formatTime(endTime - startTime)}
                  </div>
                </div>

                {/* Processing Actions */}
                {splitStatus !== 'processing' ? (
                  <button
                    onClick={handleSplitVideo}
                    className="w-full py-3 px-4 bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Scissors className="w-4 h-4" /> Trim & Extract Video
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#10b981]">
                      <span>Exporting segment...</span>
                      <span>{Math.round(splitProgress)}%</span>
                    </div>
                    <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-[#10b981] h-full transition-all duration-300"
                        style={{ width: `${splitProgress}%` }}
                      />
                    </div>
                    <button
                      onClick={() => splitAbortRef.current?.abort()}
                      className="w-full py-2 text-xs font-bold rounded uppercase tracking-wider border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                    >
                      Cancel Export
                    </button>
                  </div>
                )}

                {/* Download Converted */}
                {trimmedVideoUrl && splitStatus === 'completed' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col gap-2 pt-2 border-t border-[#2a2a2a] mt-2"
                  >
                    <div className="bg-emerald-950/20 text-emerald-300 rounded border border-emerald-900/40 p-3 text-xs flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block uppercase tracking-wider text-[10px] text-emerald-200">Video Segment Trimmed!</span>
                        The file is compiled and ready to download.
                      </div>
                    </div>
                    <a
                      href={trimmedVideoUrl}
                      download={buildVideoOutputFilename(videoFile.name, 'trimmed')}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Download Trimmed Video (WebM)
                    </a>
                  </motion.div>
                )}
              </div>
            ) : (
              /* Multi-Split Batch Mode Panel */
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#2a2a2a]">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-[#10b981]" />
                    <h2 className="font-sans text-lg text-white font-bold">Multi-Split Queue</h2>
                  </div>
                  {segments.length > 0 && (
                    <button
                      onClick={clearSegments}
                      className="text-[9px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider"
                    >
                      Clear Queue
                    </button>
                  )}
                </div>

                {segments.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 border border-[#1a1a1a] border-dashed rounded-xl flex flex-col items-center justify-center gap-2">
                    <Scissors className="w-8 h-8 text-gray-600" />
                    <span className="text-xs font-medium">No segments defined yet</span>
                    <span className="text-[10px] text-gray-600 px-4">Adjust the range slider on the left and click <strong>+ Add Segment</strong> to build your split cue.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto pr-1">
                    {segments.map((seg, idx) => (
                      <div 
                        key={seg.id}
                        className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-white truncate max-w-[130px]">{seg.name}</span>
                          <div className="flex items-center gap-1.5">
                            {seg.status === 'idle' && (
                              <button
                                onClick={() => removeSegment(seg.id)}
                                className="text-gray-500 hover:text-rose-400 cursor-pointer"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {seg.status === 'completed' && (
                              <button
                                onClick={() => triggerDownloadSeg(seg)}
                                className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                                title="Download segment"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {seg.status === 'processing' && (
                          <div className="flex flex-col gap-1">
                            <div className="w-full bg-[#1a1a1a] rounded-full h-1 overflow-hidden">
                              <div className="bg-[#10b981] h-full" style={{ width: `${seg.progress}%` }} />
                            </div>
                            <span className="text-[8px] font-mono font-bold text-[#10b981] uppercase tracking-wider">Compiling Segment...</span>
                          </div>
                        )}

                        {seg.status === 'completed' && (
                          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Ready for download
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Batch split actions */}
                {segments.length > 0 && (
                  <div className="pt-2 border-t border-[#2a2a2a] flex flex-col gap-2">
                    <button
                      onClick={handleBatchSplit}
                      disabled={isBatchProcessing}
                      className="w-full py-3 bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] disabled:bg-[#1a1a1a] disabled:text-gray-600 rounded font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isBatchProcessing ? (
                        <>
                          <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Splitting Segments...
                        </>
                      ) : (
                        <>
                          <Scissors className="w-4 h-4" /> Batch Process ({segments.length}) Splits
                        </>
                      )}
                    </button>
                    {isBatchProcessing && (
                      <button
                        onClick={() => splitAbortRef.current?.abort()}
                        className="w-full py-2 bg-[#111111] hover:bg-[#181818] text-red-400 border border-red-500/40 rounded font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        Cancel Batch
                      </button>
                    )}
                    {segments.some(seg => seg.status === 'completed') && (
                      <button
                        onClick={triggerDownloadAllSegs}
                        className="w-full py-2 bg-[#111111] hover:bg-[#181818] text-white border border-[#2a2a2a] rounded font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-4 h-4" /> Download All Slices
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Process Logs Output Console */}
            {splitLogs.length > 0 && splitMode === 'trim' && (
              <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-4 shadow-inner flex flex-col gap-2">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block font-mono">Console Logs</span>
                <div className="max-h-[140px] overflow-y-auto flex flex-col gap-1 font-mono text-[10px] text-[#10b981] scrollbar-thin">
                  {splitLogs.map((log, idx) => (
                    <div key={idx} className="leading-normal opacity-90">{log}</div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
