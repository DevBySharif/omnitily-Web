export type DownloadStatus = 'tunnel' | 'redirect' | 'picker' | 'local-processing' | 'error';

export interface CobaltTunnelResponse {
  status: 'tunnel' | 'redirect';
  url: string;
  filename: string;
}

export interface CobaltPickerItem {
  type: 'photo' | 'video' | 'gif';
  url: string;
  thumb?: string;
}

export interface CobaltPickerResponse {
  status: 'picker';
  picker: CobaltPickerItem[];
  audio?: string;
  audioFilename?: string;
}

export interface CobaltErrorResponse {
  status: 'error';
  error: { code: string; context?: Record<string, unknown> };
}

export type CobaltResponse = CobaltTunnelResponse | CobaltPickerResponse | CobaltErrorResponse;

export interface DownloadResult {
  status: DownloadStatus;
  url?: string;
  filename?: string;
  items?: Array<{ type: string; url: string; thumb?: string }>;
  audioUrl?: string;
  audioFilename?: string;
  errorCode?: string;
  /** Seconds to wait before retrying, when the provider sent a Retry-After. */
  retryAfterSeconds?: number;
}

export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'facebook';

export interface SocialDownloadProvider {
  resolve(platform: Platform, url: string, options?: DownloadOptions): Promise<DownloadResult>;
  isConfigured(): boolean;
}

export interface DownloadOptions {
  videoQuality?: string;
  audioFormat?: string;
  downloadMode?: string;
}
