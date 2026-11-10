import express, { type NextFunction, type Request, type Response } from 'express';
import { execFile } from 'node:child_process';
import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { ApiError, errorMiddleware, requestId, sendError } from '../lib/security/errors.js';
import { clientIp, hashIdentity } from '../lib/security/clientIdentity.js';
import { MemoryRateLimitStore, UpstashRateLimitStore, createRateLimitMiddleware, type RateLimitStore } from '../lib/security/rateLimit.js';
import { loadConfig, requireProductionLimiter, type AppConfig } from '../lib/config.js';
import { CobaltProvider } from '../lib/providers/cobalt.js';
import { detectPlatform, validatePlatformUrl } from '../lib/providers/platforms.js';
import { validateOutboundUrl, type OutboundLookup } from '../lib/security/outbound.js';
import type { Platform } from '../lib/providers/types.js';

export const AUDIO_MAX_BYTES = 3 * 1024 * 1024;
export const BODY_LIMIT = '4.25mb';
const PROVIDER_TIMEOUT_MS = 20_000;
const AUDIO_MIME = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac']);
/** Hard cap on bytes relayed by /api/media-proxy (bandwidth-amplification bound). */
const MAX_PROXY_BYTES = 512 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'video/x-matroska': 'mkv',
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/webm': 'webm', 'audio/ogg': 'ogg',
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/flac': 'flac', 'audio/opus': 'opus',
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
  'application/octet-stream': 'mp4',
};
const KNOWN_MEDIA_EXTS = new Set(['mp4', 'webm', 'mov', 'mkv', 'mp3', 'm4a', 'ogg', 'wav', 'flac', 'opus', 'jpg', 'jpeg', 'png', 'gif', 'webp']);

/**
 * Build the download filename for /api/media-proxy. The extension always
 * comes from the upstream Content-Type, and a trailing known extension on
 * the requested name is stripped first — previously the handler blindly
 * appended ".mp4", so "clip.mp4" downloaded as "clip.mp4.mp4" and a photo
 * picked from a Cobalt picker downloaded as a ".mp4".
 */
function proxyFilename(raw: string | undefined, mime: string): string {
  const safe = (raw || 'video').replace(/[^a-zA-Z0-9._-]/g, '_');
  const dot = safe.lastIndexOf('.');
  const base = dot > 0 && KNOWN_MEDIA_EXTS.has(safe.slice(dot + 1).toLowerCase()) ? safe.slice(0, dot) : safe;
  const ext = EXT_BY_MIME[mime] || 'mp4';
  return `${base || 'video'}.${ext}`;
}

const PROXY_URL = process.env.PROXY_URL || '';
const ytDispatcher = PROXY_URL ? new ProxyAgent(PROXY_URL) : undefined;

async function ytFetch(input: string | URL, init: RequestInit = {}): Promise<globalThis.Response> {
  if (ytDispatcher) return undiciFetch(input, { ...init, dispatcher: ytDispatcher } as any) as any;
  return fetch(input, init);
}

async function resolveWithYtdlp(targetUrl: string, format: string, maxDuration = 600): Promise<{ videoUrl: string; title: string; thumbnail: string; duration: string } | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => { try { child.kill(); } catch { /* already exited */ } resolve(null); }, 25_000);
    const child = execFile('yt-dlp', [
      '-j', '--no-download', '--no-update', '--no-warnings',
      '--format', format,
      '--no-playlist', '--socket-timeout', '15',
      targetUrl,
    ], { timeout: 20_000, maxBuffer: 5 * 1024 * 1024 }, (err, stdout) => {
      clearTimeout(timeout);
      if (err || !stdout?.trim()) { resolve(null); return; }
      try {
        const info = JSON.parse(stdout.trim().split('\n')[0]) as Record<string, any>;
        const videoUrl = info.url as string;
        if (!videoUrl) { resolve(null); return; }
        const secs = typeof info.duration === 'number' ? Math.floor(info.duration) : 0;
        const duration = formatDuration(secs);
        resolve({
          videoUrl,
          title: (info.title as string) || '',
          thumbnail: (info.thumbnail as string) || '',
          duration,
        });
      } catch { resolve(null); }
    });
    child.on('error', () => { clearTimeout(timeout); resolve(null); });
  });
}

function formatDuration(totalSeconds: number): string {
  const secs = Math.floor(totalSeconds);
  if (!secs || secs <= 0) return '00:00';
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
}

const PLATFORM_DISPLAY_NAMES: Record<Platform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
};

