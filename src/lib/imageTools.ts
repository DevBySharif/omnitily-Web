export const IMAGE_TOOL_LIMITS = {
  maxSingleBytes: 50 * 1024 * 1024,
  maxBatchItems: 50,
  maxDimension: 16384,
} as const;

export const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|webp|gif|bmp|avif|svg)$/i;

export type ImageValidationResult =
  | { ok: true }
  | { ok: false; code: 'empty' | 'too-large' | 'unsupported'; message: string };

export function validateImageFile(file: { name: string; size: number; type: string }): ImageValidationResult {
  if (file.size === 0) {
    return { ok: false, code: 'empty', message: `"${file.name}" is 0 bytes and cannot be processed.` };
  }
  if (file.size > IMAGE_TOOL_LIMITS.maxSingleBytes) {
    return { ok: false, code: 'too-large', message: `"${file.name}" exceeds the 50MB file size limit.` };
  }
  const isMimeValid = file.type ? file.type.startsWith('image/') : false;
  const isExtValid = IMAGE_EXTENSION_PATTERN.test(file.name);
  if (!isMimeValid && !isExtValid) {
    return { ok: false, code: 'unsupported', message: `"${file.name}" is not a recognized image format.` };
  }
  return { ok: true };
}

export function buildConvertedFileName(originalName: string, mimeType: string): string {
  const extension = mimeType.split('/')[1] || 'png';
  const rawName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
  const sanitizedBase = rawName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${sanitizedBase}_converted.${extension}`;
}

// ---------------------------------------------------------------------------
// Favicon (.ico) export. A genuine ICO file is an ICONDIR header + entries
// pointing at the image data; modern .ico files embed a PNG (Vista-style)
// rather than BMP/DIB data, and every OS/browser reads that form. Writing
// raw PNG bytes with a .ico name (the old favicon-generator bug) is NOT an
// ICO file — the header below is what makes it one.
// ---------------------------------------------------------------------------

/** Binary-safe base64 decode (atob alone yields a string, not bytes). */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Binary-safe base64 encode (btoa alone chokes on non-Latin1 bytes). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Wraps one PNG image in a genuine single-image .ico container.
 * `size` is the icon's pixel dimension (1–256; 0 is written for 256, per
 * the ICO spec). Throws on empty input or an out-of-range size.
 */
export function buildIcoFromPng(pngBytes: Uint8Array, size = 32): Uint8Array {
  if (!(pngBytes instanceof Uint8Array) || pngBytes.length === 0) {
    throw new Error('ICO export needs non-empty PNG bytes.');
  }
  if (!Number.isInteger(size) || size < 1 || size > 256) {
    throw new Error('ICO icon size must be a whole number from 1 to 256.');
  }
  // ICONDIR (6 bytes): reserved=0, type=1 (icon), count=1.
  // ICONDIRENTRY (16 bytes): width, height, palette=0, reserved=0,
  // planes=1, bitCount=32, image size, image offset (= 6 + 16 = 22).
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  header[6] = size === 256 ? 0 : size;
  header[7] = size === 256 ? 0 : size;
  header[8] = 0;
  header[9] = 0;
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, pngBytes.length, true);
  view.setUint32(18, 22, true);
  const ico = new Uint8Array(22 + pngBytes.length);
  ico.set(header, 0);
  ico.set(pngBytes, 22);
  return ico;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const value = bytes / Math.pow(k, i);
  const text = value >= 10 ? value.toFixed(0) : value.toFixed(1);
  return `${text} ${sizes[i]}`;
}

export function formatSizeDelta(before: number, after: number): string {
  if (!Number.isFinite(before) || !Number.isFinite(after) || before <= 0) return '0%';
  return `${Math.round(((after - before) / before) * 100)}%`;
}

export interface OutputDimensions {
  width: number;
  height: number;
}

export function computeOutputDimensions(
  naturalW: number,
  naturalH: number,
  widthInput: string,
  heightInput: string,
  maintainAspectRatio: boolean,
  maxDimension = IMAGE_TOOL_LIMITS.maxDimension,
): OutputDimensions {
  const safeW = Math.max(1, naturalW);
  const safeH = Math.max(1, naturalH);
  let outWidth = safeW;
  let outHeight = safeH;

  const parsedW = parseInt(widthInput, 10);
  const parsedH = parseInt(heightInput, 10);

  const userW = Number.isFinite(parsedW) && parsedW > 0 && parsedW <= maxDimension ? parsedW : 0;
  const userH = Number.isFinite(parsedH) && parsedH > 0 && parsedH <= maxDimension ? parsedH : 0;

  if (userW && userH) {
    outWidth = userW;
    outHeight = userH;
  } else if (userW && maintainAspectRatio) {
    outWidth = userW;
    outHeight = Math.max(1, Math.round(userW * (safeH / safeW)));
  } else if (userH && maintainAspectRatio) {
    outHeight = userH;
    outWidth = Math.max(1, Math.round(userH * (safeW / safeH)));
  } else {
    if (userW) outWidth = userW;
    if (userH) outHeight = userH;
  }

  return { width: outWidth, height: outHeight };
}

export interface ColorSwatch {
  hex: string;
  rgb: string;
  percentage: number;
}

export function extractDominantColors(
  imageData: Uint8ClampedArray | number[],
  options: { clusterFactor?: number; topCount?: number; alphaThreshold?: number } = {},
): ColorSwatch[] {
  const { clusterFactor = 32, topCount = 6, alphaThreshold = 128 } = options;
  if (!imageData || imageData.length === 0) return [];

  const colorBuckets: Record<string, number> = {};
  let nonTransparentPixels = 0;

  for (let i = 0; i + 3 < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];

    if (a < alphaThreshold) continue;
    nonTransparentPixels++;

    const groupedR = Math.round(r / clusterFactor) * clusterFactor;
    const groupedG = Math.round(g / clusterFactor) * clusterFactor;
    const groupedB = Math.round(b / clusterFactor) * clusterFactor;

    const key = `${groupedR},${groupedG},${groupedB}`;
    colorBuckets[key] = (colorBuckets[key] || 0) + 1;
  }

  if (nonTransparentPixels === 0) return [];

  const sortedBuckets = Object.entries(colorBuckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topCount);

  return sortedBuckets.map(([key, count]) => {
    const [r, g, b] = key.split(',').map(Number);
    const cr = Math.min(255, Math.max(0, r));
    const cg = Math.min(255, Math.max(0, g));
    const cb = Math.min(255, Math.max(0, b));

    const toHex = (num: number) => num.toString(16).padStart(2, '0');
    const hexStr = `#${toHex(cr)}${toHex(cg)}${toHex(cb)}`;

    return {
      hex: hexStr,
      rgb: `rgb(${cr}, ${cg}, ${cb})`,
      percentage: Math.round((count / nonTransparentPixels) * 100),
    };
  });
}

