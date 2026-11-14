import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Download,
  Globe,
  Link,
  Shield,
  WarningCircle,
  Play,
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';

interface SocialDownloaderProps {
  onBack: () => void;
}

type Status = 'idle' | 'parsing' | 'ready' | 'downloading' | 'completed' | 'error';

interface VideoMeta {
  title: string;
  thumbnail: string;
  duration: string;
  platform: string;
  videoUrl: string;
}

const QUALITIES = [
  { id: 'max',   label: 'Highest Quality (Up to 4K/1080p)' },
  { id: '1080p', label: 'MP4 1080p Full HD' },
  { id: '720p',  label: 'MP4 720p HD' },
  { id: '480p',  label: 'MP4 480p' },
  { id: '360p',  label: 'MP4 360p' },
  { id: 'mp3',   label: 'MP3 Audio' },
];

const fmtDuration = (seconds: number) => {
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export default function SocialDownloader({ onBack }: SocialDownloaderProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [parsingStep, setParsingStep] = useState('');
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState(0);
  const [isReResolving, setIsReResolving] = useState(false);
  // Preview state for the in-card video: while the first frame is still
  // loading the card shows an explicit "Loading preview…" overlay instead
  // of a black box, and a failed preview falls back to a placeholder (the
  // download button is unaffected).
  const [previewStatus, setPreviewStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [previewDuration, setPreviewDuration] = useState('');

  // Hostname-based: substring matching mis-detected lookalike hosts
  // (e.g. fakeyoutube.com) as the real platform.
  const detectPlatform = (u: string) => {
    try {
      const h = new URL(u).hostname.toLowerCase();
      if (h === 'youtube.com' || h.endsWith('.youtube.com') || h === 'youtu.be') return 'YouTube';
      if (h === 'tiktok.com' || h.endsWith('.tiktok.com')) return 'TikTok';
      if (h === 'instagram.com' || h.endsWith('.instagram.com')) return 'Instagram';
      if (h === 'facebook.com' || h.endsWith('.facebook.com') || h === 'fb.watch') return 'Facebook';
    } catch { /* not a URL yet — falls through to Web Video */ }
    return 'Web Video';
  };

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setStatus('parsing');
    setMeta(null);
    setErrorMsg('');
    setProgress(0);

    const steps = [
      'Initiating connection…',
      `Resolving ${detectPlatform(trimmed)} stream…`,
      'Fetching media manifest…',
    ];
    let si = 0;
    const iv = setInterval(() => {
      if (si < steps.length) { setParsingStep(steps[si]); si++; }
    }, 600);

    try {
      const r = await fetch('/api/resolve-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, quality: QUALITIES[selectedQuality].id }),
      });

      clearInterval(iv);

      if (r.status === 422) {
        const e = await r.json();
        setErrorMsg(e.error || 'Could not resolve stream.');
        setStatus('error');
        return;
      }
      if (!r.ok) {
        let errMsg = `Server error (${r.status}).`;
        try { const e = await r.json(); if (e.error) errMsg = typeof e.error === 'string' ? e.error : e.error.message || e.error.code || errMsg; } catch { /* non-JSON */ }
        setErrorMsg(errMsg);
        setStatus('error');
        return;
      }

      const d = await r.json();
      setMeta({ title: d.title, thumbnail: d.thumbnail, duration: d.duration, platform: d.platform, videoUrl: d.videoUrl });
      setPreviewStatus('loading');
      setPreviewDuration('');
      setStatus('ready');
    } catch {
      clearInterval(iv);
      setErrorMsg('Network error — check your connection and try again.');
      setStatus('error');
    }
  };

  const handleQualityChange = async (qualityIndex: number) => {
    setSelectedQuality(qualityIndex);
    if (!meta) return;
    setIsReResolving(true);
    setErrorMsg('');
    try {
      const r = await fetch('/api/resolve-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), quality: QUALITIES[qualityIndex].id }),
      });
      if (!r.ok) { let errMsg = 'Failed to switch quality.'; try { const e = await r.json(); if (e.error) errMsg = typeof e.error === 'string' ? e.error : e.error.message || errMsg; } catch { /* */ } throw new Error(errMsg); }
      const d = await r.json();
      setMeta(prev => prev ? { ...prev, videoUrl: d.videoUrl } : null);
      setPreviewStatus('loading');
      setPreviewDuration('');
    } catch (e: any) {
      setErrorMsg(e.message || 'Error switching quality.');
      setStatus('error');
    } finally { setIsReResolving(false); }
  };

  const handleDownload = async () => {
    if (!meta?.videoUrl) return;
    const isAudio = QUALITIES[selectedQuality].id === 'mp3';
    const cleanTitle = meta.title.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_').slice(0, 60);
    const ext = isAudio ? 'mp3' : 'mp4';
    const filename = `${cleanTitle}.${ext}`;

    setStatus('downloading');
    setProgress(0);

    try {
      const proxyUrl = `/api/media-proxy?url=${encodeURIComponent(meta.videoUrl)}&filename=${encodeURIComponent(filename)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        let errMsg = `Download failed (${response.status}).`;
        try { const e = await response.json(); if (e.error?.message) errMsg = e.error.message; } catch { /* */ }
        setErrorMsg(errMsg);
        setStatus('error');
        return;
      }

      const contentLength = Number(response.headers.get('Content-Length') || 0);
      const reader = response.body?.getReader();
      if (!reader) { setErrorMsg('Download stream not available.'); setStatus('error'); return; }

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        if (contentLength > 0) setProgress(Math.round((received / contentLength) * 100));
        else setProgress(Math.min(95, Math.round(received / 1048576) * 2));
      }

      setProgress(100);
      const blob = new Blob(chunks, { type: response.headers.get('Content-Type') || 'video/mp4' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      setStatus('completed');
      confetti({ particleCount: 140, spread: 85, origin: { y: 0.6 } });
    } catch {
      setErrorMsg('Download failed — check your connection and try again.');
      setStatus('error');
    }
  };

  const reset = () => { setUrl(''); setStatus('idle'); setMeta(null); setProgress(0); setSelectedQuality(0); setIsReResolving(false); setPreviewStatus('loading'); setPreviewDuration(''); };

  // Preview rule: when the resolved stream is a video, show the video
  // itself (its first frame is the true preview). The thumbnail is only
  // used for audio quality, where the stream is an mp3. When the provider
  // returns no thumbnail at all (e.g. Cobalt for Instagram/Facebook),
  // there is no stock-photo fallback — the video preview is the preview.
  const isAudioQuality = QUALITIES[selectedQuality].id === 'mp3';
  const showVideoPreview = Boolean(meta?.videoUrl) && !isAudioQuality;
  // The preview is served through /api/media-proxy — the same proven path
  // the download uses (Range forwarding, redirect re-validation). A raw
  // tunnel/redirect URL in the <video> tag left a black frame while the
  // first bytes were still in flight; the proxy path loads from the warm
  // server and the fast CDN instead.
  const previewUrl = meta?.videoUrl
    ? `/api/media-proxy?url=${encodeURIComponent(meta.videoUrl)}&filename=preview.mp4`
    : '';
  // Real duration once the video metadata loads; Cobalt gives no duration
  // for Instagram/Facebook, so the preview's own duration is the proof
  // the right video resolved.
  const displayDuration = previewDuration || (meta?.duration && meta.duration !== '00:00' ? meta.duration : '');

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6" id="social-downloader-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button onClick={onBack} className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer">
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-2.5">
            <Download className="w-8 h-8 text-[#10b981]" /> Social Media Downloader
          </h1>
          <p className="text-gray-400 text-sm mt-1">Download HD videos and extracts from YouTube, TikTok, Instagram, and Facebook.</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 md:p-8 shadow-xl flex flex-col gap-4 text-center max-w-3xl mx-auto w-full">
          <div className="flex flex-col items-center gap-1 mb-1">
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 justify-center">
              <Globe className="w-6 h-6 text-[#10b981]" /> Online Video Downloader
            </h2>
            <p className="text-gray-400 text-xs md:text-sm">Paste a supported public media URL. Resolution and output format are not guaranteed.</p>
          </div>

          <div className="flex flex-col sm:flex-row rounded-lg overflow-hidden border border-[#2a2a2a] focus-within:border-[#10b981] transition-all bg-[#151515] p-1 shadow-inner gap-0">
            <div className="flex-1 flex items-center px-3.5">
              <Link className="w-4 h-4 text-gray-500 shrink-0 mr-2" />
              <input
                id="video-url-input"
                type="url"
                placeholder="https://youtu.be/..."
                value={url}
                onChange={e => { setUrl(e.target.value); if (status === 'error') setStatus('idle'); }}
                onKeyDown={e => e.key === 'Enter' && handleFetch()}
                disabled={status === 'parsing' || status === 'downloading'}
                className="w-full py-3.5 text-sm focus:outline-none bg-transparent text-white placeholder-gray-500"
              />
            </div>
            <button
              id="fetch-video-btn"
              onClick={handleFetch}
              disabled={!url.trim() || status === 'parsing' || status === 'downloading'}
              className="py-3 px-8 bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shrink-0 disabled:bg-[#1c1c1c] disabled:text-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-md sm:rounded-none sm:rounded-r-md m-0.5 sm:m-0"
            >
              {status === 'parsing' ? <><ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Fetching…</> : <>Download →</>}
            </button>
          </div>

          <AnimatePresence>
            {status === 'parsing' && (
              <motion.div key="parsing" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 bg-[#070707] border border-[#1a1a1a] rounded-lg p-3 text-left">
                <ArrowsCounterClockwise className="w-4 h-4 text-[#10b981] animate-spin shrink-0" />
                <span className="text-[11px] text-[#10b981] font-mono">{parsingStep}</span>
              </motion.div>
            )}
            {status === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-red-950/20 border border-red-900/40 rounded-lg p-4 flex flex-col gap-2 text-left">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-widest">
                  <WarningCircle className="w-4 h-4" /> Could Not Resolve Stream
                </div>
                <p className="text-[11px] text-red-300/80 leading-relaxed">{errorMsg}</p>
                <button onClick={reset} className="mt-1 self-start text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-white border border-[#2a2a2a] rounded px-3 py-1.5 cursor-pointer transition-colors">
                  Try Another Link
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {(status === 'ready' || status === 'downloading' || status === 'completed') && meta && (
            <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="border border-[#2a2a2a] bg-[#0d0d0d] rounded-xl overflow-hidden shadow-2xl max-w-3xl mx-auto w-full">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-60 aspect-video bg-[#0a0a0a] shrink-0 relative overflow-hidden">
                  {showVideoPreview ? (
                    <>
                      {previewStatus !== 'error' && (
                        <video
                          key={meta.videoUrl}
                          src={previewUrl}
                          className="w-full h-full object-cover"
                          preload="metadata"
                          controls
                          muted
                          playsInline
                          onLoadedData={() => setPreviewStatus('ready')}
                          onLoadedMetadata={e => {
                            const d = e.currentTarget.duration;
                            if (Number.isFinite(d) && d > 0) setPreviewDuration(fmtDuration(d));
                          }}
                          onError={() => setPreviewStatus('error')}
                        />
                      )}
                      {previewStatus === 'loading' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0a0a0a]">
                          <ArrowsCounterClockwise className="w-5 h-5 text-[#10b981] animate-spin" />
                          <span className="text-[10px] font-mono text-[#10b981]">Loading preview…</span>
                        </div>
                      )}
                      {previewStatus === 'error' && (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                          <Play className="w-10 h-10 text-gray-700" />
                          <span className="text-[10px] text-gray-500">Preview unavailable — download still works</span>
                        </div>
                      )}
                    </>
                  ) : meta.thumbnail ? (
                    <img src={meta.thumbnail} alt="thumb" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Play className="w-10 h-10 text-gray-700" /></div>
                  )}
                  {displayDuration && (
                    <span className={`absolute ${showVideoPreview ? 'top-2' : 'bottom-2'} right-2 px-1.5 py-0.5 bg-black/80 rounded text-[10px] font-mono text-white font-bold`}>{displayDuration}</span>
                  )}
                </div>
                <div className="flex-1 p-5 flex flex-col justify-between gap-4">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-emerald-950/40 text-[#10b981] px-2 py-0.5 rounded border border-[#10b981]/25">
                      {meta.platform} · Stream Resolved
                    </span>
                    <h3 className="text-sm md:text-base font-bold text-white mt-2 leading-snug line-clamp-2">{meta.title}</h3>
                  </div>
                  {status === 'ready' && (
                    <div className="flex items-center gap-3 h-10">
                      {isReResolving ? (
                        <div className="flex items-center gap-2 text-xs text-[#10b981] font-mono">
                          <ArrowsCounterClockwise className="w-4 h-4 animate-spin text-[#10b981]" />
                          <span>Re-resolving stream…</span>
                        </div>
                      ) : (
                        <div className="flex items-stretch gap-0.5 rounded-lg overflow-hidden border border-[#2a2a2a] w-fit">
                          <button id="download-btn" onClick={handleDownload} className="py-3 px-6 bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all">
                            <Download className="w-4 h-4" /> Download
                          </button>
                          <select value={selectedQuality} onChange={e => handleQualityChange(Number(e.target.value))} className="bg-[#151515] hover:bg-[#1a1a1a] text-white border-l border-[#2a2a2a] py-3 px-4 text-xs font-semibold cursor-pointer focus:outline-none min-w-[130px]">
                            {QUALITIES.map((q, i) => (<option key={q.id} value={i}>{q.label}</option>))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  {status === 'downloading' && (
                    <div className="flex flex-col gap-2 w-full max-w-xs">
                      <div className="flex justify-between text-xs font-semibold text-[#10b981]">
                        <span className="flex items-center gap-1.5"><ArrowsCounterClockwise className="w-3.5 h-3.5 animate-spin" /> Downloading…</span>
                        <span className="font-mono">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-[#10b981] h-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                  {status === 'completed' && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="bg-emerald-950/20 text-emerald-300 rounded-lg p-3 text-xs flex items-center gap-2 border border-[#10b981]/20 flex-1">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-medium">Download started! Check your browser's download folder.</span>
                      </div>
                      <button onClick={reset} className="py-2.5 px-4 bg-[#151515] hover:bg-[#1a1a1a] text-gray-300 font-bold text-xs uppercase tracking-wider rounded border border-[#2a2a2a] cursor-pointer shrink-0">
                        Download Another
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 max-w-3xl mx-auto w-full">
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#2a2a2a]">
              <Shield className="w-5 h-5 text-[#10b981]" />
              <h2 className="font-sans text-white text-sm font-semibold">100% Private</h2>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-400">Your URLs are never stored. Everything runs through our server proxy — no external services required.</p>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />
              <span className="text-[10px] font-bold text-[#10b981]">Zero tracking</span>
            </div>
          </div>
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#2a2a2a]">
              <Globe className="w-5 h-5 text-[#10b981]" />
              <h2 className="font-sans text-white text-sm font-semibold">Supported Platforms</h2>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-400">YouTube, Instagram, TikTok, and Facebook. Public media only. Format and quality depend on provider availability.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