/** Requested output: a video capped at `maxHeight`, or audio-only (mp3). */
type ResolveQuality = { kind: 'video'; maxHeight: number } | { kind: 'audio' };

const QUALITY_CAPS: Record<string, number> = {
  max: 1080,
  '1080p': 1080,
  '720p': 720,
  '480p': 480,
  '360p': 360,
};

function parseResolveQuality(raw: unknown): ResolveQuality {
  if (raw === undefined) return { kind: 'video', maxHeight: 1080 };
  if (raw === 'mp3') return { kind: 'audio' };
  if (typeof raw === 'string' && QUALITY_CAPS[raw] !== undefined) {
    return { kind: 'video', maxHeight: QUALITY_CAPS[raw] };
  }
  throw new ApiError(400, 'BAD_REQUEST', 'Unsupported quality.');
}

/**
 * Race the public Cobalt instances. Returns the first stream URL, or null
 * when every instance fails. `rateLimited` is true when at least one
 * instance explicitly reported rate limiting (as opposed to being down).
 * The configured self-hosted Cobalt instance (see /api/download/*) remains
 * the supported path; these public instances are a best-effort fallback and
 * are frequently unreachable or auth-gated, so a null here is normal.
 */
async function tryPublicCobalt(url: string, downloadMode: 'auto' | 'audio', outboundLookup?: OutboundLookup): Promise<{ videoUrl: string; title: string; thumbnail: string; rateLimited: boolean }> {
  const none = { videoUrl: '', title: '', thumbnail: '', rateLimited: false };
  const cobaltEndpoints = ['https://cobalt.api.red.velvet.ink/', 'https://api.cobalt.tools/', 'https://cobalt.catvibers.me/', 'https://api.cobalt.best/'];
  const cobaltBody = JSON.stringify(downloadMode === 'audio'
    ? { url, downloadMode: 'audio', audioFormat: 'mp3', filenameStyle: 'classic' }
    : { url, vQuality: '720', videoQuality: '720', filenameStyle: 'classic' });
  let rateLimited = false;
  const tryCobalt = async (ep: string) => {
    let validated: URL;
    // Endpoints are hardcoded constants, but the DNS check still applies:
    // a hijacked/rebound endpoint must not turn the race into an SSRF relay.
    // `outboundLookup` is the test seam (same pattern as secureFetch's
    // lookup option); production always uses real DNS. In sandboxes whose
    // DNS answers every host with a proxy CGNAT address, the lookup rejects
    // and the race fails closed to null.
    try { validated = await validateOutboundUrl(ep, outboundLookup ? { lookup: outboundLookup } : undefined); } catch { throw new Error('Invalid endpoint'); }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    try {
      const r = await fetch(validated, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: cobaltBody, signal: ctrl.signal });
      clearTimeout(t);
      if (r.status === 429) { rateLimited = true; throw new Error('HTTP 429'); }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json() as Record<string, any>;
      if (d?.error?.code && String(d.error.code).includes('rate-limited')) { rateLimited = true; throw new Error(`status=${d.error.code}`); }
      if (['stream', 'tunnel', 'redirect'].includes(d.status)) return { videoUrl: d.url as string, title: (d.filename || '').replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim(), thumbnail: d.thumbnail || '' };
      if (d.status === 'picker' && d.picker?.length) return { videoUrl: d.picker[0].url as string, title: '', thumbnail: d.picker[0].thumb || '' };
      throw new Error(`status=${d.status}`);
    } finally { clearTimeout(t); }
  };
  try {
    const r = await Promise.any(cobaltEndpoints.map(ep => tryCobalt(ep)));
    return { ...r, rateLimited };
  } catch { return { ...none, rateLimited }; }
}

export interface ResolvedSocialMedia {
  title: string;
  thumbnail: string;
  videoUrl: string;
  duration: string;
  platform: string;
  /** Quality actually served, e.g. '360p', 'hd', 'sd', 'audio', 'original'. */
  qualityServed: string;
}

/**
 * Resolve a social-media URL to a downloadable stream. Config-free legs
 * first (YouTube InnerTube, yt-dlp when installed, tikwm, public Cobalt
 * race, YouTube oEmbed for metadata); when a Cobalt instance is configured
 * (COBALT_API_URL, e.g. the Render free tier) it is tried before the public
 * race — it is the only leg that can serve Instagram/Facebook, and the
 * supported one for every platform.
 *
 * Honest failures: 400 for unsupported/non-HTTPS URLs, 429 when a provider
 * explicitly rate-limited the request, 422 when the link is private,
 * removed, or has no extractable stream, 503 when the configured instance
 * is still waking up (free-tier sleep) or Instagram/Facebook was asked for
 * with no instance configured. Never returns a fabricated URL.
 * NOTE: the link itself is only ever sent to the fixed provider hosts
 * below — the user-supplied URL is never fetched directly by this server
 * (no OG scrape), so it cannot be used as an SSRF relay.
 */
