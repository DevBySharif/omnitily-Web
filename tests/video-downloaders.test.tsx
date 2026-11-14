// Worker A (Downloaders) — deterministic tests for the video downloaders.
//
// Every provider is intercepted via a stubbed global fetch, so no test
// touches the live network. yt-dlp is NOT mocked: Node built-ins are
// externalised by Vitest, so vi.mock cannot intercept `node:child_process`.
// That is safe here because yt-dlp is absent from this sandbox and from
// Vercel, so the yt-dlp leg fails fast to null; the mp3 happy path is
// covered through the Cobalt audio leg instead. Live-provider behaviour
// (InnerTube 200, tikwm code 0, public Cobalt dead/auth-gated) was verified
// separately with curl on 2026-11-10; see the worker report.
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createApp } from '../api/index.js';
import { CobaltProvider } from '../lib/providers/cobalt.js';
import PlatformDownloader from '../src/components/PlatformDownloader';
import SocialDownloader from '../src/components/SocialDownloader';
import type { AppConfig } from '../lib/config.js';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

// ── fetch stub ─────────────────────────────────────────────────────────────

interface MockFetchCall { url: string; init: unknown }

const fetchCalls: MockFetchCall[] = [];
type FetchHandler = (url: string, init?: unknown) => unknown;
let fetchHandler: FetchHandler = () => { throw new Error('unexpected fetch call'); };

function headersMap(entries: Record<string, string>) {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(entries)) lower[k.toLowerCase()] = v;
  return { get: (name: string) => lower[name.toLowerCase()] ?? null };
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headersMap({ 'content-type': 'application/json', ...headers }),
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

function responseBodyText(res: { body?: unknown; text?: string }): string {
  // supertest hands binary (non-JSON/text) bodies back as a Buffer.
  if (Buffer.isBuffer(res.body)) return res.body.toString('utf-8');
  if (typeof res.body === 'string') return res.body;
  return res.text ?? '';
}

function streamResponse(status: number, chunks: Uint8Array[], contentType: string, contentLength?: number) {
  let index = 0;
  const headers: Record<string, string> = { 'content-type': contentType };
  if (contentLength !== undefined) headers['content-length'] = String(contentLength);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headersMap(headers),
    body: {
      getReader: () => ({
        read: async () => (index < chunks.length
          ? { done: false, value: chunks[index++] }
          : { done: true, value: undefined }),
        cancel: async () => { index = chunks.length; },
      }),
    },
  };
}

const mockFetch = vi.fn(async (input: unknown, init?: unknown) => {
  const url = String((input as { url?: unknown } | null)?.url ?? input);
  fetchCalls.push({ url, init });
  return fetchHandler(url, init) as unknown as Response;
});

