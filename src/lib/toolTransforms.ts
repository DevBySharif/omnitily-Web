export type CaseMode = 'upper' | 'lower' | 'title' | 'sentence' | 'camel' | 'pascal' | 'snake' | 'kebab';

function capitalizeWord(word: string): string {
  const [first, ...rest] = Array.from(word);
  return first.toUpperCase() + rest.join('').toLowerCase();
}

export function convertCase(value: string, mode: CaseMode): string {
  if (!value) return '';
  if (mode === 'upper') return value.toUpperCase();
  if (mode === 'lower') return value.toLowerCase();
  
  if (mode === 'title') {
    return value.replace(/(\p{L})([\p{L}\p{N}]*)/gu, (_, first: string, rest: string) => 
      first.toUpperCase() + rest.toLowerCase()
    );
  }
  
  if (mode === 'sentence') {
    return value.replace(/(^\s*|\b[.!?]\s+)(\p{L})/gu, (_, prefix: string, char: string) => 
      prefix + char.toUpperCase()
    );
  }

  const words = Array.from(value.matchAll(/\p{L}+|\p{N}+/gu), (m) => m[0]);
  if (words.length === 0) return value;

  if (mode === 'snake') {
    return words.map((w) => w.toLowerCase()).join('_');
  }

  if (mode === 'kebab') {
    return words.map((w) => w.toLowerCase()).join('-');
  }

  return words
    .map((word, index) =>
      index === 0 && mode === 'camel'
        ? word.toLowerCase()
        : capitalizeWord(word)
    )
    .join('');
}

export function countText(value: string) {
  if (!value) {
    return { words: 0, characters: 0, charactersWithoutSpaces: 0, lines: 0, paragraphs: 0, readingTimeMinutes: 0, readingTimeLabel: '0 min read' };
  }

  const wordMatches = value.match(/\p{L}+[\p{L}\p{N}']*\p{L}*|\p{N}+/gu);
  const words = wordMatches ? wordMatches.length : 0;
  
  // Use Array.from to count Unicode code points (properly counting emoji graphemes)
  const characters = Array.from(value).length;
  const charactersWithoutSpaces = Array.from(value.replace(/\s/g, '')).length;
  const lines = value.split(/\r?\n/).length;
  const paragraphs = countParagraphs(value);

  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
  const readingTimeLabel = words === 0 ? '0 min read' : `${readingTimeMinutes} min read (est.)`;

  return {
    words,
    characters,
    charactersWithoutSpaces,
    lines,
    paragraphs,
    readingTimeMinutes,
    readingTimeLabel
  };
}

function countParagraphs(value: string): number {
  let paragraphs = 0;
  let inParagraph = false;
  for (const line of value.split(/\r?\n/)) {
    if (line.trim() === '') {
      inParagraph = false;
    } else if (!inParagraph) {
      paragraphs += 1;
      inParagraph = true;
    }
  }
  return paragraphs;
}

const LOREM_SENTENCES = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Curabitur sed diam id nisi interdum faucibus, tempor nec purus.',
  'Vivamus sit amet lectus at eros accumsan sodales.',
  'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
];

export function generateLorem(paragraphs: number): string {
  const count = Math.min(20, Math.max(1, Math.trunc(Number(paragraphs) || 1)));
  const result: string[] = [];

  for (let p = 0; p < count; p++) {
    const sentenceCount = 3 + (p % 3);
    const paragraphSentences: string[] = [];
    for (let s = 0; s < sentenceCount; s++) {
      const idx = (p * 3 + s) % LOREM_SENTENCES.length;
      paragraphSentences.push(LOREM_SENTENCES[idx]);
    }
    result.push(paragraphSentences.join(' '));
  }

  return result.join('\n\n');
}

export interface RemoveDuplicatesOptions {
  trim?: boolean;
  removeEmpty?: boolean;
  caseSensitive?: boolean;
}

export function removeDuplicateLines(value: string, options: RemoveDuplicatesOptions = {}): string {
  const { trim = false, removeEmpty = false, caseSensitive = true } = options;
  if (!value) return '';

  const rawLines = value.split(/\r?\n/);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawLine of rawLines) {
    const processedLine = trim ? rawLine.trim() : rawLine;
    if (removeEmpty && !processedLine) continue;

    const key = caseSensitive ? processedLine : processedLine.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(processedLine);
    }
  }

  return result.join('\n');
}

export function formatJson(value: string, mode: 'format' | 'minify' = 'format'): string {
  if (!value || !value.trim()) {
    throw new Error('Please enter valid JSON text to format.');
  }

  if (value.length > 5000000) {
    throw new Error('JSON input exceeds 5MB safety limit.');
  }

  try {
    const parsed = JSON.parse(value);
    return mode === 'minify' ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON format.';
    throw new Error(`JSON Syntax Error: ${msg}`);
  }
}

export function percentageOf(percent: number, value: number): number {
  if (!Number.isFinite(percent) || !Number.isFinite(value)) {
    throw new Error('Percent and value must be valid finite numbers.');
  }
  const raw = (percent / 100) * value;
  return Math.round(raw * 1e6) / 1e6;
}

export function splitTip(bill: number, tipPercent: number, people: number) {
  if (![bill, tipPercent, people].every(Number.isFinite)) {
    throw new Error('Enter valid finite numeric values.');
  }
  if (bill < 0) {
    throw new Error('Bill amount cannot be negative.');
  }
  if (tipPercent < 0) {
    throw new Error('Tip percentage cannot be negative.');
  }
  if (people <= 0 || !Number.isInteger(people)) {
    throw new Error('Number of people must be a positive whole integer (at least 1).');
  }

  const tip = Math.round((bill * tipPercent / 100) * 100) / 100;
  const total = Math.round((bill + tip) * 100) / 100;
  const perPerson = Math.round((total / people) * 100) / 100;

  return { tip, total, perPerson };
}

/**
 * Returns a uniformly distributed number in [0, 1) from Web Crypto when
 * available. When Web Crypto is unavailable (older embedded webviews), it
 * falls back to Math.random — an isolated, entertainment-only fallback that is
 * fine for dice/RPS play but must never be claimed as cryptographically secure.
 */
export function secureRandom(): number {
  const cryptoObj =
    (typeof window !== 'undefined' && window.crypto) ||
    (typeof globalThis !== 'undefined' && (globalThis as { crypto?: { getRandomValues: (array: Uint32Array) => void } }).crypto) ||
    undefined;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const array = new Uint32Array(1);
    cryptoObj.getRandomValues(array);
    return array[0] / (0xFFFFFFFF + 1);
  }
  return Math.random();
}

const UINT32_MAX = 0xFFFFFFFF;

function secureUint32(random: () => number): number {
  const r = typeof random === 'function' ? random() : Math.random();
  return Math.min(Math.floor(r * (UINT32_MAX + 1)), UINT32_MAX);
}

/**
 * Uniform integer in [0, maxExclusive) using rejection sampling over the full
 * uint32 range, which removes the modulo bias of a naive `value % max`
 * mapping. The `random` source is injectable so tests stay deterministic.
 */
export function secureIntInRange(maxExclusive: number, random = secureRandom): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error('Upper bound must be a positive integer.');
  }
  const maxAllowed = Math.floor((UINT32_MAX + 1) / maxExclusive) * maxExclusive;
  let u = secureUint32(random);
  let guard = 0;
  while (u >= maxAllowed && guard < 1000) {
    u = secureUint32(random);
    guard += 1;
  }
  return u % maxExclusive;
}