export function isFullyTransparent(imageData: Uint8ClampedArray | number[], alphaThreshold = 128): boolean {
  if (!imageData || imageData.length === 0) return true;
  for (let i = 3; i < imageData.length; i += 4) {
    if (imageData[i] >= alphaThreshold) return false;
  }
  return true;
}

export type PdfPageSize = 'a4' | 'letter' | 'original';
export type PdfOrientation = 'auto' | 'portrait' | 'landscape';

export const PDF_PAGE_DIMENSIONS: Record<'a4' | 'letter', { width: number; height: number }> = {
  a4: { width: 595, height: 842 },
  letter: { width: 612, height: 792 },
};

export function computePageDimensions(
  itemWidth: number,
  itemHeight: number,
  pageSize: PdfPageSize,
  orientation: PdfOrientation,
): { pageW: number; pageH: number } {
  const sw = Math.max(1, itemWidth);
  const sh = Math.max(1, itemHeight);

  let w = sw;
  let h = sh;

  if (pageSize === 'a4' || pageSize === 'letter') {
    w = PDF_PAGE_DIMENSIONS[pageSize].width;
    h = PDF_PAGE_DIMENSIONS[pageSize].height;
  }

  if (pageSize !== 'original') {
    const isItemLandscape = sw > sh;
    const forceLandscape = orientation === 'landscape' || (orientation === 'auto' && isItemLandscape);
    const forcePortrait = orientation === 'portrait' || (orientation === 'auto' && !isItemLandscape);

    if (forceLandscape && w < h) {
      const temp = w;
      w = h;
      h = temp;
    } else if (forcePortrait && w > h) {
      const temp = w;
      w = h;
      h = temp;
    }
  }

  return { pageW: w, pageH: h };
}

export interface DrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeDrawRect(
  origW: number,
  origH: number,
  pageW: number,
  pageH: number,
  marginVal: number,
): DrawRect {
  const safeW = Math.max(1, origW);
  const safeH = Math.max(1, origH);
  const maxDrawW = Math.max(1, pageW - marginVal * 2);
  const maxDrawH = Math.max(1, pageH - marginVal * 2);

  const imgRatio = safeW / safeH;
  const drawRatio = maxDrawW / maxDrawH;

  let drawW = maxDrawW;
  let drawH = maxDrawH;

  if (imgRatio > drawRatio) {
    drawH = maxDrawW / imgRatio;
  } else {
    drawW = maxDrawH * imgRatio;
  }

  drawW = Math.max(1, drawW);
  drawH = Math.max(1, drawH);

  const x = marginVal + (maxDrawW - drawW) / 2;
  const y = marginVal + (maxDrawH - drawH) / 2;

  return { x, y, width: drawW, height: drawH };
}

export function sanitizePdfTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return 'compiled_document';
  const sanitized = trimmed.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 80);
  return sanitized || 'compiled_document';
}