beforeEach(() => {
  fetchCalls.length = 0;
  fetchHandler = () => { throw new Error('unexpected fetch call'); };
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── fixtures ───────────────────────────────────────────────────────────────

const TEST_CONFIG: AppConfig = {
  environment: 'test',
  vercel: false,
  transcriptionEnabled: false,
  allowedOrigins: new Set(['https://omnitily.vercel.app']),
  cobaltApiUrl: 'https://cobalt.example/',
  cobaltApiKey: 'test-api-key',
};
const NO_COBALT_CONFIG: AppConfig = { ...TEST_CONFIG, cobaltApiUrl: undefined };
// Test seam for the public-Cobalt race: the sandbox's DNS answers every
// host with a proxy CGNAT address (198.18.0.0/15), which the SSRF validator
// correctly rejects. Injecting a public answer makes the race deterministic
// without weakening production validation (production always uses real DNS).
const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];

const YT_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const TT_URL = 'https://www.tiktok.com/@zachking/video/6768504823336815877';
const IG_URL = 'https://www.instagram.com/p/CxYzAbCdEfG/';
const FB_URL = 'https://www.facebook.com/watch?v=123456';

const YT_THUMB = 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg';

function innerTubeResponse(
  formats: Array<{ height: number; url: string }>,
  overrides: { title?: string; lengthSeconds?: string; playability?: string; reason?: string } = {},
) {
  return jsonResponse(200, {
    playabilityStatus: { status: overrides.playability ?? 'OK', reason: overrides.reason ?? '' },
    videoDetails: {
      title: overrides.title ?? 'Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)',
      lengthSeconds: overrides.lengthSeconds ?? '213',
      thumbnail: { thumbnails: [{ url: YT_THUMB }] },
    },
    streamingData: { formats: formats.map((f) => ({ height: f.height, url: f.url, mimeType: 'video/mp4' })) },
  });
}

function tikwmResponse(data: Record<string, unknown>, code = 0) {
  return jsonResponse(200, { code, msg: code === 0 ? 'success' : 'Free Api Limit: 1 request/second.', data });
}

function cobaltTunnel(url = 'https://tunnel.example/video.mp4', filename = 'cobalt-video.mp4') {
  return jsonResponse(200, { status: 'tunnel', url, filename });
}

function cobaltError(code: string, httpStatus = 200) {
  return jsonResponse(httpStatus, { status: 'error', error: { code } });
}

/** Route every provider call to a failure, except hosts the test overrides. */
function failingFetchHandler(url: string) {
  if (url.includes('youtubei/v1/player')) return jsonResponse(500, {});
  if (url.includes('tikwm.com')) return jsonResponse(200, { code: -1, msg: 'failed' });
  if (url.includes('oembed')) return jsonResponse(404, {});
  if (url.includes('cobalt')) throw new Error('cobalt unreachable');
  throw new Error(`unexpected fetch: ${url}`);
}

// ── /api/resolve-social ────────────────────────────────────────────────────

describe('resolve-social (resolver)', () => {
  it('rejects a non-platform URL with 400 and never fetches it', async () => {
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: 'https://example.com/video.mp4' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toMatch(/YouTube, TikTok, Instagram, and Facebook/);
    expect(fetchCalls).toHaveLength(0);
  });

  it('rejects an SSRF-style URL (metadata IP) without fetching it', async () => {
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: 'https://169.254.169.254/latest/meta-data/' });
    expect(res.status).toBe(400);
    expect(fetchCalls).toHaveLength(0);
    expect(fetchCalls.some((c) => c.url.includes('169.254'))).toBe(false);
  });

  it('rejects http URLs, unknown fields, and bad quality values', async () => {
    const app = () => createApp({ config: NO_COBALT_CONFIG });
    const post = (body: Record<string, unknown>) => request(app()).post('/api/resolve-social').set('Content-Type', 'application/json').send(body);
    expect((await post({ url: 'http://youtube.com/watch?v=dQw4w9WgXcQ' })).status).toBe(400);
    expect((await post({})).status).toBe(400);
    expect((await post({ url: YT_URL, evil: true })).status).toBe(400);
    expect((await post({ url: YT_URL, quality: '4k' })).status).toBe(400);
    expect((await post({ url: YT_URL, quality: 720 })).status).toBe(400);
  });

  it('resolves YouTube via InnerTube and honours the default (max) quality', async () => {
    fetchHandler = (url) => {
      if (url.includes('youtubei/v1/player')) {
        return innerTubeResponse([
          { height: 1080, url: 'https://cdn.example/1080.mp4' },
          { height: 720, url: 'https://cdn.example/720.mp4' },
          { height: 360, url: 'https://cdn.example/360.mp4' },
        ]);
      }
      return failingFetchHandler(url);
    };
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: YT_URL });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      title: expect.stringContaining('Rick Astley'),
      thumbnail: YT_THUMB,
      videoUrl: 'https://cdn.example/1080.mp4',
      duration: '03:33',
      platform: 'YouTube',
      qualityServed: '1080p',
    });
    expect(fetchCalls.some((c) => c.url.includes('youtubei/v1/player'))).toBe(true);
  });

  it('caps the YouTube format at the requested quality', async () => {
    fetchHandler = (url) => {
      if (url.includes('youtubei/v1/player')) {
        return innerTubeResponse([
          { height: 1080, url: 'https://cdn.example/1080.mp4' },
          { height: 720, url: 'https://cdn.example/720.mp4' },
          { height: 360, url: 'https://cdn.example/360.mp4' },
        ]);
      }
      return failingFetchHandler(url);
    };
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: YT_URL, quality: '360p' });
    expect(res.status).toBe(200);
    expect(res.body.videoUrl).toBe('https://cdn.example/360.mp4');
    expect(res.body.qualityServed).toBe('360p');
  });

  it('serves the best available format when the cap exceeds it', async () => {
    fetchHandler = (url) => {
      if (url.includes('youtubei/v1/player')) {
        return innerTubeResponse([{ height: 360, url: 'https://cdn.example/360.mp4' }]);
      }
      return failingFetchHandler(url);
    };
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: YT_URL, quality: '1080p' });
    expect(res.status).toBe(200);
    expect(res.body.videoUrl).toBe('https://cdn.example/360.mp4');
    expect(res.body.qualityServed).toBe('360p');
  });

  it('reports a private YouTube video as 422, not as a rate limit', async () => {
    fetchHandler = (url) => {
      if (url.includes('youtubei/v1/player')) {
        return innerTubeResponse([], { playability: 'ERROR', reason: 'Private video' });
      }
      return failingFetchHandler(url);
    };
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: YT_URL });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/private, removed, or unavailable/i);
  });

  it('reports an InnerTube 429 as a rate limit with Retry-After', async () => {
    fetchHandler = (url) => {
      if (url.includes('youtubei/v1/player')) return jsonResponse(429, {});
      return failingFetchHandler(url);
    };
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: YT_URL });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.body.error.message).toMatch(/rate-limited/i);
    expect(res.headers['retry-after']).toBeTruthy();
  });

  it('resolves TikTok via tikwm and picks hdplay for max, play for 360p', async () => {
    const tikwmData = {
      title: 'Wizard video',
      cover: 'https://cdn.example/cover.jpg',
      duration: '18',
      play: 'https://cdn.example/play.mp4',
      hdplay: 'https://cdn.example/hdplay.mp4',
    };
    fetchHandler = (url) => {
      if (url.includes('tikwm.com')) return tikwmResponse(tikwmData);
      return failingFetchHandler(url);
    };
    const app = () => createApp({ config: NO_COBALT_CONFIG });
    const post = (body: Record<string, unknown>) => request(app()).post('/api/resolve-social').set('Content-Type', 'application/json').send(body);
    const hd = await post({ url: TT_URL });
    expect(hd.status).toBe(200);
    expect(hd.body.videoUrl).toBe('https://cdn.example/hdplay.mp4');
    expect(hd.body.qualityServed).toBe('hd');
    expect(hd.body.duration).toBe('00:18');
    expect(fetchCalls.find((c) => c.url.includes('tikwm.com'))?.url).toContain('hd=1');
    fetchCalls.length = 0;
    const sd = await post({ url: TT_URL, quality: '360p' });
    expect(sd.status).toBe(200);
    expect(sd.body.videoUrl).toBe('https://cdn.example/play.mp4');
    expect(sd.body.qualityServed).toBe('sd');
    expect(fetchCalls.find((c) => c.url.includes('tikwm.com'))?.url).toContain('hd=0');
  });

  it('reports a tikwm free-tier rate limit as 429', async () => {
    fetchHandler = (url) => {
      if (url.includes('tikwm.com')) return jsonResponse(200, { code: -1, msg: 'Free Api Limit: 1 request/second.' });
      return failingFetchHandler(url);
    };
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: TT_URL });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('serves mp3 from the Cobalt audio leg and never calls the video legs', async () => {
    // yt-dlp is absent here, so the audio leg exercised is the public
    // Cobalt race with downloadMode 'audio' (endpoints are validated with
    // the injected public lookup, then answered by the fetch stub).
    let cobaltBody = '';
    fetchHandler = (url, init) => {
      if (url.includes('cobalt')) {
        cobaltBody = String((init as { body?: unknown } | undefined)?.body ?? '');
        return jsonResponse(200, { status: 'tunnel', url: 'https://cdn.example/audio.mp3', filename: 'audio.mp3' });
      }
      return failingFetchHandler(url);
    };
    const res = await request(createApp({ config: NO_COBALT_CONFIG, outboundLookup: publicLookup }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: YT_URL, quality: 'mp3' });
    expect(res.status).toBe(200);
    expect(res.body.videoUrl).toBe('https://cdn.example/audio.mp3');
    expect(res.body.qualityServed).toBe('audio');
    expect(JSON.parse(cobaltBody).downloadMode).toBe('audio');
    expect(fetchCalls.some((c) => c.url.includes('youtubei/v1/player'))).toBe(false);
  });

  it('returns an honest 422 for mp3 when no audio leg can serve it', async () => {
    fetchHandler = failingFetchHandler;
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: YT_URL, quality: 'mp3' });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/Audio-only download is not available/);
  });

  it('returns 503 for Instagram/Facebook when no instance is configured, and never fetches the user URL', async () => {
    fetchHandler = failingFetchHandler;
    const app = () => createApp({ config: NO_COBALT_CONFIG });
    for (const url of [IG_URL, FB_URL]) {
      const res = await request(app())
        .post('/api/resolve-social')
        .set('Content-Type', 'application/json')
        .send({ url });
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(res.body.error.message).toMatch(/download server/i);
    }
    expect(fetchCalls.some((c) => c.url.includes('instagram.com'))).toBe(false);
    expect(fetchCalls.some((c) => c.url.includes('facebook.com'))).toBe(false);
  });

  it('resolves Instagram via the public Cobalt race when an instance answers', async () => {
    fetchHandler = (url) => {
      if (url.includes('cobalt')) {
        return jsonResponse(200, { status: 'tunnel', url: 'https://cdn.example/ig.mp4', filename: 'ig.mp4' });
      }
      return failingFetchHandler(url);
    };
    const res = await request(createApp({ config: NO_COBALT_CONFIG, outboundLookup: publicLookup }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: IG_URL });
    expect(res.status).toBe(200);
    expect(res.body.videoUrl).toBe('https://cdn.example/ig.mp4');
    expect(res.body.platform).toBe('Instagram');
  });

  it('returns 422 (not a fabricated link) when every provider fails', async () => {
    fetchHandler = failingFetchHandler;
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: YT_URL });
    expect(res.status).toBe(422);
    expect(res.body.videoUrl).toBeUndefined();
  });
});