export function rollDie(sides: number, random = secureRandom): number {
  if (!Number.isInteger(sides) || sides < 2) {
    throw new Error('Die sides must be a positive integer of at least 2.');
  }
  return secureIntInRange(sides, random) + 1;
}

export function playRockPaperScissors(player: 'rock' | 'paper' | 'scissors', random = secureRandom) {
  const choices = ['rock', 'paper', 'scissors'] as const;
  if (!choices.includes(player)) {
    throw new Error('Player choice must be "rock", "paper", or "scissors".');
  }
  const computer = choices[secureIntInRange(choices.length, random)];
  const result = player === computer 
    ? 'draw' 
    : (player === 'rock' && computer === 'scissors') || 
      (player === 'paper' && computer === 'rock') || 
      (player === 'scissors' && computer === 'paper') 
      ? 'win' 
      : 'lose';
  return { player, computer, result };
}

/**
 * Shared numeric standards for calculator-style tools.
 * - Rejects blank/whitespace input (blank is never treated as 0).
 * - Rejects NaN and non-finite values (no Infinity/-Infinity).
 * - Optional min/max/integer constraints with explicit error messages.
 * - Throws so callers can surface a precise validation message.
 */
export interface NumericConstraints {
  min?: number;
  max?: number;
  integer?: boolean;
}

