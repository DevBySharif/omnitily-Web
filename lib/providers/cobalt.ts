import type { CobaltResponse, DownloadOptions, DownloadResult, Platform, SocialDownloadProvider } from './types.js';

const COBALT_TIMEOUT_MS = 20_000;
/**
 * How long the wake-up probe may hang. Free-tier hosts (e.g. Render) sleep
 * after ~15 min idle and take 30-60s to boot — far beyond Vercel's 30s
 * function limit — so the probe must fail fast and let the caller tell the
 * user to retry in a minute instead of burning the whole resolve budget.
 */
const COBALT_PROBE_TIMEOUT_MS = 5_000;

export interface CobaltProviderOptions {
  /** Test seam: override the wake-up probe timeout (default 5s). */
  probeTimeoutMs?: number;
  /** Test seam: override the resolve POST timeout (default 20s). */
  timeoutMs?: number;
}

export class CobaltProvider implements SocialDownloadProvider {
  private apiUrl: string;
  private apiKey?: string;
  private probeTimeoutMs: number;
  private timeoutMs: number;

  constructor(apiUrl: string, apiKey?: string, options: CobaltProviderOptions = {}) {
    this.apiUrl = apiUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.probeTimeoutMs = options.probeTimeoutMs ?? COBALT_PROBE_TIMEOUT_MS;
    this.timeoutMs = options.timeoutMs ?? COBALT_TIMEOUT_MS;
  }

  isConfigured(): boolean {
    return Boolean(this.apiUrl);
  }

  /**
   * Cheap wake-up probe: GET the instance root (Cobalt answers instance
   * info there). A timeout or 5xx means the host is still booting — the
   * caller maps that to a "try again in a minute" message instead of
   * waiting out the 20s POST timeout. A 4xx means the instance IS answering
   * (auth/rate-limit surface through the POST instead). Any other network
   * error (e.g. connection refused) means the host is unreachable, so the
   * probe is skipped and the POST fails honestly as before.
   */
  private async isAwake(): Promise<boolean> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Api-Key ${this.apiKey}`;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.probeTimeoutMs);
    try {
      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (response.ok) return true;
      // 4xx: the instance is up and answering — let the POST carry the error.
      if (response.status >= 400 && response.status < 500) return true;
      // 5xx (e.g. Render's proxy while the container boots): still waking.
      return false;
    } catch (error: unknown) {
      clearTimeout(timeout);
      if (error instanceof DOMException && error.name === 'AbortError') return false;
      // Unreachable host — not a sleep, let the POST fail honestly.
      return true;
    }
  }

  async resolve(platform: Platform, url: string, options?: DownloadOptions): Promise<DownloadResult> {
    if (!this.isConfigured()) {
      return { status: 'error', errorCode: 'PROVIDER_NOT_CONFIGURED' };
    }

    if (!(await this.isAwake())) {
      return { status: 'error', errorCode: 'PROVIDER_WAKING' };
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Api-Key ${this.apiKey}`;
    }

    const body = JSON.stringify({
      url,
      downloadMode: options?.downloadMode ?? 'auto',
      audioFormat: options?.audioFormat ?? 'mp3',
      videoQuality: options?.videoQuality ?? '1080',
      filenameStyle: 'basic',
      disableMetadata: false,
      alwaysProxy: false,
      localProcessing: 'disabled',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        let errorCode = 'PROVIDER_HTTP_ERROR';
        let retryAfterSeconds: number | undefined;
        if (response.status === 429) {
          errorCode = 'PROVIDER_RATE_LIMITED';
          const retryAfter = response.headers.get('Retry-After');
          const parsed = retryAfter ? Number.parseInt(retryAfter, 10) : Number.NaN;
          if (Number.isFinite(parsed) && parsed > 0) retryAfterSeconds = parsed;
        }
        try {
          const errBody = await response.json() as CobaltResponse;
          if (errBody.status === 'error') errorCode = errBody.error.code;
        } catch { /* ignore JSON parse errors on non-2xx responses */ }
        if (response.status === 429 && errorCode === 'PROVIDER_HTTP_ERROR') errorCode = 'PROVIDER_RATE_LIMITED';
        return { status: 'error', errorCode, ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}) };
      }

      const data = await response.json() as CobaltResponse;
      return this.mapResponse(data);
    } catch (error: unknown) {
      clearTimeout(timeout);
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { status: 'error', errorCode: 'PROVIDER_TIMEOUT' };
      }
      return { status: 'error', errorCode: 'PROVIDER_ERROR' };
    }
  }

  private mapResponse(data: CobaltResponse): DownloadResult {
    switch (data.status) {
      case 'tunnel':
      case 'redirect':
        // A tunnel/redirect without a URL is unusable — never hand the
        // frontend a "ready" state with nowhere to download from.
        if (!data.url || typeof data.url !== 'string') {
          return { status: 'error', errorCode: 'UNKNOWN_RESPONSE' };
        }
        return {
          status: data.status,
          url: data.url,
          filename: data.filename,
        };
      case 'picker': {
        const items = (Array.isArray(data.picker) ? data.picker : [])
          .filter((item) => item && typeof item.url === 'string' && item.url.length > 0)
          .map((item) => ({
            type: item.type,
            url: item.url,
            thumb: item.thumb,
          }));
        if (!items.length) {
          return { status: 'error', errorCode: 'UNKNOWN_RESPONSE' };
        }
        return {
          status: 'picker',
          items,
          audioUrl: data.audio,
          audioFilename: data.audioFilename,
        };
      }
      case 'error':
        return {
          status: 'error',
          errorCode: data.error.code,
        };
      default:
        return { status: 'error', errorCode: 'UNKNOWN_RESPONSE' };
    }
  }
}