// ── resolve-social with a configured Cobalt instance (Render free tier) ─────

describe('resolve-social with a configured Cobalt instance', () => {
  /** Stub the instance: GET / answers instance info, POST answers `postBody`. */
  function cobaltInstanceHandler(postBody: unknown) {
    return (url: string, init?: unknown) => {
      const method = (init as { method?: string } | undefined)?.method ?? 'GET';
      if (url.includes('cobalt.example')) {
        if (method === 'GET') return jsonResponse(200, { cobalt: { version: '11.0.0', api: 10 } });
        return jsonResponse(200, postBody);
      }
      return failingFetchHandler(url);
    };
  }

  it('resolves Instagram via the configured instance (first leg for IG/FB)', async () => {
    fetchHandler = cobaltInstanceHandler({ status: 'tunnel', url: 'https://cdn.example/ig.mp4', filename: 'my-reel.mp4' });
    const res = await request(createApp({ config: TEST_CONFIG }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: IG_URL });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      videoUrl: 'https://cdn.example/ig.mp4',
      title: 'my reel',
      platform: 'Instagram',
      // No stock-photo thumbnail: Cobalt returns no thumbnail, so the
      // resolver leaves it empty and the UI previews the video itself.
      thumbnail: '',
    });
  });

  it('resolves Facebook via the configured instance picker (first video item)', async () => {
    fetchHandler = cobaltInstanceHandler({
      status: 'picker',
      picker: [
        { type: 'video', url: 'https://cdn.example/fb.mp4', thumb: 'https://cdn.example/fb.jpg' },
        { type: 'photo', url: 'https://cdn.example/fb.jpg' },
      ],
    });
    const res = await request(createApp({ config: TEST_CONFIG }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: FB_URL });
    expect(res.status).toBe(200);
    expect(res.body.videoUrl).toBe('https://cdn.example/fb.mp4');
    expect(res.body.thumbnail).toBe('https://cdn.example/fb.jpg');
    expect(res.body.platform).toBe('Facebook');
  });

  it('uses the configured instance as a YouTube fallback after the config-free legs fail', async () => {
    fetchHandler = (url, init) => {
      if (url.includes('youtubei/v1/player')) return jsonResponse(500, {});
      if (url.includes('oembed')) return jsonResponse(404, {});
      return cobaltInstanceHandler({ status: 'tunnel', url: 'https://cdn.example/yt.mp4', filename: 'yt-video.mp4' })(url, init);
    };
    const res = await request(createApp({ config: TEST_CONFIG }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: YT_URL });
    expect(res.status).toBe(200);
    expect(res.body.videoUrl).toBe('https://cdn.example/yt.mp4');
    expect(res.body.platform).toBe('YouTube');
  });

  it('serves Instagram mp3 through the configured instance in audio mode', async () => {
    let cobaltBody = '';
    fetchHandler = (url, init) => {
      const method = (init as { method?: string } | undefined)?.method ?? 'GET';
      if (url.includes('cobalt.example')) {
        if (method === 'GET') return jsonResponse(200, { cobalt: { version: '11.0.0', api: 10 } });
        cobaltBody = String((init as { body?: unknown } | undefined)?.body ?? '');
        return jsonResponse(200, { status: 'tunnel', url: 'https://cdn.example/audio.mp3', filename: 'audio.mp3' });
      }
      return failingFetchHandler(url);
    };
    const res = await request(createApp({ config: TEST_CONFIG }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: IG_URL, quality: 'mp3' });
    expect(res.status).toBe(200);
    expect(res.body.videoUrl).toBe('https://cdn.example/audio.mp3');
    expect(res.body.qualityServed).toBe('audio');
    expect(JSON.parse(cobaltBody).downloadMode).toBe('audio');
  });

  it('returns 503 with a retry-in-a-minute message when the instance is waking up', async () => {
    fetchHandler = (url, init) => {
      const method = (init as { method?: string } | undefined)?.method ?? 'GET';
      if (url.includes('cobalt.example')) {
        if (method === 'GET') return jsonResponse(502, {});
        throw new Error('POST must not be called while the instance is booting');
      }
      return failingFetchHandler(url);
    };
    const res = await request(createApp({ config: TEST_CONFIG }))
      .post('/api/resolve-social')
      .set('Content-Type', 'application/json')
      .send({ url: IG_URL });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(res.body.error.message).toMatch(/waking up/i);
  });

  it('maps a waking instance to 503 (not 502) on /api/download/instagram', async () => {
    fetchHandler = (url, init) => {
      const method = (init as { method?: string } | undefined)?.method ?? 'GET';
      if (url.includes('cobalt.example')) {
        if (method === 'GET') return jsonResponse(502, {});
        throw new Error('POST must not be called while the instance is booting');
      }
      throw new Error(`unexpected fetch: ${url}`);
    };
    const res = await request(createApp({ config: TEST_CONFIG }))
      .post('/api/download/instagram')
      .set('Content-Type', 'application/json')
      .send({ url: IG_URL });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(res.body.error.message).toMatch(/waking up/i);
  });
});