export function parseFiniteNumber(value: string, label: string, constraints: NumericConstraints = {}): number {
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new Error(`${label} is required.`);
  }
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    throw new Error(`${label} must be a valid number.`);
  }
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid finite number.`);
  }
  if (constraints.integer && !Number.isInteger(parsed)) {
    throw new Error(`${label} must be a whole number.`);
  }
  if (constraints.min !== undefined && parsed < constraints.min) {
    throw new Error(`${label} must be at least ${constraints.min}.`);
  }
  if (constraints.max !== undefined && parsed > constraints.max) {
    throw new Error(`${label} must be no more than ${constraints.max}.`);
  }
  return parsed;
}

/**
 * Display formatter that strips trailing zeros while keeping up to 6 decimals
 * (the rounding precision used by percentageOf). e.g. 50 -> "50", 10.5 -> "10.5".
 */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const asString = value.toString();
  if (!asString.includes('.')) return asString;
  return asString.replace(/0+$/, '').replace(/\.$/, '');
}

export function decodeUrlSafely(value: string): { value?: string; error?: string } {
  try { return { value: decodeURIComponent(value) }; }
  catch { return { error: 'Invalid URL-encoded input.' }; }
}

export function decodeBase64Safely(value: string): { value?: string; error?: string } {
  try { return { value: decodeURIComponent(Array.from(atob(value), (character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')) }; }
  catch { return { error: 'Invalid Base64 input.' }; }
}

// ---------------------------------------------------------------------------
// Video media tools (gif-maker, video-to-audio, frame-extractor,
// video-compressor, video-looper, subtitles-editor).
//
// Everything in this section is pure/deterministic so it can be unit-tested
// in jsdom: byte-level validators for the real outputs (GIF/WAV/JPEG/WebM),
// the WAV encoder, SRT/VTT parse/format, and the planning/limits helpers the
// workspace uses before touching any browser media API. The component never
// claims success from UI state alone — it runs these validators over the
// actual bytes it produced.
// ---------------------------------------------------------------------------

export const VIDEO_MEDIA_LIMITS = {
  /** Largest single media file any of these tools will accept. */
  maxFileBytes: 200 * 1024 * 1024,
  /** GIF sampling never covers more than the first N seconds of a video. */
  maxGifDurationSeconds: 60,
  /** Hard cap on frames in one generated GIF. */
  maxGifFrames: 24,
  /** Longest audio track video-to-audio will decode (decodeAudioData holds
   * the whole decoded buffer in memory). */
  maxAudioDurationSeconds: 30 * 60,
  /** Longest single MediaRecorder output (compressor / looper). */
  maxRecordSeconds: 300,
  minLoopCount: 2,
  maxLoopCount: 10,
  maxSubtitleCues: 2000,
} as const;

export type VideoMediaValidation =
  | { ok: true }
  | { ok: false; message: string };

const VIDEO_MEDIA_EXTENSIONS: Record<'video' | 'audio' | 'image', RegExp> = {
  video: /\.(mp4|m4v|webm|mov|mkv|avi|ogv)$/i,
  audio: /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus)$/i,
  image: /\.(jpe?g|png|webp|gif|bmp|avif)$/i,
};

/**
 * Guards the file before any decoding work starts: non-empty, within the
 * 200MB cap, and of an allowed media kind (by MIME type when present,
 * otherwise by extension).
 */
export function validateVideoMediaFile(
  file: { name: string; size: number; type: string },
  allowed: Array<'video' | 'audio' | 'image'>,
): VideoMediaValidation {
  if (!file || typeof file.size !== 'number' || file.size === 0) {
    return { ok: false, message: `"${file?.name ?? 'file'}" is 0 bytes and cannot be processed.` };
  }
  if (file.size > VIDEO_MEDIA_LIMITS.maxFileBytes) {
    return {
      ok: false,
      message: `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB — these tools accept files up to 200MB.`,
    };
  }
  const kinds = allowed.map((kind) => kind.toLowerCase());
  const mimeOk = file.type ? kinds.some((kind) => file.type.toLowerCase().startsWith(`${kind}/`)) : false;
  if (file.type && !mimeOk) {
    return { ok: false, message: `"${file.name}" is "${file.type}" — this tool needs ${kinds.join(' or ')} input.` };
  }
  if (!file.type) {
    const extOk = kinds.some((kind) => VIDEO_MEDIA_EXTENSIONS[kind as 'video' | 'audio' | 'image'].test(file.name));
    if (!extOk) {
      return { ok: false, message: `"${file.name}" does not look like a ${kinds.join(' or ')} file.` };
    }
  }
  return { ok: true };
}

/**
 * Encodes decoded PCM channel data as a standard 44-byte-header WAV (16-bit
 * PCM). Throws on empty channels, mismatched channel lengths, or a bad
 * sample rate — the caller must surface that instead of emitting a file.
 */
export function encodeWavPcm16(channels: Float32Array[], sampleRate: number): ArrayBuffer {
  if (!Array.isArray(channels) || channels.length === 0) {
    throw new Error('WAV encoding needs at least one audio channel.');
  }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || sampleRate > 384000) {
    throw new Error('WAV encoding needs a valid sample rate.');
  }
  const frameCount = channels[0].length;
  for (const channel of channels) {
    if (!(channel instanceof Float32Array) || channel.length !== frameCount) {
      throw new Error('WAV encoding needs all channels to have the same length.');
    }
  }
  const numChannels = channels.length;
  const buffer = new ArrayBuffer(44 + frameCount * 2 * numChannels);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + frameCount * 2 * numChannels, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2 * numChannels, true);
  view.setUint16(32, 2 * numChannels, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, frameCount * 2 * numChannels, true);

  let offset = 44;
  for (let i = 0; i < frameCount; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const pcm = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, pcm, true);
      offset += 2;
    }
  }
  return buffer;
}

export interface WavInfo {
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  dataBytes: number;
  durationSeconds: number;
}

/**
 * Validates real WAV bytes: RIFF/WAVE magic, a 16-bit PCM `fmt ` chunk, and
 * a `data` chunk whose declared size matches the bytes present. Throws with
 * a precise reason instead of returning a partial result.
 */
export function parseWavHeader(bytes: Uint8Array): WavInfo {
  const readString = (offset: number, length: number): string => {
    let out = '';
    for (let i = 0; i < length; i++) out += String.fromCharCode(bytes[offset + i] ?? 0);
    return out;
  };
  if (bytes.length < 44) throw new Error('Not a WAV file: fewer than 44 bytes.');
  if (readString(0, 4) !== 'RIFF' || readString(8, 4) !== 'WAVE') {
    throw new Error('Not a WAV file: missing RIFF/WAVE header.');
  }
  const declaredSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true);
  if (declaredSize + 8 > bytes.length) {
    throw new Error('Truncated WAV file: RIFF size exceeds the bytes present.');
  }
  let offset = 12;
  let fmt: { audioFormat: number; channels: number; sampleRate: number; bitsPerSample: number } | null = null;
  let dataBytes: number | null = null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (offset + 8 <= bytes.length) {
    const id = readString(offset, 4);
    const size = view.getUint32(offset + 4, true);
    if (id === 'fmt ') {
      if (size < 16 || offset + 8 + size > bytes.length) throw new Error('Corrupt WAV file: bad fmt chunk.');
      fmt = {
        audioFormat: view.getUint16(offset + 8, true),
        channels: view.getUint16(offset + 10, true),
        sampleRate: view.getUint32(offset + 12, true),
        bitsPerSample: view.getUint16(offset + 22, true),
      };
    } else if (id === 'data') {
      dataBytes = size;
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (!fmt) throw new Error('Corrupt WAV file: no fmt chunk.');
  if (fmt.audioFormat !== 1) throw new Error(`Unsupported WAV format: audio format ${fmt.audioFormat} is not PCM.`);
  if (fmt.bitsPerSample !== 16) throw new Error(`Unsupported WAV file: ${fmt.bitsPerSample}-bit samples, expected 16-bit PCM.`);
  if (fmt.channels < 1 || fmt.sampleRate <= 0) throw new Error('Corrupt WAV file: no channels or invalid sample rate.');
  if (dataBytes === null) throw new Error('Corrupt WAV file: no data chunk.');
  if (offset + 8 + dataBytes > bytes.length) throw new Error('Truncated WAV file: data chunk exceeds the bytes present.');
  const bytesPerFrame = fmt.channels * 2;
  return {
    channels: fmt.channels,
    sampleRate: fmt.sampleRate,
    bitsPerSample: fmt.bitsPerSample,
    dataBytes,
    durationSeconds: dataBytes / (fmt.sampleRate * bytesPerFrame),
  };
}

export interface GifInfo {
  version: '87a' | '89a';
  width: number;
  height: number;
  frames: number;
}

function skipGifSubBlocks(bytes: Uint8Array, offset: number): number {
  while (offset < bytes.length) {
    const size = bytes[offset];
    offset += 1;
    if (size === 0) return offset;
    offset += size;
  }
  throw new Error('Truncated GIF: unterminated data sub-blocks.');
}

/**
 * Validates real GIF bytes by walking the block structure: GIF87a/GIF89a
 * magic, logical screen descriptor, image descriptors (counted as frames),
 * extensions skipped, and a 0x3B trailer. Throws on any structural problem.
 */
export function validateGifBytes(bytes: Uint8Array): GifInfo {
  if (bytes.length < 13) throw new Error('Not a GIF: fewer than 13 bytes.');
  const magic = String.fromCharCode(...bytes.slice(0, 6));
  if (magic !== 'GIF87a' && magic !== 'GIF89a') throw new Error('Not a GIF: missing GIF87a/GIF89a header.');
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  if (width === 0 || height === 0) throw new Error('Corrupt GIF: zero width or height.');
  const packed = bytes[10];
  let offset = 13;
  if (packed & 0x80) offset += 3 * (1 << ((packed & 0x07) + 1)); // global color table
  let frames = 0;
  let sawTrailer = false;
  while (offset < bytes.length) {
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0x3b) {
      sawTrailer = true;
      break;
    }
    if (marker === 0x2c) {
      // Image descriptor: 9 bytes + optional local color table + image data.
      if (offset + 9 > bytes.length) throw new Error('Truncated GIF: incomplete image descriptor.');
      const imagePacked = bytes[offset + 8];
      offset += 9;
      if (imagePacked & 0x80) offset += 3 * (1 << ((imagePacked & 0x07) + 1));
      if (offset >= bytes.length) throw new Error('Truncated GIF: missing image data.');
      offset += 1; // LZW minimum code size
      offset = skipGifSubBlocks(bytes, offset);
      frames += 1;
    } else if (marker === 0x21) {
      if (offset >= bytes.length) throw new Error('Truncated GIF: incomplete extension block.');
      offset += 1; // extension label
      offset = skipGifSubBlocks(bytes, offset);
    } else {
      throw new Error(`Corrupt GIF: unexpected block marker 0x${marker.toString(16)} at byte ${offset - 1}.`);
    }
  }
  if (!sawTrailer) throw new Error('Truncated GIF: missing 0x3B trailer.');
  if (frames === 0) throw new Error('GIF contains no image frames.');
  return { version: magic === 'GIF89a' ? '89a' : '87a', width, height, frames };
}

export interface JpegInfo {
  width: number;
  height: number;
}

/**
 * Validates real JPEG bytes: SOI marker, a SOF0/SOF2 frame header carrying
 * the dimensions, and an EOI marker at the end. Throws on any problem.
 */
export function validateJpegBytes(bytes: Uint8Array): JpegInfo {
  if (bytes.length < 4) throw new Error('Not a JPEG: fewer than 4 bytes.');
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Not a JPEG: missing SOI marker (FFD8).');
  if (bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) {
    throw new Error('Truncated JPEG: missing EOI marker (FFD9) at the end.');
  }
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error(`Corrupt JPEG: expected a marker at byte ${offset}.`);
    const marker = bytes[offset + 1];
    if (marker === 0xd9) break; // EOI
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) throw new Error('Corrupt JPEG: bad segment length.');
    if (marker === 0xc0 || marker === 0xc2) {
      if (length < 7) throw new Error('Corrupt JPEG: bad frame header.');
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
      if (width === 0 || height === 0) throw new Error('Corrupt JPEG: zero width or height.');
      return { width, height };
    }
    offset += 2 + length;
  }
  throw new Error('Corrupt JPEG: no SOF frame header found.');
}

/**
 * Validates MediaRecorder output: the EBML magic (1A 45 DF A3) plus a
 * non-trivial payload. This proves the bytes are a real WebM container, not
 * an empty or renamed file. It does not prove playability of every frame —
 * that needs a real browser decode, which jsdom cannot do.
 */
export function validateWebmBytes(bytes: Uint8Array): { sizeBytes: number } {
  if (bytes.length < 100) {
    throw new Error(`Not a valid WebM recording: only ${bytes.length} bytes.`);
  }
  if (bytes[0] !== 0x1a || bytes[1] !== 0x45 || bytes[2] !== 0xdf || bytes[3] !== 0xa3) {
    throw new Error('Not a WebM file: missing EBML header (1A45DFA3).');
  }
  return { sizeBytes: bytes.length };
}

// --- Subtitles (SRT / VTT): parse, format, build ---------------------------

export interface SubtitleCue {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

const TIMESTAMP_RE = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[,.](\d{3})$/;

/** Parses `HH:MM:SS,mmm` (SRT) or `HH:MM:SS.mmm` / `MM:SS.mmm` (VTT). Throws on malformed input. */
export function parseSubtitleTimestamp(raw: string): number {
  const match = raw.trim().match(TIMESTAMP_RE);
  if (!match) throw new Error(`Invalid subtitle timestamp "${raw}" — expected HH:MM:SS,mmm.`);
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const millis = Number(match[4]);
  if (minutes >= 60 || seconds >= 60) throw new Error(`Invalid subtitle timestamp "${raw}" — minutes/seconds must be under 60.`);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

export function formatSubtitleTimestamp(ms: number, format: 'srt' | 'vtt'): string {
  if (!Number.isFinite(ms) || ms < 0) throw new Error('Subtitle timestamps must be non-negative.');
  const totalSeconds = Math.floor(ms / 1000);
  const millis = Math.floor(ms % 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  const separator = format === 'srt' ? ',' : '.';
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${separator}${pad(millis, 3)}`;
}