async function resolveSocialMedia(rawUrl: string, qualityRaw: unknown, outboundLookup?: OutboundLookup, cobaltProvider?: CobaltProvider | null): Promise<ResolvedSocialMedia> {
  const platform = detectPlatform(rawUrl);
  if (!platform) {
    throw new ApiError(400, 'BAD_REQUEST', 'Only YouTube, TikTok, Instagram, and Facebook links are supported.');
  }
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch {
    throw new ApiError(400, 'BAD_REQUEST', 'Invalid URL format.');
  }
  if (parsed.protocol !== 'https:') {
    throw new ApiError(400, 'BAD_REQUEST', 'Only HTTPS URLs are supported.');
  }
  const quality = parseResolveQuality(qualityRaw);
  const platformName = PLATFORM_DISPLAY_NAMES[platform];
  const isYT = platform === 'youtube';
  const isTT = platform === 'tiktok';

  let title = '', thumbnail = '', videoUrl = '', duration = '00:00';
  let qualityServed = 'original';
  let sawRateLimit = false;
  let sawPrivate = false;

  // 1. YouTube: InnerTube multi-client rotation — tries multiple client types to avoid rate limiting.
  //    Skipped for audio-only requests: a video stream renamed .mp3 would be a corrupt download.
  if (isYT && quality.kind === 'video') {
    const ytId = rawUrl.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (ytId) {
      const ytClients = [
        { clientName: 'ANDROID_VR', clientVersion: '1.57.29', androidSdkVersion: 32, ua: 'com.google.android.apps.youtube.vr.oculus/1.57.29 (Linux; U; Android 12; eureka-user Build/SQ3A.220605.009.A1) gzip' },
        { clientName: 'ANDROID_VR', clientVersion: '1.60.19', androidSdkVersion: 32, ua: 'com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 13; Quest 3 Build/5.1.0) gzip' },
        { clientName: 'ANDROID_VR', clientVersion: '1.62.33', androidSdkVersion: 33, ua: 'com.google.android.apps.youtube.vr.oculus/1.62.33 (Linux; U; Android 14; Quest Pro Build/ST1A.230802.036) gzip' },
        { clientName: 'ANDROID_VR', clientVersion: '1.64.21', androidSdkVersion: 34, ua: 'com.google.android.apps.youtube.vr.oculus/1.64.21 (Linux; U; Android 15; Quest S Build/AP3A.240905.015) gzip' },
      ];
      for (const yc of ytClients) {
        if (videoUrl) break;
        try {
          const ctrl = new AbortController();
          const to = setTimeout(() => ctrl.abort(), 8000);
          const pr = await ytFetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': yc.ua, 'X-Goog-Api-Format-Version': '2', 'X-YouTube-Client-Name': '28', 'X-YouTube-Client-Version': yc.clientVersion },
            body: JSON.stringify({
              videoId: ytId,
              context: { client: { clientName: yc.clientName, clientVersion: yc.clientVersion, androidSdkVersion: yc.androidSdkVersion, hl: 'en', gl: 'US', osName: 'Android', osVersion: '14' } },
            }),
            signal: ctrl.signal,
          });
          clearTimeout(to);
          if (pr.status === 429) { sawRateLimit = true; continue; }
          if (pr.ok) {
            const pd = await pr.json() as Record<string, any>;
            const playability = pd.playabilityStatus?.status as string | undefined;
            if (playability === 'OK') {
              const vd = pd.videoDetails;
              if (vd?.title) title = vd.title;
              if (vd?.thumbnail?.thumbnails?.length) { const thumbs = vd.thumbnail.thumbnails; thumbnail = thumbs[thumbs.length - 1].url; }
              if (!thumbnail) thumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
              const secs = parseInt(vd?.lengthSeconds || '0', 10);
              if (secs) duration = formatDuration(secs);
              const formats: any[] = pd.streamingData?.formats || [];
              const sorted = [...formats].sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
              const cap = quality.maxHeight;
              const best = sorted.find((f: any) => f.url && (f.height || 999) <= cap) || sorted.find((f: any) => f.url);
              if (best?.url) {
                videoUrl = best.url;
                if (best.height) qualityServed = `${best.height}p`;
              }
            } else if (playability === 'ERROR' || playability === 'LOGIN_REQUIRED' || playability === 'UNPLAYABLE') {
              const reason = String(pd.playabilityStatus?.reason || '');
              if (/private|removed|unavailable|deleted/i.test(reason)) sawPrivate = true;
            }
          }
        } catch { /* try next client */ }
        // A private/removed video will not become playable on another
        // client — stop rotating instead of burning 4 attempts on it.
        if (sawPrivate) break;
        if (!videoUrl) await new Promise(r => setTimeout(r, 300));
      }
    }
  }

  // 2. yt-dlp fallback (works for YouTube + other platforms when yt-dlp is available on the server).
  //    Absent on Vercel and in this sandbox — fails fast to null, never faked.
  if (!videoUrl) {
    const format = quality.kind === 'audio'
      ? 'bestaudio[ext=mp3]/bestaudio/best'
      : `best[height<=${quality.maxHeight}][ext=mp4]/best[height<=${quality.maxHeight}]/best[ext=mp4]/best`;
    const ytdlpResult = await resolveWithYtdlp(rawUrl, format);
    if (ytdlpResult) {
      videoUrl = ytdlpResult.videoUrl;
      if (!title && ytdlpResult.title) title = ytdlpResult.title;
      if (!thumbnail && ytdlpResult.thumbnail) thumbnail = ytdlpResult.thumbnail;
      if (duration === '00:00' && ytdlpResult.duration !== '00:00') duration = ytdlpResult.duration;
      qualityServed = quality.kind === 'audio' ? 'audio' : `${quality.maxHeight}p`;
    }
  }

  // 3. TikTok: tikwm.com free API (no auth required; 1 req/sec on the free tier).
  if (!videoUrl && isTT && quality.kind === 'video') {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 10000);
      const hd = quality.maxHeight >= 720 ? 1 : 0;
      const tr = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(rawUrl)}&hd=${hd}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: ctrl.signal,
      });
      clearTimeout(to);
      if (tr.ok) {
        const td = await tr.json() as Record<string, any>;
        if (td.code === 0 && td.data) {
          const useHd = hd === 1 && td.data.hdplay;
          videoUrl = (useHd ? td.data.hdplay : td.data.play) || td.data.play || td.data.hdplay || '';
          qualityServed = useHd ? 'hd' : 'sd';
          if (!title && td.data.title) title = td.data.title;
          if (!thumbnail && td.data.cover) thumbnail = td.data.cover;
          if (duration === '00:00' && td.data.duration) {
            const secs = parseInt(td.data.duration, 10);
            if (secs) duration = formatDuration(secs);
          }
        } else if (td.code === -1 && /limit/i.test(String(td.msg || ''))) {
          sawRateLimit = true;
        }
      } else if (tr.status === 429) {
        sawRateLimit = true;
      }
    } catch { /* tikwm failed, fall through to Cobalt */ }
  }

  // 3.5 Configured Cobalt (self-hosted instance, e.g. Render free tier) —
  //     the only leg that can serve Instagram/Facebook, and a fallback for
  //     YouTube/TikTok once their config-free legs have had their chance.
  //     It runs before the public race: our own instance is supported,
  //     the public ones are best-effort and mostly dead/auth-gated.
  //     A waking instance throws 503 (retry in a minute) instead of
  //     falling through to a race that cannot help.
  if (!videoUrl && cobaltProvider?.isConfigured()) {
    const result = await cobaltProvider.resolve(platform, rawUrl, {
      videoQuality: quality.kind === 'video' ? String(quality.maxHeight) : undefined,
      downloadMode: quality.kind === 'audio' ? 'audio' : 'auto',
    });
    if (result.status === 'error') {
      if (result.errorCode === 'PROVIDER_WAKING') {
        throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'The download server is waking up after being idle (about a minute). Please try again in a moment.');
      }
      // Any other Cobalt failure falls through to the public race.
    } else if ((result.status === 'tunnel' || result.status === 'redirect') && result.url) {
      videoUrl = result.url;
      if (!title && result.filename) title = result.filename.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
      if (quality.kind === 'audio') qualityServed = 'audio';
    } else if (result.status === 'picker' && result.items?.length) {
      if (quality.kind === 'audio' && result.audioUrl) {
        videoUrl = result.audioUrl;
        if (!title && result.audioFilename) title = result.audioFilename;
        qualityServed = 'audio';
      } else {
        const first = result.items.find((item) => item.type === 'video' && item.url) ?? result.items[0];
        videoUrl = first.url;
        if (!thumbnail && first.thumb) thumbnail = first.thumb;
      }
    }
  }

  // 4. Cobalt race for stream URL (all platforms; audio mode for mp3 requests).
  if (!videoUrl) {
    const r = await tryPublicCobalt(rawUrl, quality.kind === 'audio' ? 'audio' : 'auto', outboundLookup);
    if (r.rateLimited) sawRateLimit = true;
    if (r.videoUrl) {
      videoUrl = r.videoUrl;
      if (!title && r.title) title = r.title;
      if (!thumbnail && r.thumbnail) thumbnail = r.thumbnail;
      if (quality.kind === 'audio') qualityServed = 'audio';
    }
  }

  // 5. Metadata fallback: YouTube oEmbed (fixed host, video-ID derived).
  //    No generic OG scrape: fetching an arbitrary user-supplied URL
  //    server-side would be an SSRF relay, and title/thumbnail alone can
  //    never produce a download anyway.
  if (isYT && (!title || !thumbnail)) {
    const ytId = rawUrl.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (ytId) {
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 5000);
        const oe = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`, { signal: ctrl.signal });
        clearTimeout(to);
        if (oe.ok) { const od = await oe.json() as Record<string, any>; if (!title) title = od.title; if (!thumbnail) thumbnail = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`; }
      } catch { /* ignore */ }
    }
  }

  if (!videoUrl) {
    if (sawRateLimit) {
      throw new ApiError(429, 'RATE_LIMITED', 'The provider temporarily rate-limited this request. Wait a few minutes and try again.', 60);
    }
    if (sawPrivate) {
      throw new ApiError(422, 'PROVIDER_ERROR', 'This video is private, removed, or unavailable.');
    }
    if ((platform === 'instagram' || platform === 'facebook') && !cobaltProvider?.isConfigured()) {
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', `${platformName} downloads need the download server, which is not configured yet.`);
    }
    if (quality.kind === 'audio') {
      throw new ApiError(422, 'PROVIDER_ERROR', 'Audio-only download is not available for this link. Try the video quality instead.');
    }
    throw new ApiError(422, 'PROVIDER_ERROR', isYT
      ? 'YouTube temporarily blocked this request (rate limit). Try a different video or wait a few minutes and try again.'
      : 'Could not extract a stream URL. The link may be private, expired, or unsupported.');
  }
  if (!title) title = `${platformName} Video`;
  if (!thumbnail) thumbnail = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=60';

  return { title, thumbnail, videoUrl, duration, platform: platformName, qualityServed };
}