// ── /api/download/* (configured Cobalt) ─────────────────────────────────────

describe('download API with a configured Cobalt provider', () => {
  it.each([
    ['youtube', YT_URL],
    ['instagram', IG_URL],
    ['tiktok', TT_URL],
    ['facebook', FB_URL],
  ])('POST /api/download/%s returns a tunnel URL from Cobalt', async (platform, url) => {
    fetchHandler = (u) => {
      if (u.includes('cobalt.example')) return cobaltTunnel();
      throw new Error(`unexpected fetch: ${u}`);
    };
    const res = await request(createApp({ config: TEST_CONFIG }))
      .post(`/api/download/${platform}`)
      .set('Content-Type', 'application/json')
      .send({ url });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'tunnel', url: 'https://tunnel.example/video.mp4', filename: 'cobalt-video.mp4' });
    expect(res.body.requestId).toBeTruthy();
  });

  it('returns picker items (with audio) from Cobalt', async () => {
    fetchHandler = (u) => {
      if (u.includes('cobalt.example')) {
        return jsonResponse(200, {
          status: 'picker',
          picker: [
            { type: 'video', url: 'https://cdn.example/v1.mp4', thumb: 'https://cdn.example/t1.jpg' },
            { type: 'photo', url: 'https://cdn.example/p1.jpg' },
          ],
          audio: 'https://cdn.example/a.mp3',
          audioFilename: 'audio.mp3',
        });
      }
      throw new Error(`unexpected fetch: ${u}`);
    };
    const res = await request(createApp({ config: TEST_CONFIG }))
      .post('/api/download/instagram')
      .set('Content-Type', 'application/json')
      .send({ url: IG_URL });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('picker');
    expect(res.body.items).toHaveLength(2);
    expect(res.body.audioUrl).toBe('https://cdn.example/a.mp3');
  });

  it('maps a Cobalt rate limit to 429 RATE_LIMITED', async () => {
    fetchHandler = (u) => {
      if (u.includes('cobalt.example')) return cobaltError('error.api.fetch.rate-limited', 429);
      throw new Error(`unexpected fetch: ${u}`);
    };
    const res = await request(createApp({ config: TEST_CONFIG }))
      .post('/api/download/youtube')
      .set('Content-Type', 'application/json')
      .send({ url: YT_URL });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.body.error.message).toMatch(/rate-limited/i);
  });

  it('maps a Cobalt unsupported-link error to 422, not 502', async () => {
    fetchHandler = (u) => {
      if (u.includes('cobalt.example')) return cobaltError('error.api.fetch.unsupported');
      throw new Error(`unexpected fetch: ${u}`);
    };
    const res = await request(createApp({ config: TEST_CONFIG }))
      .post('/api/download/youtube')
      .set('Content-Type', 'application/json')
      .send({ url: YT_URL });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/not supported/);
  });

  it('maps a Cobalt blocked/private error to 422', async () => {
    fetchHandler = (u) => {
      if (u.includes('cobalt.example')) return cobaltError('error.api.fetch.blocked');
      throw new Error(`unexpected fetch: ${u}`);
    };
    const res = await request(createApp({ config: TEST_CONFIG }))
      .post('/api/download/facebook')
      .set('Content-Type', 'application/json')
      .send({ url: FB_URL });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/private or blocked/);
  });

  it('returns 502 when the Cobalt provider is unreachable (provider down)', async () => {
    fetchHandler = () => { throw new Error('connect ECONNREFUSED'); };
    const res = await request(createApp({ config: TEST_CONFIG }))
      .post('/api/download/youtube')
      .set('Content-Type', 'application/json')
      .send({ url: YT_URL });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('PROVIDER_ERROR');
  });

  it('still returns 503 when Cobalt is not configured (behaviour preserved)', async () => {
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .post('/api/download/youtube')
      .set('Content-Type', 'application/json')
      .send({ url: YT_URL });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(fetchCalls).toHaveLength(0);
  });
});