function parseSubtitleBlocks(normalized: string, format: 'srt' | 'vtt'): SubtitleCue[] {
  const lines = normalized.split('\n');
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length > 0) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);

  const cues: SubtitleCue[] = [];
  const errors: string[] = [];
  for (const block of blocks) {
    const cueNumber = cues.length + 1;
    let cursor = 0;
    if (format === 'vtt' && /^(WEBVTT|NOTE|STYLE|REGION)\b/.test(block[0].trim())) continue;
    if (/^\d+$/.test(block[0].trim())) cursor = 1; // optional numeric index (SRT)
    if (cursor >= block.length) {
      errors.push(`Cue ${cueNumber}: missing timestamp line.`);
      continue;
    }
    const timing = block[cursor].trim();
    const arrow = timing.split(/\s*-->\s*/);
    if (arrow.length !== 2) {
      errors.push(`Cue ${cueNumber}: timestamp line "${timing}" has no "-->".`);
      continue;
    }
    let startMs = 0;
    let endMs = 0;
    try {
      startMs = parseSubtitleTimestamp(arrow[0]);
      endMs = parseSubtitleTimestamp(arrow[1].split(/\s+/)[0]);
    } catch (err) {
      errors.push(`Cue ${cueNumber}: ${err instanceof Error ? err.message : 'bad timestamp.'}`);
      continue;
    }
    if (endMs <= startMs) {
      errors.push(`Cue ${cueNumber}: end time must be after start time.`);
      continue;
    }
    const text = block.slice(cursor + 1).join('\n').trim();
    if (!text) {
      errors.push(`Cue ${cueNumber}: cue has no text.`);
      continue;
    }
    const previous = cues[cues.length - 1];
    if (previous && startMs < previous.endMs) {
      errors.push(`Cue ${cueNumber}: starts before cue ${cues.length} ends (overlapping cues).`);
      continue;
    }
    cues.push({ index: cues.length + 1, startMs, endMs, text });
    if (errors.length >= 5) break;
  }
  if (cues.length === 0) {
    const detail = errors.length > 0 ? ` ${errors.slice(0, 3).join(' ')}` : ' No cues found.';
    throw new Error(`No valid subtitle cues found.${detail}`);
  }
  if (errors.length > 0) {
    throw new Error(`Subtitle file has ${errors.length} problem(s): ${errors.slice(0, 3).join(' ')}`);
  }
  return cues;
}

/**
 * Parses SRT or VTT text into ordered, non-overlapping cues. Rejects empty
 * input, malformed timestamps, end-before-start, overlapping cues, and text
 * with no cues (with the specific problems listed in the error).
 */
export function parseSubtitleText(raw: string, format: 'srt' | 'vtt'): SubtitleCue[] {
  if (!raw || !raw.trim()) throw new Error('Subtitle text is empty.');
  if (raw.length > 5_000_000) throw new Error('Subtitle text exceeds the 5MB safety limit.');
  const normalized = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (format === 'vtt') {
    const withoutHeader = normalized.replace(/^WEBVTT[^\n]*\n/, '');
    const cues = parseSubtitleBlocks(withoutHeader, 'vtt');
    if (cues.length > VIDEO_MEDIA_LIMITS.maxSubtitleCues) {
      throw new Error(`Subtitle file has ${cues.length} cues — the limit is ${VIDEO_MEDIA_LIMITS.maxSubtitleCues}.`);
    }
    return cues;
  }
  const cues = parseSubtitleBlocks(normalized, 'srt');
  if (cues.length > VIDEO_MEDIA_LIMITS.maxSubtitleCues) {
    throw new Error(`Subtitle file has ${cues.length} cues — the limit is ${VIDEO_MEDIA_LIMITS.maxSubtitleCues}.`);
  }
  return cues;
}

/** Serializes cues to SRT (numbered blocks) or VTT (with WEBVTT header). */
export function formatSubtitleText(cues: SubtitleCue[], format: 'srt' | 'vtt'): string {
  if (!Array.isArray(cues) || cues.length === 0) throw new Error('Nothing to export: no subtitle cues.');
  const blocks = cues.map((cue, i) => {
    const timing = `${formatSubtitleTimestamp(cue.startMs, format)} --> ${formatSubtitleTimestamp(cue.endMs, format)}`;
    return format === 'srt' ? `${i + 1}\n${timing}\n${cue.text}` : `${timing}\n${cue.text}`;
  });
  return (format === 'vtt' ? 'WEBVTT\n\n' : '') + blocks.join('\n\n') + '\n';
}

/**
 * Builds one timed cue per non-empty line: cue N covers
 * [offset + N*perCue, offset + (N+1)*perCue). Used by the "build from
 * lines" mode — the user supplies plain text, timings are generated, never
 * invented from a video that was never analyzed.
 */
export function buildTimedCues(lines: string[], perCueSeconds: number, startOffsetSeconds = 0): SubtitleCue[] {
  if (!Array.isArray(lines)) throw new Error('Subtitle lines must be an array.');
  if (!Number.isFinite(perCueSeconds) || perCueSeconds < 0.5 || perCueSeconds > 30) {
    throw new Error('Seconds per subtitle must be between 0.5 and 30.');
  }
  if (!Number.isFinite(startOffsetSeconds) || startOffsetSeconds < 0) {
    throw new Error('Start offset must be 0 or more seconds.');
  }
  const texts = lines.map((line) => line.trim()).filter((line) => line !== '');
  if (texts.length === 0) throw new Error('Add at least one line of subtitle text.');
  if (texts.length > VIDEO_MEDIA_LIMITS.maxSubtitleCues) {
    throw new Error(`Too many lines: ${texts.length} — the limit is ${VIDEO_MEDIA_LIMITS.maxSubtitleCues}.`);
  }
  return texts.map((text, i) => {
    const startMs = Math.round((startOffsetSeconds + i * perCueSeconds) * 1000);
    return { index: i + 1, startMs, endMs: startMs + Math.round(perCueSeconds * 1000), text };
  });
}