function originPolicy(config: AppConfig) { return (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('origin');
  if (origin) {
    res.setHeader('Vary', 'Origin');
    if (origin === 'null' || !config.allowedOrigins.has(origin)) return next(new ApiError(403, 'INVALID_ORIGIN', 'This origin is not allowed.'));
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (config.transcriptionEnabled && config.environment === 'production' && req.originalUrl.split('?')[0] === '/api/transcribe') {
    return next(new ApiError(403, 'INVALID_ORIGIN', 'This origin is not allowed.'));
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-ID');
    return res.status(204).end();
  }
  next();
}; }

function decodeAudio(body: unknown): { audio: string; mimeType: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'BAD_REQUEST', 'A JSON request body is required.');
  const keys = Object.keys(body);
  if (keys.some((key) => !['audio', 'mimeType'].includes(key))) throw new ApiError(400, 'BAD_REQUEST', 'The request contains unsupported fields.');
  const { audio, mimeType } = body as Record<string, unknown>;
  if (typeof audio !== 'string' || !audio.length || typeof mimeType !== 'string') throw new ApiError(400, 'BAD_REQUEST', 'Audio and mimeType are required.');
  if (!AUDIO_MIME.has(mimeType.toLowerCase())) throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'This audio type is not supported.');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(audio) || audio.length % 4 !== 0) throw new ApiError(400, 'BAD_REQUEST', 'The audio data is not valid Base64.');
  const bytes = Buffer.from(audio, 'base64');
  if (!bytes.length) throw new ApiError(400, 'BAD_REQUEST', 'Audio cannot be empty.');
  if (bytes.length > AUDIO_MAX_BYTES) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Audio exceeds the 3 MiB limit.');
  const signatureOkay = bytes.length >= 4 && (bytes.subarray(0, 3).toString() === 'ID3' || bytes[0] === 0xff || bytes.subarray(0, 4).toString() === 'RIFF' || bytes.subarray(0, 4).toString() === 'OggS' || bytes.subarray(0, 4).toString('hex') === '1a45dfa3' || bytes.subarray(4, 8).toString() === 'ftyp' || bytes.subarray(0, 4).toString() === 'fLaC');
  if (!signatureOkay) throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'The audio signature does not match a supported format.');
  return { audio, mimeType: mimeType.toLowerCase() };
}