describe('CobaltProvider', () => {
  it('maps HTTP 429 to PROVIDER_RATE_LIMITED and keeps Retry-After', async () => {
    fetchHandler = () => jsonResponse(429, { status: 'error', error: { code: 'error.api.fetch.rate-limited' } }, { 'retry-after': '120' });
    const result = await new CobaltProvider('https://cobalt.example/').resolve('youtube', YT_URL);
    expect(result.status).toBe('error');
    expect(result.errorCode).toBe('error.api.fetch.rate-limited');
    expect(result.retryAfterSeconds).toBe(120);
  });

  it('maps HTTP 429 without a body to PROVIDER_RATE_LIMITED', async () => {
    fetchHandler = () => ({
      ok: false,
      status: 429,
      headers: headersMap({}),
      json: async () => { throw new Error('no json'); },
    });
    const result = await new CobaltProvider('https://cobalt.example/').resolve('youtube', YT_URL);
    expect(result.errorCode).toBe('PROVIDER_RATE_LIMITED');
  });

  it('rejects a tunnel response with no URL instead of handing out a dead link', async () => {
    fetchHandler = () => jsonResponse(200, { status: 'tunnel', filename: 'x.mp4' });
    const result = await new CobaltProvider('https://cobalt.example/').resolve('youtube', YT_URL);
    expect(result.status).toBe('error');
    expect(result.errorCode).toBe('UNKNOWN_RESPONSE');
  });

  it('rejects a picker response with no usable items', async () => {
    fetchHandler = () => jsonResponse(200, { status: 'picker', picker: [{ type: 'video', url: '' }] });
    const result = await new CobaltProvider('https://cobalt.example/').resolve('instagram', IG_URL);
    expect(result.status).toBe('error');
    expect(result.errorCode).toBe('UNKNOWN_RESPONSE');
  });

  it('filters picker items without URLs and keeps the good ones', async () => {
    fetchHandler = () => jsonResponse(200, {
      status: 'picker',
      picker: [
        { type: 'video', url: '' },
        { type: 'photo', url: 'https://cdn.example/p1.jpg', thumb: 'https://cdn.example/t1.jpg' },
      ],
    });
    const result = await new CobaltProvider('https://cobalt.example/').resolve('instagram', IG_URL);
    expect(result.status).toBe('picker');
    expect(result.items).toHaveLength(1);
    expect(result.items?.[0].url).toBe('https://cdn.example/p1.jpg');
  });
});

// ── /api/media-proxy ────────────────────────────────────────────────────────