// --- Planning helpers -------------------------------------------------------

export interface GifCapturePlan {
  /** Seconds of the source video actually sampled (capped). */
  sampledSeconds: number;
  frameCount: number;
  intervalSeconds: number;
}

/** Plans GIF frame sampling: caps the sampled window, caps the frame count. */
export function planGifCapture(durationSeconds: number, requestedFrames = 10): GifCapturePlan {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('GIF capture needs a video with a known, positive duration.');
  }
  const sampledSeconds = Math.min(durationSeconds, VIDEO_MEDIA_LIMITS.maxGifDurationSeconds);
  const frameCount = Math.max(2, Math.min(Math.trunc(requestedFrames) || 10, VIDEO_MEDIA_LIMITS.maxGifFrames));
  return { sampledSeconds, frameCount, intervalSeconds: sampledSeconds / frameCount };
}

export interface LoopPlan {
  loopCount: number;
  totalSeconds: number;
}

/** Validates a loop request: count 2–10, total output within the 5-minute cap. */
export function planLoopOutput(durationSeconds: number, loopCount: number): LoopPlan {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('Looping needs a video with a known, positive duration.');
  }
  if (!Number.isInteger(loopCount) || loopCount < VIDEO_MEDIA_LIMITS.minLoopCount || loopCount > VIDEO_MEDIA_LIMITS.maxLoopCount) {
    throw new Error(`Loop count must be a whole number from ${VIDEO_MEDIA_LIMITS.minLoopCount} to ${VIDEO_MEDIA_LIMITS.maxLoopCount}.`);
  }
  const totalSeconds = durationSeconds * loopCount;
  if (totalSeconds > VIDEO_MEDIA_LIMITS.maxRecordSeconds) {
    throw new Error(
      `Looping ${loopCount}x would produce ${totalSeconds.toFixed(0)}s — the limit is ${VIDEO_MEDIA_LIMITS.maxRecordSeconds}s total. Use fewer loops or a shorter clip.`,
    );
  }
  return { loopCount, totalSeconds };
}

/**
 * Target MediaRecorder bitrate for compression: the source's average bitrate
 * scaled by the requested percentage, clamped to a sane 100 kbps–8 Mbps
 * range. A value above the source bitrate would only grow the file, so the
 * component reports that honestly instead of claiming a saving.
 */
export function estimateCompressedBitrate(originalBytes: number, durationSeconds: number, targetPercent: number): number {
  if (!Number.isFinite(originalBytes) || originalBytes <= 0) {
    throw new Error('Compression needs a non-empty source file.');
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('Compression needs a video with a known, positive duration.');
  }
  if (!Number.isFinite(targetPercent) || targetPercent < 10 || targetPercent > 90) {
    throw new Error('Target size must be between 10% and 90% of the original bitrate.');
  }
  const sourceBps = (originalBytes * 8) / durationSeconds;
  const targetBps = Math.round((sourceBps * targetPercent) / 100);
  return Math.min(8_000_000, Math.max(100_000, targetBps));
}

// ============================================================================
// Video re-encode (browser-side only, MediaRecorder + canvas captureStream)
// ============================================================================
//
// Honest model: every video transform here is a REAL re-encode. The source
// video is decoded by the browser, drawn frame-by-frame onto a canvas (with
// the requested rotation / scale / watermark applied), and the canvas stream
// (+ the source audio track, unless muted) is recorded with MediaRecorder.
// Output is always WebM — never the source container — and the recorded
// bytes are verified (EBML header + size + a metadata re-read of the output)
// before the tool reports success. There is no byte-slicing path anywhere:
// cutting container bytes by time-ratio produces structurally invalid files.
//
// What this deliberately does NOT do:
// - No ffmpeg.wasm / server transcode (weight, licensing, P0-B server rule).
// - No claim about audio presence beyond what the recorder was fed: for the
//   muter the recorder input is video-only by construction; for the other
//   tools `hasAudio` reports whether the captured element stream actually
//   carried an audio track (Chrome/Firefox: yes; Safari has no element
//   captureStream, so the engine refuses there rather than faking it).
// - No duration claim from the WebM header alone: some browsers write
//   `Infinity` duration metadata into MediaRecorder WebM. The engine checks
//   the finite metadata duration when present and otherwise verifies the
//   recorded wall-clock length against the expected length.

export const VIDEO_TRANSFORM_LIMITS = {
  /** Max source file size (matches the 150 MB upload copy). */
  maxFileBytes: 150 * 1024 * 1024,
  /** Max source duration: re-encoding is real-time, so long inputs are refused. */
  maxDurationSeconds: 300,
  /** Max output width/height (longest side clamped; source is downscaled). */
  maxDimension: 1920,
  /** Min output width/height. */
  minDimension: 16,
  /** Shortest usable trim/segment. */
  minSegmentSeconds: 0.2,
  /** Bitrate range for the recorder (bps). */
  minVideoBitrate: 500_000,
  maxVideoBitrate: 8_000_000,
} as const;

export type VideoRotation = 0 | 90 | 180 | 270;
export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface WatermarkOptions {
  text: string;
  position: WatermarkPosition;
  /** 10-100. */
  opacityPercent: number;
}

export interface VideoTransformInput {
  file: File;
  /** Source duration in seconds (from loadedmetadata). */
  durationSeconds: number;
  startTime?: number;
  endTime?: number;
  /** 0.25x - 4x. Default 1. */
  playbackRate?: number;
}

/**
 * Validates a video transform request BEFORE any decoding starts. Pure and
 * deterministic (throws with a user-facing message).
 */
export function validateVideoTransformInput(input: VideoTransformInput): {
  startTime: number;
  endTime: number;
  playbackRate: number;
} {
  const { file, durationSeconds } = input;
  if (!file || !file.type.startsWith('video/')) {
    throw new Error('Please upload a video file first.');
  }
  if (file.size > VIDEO_TRANSFORM_LIMITS.maxFileBytes) {
    throw new Error(
      `Video is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 150 MB.`
    );
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('Could not read this video’s duration. The file may be corrupt or in an unsupported format.');
  }
  if (durationSeconds > VIDEO_TRANSFORM_LIMITS.maxDurationSeconds) {
    throw new Error(
      `Video is ${Math.round(durationSeconds)}s long — the limit is ${VIDEO_TRANSFORM_LIMITS.maxDurationSeconds}s (5 minutes) because re-encoding runs in real time.`
    );
  }
  const startTime = input.startTime ?? 0;
  const endTime = input.endTime ?? durationSeconds;
  const playbackRate = input.playbackRate ?? 1;
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    throw new Error('Start and end times must be numbers.');
  }
  if (startTime < 0 || endTime > durationSeconds + 0.05) {
    throw new Error('The selected range is outside the video’s duration.');
  }
  if (endTime - startTime < VIDEO_TRANSFORM_LIMITS.minSegmentSeconds) {
    throw new Error(`The selected range must be at least ${VIDEO_TRANSFORM_LIMITS.minSegmentSeconds}s long.`);
  }
  if (!Number.isFinite(playbackRate) || playbackRate < 0.25 || playbackRate > 4) {
    throw new Error('Playback speed must be between 0.25x and 4x.');
  }
  return { startTime, endTime, playbackRate };
}

