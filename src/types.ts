export type ToolStatus = 'functional' | 'beta' | 'coming-soon' | 'disabled';

export type ProcessingType = 'browser' | 'server' | 'external' | 'none';

export type ToolCategory =
  | 'Video'
  | 'Image'
  | 'Document'
  | 'Audio'
  | 'Text & Writing'
  | 'Developer Tools'
  | 'Math & Finance'
  | 'Health & Lifestyle'
  | 'Fun & Games';

export type ToolComponentKey =
  | 'image-converter'
  | 'pdf-compiler'
  | 'audio-trimmer'
  | 'audio-transcriber'
  | 'qr-generator'
  | 'color-extractor'
  | 'video-splitter'
  | 'youtube-downloader'
  | 'instagram-downloader'
  | 'tiktok-downloader'
  | 'facebook-downloader'
  | 'social-downloader'
  | 'generic';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  status: ToolStatus;
  statusReason?: string;
  processingType: ProcessingType;
  privacyNotice?: string;
  supportedInputTypes: string[];
  supportedOutputTypes: string[];
  isFeatured: boolean;
  isIndexable: boolean;
  componentKey?: ToolComponentKey;
  icon: string; // we'll use Lucide icon names
  color: string; // Tailwind colors for subtle borders/accents
  badge?: string;
}

export interface ImageFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  width: number;
  height: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  convertedBlob?: Blob;
  convertedUrl?: string;
  convertedName?: string;
  convertedSize?: number;
}

export interface PDFImageItem {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
  size: number;
}

export interface SocialDownloadInfo {
  url: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'twitter' | 'unknown';
  status: 'idle' | 'parsing' | 'ready' | 'downloading' | 'completed' | 'error';
  errorMsg?: string;
  title?: string;
  author?: string;
  duration?: string;
  thumbnail?: string;
  formats: Array<{
    id: string;
    quality: string;
    format: 'mp4' | 'mp3';
    size: string;
    url: string;
    isAudioOnly: boolean;
  }>;
}