describe('media-proxy', () => {
  const clipUrl = 'https://93.184.216.34/clip.mp4';
  const helloChunks = [new TextEncoder().encode('hel'), new TextEncoder().encode('lo')];

  it('streams media bytes and names the file once (no double extension)', async () => {
    fetchHandler = (url) => {
      expect(url).toBe(clipUrl);
      return streamResponse(200, helloChunks, 'video/mp4', 5);
    };
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .get('/api/media-proxy')
      .query({ url: clipUrl, filename: 'clip.mp4' });
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toBe('attachment; filename="clip.mp4"');
    expect(res.headers['content-length']).toBe('5');
    expect(responseBodyText(res)).toBe('hello');
  });

  it('derives the extension from the upstream content type (photo = .jpg)', async () => {
    fetchHandler = () => streamResponse(200, [new TextEncoder().encode('img')], 'image/jpeg', 3);
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .get('/api/media-proxy')
      .query({ url: 'https://93.184.216.34/photo', filename: 'instagram-download-1' });
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toBe('attachment; filename="instagram-download-1.jpg"');
  });

  it('rejects a non-media upstream (HTML page) with 415', async () => {
    fetchHandler = () => streamResponse(200, [new TextEncoder().encode('<html>')], 'text/html', 6);
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .get('/api/media-proxy')
      .query({ url: clipUrl, filename: 'clip.mp4' });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('returns 502 when upstream is 404', async () => {
    fetchHandler = () => streamResponse(404, [], 'video/mp4');
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .get('/api/media-proxy')
      .query({ url: clipUrl, filename: 'clip.mp4' });
    expect(res.status).toBe(502);
  });

  it('rejects SSRF targets (localhost, metadata IP, http) with 403/400', async () => {
    const app = () => createApp({ config: NO_COBALT_CONFIG });
    const noUrl = await request(app()).get('/api/media-proxy');
    expect(noUrl.status).toBe(400);
    for (const target of ['https://127.0.0.1/x.mp4', 'https://169.254.169.254/x.mp4', 'http://93.184.216.34/x.mp4']) {
      const res = await request(app()).get('/api/media-proxy').query({ url: target });
      expect([400, 403]).toContain(res.status);
    }
    expect(fetchCalls).toHaveLength(0);
  });

  it('follows a redirect to a public host, but not to a private IP', async () => {
    fetchHandler = (url) => {
      if (url === 'https://93.184.216.34/short.mp4') {
        return { ok: false, status: 302, headers: headersMap({ location: 'https://93.184.216.34/final.mp4' }) };
      }
      if (url === 'https://93.184.216.34/final.mp4') {
        return streamResponse(200, helloChunks, 'video/mp4', 5);
      }
      throw new Error(`unexpected fetch: ${url}`);
    };
    const ok = await request(createApp({ config: NO_COBALT_CONFIG }))
      .get('/api/media-proxy')
      .query({ url: 'https://93.184.216.34/short.mp4', filename: 'clip.mp4' });
    expect(ok.status).toBe(200);
    expect(responseBodyText(ok)).toBe('hello');
    expect(fetchCalls).toHaveLength(2);

    fetchCalls.length = 0;
    fetchHandler = (url) => {
      if (url === 'https://93.184.216.34/trap.mp4') {
        return { ok: false, status: 302, headers: headersMap({ location: 'https://10.0.0.5/secret' }) };
      }
      throw new Error(`unexpected fetch: ${url}`);
    };
    const blocked = await request(createApp({ config: NO_COBALT_CONFIG }))
      .get('/api/media-proxy')
      .query({ url: 'https://93.184.216.34/trap.mp4', filename: 'clip.mp4' });
    expect(blocked.status).toBe(403);
    expect(fetchCalls).toHaveLength(1);
  });

  it('rejects a redirect loop with 502', async () => {
    fetchHandler = () => ({ ok: false, status: 302, headers: headersMap({ location: 'https://93.184.216.34/loop.mp4' }) });
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .get('/api/media-proxy')
      .query({ url: 'https://93.184.216.34/loop.mp4', filename: 'clip.mp4' });
    expect(res.status).toBe(502);
    expect(res.body.error.message).toMatch(/looped/);
  });

  it('forwards a Range header upstream', async () => {
    let seenRange: string | undefined;
    fetchHandler = (_url, init) => {
      seenRange = (init as { headers?: Record<string, unknown> } | undefined)?.headers?.Range as string | undefined;
      return streamResponse(206, helloChunks, 'video/mp4', 5);
    };
    const res = await request(createApp({ config: NO_COBALT_CONFIG }))
      .get('/api/media-proxy')
      .set('Range', 'bytes=0-4')
      .query({ url: clipUrl, filename: 'clip.mp4' });
    expect(res.status).toBe(206);
    expect(seenRange).toBe('bytes=0-4');
  });
});

// ── components ─────────────────────────────────────────────────────────────

describe('PlatformDownloader component', () => {
  const clickSpy = () => vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

  function renderYoutube() {
    return render(<PlatformDownloader platform="youtube" icon={<span>YT</span>} description="Download public YouTube videos." />);
  }

  it('shows a client-side error for a wrong-platform URL without calling the API', async () => {
    renderYoutube();
    const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);
    fireEvent.change(input, { target: { value: 'https://vimeo.com/12345' } });
    fireEvent.click(screen.getByRole('button', { name: /Resolve/ }));
    expect(await screen.findByText('Please enter a valid YouTube URL.')).toBeInTheDocument();
    expect(fetchCalls).toHaveLength(0);
  });

  it('shows a client-side error for an http URL', async () => {
    renderYoutube();
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), { target: { value: 'http://youtube.com/watch?v=dQw4w9WgXcQ' } });
    fireEvent.click(screen.getByRole('button', { name: /Resolve/ }));
    expect(await screen.findByText('Only HTTPS URLs are supported.')).toBeInTheDocument();
    expect(fetchCalls).toHaveLength(0);
  });

  it('resolves via Cobalt tunnel and downloads through the proxy with real progress', async () => {
    const spy = clickSpy();
    fetchHandler = (url) => {
      if (url.startsWith('/api/download/youtube')) return cobaltTunnel('https://93.184.216.34/v.mp4', 'clip.mp4');
      if (url.startsWith('/api/media-proxy')) {
        expect(url).toContain(encodeURIComponent('https://93.184.216.34/v.mp4'));
        return streamResponse(200, [new TextEncoder().encode('01234'), new TextEncoder().encode('56789')], 'video/mp4', 10);
      }
      throw new Error(`unexpected fetch: ${url}`);
    };
    renderYoutube();
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), { target: { value: YT_URL } });
    fireEvent.click(screen.getByRole('button', { name: /Resolve/ }));
    expect(await screen.findByText('clip.mp4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(await screen.findByText(/Download started!/)).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('falls back to resolve-social when Cobalt is not configured (503) and shows its metadata', async () => {
    const spy = clickSpy();
    fetchHandler = (url) => {
      if (url.startsWith('/api/download/youtube')) {
        return jsonResponse(503, { error: { code: 'SERVICE_UNAVAILABLE', message: 'Social download service is not configured.' } });
      }
      if (url.startsWith('/api/resolve-social')) {
        return jsonResponse(200, {
          title: 'Fallback Video Title', thumbnail: YT_THUMB,
          videoUrl: 'https://93.184.216.34/v.mp4', duration: '03:33',
          platform: 'YouTube', qualityServed: '360p',
        });
      }
      if (url.startsWith('/api/media-proxy')) {
        return streamResponse(200, [new TextEncoder().encode('0123456789')], 'video/mp4', 10);
      }
      throw new Error(`unexpected fetch: ${url}`);
    };
    renderYoutube();
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), { target: { value: YT_URL } });
    fireEvent.click(screen.getByRole('button', { name: /Resolve/ }));
    expect(await screen.findByText('Fallback Video Title')).toBeInTheDocument();
    expect(screen.getByText(/Duration 03:33/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(await screen.findByText(/Download started!/)).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does NOT fall back on a real provider error (502) and shows it honestly', async () => {
    fetchHandler = (url) => {
      if (url.startsWith('/api/download/youtube')) {
        return jsonResponse(502, { error: { code: 'PROVIDER_ERROR', message: 'The download provider could not resolve this URL.' } });
      }
      throw new Error(`unexpected fetch: ${url}`);
    };
    renderYoutube();
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), { target: { value: YT_URL } });
    fireEvent.click(screen.getByRole('button', { name: /Resolve/ }));
    expect(await screen.findByText('The download provider could not resolve this URL.')).toBeInTheDocument();
    expect(fetchCalls.some((c) => c.url.startsWith('/api/resolve-social'))).toBe(false);
  });

  it('shows a video preview when Cobalt returns no thumbnail', async () => {
    fetchHandler = (url) => {
      if (url.startsWith('/api/download/youtube')) return cobaltTunnel('https://93.184.216.34/v.mp4', 'clip.mp4');
      throw new Error(`unexpected fetch: ${url}`);
    };
    const { container } = renderYoutube();
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), { target: { value: YT_URL } });
    fireEvent.click(screen.getByRole('button', { name: /Resolve/ }));
    expect(await screen.findByText('clip.mp4')).toBeInTheDocument();
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.getAttribute('src')).toBe('https://93.184.216.34/v.mp4');
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows an honest error when both the Cobalt and fallback resolvers fail', async () => {
    fetchHandler = (url) => {
      if (url.startsWith('/api/download/youtube')) {
        return jsonResponse(503, { error: { code: 'SERVICE_UNAVAILABLE', message: 'Social download service is not configured.' } });
      }
      if (url.startsWith('/api/resolve-social')) {
        return jsonResponse(422, { error: { code: 'PROVIDER_ERROR', message: 'Could not extract a stream URL. The link may be private, expired, or unsupported.' } });
      }
      throw new Error(`unexpected fetch: ${url}`);
    };
    renderYoutube();
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), { target: { value: YT_URL } });
    fireEvent.click(screen.getByRole('button', { name: /Resolve/ }));
    expect(await screen.findByText(/Could not extract a stream URL/)).toBeInTheDocument();
  });

  it('renders picker items and downloads the chosen one through the proxy', async () => {
    const spy = clickSpy();
    fetchHandler = (url) => {
      if (url.startsWith('/api/download/instagram')) {
        return jsonResponse(200, {
          status: 'picker',
          items: [
            { type: 'video', url: 'https://93.184.216.34/v1.mp4', thumb: 'https://cdn.example/t1.jpg' },
            { type: 'photo', url: 'https://93.184.216.34/p1.jpg' },
          ],
          audioUrl: 'https://93.184.216.34/a.mp3',
          audioFilename: 'audio.mp3',
        });
      }
      if (url.startsWith('/api/media-proxy')) {
        return streamResponse(200, [new TextEncoder().encode('0123456789')], 'video/mp4', 10);
      }
      throw new Error(`unexpected fetch: ${url}`);
    };
    render(<PlatformDownloader platform="instagram" icon={<span>IG</span>} description="Download public Instagram reels." />);
    fireEvent.change(screen.getByPlaceholderText(/instagram\.com\/reel/i), { target: { value: IG_URL } });
    fireEvent.click(screen.getByRole('button', { name: /Resolve/ }));
    expect(await screen.findByText(/2 items found/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'video' }));
    expect(await screen.findByText(/Download started!/)).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('keeps the resolved result and shows an inline error when the download itself fails', async () => {
    fetchHandler = (url) => {
      if (url.startsWith('/api/download/youtube')) return cobaltTunnel('https://93.184.216.34/v.mp4', 'clip.mp4');
      if (url.startsWith('/api/media-proxy')) {
        return jsonResponse(502, { error: { code: 'PROVIDER_ERROR', message: 'Upstream returned 404.' } });
      }
      throw new Error(`unexpected fetch: ${url}`);
    };
    renderYoutube();
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), { target: { value: YT_URL } });
    fireEvent.click(screen.getByRole('button', { name: /Resolve/ }));
    expect(await screen.findByText('clip.mp4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(await screen.findByText(/Download failed: Upstream returned 404\./)).toBeInTheDocument();
    // The resolved result stays on screen so the user can retry.
    expect(screen.getByText('clip.mp4')).toBeInTheDocument();
  });
});