export function validateWatermarkOptions(watermark: WatermarkOptions): WatermarkOptions {
  const text = watermark.text.trim();
  if (!text) throw new Error('Watermark text cannot be empty.');
  if (text.length > 120) throw new Error('Watermark text must be 120 characters or fewer.');
  if (watermark.opacityPercent < 10 || watermark.opacityPercent > 100) {
    throw new Error('Watermark opacity must be between 10% and 100%.');
  }
  return { text, position: watermark.position, opacityPercent: watermark.opacityPercent };
}

export function validateRotation(rotation: number): VideoRotation {
  if (rotation === 0 || rotation === 90 || rotation === 180 || rotation === 270) return rotation;
  throw new Error('Rotation must be 0°, 90°, 180° or 270°.');
}

/**
 * Picks the best MediaRecorder mime type the browser actually supports.
 * Pure (the support probe is injected so tests stay deterministic).
 * Returns null when the browser cannot record WebM/MP4 at all.
 */
export function pickVideoMimeType(isTypeSupported: (mimeType: string) => boolean): string | null {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const candidate of candidates) {
    try {
      if (isTypeSupported(candidate)) return candidate;
    } catch {
      // A throwing probe counts as "not supported".
    }
  }
  return null;
}

/** Bitrate scaled to output area: ~5 Mbps at 1080p, clamped to the limits. Pure. */
export function computeVideoBitrate(width: number, height: number): number {
  const scaled = Math.round((width * height) / (1920 * 1080) * 5_000_000);
  return Math.min(
    VIDEO_TRANSFORM_LIMITS.maxVideoBitrate,
    Math.max(VIDEO_TRANSFORM_LIMITS.minVideoBitrate, scaled)
  );
}

function evenDim(value: number): number {
  const rounded = Math.max(
    VIDEO_TRANSFORM_LIMITS.minDimension,
    Math.min(VIDEO_TRANSFORM_LIMITS.maxDimension, Math.round(value))
  );
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

export interface OutputDimensionsInput {
  sourceWidth: number;
  sourceHeight: number;
  rotation?: VideoRotation;
  /** Requested width (video-resizer). Omit to keep source size. */
  targetWidth?: number;
  /** Requested height (video-resizer). Ignored when lockAspectRatio is true. */
  targetHeight?: number;
  lockAspectRatio?: boolean;
}

/**
 * Output canvas size for a re-encode. Rotation by 90°/270° swaps the axes;
 * a resize request is clamped to the 16–1920 px range and rounded to even
 * values (VP8/VP9 encoders require even dimensions). Pure.
 */
export function computeOutputDimensions(input: OutputDimensionsInput): { width: number; height: number } {
  const { sourceWidth, sourceHeight } = input;
  if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('Could not read this video’s dimensions.');
  }
  const rotation = input.rotation ?? 0;
  const swapped = rotation === 90 || rotation === 270;
  const baseWidth = swapped ? sourceHeight : sourceWidth;
  const baseHeight = swapped ? sourceWidth : sourceHeight;

  if (input.targetWidth === undefined && input.targetHeight === undefined) {
    // No resize requested: keep the source size, downscaling proportionally
    // (never one axis alone) if the longest side exceeds the 1920 px cap.
    const scale = Math.min(
      1,
      VIDEO_TRANSFORM_LIMITS.maxDimension / Math.max(baseWidth, baseHeight)
    );
    return { width: evenDim(baseWidth * scale), height: evenDim(baseHeight * scale) };
  }
  const lockAspectRatio = input.lockAspectRatio ?? true;
  if (lockAspectRatio || input.targetHeight === undefined) {
    const width = evenDim(input.targetWidth ?? baseWidth);
    const height = evenDim((width * baseHeight) / baseWidth);
    return { width, height };
  }
  return {
    width: evenDim(input.targetWidth ?? baseWidth),
    height: evenDim(input.targetHeight ?? baseHeight),
  };
}

/** Expected output wall-clock length for a (range, rate) re-encode. Pure. */
export function computeExpectedOutputDuration(args: {
  durationSeconds: number;
  startTime?: number;
  endTime?: number;
  playbackRate?: number;
}): number {
  const start = args.startTime ?? 0;
  const end = args.endTime ?? args.durationSeconds;
  const rate = args.playbackRate ?? 1;
  return (end - start) / rate;
}

export interface WatermarkLayout {
  x: number;
  y: number;
  fontPx: number;
  opacity: number;
  /** Clamped text bounding box, for the visibility pixel-diff check. */
  box: { x: number; y: number; width: number; height: number };
}

/**
 * Where the watermark text lands on the canvas. Pure geometry (the actual
 * text width comes from the canvas measure at draw time; callers pass the
 * measured width, or an estimate of `text.length * fontPx * 0.6`).
 */
export function computeWatermarkLayout(args: {
  text: string;
  position: WatermarkPosition;
  canvasWidth: number;
  canvasHeight: number;
  opacityPercent: number;
  textWidthPx: number;
}): WatermarkLayout {
  const fontPx = Math.max(14, Math.min(96, Math.round(args.canvasWidth * 0.045)));
  const opacity = args.opacityPercent / 100;
  const pad = 20;
  const textWidth = Math.min(args.textWidthPx, args.canvasWidth - pad * 2);
  const textHeight = fontPx;
  let x = args.canvasWidth - textWidth - pad;
  let y = args.canvasHeight - pad;
  if (args.position === 'top-left') { x = pad; y = textHeight + pad; }
  else if (args.position === 'top-right') { x = args.canvasWidth - textWidth - pad; y = textHeight + pad; }
  else if (args.position === 'bottom-left') { x = pad; y = args.canvasHeight - pad; }
  else if (args.position === 'center') {
    x = (args.canvasWidth - textWidth) / 2;
    y = (args.canvasHeight + textHeight) / 2;
  }
  x = Math.max(pad, Math.min(x, args.canvasWidth - textWidth - pad));
  y = Math.max(textHeight + pad / 2, Math.min(y, args.canvasHeight - pad / 2));
  return {
    x, y, fontPx, opacity,
    box: {
      x: Math.max(0, x - 4),
      y: Math.max(0, y - textHeight - 4),
      width: Math.min(args.canvasWidth, textWidth + 8),
      height: Math.min(args.canvasHeight, textHeight + 8),
    },
  };
}

/** File name for a re-encoded output: always `.webm`, never the source container. Pure. */
export function buildVideoOutputFilename(sourceName: string, suffix: string): string {
  const base = sourceName.substring(0, sourceName.lastIndexOf('.')) || sourceName || 'video';
  return `${base}_${suffix}.webm`;
}

/**
 * Minimal WebM/EBML structural check — see validateWebmBytes (added by the
 * beta-tools worker in the shared section above): EBML magic 1A 45 DF A3
 * plus a non-trivial payload. The engine runs it on every recorded output.
 */

