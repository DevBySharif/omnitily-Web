// Worker: Cobalt on Render — wake-up probe + POST behaviour.
// Every call goes through a stubbed global fetch; no live network.
// Covers the free-tier sleep case: a sleeping instance hangs the first
// request for 30-60s, so CobaltProvider probes cheaply (5s) and reports
// PROVIDER_WAKING instead of burning the 20s resolve budget.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CobaltProvider } from '../lib/providers/cobalt.js';

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

const IG_URL = 'https://www.instagram.com/p/CxYzAbCdEfG/';
const YT_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

/** A fetch that never resolves unless its AbortSignal fires (real fetch rejects on abort). */
function hangingFetch(init?: unknown) {
  return new Promise<never>((_resolve, reject) => {
    const signal = (init as { signal?: AbortSignal } | undefined)?.signal;
    if (!signal) return;
    if (signal.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }
    signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')), { once: true });
  });
}

function cobaltTunnel(url = 'https://tunnel.example/video.mp4', filename = 'cobalt-video.mp4') {
  return jsonResponse(200, { status: 'tunnel', url, filename });
}

function instanceInfo() {
  return jsonResponse(200, { cobalt: { version: '11.0.0', api: 10 } });
}

describe('CobaltProvider wake-up probe (Render free tier)', () => {
  it('probes GET / first, then POSTs, sending the API key on both', async () => {
    fetchHandler = (url, init) => {
      const method = (init as { method?: string } | undefined)?.method ?? 'GET';
      if (method === 'GET') return instanceInfo();
      return cobaltTunnel();
    };
    const result = await new CobaltProvider('https://cobalt.example/', 'test-api-key').resolve('instagram', IG_URL);
    expect(result.status).toBe('tunnel');
    expect(result.url).toBe('https://tunnel.example/video.mp4');
    expect(fetchCalls).toHaveLength(2);
    expect((fetchCalls[0].init as { method?: string }).method).toBe('GET');
    expect((fetchCalls[1].init as { method?: string }).method).toBe('POST');
    for (const call of fetchCalls) {
      expect((call.init as { headers?: Record<string, string> }).headers?.['Authorization']).toBe('Api-Key test-api-key');
    }
  });

  it('returns PROVIDER_WAKING on a 5xx probe without calling POST', async () => {
    fetchHandler = (url, init) => {
      const method = (init as { method?: string } | undefined)?.method ?? 'GET';
      if (method === 'GET') return jsonResponse(502, {});
      throw new Error('POST must not be called while the instance is booting');
    };
    const result = await new CobaltProvider('https://cobalt.example/', 'test-api-key').resolve('instagram', IG_URL);
    expect(result.status).toBe('error');
    expect(result.errorCode).toBe('PROVIDER_WAKING');
    expect(fetchCalls).toHaveLength(1);
  });

  it('returns PROVIDER_WAKING when the probe times out (sleeping instance)', async () => {
    fetchHandler = (url, init) => {
      const method = (init as { method?: string } | undefined)?.method ?? 'GET';
      if (method === 'GET') return hangingFetch(init);
      throw new Error('POST must not be called while the instance is booting');
    };
    const result = await new CobaltProvider('https://cobalt.example/', 'test-api-key', { probeTimeoutMs: 50 }).resolve('instagram', IG_URL);
    expect(result.status).toBe('error');
    expect(result.errorCode).toBe('PROVIDER_WAKING');
    expect(fetchCalls).toHaveLength(1);
  });

  it('treats a 4xx probe as awake and lets the POST surface the real error', async () => {
    fetchHandler = (url, init) => {
      const method = (init as { method?: string } | undefined)?.method ?? 'GET';
      if (method === 'GET') return jsonResponse(401, {});
      return jsonResponse(429, { status: 'error', error: { code: 'error.api.fetch.rate-limited' } }, { 'retry-after': '120' });
    };
    const result = await new CobaltProvider('https://cobalt.example/', 'test-api-key').resolve('youtube', YT_URL);
    expect(result.status).toBe('error');
    expect(result.errorCode).toBe('error.api.fetch.rate-limited');
    expect(result.retryAfterSeconds).toBe(120);
  });

  it('treats a probe network error as unreachable and lets the POST fail honestly', async () => {
    fetchHandler = (url, init) => {
      const method = (init as { method?: string } | undefined)?.method ?? 'GET';
      if (method === 'GET') throw new TypeError('fetch failed');
      return cobaltTunnel();
    };
    const result = await new CobaltProvider('https://cobalt.example/', 'test-api-key').resolve('instagram', IG_URL);
    expect(result.status).toBe('tunnel');
    expect(result.url).toBe('https://tunnel.example/video.mp4');
  });

  it('keeps the POST timeout mapping (timeout still means PROVIDER_TIMEOUT)', async () => {
    fetchHandler = (url, init) => {
      const method = (init as { method?: string } | undefined)?.method ?? 'GET';
      if (method === 'GET') return instanceInfo();
      return hangingFetch(init);
    };
    const result = await new CobaltProvider('https://cobalt.example/', 'test-api-key', { probeTimeoutMs: 50, timeoutMs: 50 }).resolve('youtube', YT_URL);
    expect(result.status).toBe('error');
    expect(result.errorCode).toBe('PROVIDER_TIMEOUT');
  });
});