describe('SocialDownloader component', () => {
  function renderSocial() {
    return render(<SocialDownloader onBack={() => undefined} />);
  }

  it('fetches a video, switches quality to mp3 with a real re-resolve, and downloads with progress', async () => {
    const spy = vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    fetchHandler = (url, init) => {
      if (url.startsWith('/api/resolve-social')) {
        const body = JSON.parse(String((init as { body?: unknown } | undefined)?.body ?? '{}')) as Record<string, unknown>;
        if (body.quality === 'mp3') {
          return jsonResponse(200, {
            title: 'Test Video', thumbnail: YT_THUMB,
            videoUrl: 'https://93.184.216.34/a.mp3', duration: '03:33',
            platform: 'YouTube', qualityServed: 'audio',
          });
        }
        return jsonResponse(200, {
          title: 'Test Video', thumbnail: YT_THUMB,
          videoUrl: 'https://93.184.216.34/v.mp4', duration: '03:33',
          platform: 'YouTube', qualityServed: '360p',
        });
      }
      if (url.startsWith('/api/media-proxy')) {
        expect(url).toContain(encodeURIComponent('https://93.184.216.34/a.mp3'));
        return streamResponse(200, [new TextEncoder().encode('01234'), new TextEncoder().encode('56789')], 'audio/mpeg', 10);
      }
      throw new Error(`unexpected fetch: ${url}`);
    };
    renderSocial();
    fireEvent.change(screen.getByPlaceholderText(/youtu\.be/i), { target: { value: YT_URL } });
    fireEvent.click(screen.getByRole('button', { name: /Download →/ }));
    expect(await screen.findByText('Test Video')).toBeInTheDocument();

    // Switching quality must re-resolve with the chosen quality (previously
    // the server ignored it and the mp3 "download" was a renamed mp4).
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '5' } });
    await vi.waitFor(() => {
      const calls = fetchCalls.filter((c) => c.url.startsWith('/api/resolve-social'));
      expect(calls.length).toBeGreaterThanOrEqual(2);
      expect(String((calls[1].init as { body?: unknown } | undefined)?.body ?? '')).toContain('"quality":"mp3"');
    });

    // Wait for the re-resolve to settle: while it runs the Download button
    // is replaced by a "Re-resolving stream…" indicator.
    const downloadBtn = await screen.findByRole('button', { name: 'Download' });
    fireEvent.click(downloadBtn);
    expect(await screen.findByText(/Download started!/)).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('shows the resolved video itself as the preview when no thumbnail exists (no stock photo)', async () => {
    fetchHandler = (url) => {
      if (url.startsWith('/api/resolve-social')) {
        return jsonResponse(200, {
          title: 'instagram DeX6KRsTz1K', thumbnail: '',
          videoUrl: 'https://cdn.example/ig.mp4', duration: '00:00',
          platform: 'Instagram', qualityServed: 'original',
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    };
    const { container } = renderSocial();
    fireEvent.change(screen.getByPlaceholderText(/youtu\.be/i), { target: { value: IG_URL } });
    fireEvent.click(screen.getByRole('button', { name: /Download →/ }));
    expect(await screen.findByText('instagram DeX6KRsTz1K')).toBeInTheDocument();
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.getAttribute('src')).toBe('https://cdn.example/ig.mp4');
    // No generic image anywhere in the result card.
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows the server error honestly when resolution fails', async () => {
    fetchHandler = (url) => {
      if (url.startsWith('/api/resolve-social')) {
        return jsonResponse(422, { error: 'Could not resolve stream.' });
      }
      throw new Error(`unexpected fetch: ${url}`);
    };
    renderSocial();
    fireEvent.change(screen.getByPlaceholderText(/youtu\.be/i), { target: { value: YT_URL } });
    fireEvent.click(screen.getByRole('button', { name: /Download →/ }));
    expect(await screen.findByText('Could Not Resolve Stream')).toBeInTheDocument();
    expect(screen.getByText('Could not resolve stream.')).toBeInTheDocument();
  });
});