/** Environment probe: what this browser can actually do. Used for honest errors. */
export function getVideoReencodeSupport(): { supported: boolean; missing: string[] } {
  const missing: string[] = [];
  if (typeof window === 'undefined') {
    return { supported: false, missing: ['browser (no window object)'] };
  }
  if (typeof (window as unknown as { MediaRecorder?: unknown }).MediaRecorder !== 'function') {
    missing.push('MediaRecorder');
  }
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas || typeof (canvas as HTMLCanvasElement).captureStream !== 'function') {
    missing.push('canvas.captureStream');
  }
  const video = typeof document !== 'undefined' ? document.createElement('video') : null;
  type CaptureStreamVideo = HTMLVideoElement & {
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
  };
  const mediaCapture =
    video &&
    (typeof (video as CaptureStreamVideo).captureStream === 'function' ||
      typeof (video as CaptureStreamVideo).mozCaptureStream === 'function');
  if (!mediaCapture) missing.push('video.captureStream (audio track)');
  if (typeof (window as unknown as { MediaRecorder?: { isTypeSupported?: unknown } }).MediaRecorder?.isTypeSupported !== 'function') {
    missing.push('MediaRecorder.isTypeSupported');
  }
  return { supported: missing.length === 0, missing };
}

export interface VideoSegmentInput {
  startTime: number;
  endTime: number;
}

/** Validates a batch of trim segments (each must be in-range and ≥ 0.2s). Pure. */
export function validateVideoSegments(segments: VideoSegmentInput[], durationSeconds: number): void {
  if (segments.length === 0) throw new Error('Add at least one segment first.');
  for (const [i, seg] of segments.entries()) {
    if (!Number.isFinite(seg.startTime) || !Number.isFinite(seg.endTime)) {
      throw new Error(`Segment ${i + 1}: start and end times must be numbers.`);
    }
    if (seg.startTime < 0 || seg.endTime > durationSeconds + 0.05 || seg.endTime <= seg.startTime) {
      throw new Error(`Segment ${i + 1}: range is outside the video’s duration.`);
    }
    if (seg.endTime - seg.startTime < VIDEO_TRANSFORM_LIMITS.minSegmentSeconds) {
      throw new Error(`Segment ${i + 1}: must be at least ${VIDEO_TRANSFORM_LIMITS.minSegmentSeconds}s long.`);
    }
  }
}

// --- Browser-only engine (MediaRecorder / canvas / video element) -----------

export interface ReencodeVideoOptions {
  file: File;
  startTime?: number;
  endTime?: number;
  /** 0.25x - 4x. Default 1. */
  playbackRate?: number;
  rotation?: VideoRotation;
  targetWidth?: number;
  targetHeight?: number;
  lockAspectRatio?: boolean;
  /** When true the recorder gets a video-only stream (no audio track at all). */
  mute?: boolean;
  watermark?: WatermarkOptions;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export interface ReencodeVideoResult {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  /** Expected length from (range / rate). */
  expectedDurationSeconds: number;
  /** Wall-clock seconds actually recorded. */
  recordedWallSeconds: number;
  /** Output metadata duration, or null when the browser wrote no finite duration. */
  outputDurationSeconds: number | null;
  /** Whether the recorder input actually carried an audio track. */
  hasAudio: boolean;
  /** Watermark pixel-diff check result (null when no watermark requested). */
  watermarkVisible: boolean | null;
}

function loadVideoMetadata(file: File): Promise<{ video: HTMLVideoElement; url: string; duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.playsInline = true;
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Timed out reading the video file. The file may be corrupt or in an unsupported format.'));
    }, 30_000);
    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      resolve({ video, url, duration: video.duration, width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new Error('This video file could not be decoded by the browser. Try an MP4 or WebM file.'));
    };
    video.src = url;
    video.load();
  });
}

function waitForSeek(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    // Seeking to the position the video is already at fires no 'seeked'
    // event — poll `seeking` instead so we never hang on startTime === 0.
    const started = Date.now();
    const tick = () => {
      if (!video.seeking) return resolve();
      if (Date.now() - started > 15_000) return reject(new Error('Seeking in the video timed out.'));
      window.setTimeout(tick, 100);
    };
    window.setTimeout(tick, 50);
  });
}

