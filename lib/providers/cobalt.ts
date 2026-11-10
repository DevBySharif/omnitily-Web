import type { CobaltResponse, DownloadOptions, DownloadResult, Platform, SocialDownloadProvider } from './types.js';

const COBALT_TIMEOUT_MS = 20_000;

export class CobaltProvider implements SocialDownloadProvider {
  private apiUrl: string;
  private apiKey?: string;

  constructor(apiUrl: string, apiKey?: string) {
    this.apiUrl = apiUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return Boolean(this.apiUrl);
  }

  async resolve(platform: Platform, url: string, options?: DownloadOptions): Promise<DownloadResult> {
    if (!this.isConfigured()) {
      return { status: 'error', errorCode: 'PROVIDER_NOT_CONFIGURED' };
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
    const timeout = setTimeout(() => controller.abort(), COBALT_TIMEOUT_MS);

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