export function createApp(options: { generateContent?: (audio: string, mimeType: string) => Promise<string>; providerTimeoutMs?: number; config?: AppConfig; rateLimitStore?: RateLimitStore; outboundLookup?: OutboundLookup } = {}) {
  const config = options.config ?? loadConfig();
  const outboundLookup = options.outboundLookup;
  // The configured Cobalt instance (e.g. Render free tier) is built once
  // and shared by /api/resolve-social and /api/download/*.
  const cobaltProvider = config.cobaltApiUrl ? new CobaltProvider(config.cobaltApiUrl, config.cobaltApiKey) : null;
  const store = config.transcriptionEnabled ? options.rateLimitStore ?? (config.environment === 'production' && config.redisUrl && config.redisToken
    ? new UpstashRateLimitStore(config.redisUrl, config.redisToken)
    : new MemoryRateLimitStore()) : undefined;
  const app = express();
  app.set('trust proxy', false);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const started = Date.now();
    res.locals.requestId = requestId(req);
    res.setHeader('X-Request-ID', res.locals.requestId);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(), usb=()');
    if (req.path.startsWith('/api/')) res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    if (config.environment === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.on('finish', () => console.log(JSON.stringify({ level: 'info', requestId: res.locals.requestId, route: req.path, method: req.method, status: res.statusCode, durationMs: Date.now() - started })));
    next();
  });
  app.use('/api', originPolicy(config));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', requestId: res.locals.requestId }));
  app.get('/api/readiness', async (_req, res) => {
    if (!config.transcriptionEnabled) return res.json({ status: 'ready', services: { browserTools: true }, requestId: res.locals.requestId });
    const limiterConfigured = config.environment !== 'production' || Boolean(config.redisUrl && config.redisToken && config.identitySecret);
    const limiterReady = limiterConfigured && await Promise.race([store!.ready(), new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1600))]);
    const ready = Boolean(config.geminiApiKey) && limiterReady;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not-ready', services: { transcription: Boolean(config.geminiApiKey), rateLimit: limiterReady }, requestId: res.locals.requestId });
  });

  if (!config.transcriptionEnabled) {
    app.all('/api/transcribe', (_req, _res, next) => next(new ApiError(410, 'FEATURE_DISABLED', 'Server-based transcription is temporarily unavailable.')));
  } else {
    app.use('/api', express.json({ limit: BODY_LIMIT, strict: true }));
    const transcriptionLimit = createRateLimitMiddleware({ store: store!, windowMs: 15 * 60_000, max: 5, endpoint: 'transcribe', identity: (req) => {
      requireProductionLimiter(config);
      const secret = config.identitySecret ?? 'local-development-identity-secret-32';
      return hashIdentity(clientIp(req, config.vercel), secret);
    } });
    app.all('/api/transcribe', (req, res, next) => {
      if (req.method !== 'POST') return next(new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.'));
      if (!req.is('application/json')) return next(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.'));
      next();
    });
    app.post('/api/transcribe', transcriptionLimit, async (req, res, next) => {
    try {
      const { audio, mimeType } = decodeAudio(req.body);
      if (!config.geminiApiKey && !options.generateContent) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Transcription is temporarily unavailable.');
      const providerStarted = Date.now();
      const operation = options.generateContent
        ? options.generateContent(audio, mimeType)
        : import('@google/genai').then(({ GoogleGenAI }) => new GoogleGenAI({ apiKey: config.geminiApiKey! }).models.generateContent({ model: 'gemini-2.5-flash', contents: [{ inlineData: { data: audio, mimeType } }, 'Transcribe the audio with [MM:SS] timestamps. Return only the transcription.'] }).then((result) => result.text || ''));
      const transcription = await Promise.race([operation, new Promise<never>((_, reject) => setTimeout(() => reject(new ApiError(504, 'PROVIDER_TIMEOUT', 'The transcription provider timed out.')), options.providerTimeoutMs ?? PROVIDER_TIMEOUT_MS))]);
      if (!transcription) throw new ApiError(502, 'PROVIDER_ERROR', 'The transcription provider returned no text.');
      console.log(JSON.stringify({ level: 'info', requestId: res.locals.requestId, provider: 'google-gemini', providerLatencyMs: Date.now() - providerStarted }));
      res.json({ transcription, requestId: res.locals.requestId });
    } catch (error) { next(error instanceof ApiError ? error : new ApiError(502, 'PROVIDER_ERROR', 'The transcription provider could not complete the request.')); }
    });
  }

  // ── /api/resolve-social: resolve a social media URL to a downloadable stream ──
  app.all('/api/resolve-social', (req, res, next) => {
    if (req.method !== 'POST') return next(new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.'));
    next();
  });
  app.post('/api/resolve-social', express.json({ limit: '4kb', strict: true }), async (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown>;
      const keys = Object.keys(body);
      if (keys.some((k) => !['url', 'quality'].includes(k))) {
        throw new ApiError(400, 'BAD_REQUEST', 'The request contains unsupported fields.');
      }
      const { url, quality } = body;
      if (!url || typeof url !== 'string') throw new ApiError(400, 'BAD_REQUEST', "Missing 'url'.");
      const resolved = await resolveSocialMedia(url, quality, outboundLookup, cobaltProvider);
      res.json({ ...resolved, requestId: res.locals.requestId });
    } catch (error) { next(error instanceof ApiError ? error : new ApiError(502, 'PROVIDER_ERROR', 'The resolver could not process this request.')); }
  });

  // ── /api/media-proxy: stream external media through the server with SSRF protection ──
  // ── /api/media-proxy: stream external media through the server with SSRF protection ──
  // Redirects are followed manually (max 3 hops) with every hop re-validated
  // by validateOutboundUrl — the old redirect:'follow' let an upstream
  // bounce the request to a private/internal host (SSRF via redirect).
  app.get('/api/media-proxy', async (req, res, next) => {
    try {
      const { url, filename } = req.query as Record<string, string>;
      if (!url || typeof url !== 'string') throw new ApiError(400, 'BAD_REQUEST', "Missing 'url'.");

      let current: URL;
      try { current = await validateOutboundUrl(url, outboundLookup ? { lookup: outboundLookup } : undefined); } catch { throw new ApiError(403, 'BAD_REQUEST', 'The target URL is not allowed.'); }

      const rangeHeader = req.headers.range;
      const fetchHeaders: Record<string, string> = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.8' };
      if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      req.on('close', () => { clearTimeout(timeout); controller.abort(); });

      let upstream: globalThis.Response | undefined;
      const visited = new Set<string>();
      for (let hop = 0; hop <= 3; hop++) {
        if (visited.has(current.href)) throw new ApiError(502, 'PROVIDER_ERROR', 'The upstream redirect looped.');
        visited.add(current.href);
        const attempt = await fetch(current, { headers: fetchHeaders, signal: controller.signal, redirect: 'manual' });
        if ([301, 302, 303, 307, 308].includes(attempt.status)) {
          if (hop === 3) throw new ApiError(502, 'PROVIDER_ERROR', 'The upstream redirected too many times.');
          const location = attempt.headers.get('location');
          if (!location) throw new ApiError(502, 'PROVIDER_ERROR', 'The upstream redirect was invalid.');
          let nextUrl: URL;
          try { nextUrl = new URL(location, current); } catch { throw new ApiError(502, 'PROVIDER_ERROR', 'The upstream redirect was invalid.'); }
          if (current.protocol === 'https:' && nextUrl.protocol !== 'https:') throw new ApiError(502, 'PROVIDER_ERROR', 'The upstream protocol downgrade was rejected.');
          // Re-validate every hop: a redirect to localhost / a private IP /
          // cloud metadata is rejected here, fail-closed.
          current = await validateOutboundUrl(nextUrl.href, outboundLookup ? { lookup: outboundLookup } : undefined);
          continue;
        }
        upstream = attempt;
        break;
      }
      if (!upstream) throw new ApiError(502, 'PROVIDER_ERROR', 'The upstream redirect was invalid.');
      clearTimeout(timeout);

      if (!upstream.ok && upstream.status !== 206) {
        throw new ApiError(502, 'PROVIDER_ERROR', `Upstream returned ${upstream.status}.`);
      }

      const ct = upstream.headers.get('Content-Type') || 'video/mp4';
      const mime = ct.split(';')[0].trim().toLowerCase();
      // Only real media is relayed — an HTML/error page proxied as a
      // "download" would be a misleading output and an arbitrary-URL relay.
      const isMedia = /^(video|audio|image)\//.test(mime) || mime === 'application/octet-stream';
      if (!isMedia) throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'The upstream URL did not return downloadable media.');
      const cl = upstream.headers.get('Content-Length');
      const cr = upstream.headers.get('Content-Range');
      const safeFilename = proxyFilename(filename, mime);

      res.status(upstream.status === 206 ? 206 : 200);
      res.setHeader('Content-Type', ct);
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('Accept-Ranges', 'bytes');
      if (cl) res.setHeader('Content-Length', cl);
      if (cr) res.setHeader('Content-Range', cr);

      if (!upstream.body) { res.end(); return; }
      const reader = upstream.body.getReader();
      let streamedBytes = 0;
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); break; }
          streamedBytes += value.byteLength;
          if (streamedBytes > MAX_PROXY_BYTES) {
            try { await reader.cancel(); } catch { /* already closed */ }
            res.destroy();
            throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The upstream media exceeds the 512 MiB proxy limit.');
          }
          const ok = res.write(value);
          if (!ok) await new Promise(r => res.once('drain', r));
        }
      };
      await pump();
    } catch (error) {
      if (error instanceof ApiError) return next(error);
      if (error instanceof DOMException && error.name === 'AbortError') return next(new ApiError(504, 'PROVIDER_TIMEOUT', 'Upstream timed out.'));
      next(new ApiError(502, 'PROVIDER_ERROR', 'The proxy could not process this request.'));
    }
  });

  const downloadParser = express.json({ limit: '16kb', strict: true });
  const PLATFORMS: Platform[] = ['youtube', 'instagram', 'tiktok', 'facebook'];

  for (const platform of PLATFORMS) {
    app.all(`/api/download/${platform}`, (req, res, next) => {
      if (req.method !== 'POST') return next(new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.'));
      if (!req.is('application/json')) return next(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.'));
      next();
    });
    app.post(`/api/download/${platform}`, downloadParser, async (req, res, next) => {
      try {
        if (!cobaltProvider) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Social download service is not configured.');
        const body = req.body as Record<string, unknown>;
        const keys = Object.keys(body);
        if (keys.some((k) => !['url', 'videoQuality', 'audioFormat', 'downloadMode'].includes(k))) {
          throw new ApiError(400, 'BAD_REQUEST', 'The request contains unsupported fields.');
        }
        const { url, videoQuality, audioFormat, downloadMode } = body;
        if (typeof url !== 'string' || !url.trim()) throw new ApiError(400, 'BAD_REQUEST', 'A URL is required.');
        const validation = validatePlatformUrl(platform, url);
        if (!validation.valid) throw new ApiError(400, 'BAD_REQUEST', validation.error!);
        const result = await cobaltProvider.resolve(platform, validation.normalizedUrl, {
          videoQuality: typeof videoQuality === 'string' ? videoQuality : undefined,
          audioFormat: typeof audioFormat === 'string' ? audioFormat : undefined,
          downloadMode: typeof downloadMode === 'string' ? downloadMode : undefined,
        });
        if (result.status === 'error') {
          const code = result.errorCode ?? 'PROVIDER_ERROR';
          // Surface the provider's own failure kind instead of collapsing
          // everything into a generic 502 — the frontend shows this to the
          // user, so "rate-limited" must not read as "provider down" and
          // "unsupported link" must not read as a server bug.
          if (code === 'PROVIDER_NOT_CONFIGURED') {
            throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Social download service is not configured.');
          }
          if (code === 'PROVIDER_WAKING') {
            throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'The download server is waking up after being idle (about a minute). Please try again in a moment.');
          }
          if (code === 'PROVIDER_TIMEOUT') {
            throw new ApiError(504, 'PROVIDER_TIMEOUT', 'The download provider timed out. Try again in a moment.');
          }
          if (code === 'PROVIDER_RATE_LIMITED' || code.includes('rate-limited')) {
            throw new ApiError(429, 'RATE_LIMITED', 'The download provider is rate-limited. Wait a few minutes and try again.', result.retryAfterSeconds);
          }
          if (code.includes('unsupported') || code.includes('invalid')) {
            throw new ApiError(422, 'PROVIDER_ERROR', 'This link is not supported by the download provider.');
          }
          if (code.includes('blocked')) {
            throw new ApiError(422, 'PROVIDER_ERROR', 'This content is private or blocked by the provider.');
          }
          throw new ApiError(502, 'PROVIDER_ERROR', 'The download provider could not resolve this URL.');
        }
        res.json({ ...result, requestId: res.locals.requestId });
      } catch (error) { next(error instanceof ApiError ? error : new ApiError(502, 'PROVIDER_ERROR', 'The download provider could not complete the request.')); }
    });
  }

  app.use('/api', (_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'API route not found.')));
  app.use(errorMiddleware);
  return app;
}

export default function handler(req: Request, res: Response) {
  try { return createApp()(req, res); }
  catch { return sendError(res, requestId(req), new ApiError(500, 'SERVICE_UNAVAILABLE', 'The service is temporarily unavailable.')); }
}