function readOutputMetadata(blob: Blob): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Timed out reading the recorded output.'));
    }, 15_000);
    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const result = { duration: video.duration, width: video.videoWidth, height: video.videoHeight };
      URL.revokeObjectURL(url);
      resolve(result);
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new Error('The recorded file could not be read back by the browser — the output failed verification.'));
    };
    video.src = url;
    video.load();
  });
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  args: { canvasWidth: number; canvasHeight: number; rotation: VideoRotation; watermark: WatermarkOptions | null }
): { watermarkLayout: WatermarkLayout | null } {
  const { canvasWidth, canvasHeight, rotation } = args;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  const sw = video.videoWidth;
  const sh = video.videoHeight;
  const rotatedW = rotation === 90 || rotation === 270 ? sh : sw;
  const rotatedH = rotation === 90 || rotation === 270 ? sw : sh;
  const scale = Math.max(canvasWidth / rotatedW, canvasHeight / rotatedH);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.save();
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(video, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();

  if (!args.watermark) return { watermarkLayout: null };
  const fontPx = Math.max(14, Math.min(96, Math.round(canvasWidth * 0.045)));
  ctx.save();
  ctx.font = `bold ${fontPx}px sans-serif`;
  const textWidth = ctx.measureText(args.watermark.text).width;
  const layout = computeWatermarkLayout({
    text: args.watermark.text,
    position: args.watermark.position,
    canvasWidth,
    canvasHeight,
    opacityPercent: args.watermark.opacityPercent,
    textWidthPx: textWidth,
  });
  ctx.globalAlpha = layout.opacity;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 4;
  ctx.fillText(args.watermark.text, layout.x, layout.y);
  ctx.restore();
  return { watermarkLayout: layout };
}

/**
 * Mean absolute per-channel pixel difference inside a box between two
 * canvases of the same size. Used once, on the first frame, to prove the
 * watermark actually changes pixels (rather than trusting the draw call).
 */
function pixelDiffInBox(a: CanvasRenderingContext2D, b: CanvasRenderingContext2D, box: WatermarkLayout['box']): number {
  const width = Math.max(1, Math.floor(box.width));
  const height = Math.max(1, Math.floor(box.height));
  const dataA = a.getImageData(Math.floor(box.x), Math.floor(box.y), width, height).data;
  const dataB = b.getImageData(Math.floor(box.x), Math.floor(box.y), width, height).data;
  let total = 0;
  for (let i = 0; i < dataA.length; i += 4) {
    total += Math.abs(dataA[i] - dataB[i]) + Math.abs(dataA[i + 1] - dataB[i + 1]) + Math.abs(dataA[i + 2] - dataB[i + 2]);
  }
  return total / (width * height * 3);
}

/**
 * Re-encodes a video in the browser and returns a verified WebM blob.
 *
 * Pipeline: decode source → draw each frame to a canvas (rotation / scale /
 * watermark applied) → canvas.captureStream(30) + source audio track (unless
 * muted) → MediaRecorder → verify bytes (EBML header + size) → re-read the
 * output metadata (dimensions + duration when the browser wrote one).
 *
 * Throws an honest Error (never a fake success) when the browser lacks the
 * APIs, the source cannot be decoded, the recording times out, the user
 * cancels, or the output fails verification.
 */
export async function reencodeVideo(options: ReencodeVideoOptions): Promise<ReencodeVideoResult> {
  const support = getVideoReencodeSupport();
  if (!support.supported) {
    throw new Error(
      `Video re-encoding is not supported in this browser (missing: ${support.missing.join(', ')}). Try Chrome or Firefox on desktop.`
    );
  }
  if (options.signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError');
  const watermark = options.watermark ? validateWatermarkOptions(options.watermark) : null;
  const rotation = validateRotation(options.rotation ?? 0);

  const { video, url: sourceUrl, duration, width: sourceWidth, height: sourceHeight } =
    await loadVideoMetadata(options.file);
  try {
    const { startTime, endTime, playbackRate } = validateVideoTransformInput({
      file: options.file,
      durationSeconds: duration,
      startTime: options.startTime,
      endTime: options.endTime,
      playbackRate: options.playbackRate,
    });
    const { width, height } = computeOutputDimensions({
      sourceWidth,
      sourceHeight,
      rotation,
      targetWidth: options.targetWidth,
      targetHeight: options.targetHeight,
      lockAspectRatio: options.lockAspectRatio ?? true,
    });
    const mimeType = pickVideoMimeType((m) => MediaRecorder.isTypeSupported(m));
    if (!mimeType) {
      throw new Error('This browser cannot record WebM or MP4 video. Try Chrome or Firefox on desktop.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create a canvas for video processing.');
    const canvasStream = canvas.captureStream(30);
    type CaptureStreamVideo = HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    const capturable = video as CaptureStreamVideo;
    const videoStream = (typeof capturable.captureStream === 'function'
      ? capturable.captureStream()
      : (capturable.mozCaptureStream as () => MediaStream)());
    const audioTracks = options.mute ? [] : videoStream.getAudioTracks();
    const combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
    const recorder = new MediaRecorder(combined, {
      mimeType,
      videoBitsPerSecond: computeVideoBitrate(width, height),
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    const stopped = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.onerror = () => reject(new Error('Recording failed in the browser media recorder.'));
    });

    video.muted = options.mute ?? false;
    video.playbackRate = playbackRate;
    video.currentTime = startTime;
    await waitForSeek(video);
    if (options.signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError');

    // Watermark visibility check on the real first frame: draw the same frame
    // with and without the overlay and diff the text box. A zero diff means
    // the text is invisible against this frame (e.g. white-on-white), and the
    // export is refused rather than shipped silently unwatermarked.
    let watermarkVisible: boolean | null = null;
    if (watermark) {
      const probe = document.createElement('canvas');
      probe.width = width;
      probe.height = height;
      const probeCtx = probe.getContext('2d');
      if (!probeCtx) throw new Error('Could not create a canvas for video processing.');
      const { watermarkLayout } = drawFrame(ctx, video, { canvasWidth: width, canvasHeight: height, rotation, watermark });
      drawFrame(probeCtx, video, { canvasWidth: width, canvasHeight: height, rotation, watermark: null });
      const diff = watermarkLayout ? pixelDiffInBox(ctx, probeCtx, watermarkLayout.box) : 0;
      watermarkVisible = diff > 1;
      if (!watermarkVisible) {
        throw new Error('The watermark is not visible on this video at the chosen position (the text blends into the picture). Try a different position or higher opacity.');
      }
    }

    const recordRangeSeconds = (endTime - startTime) / playbackRate;
    const recordStartedAt = performance.now();
    const wallTimeout = window.setTimeout(() => {
      try { if (recorder.state !== 'inactive') recorder.stop(); } catch { /* ignore */ }
    }, (recordRangeSeconds + 30) * 1000);

    let frameHandle = 0;
    let stoppedByUs = false;
    const stopRecording = () => {
      if (recorder.state !== 'inactive' && !stoppedByUs) {
        stoppedByUs = true;
        try { recorder.stop(); } catch { /* ignore */ }
      }
    };
    const onAbort = () => {
      try { video.pause(); } catch { /* ignore */ }
      stopRecording();
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });

    const drawLoop = () => {
      if (options.signal?.aborted || recorder.state === 'inactive') return;
      drawFrame(ctx, video, { canvasWidth: width, canvasHeight: height, rotation, watermark });
      const elapsed = (video.currentTime - startTime) / Math.max(0.2, endTime - startTime);
      options.onProgress?.(Math.min(1, Math.max(0, elapsed)));
      if (video.currentTime >= endTime - 0.02 || video.ended) {
        stopRecording();
        return;
      }
      const rvfc = (video as unknown as { requestVideoFrameCallback?: (cb: () => void) => number }).requestVideoFrameCallback;
      if (typeof rvfc === 'function') {
        frameHandle = rvfc.call(video, () => drawLoop());
      } else {
        frameHandle = window.requestAnimationFrame(() => drawLoop());
      }
    };

    try {
      recorder.start(250);
      try {
        await video.play();
      } catch {
        stopRecording();
        throw new Error(
          'The browser refused to play this video with sound (autoplay policy). Try clicking the export button again, or use the mute option.'
        );
      }
      drawLoop();
      const blob = await stopped;
      if (options.signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError');
      const recordedWallSeconds = (performance.now() - recordStartedAt) / 1000;

      // --- Verify real output bytes, never UI state ---
      try {
        validateWebmBytes(new Uint8Array(await blob.slice(0, Math.max(256, Math.min(blob.size, 4096))).arrayBuffer()));
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'The recorded output failed verification.');
      }
      if (blob.size < 256) throw new Error('The recorded output is too small to be a valid video file.');
      if (recordedWallSeconds < recordRangeSeconds * 0.5) {
        throw new Error(
          `Recording stopped after ${recordedWallSeconds.toFixed(1)}s but ${recordRangeSeconds.toFixed(1)}s was expected — the output is incomplete.`
        );
      }
      const meta = await readOutputMetadata(blob);
      if (meta.width !== width || meta.height !== height) {
        throw new Error(
          `Output dimensions are ${meta.width}x${meta.height} but ${width}x${height} was requested — the output failed verification.`
        );
      }
      const expectedDurationSeconds = computeExpectedOutputDuration({
        durationSeconds: duration,
        startTime,
        endTime,
        playbackRate,
      });
      let outputDurationSeconds: number | null = null;
      if (Number.isFinite(meta.duration) && meta.duration > 0) {
        outputDurationSeconds = meta.duration;
        const tolerance = Math.max(0.75, expectedDurationSeconds * 0.2);
        if (Math.abs(meta.duration - expectedDurationSeconds) > tolerance) {
          throw new Error(
            `Output duration is ${meta.duration.toFixed(1)}s but ${expectedDurationSeconds.toFixed(1)}s was expected — the output failed verification.`
          );
        }
      }
      // If the browser wrote no finite duration, the verified wall-clock
      // recording length stands as the duration evidence (reported, not hidden).
      return {
        blob,
        mimeType,
        width,
        height,
        expectedDurationSeconds,
        recordedWallSeconds,
        outputDurationSeconds,
        hasAudio: audioTracks.length > 0,
        watermarkVisible,
      };
    } finally {
      window.clearTimeout(wallTimeout);
      window.cancelAnimationFrame(frameHandle);
      const rvfc = (video as unknown as { cancelVideoFrameCallback?: (id: number) => void }).cancelVideoFrameCallback;
      if (typeof rvfc === 'function') {
        try { rvfc.call(video, frameHandle); } catch { /* ignore */ }
      }
      options.signal?.removeEventListener('abort', onAbort);
      try { video.pause(); } catch { /* ignore */ }
      try { video.removeAttribute('src'); video.load(); } catch { /* ignore */ }
      combined.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
    }
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

