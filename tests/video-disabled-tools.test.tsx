import { describe, expect, it } from 'vitest';
import {
  VIDEO_TRANSFORM_LIMITS,
  buildVideoOutputFilename,
  computeExpectedOutputDuration,
  computeOutputDimensions,
  computeVideoBitrate,
  computeWatermarkLayout,
  getVideoReencodeSupport,
  pickVideoMimeType,
  reencodeVideo,
  validateRotation,
  validateVideoSegments,
  validateVideoTransformInput,
  validateWatermarkOptions,
  validateWebmBytes,
} from '../src/lib/toolTransforms';

/**
 * Tests for the six disabled video tools (video-splitter, video-speed,
 * video-muter, video-rotator, video-resizer, video-watermark), rebuilt on a
 * browser-side MediaRecorder re-encode.
 *
 * What these tests CAN prove (deterministic, jsdom-safe):
 * - all pure validation / geometry / mime-picking / byte-check logic,
 * - that the engine refuses honestly when the recording APIs are absent.
 *
 * What they CANNOT prove (needs a real browser — see the notes in
 * src/lib/toolTransforms.ts):
 * - an actual re-encode (MediaRecorder, canvas.captureStream and video
 *   captureStream do not exist in jsdom),
 * - output duration / dimensions / audio-track presence of a recorded blob,
 * - the watermark pixel-diff check (needs a real canvas 2d context).
 * Those are verified at runtime by the engine itself (EBML header + size +
 * metadata re-read) before any success is reported.
 */

function videoFile(name = 'clip.mp4', size = 1024 * 1024): File {
  const file = new File([], name, { type: 'video/mp4' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('validateVideoTransformInput', () => {
  it('accepts a normal request and normalises defaults', () => {
    expect(
      validateVideoTransformInput({ file: videoFile(), durationSeconds: 60 })
    ).toEqual({ startTime: 0, endTime: 60, playbackRate: 1 });
  });

  it('accepts an explicit trim range and speed', () => {
    expect(
      validateVideoTransformInput({
        file: videoFile(),
        durationSeconds: 60,
        startTime: 5,
        endTime: 15,
        playbackRate: 2,
      })
    ).toEqual({ startTime: 5, endTime: 15, playbackRate: 2 });
  });

  it('rejects non-video files', () => {
    const png = new File([], 'pic.png', { type: 'image/png' });
    expect(() => validateVideoTransformInput({ file: png, durationSeconds: 10 })).toThrow(
      /upload a video file/i
    );
  });

  it('rejects files over the 150 MB limit', () => {
    expect(() =>
      validateVideoTransformInput({ file: videoFile('big.mp4', 151 * 1024 * 1024), durationSeconds: 10 })
    ).toThrow(/150 MB/);
  });

  it('rejects unreadable or zero duration', () => {
    expect(() => validateVideoTransformInput({ file: videoFile(), durationSeconds: 0 })).toThrow(
      /duration/i
    );
    expect(() => validateVideoTransformInput({ file: videoFile(), durationSeconds: NaN })).toThrow(
      /duration/i
    );
  });

  it('rejects videos over the 5-minute limit', () => {
    expect(() =>
      validateVideoTransformInput({ file: videoFile(), durationSeconds: 301 })
    ).toThrow(/5 minutes/);
  });

  it('rejects ranges outside the duration', () => {
    expect(() =>
      validateVideoTransformInput({ file: videoFile(), durationSeconds: 10, startTime: 5, endTime: 11 })
    ).toThrow(/outside the video/i);
    expect(() =>
      validateVideoTransformInput({ file: videoFile(), durationSeconds: 10, startTime: -1, endTime: 5 })
    ).toThrow(/outside the video/i);
  });

  it('rejects segments shorter than 0.2s', () => {
    expect(() =>
      validateVideoTransformInput({ file: videoFile(), durationSeconds: 10, startTime: 5, endTime: 5.1 })
    ).toThrow(/at least 0\.2s/);
  });

  it('rejects playback rates outside 0.25x–4x', () => {
    expect(() =>
      validateVideoTransformInput({ file: videoFile(), durationSeconds: 10, playbackRate: 0.1 })
    ).toThrow(/0\.25x and 4x/);
    expect(() =>
      validateVideoTransformInput({ file: videoFile(), durationSeconds: 10, playbackRate: 8 })
    ).toThrow(/0\.25x and 4x/);
  });
});

describe('validateWatermarkOptions', () => {
  it('accepts a normal watermark', () => {
    expect(validateWatermarkOptions({ text: ' Demo ', position: 'bottom-right', opacityPercent: 50 })).toEqual({
      text: 'Demo',
      position: 'bottom-right',
      opacityPercent: 50,
    });
  });

  it('rejects empty text, overlong text and bad opacity', () => {
    expect(() =>
      validateWatermarkOptions({ text: '   ', position: 'center', opacityPercent: 50 })
    ).toThrow(/cannot be empty/i);
    expect(() =>
      validateWatermarkOptions({ text: 'x'.repeat(121), position: 'center', opacityPercent: 50 })
    ).toThrow(/120 characters/);
    expect(() =>
      validateWatermarkOptions({ text: 'ok', position: 'center', opacityPercent: 5 })
    ).toThrow(/10% and 100%/);
  });
});

describe('validateRotation', () => {
  it('accepts 0/90/180/270 and rejects anything else', () => {
    expect(validateRotation(90)).toBe(90);
    expect(validateRotation(0)).toBe(0);
    expect(() => validateRotation(45)).toThrow(/90°|180°|270°/);
    expect(() => validateRotation(360)).toThrow(/90°|180°|270°/);
  });
});

describe('pickVideoMimeType', () => {
  const vp9opus = (m: string) => m === 'video/webm;codecs=vp9,opus';
  it('prefers vp9+opus when supported', () => {
    expect(pickVideoMimeType(() => true)).toBe('video/webm;codecs=vp9,opus');
    expect(pickVideoMimeType(vp9opus)).toBe('video/webm;codecs=vp9,opus');
  });

  it('falls back down the list', () => {
    expect(pickVideoMimeType((m) => m === 'video/webm')).toBe('video/webm');
    expect(pickVideoMimeType((m) => m === 'video/mp4')).toBe('video/mp4');
  });

  it('returns null when nothing is supported', () => {
    expect(pickVideoMimeType(() => false)).toBeNull();
  });

  it('treats a throwing probe as unsupported', () => {
    expect(
      pickVideoMimeType((m) => {
        if (m.includes('vp9')) throw new Error('boom');
        return m === 'video/webm';
      })
    ).toBe('video/webm');
  });
});

describe('computeVideoBitrate', () => {
  it('is ~5 Mbps at 1080p', () => {
    expect(computeVideoBitrate(1920, 1080)).toBe(5_000_000);
  });
  it('clamps to the 0.5–8 Mbps range', () => {
    expect(computeVideoBitrate(160, 90)).toBe(VIDEO_TRANSFORM_LIMITS.minVideoBitrate);
    expect(computeVideoBitrate(3840, 2160)).toBe(VIDEO_TRANSFORM_LIMITS.maxVideoBitrate);
  });
});

describe('computeOutputDimensions', () => {
  it('keeps source size when nothing is requested', () => {
    expect(computeOutputDimensions({ sourceWidth: 1280, sourceHeight: 720 })).toEqual({
      width: 1280,
      height: 720,
    });
  });

  it('swaps axes for 90°/270° rotation', () => {
    expect(computeOutputDimensions({ sourceWidth: 1280, sourceHeight: 720, rotation: 90 })).toEqual({
      width: 720,
      height: 1280,
    });
    expect(computeOutputDimensions({ sourceWidth: 1280, sourceHeight: 720, rotation: 270 })).toEqual({
      width: 720,
      height: 1280,
    });
    expect(computeOutputDimensions({ sourceWidth: 1280, sourceHeight: 720, rotation: 180 })).toEqual({
      width: 1280,
      height: 720,
    });
  });

  it('respects aspect lock when resizing', () => {
    expect(
      computeOutputDimensions({ sourceWidth: 1920, sourceHeight: 1080, targetWidth: 800, lockAspectRatio: true })
    ).toEqual({ width: 800, height: 450 });
  });

  it('honours an unlocked height', () => {
    expect(
      computeOutputDimensions({
        sourceWidth: 1920,
        sourceHeight: 1080,
        targetWidth: 800,
        targetHeight: 600,
        lockAspectRatio: false,
      })
    ).toEqual({ width: 800, height: 600 });
  });

  it('clamps to the 16–1920 px range and rounds to even values', () => {
    expect(
      computeOutputDimensions({ sourceWidth: 3840, sourceHeight: 2160 })
    ).toEqual({ width: 1920, height: 1080 });
    expect(
      computeOutputDimensions({ sourceWidth: 1920, sourceHeight: 1080, targetWidth: 801, lockAspectRatio: true })
    ).toEqual({ width: 800, height: 450 });
    // Ultra-small requests hit the 16 px encoder-safe floor on both axes.
    expect(
      computeOutputDimensions({ sourceWidth: 1920, sourceHeight: 1080, targetWidth: 10, lockAspectRatio: true })
    ).toEqual({ width: 16, height: 16 });
  });

  it('rejects unreadable source dimensions', () => {
    expect(() => computeOutputDimensions({ sourceWidth: 0, sourceHeight: 720 })).toThrow(/dimensions/i);
  });
});

describe('computeExpectedOutputDuration', () => {
  it('divides the range by the playback rate', () => {
    expect(
      computeExpectedOutputDuration({ durationSeconds: 60, startTime: 10, endTime: 30, playbackRate: 2 })
    ).toBe(10);
    expect(computeExpectedOutputDuration({ durationSeconds: 60, playbackRate: 0.5 })).toBe(120);
    expect(computeExpectedOutputDuration({ durationSeconds: 60 })).toBe(60);
  });
});

describe('computeWatermarkLayout', () => {
  const base = {
    text: 'Demo',
    canvasWidth: 1280,
    canvasHeight: 720,
    opacityPercent: 50,
    textWidthPx: 120,
  };
  it('places bottom-right inside the canvas with margin', () => {
    const layout = computeWatermarkLayout({ ...base, position: 'bottom-right' });
    expect(layout.x).toBe(1280 - 120 - 20);
    expect(layout.y).toBe(720 - 20);
    expect(layout.opacity).toBe(0.5);
    expect(layout.box.x + layout.box.width).toBeLessThanOrEqual(1280);
    expect(layout.box.y + layout.box.height).toBeLessThanOrEqual(720);
  });

  it('places top-left and center', () => {
    const topLeft = computeWatermarkLayout({ ...base, position: 'top-left' });
    expect(topLeft.x).toBe(20);
    expect(topLeft.y).toBeGreaterThan(0);
    const center = computeWatermarkLayout({ ...base, position: 'center' });
    expect(center.x).toBe((1280 - 120) / 2);
    expect(center.y).toBeGreaterThan(360);
  });

  it('scales the font with canvas width and clamps it', () => {
    const small = computeWatermarkLayout({ ...base, canvasWidth: 160, canvasHeight: 90, position: 'center' });
    expect(small.fontPx).toBe(14);
    const huge = computeWatermarkLayout({ ...base, canvasWidth: 4000, canvasHeight: 2000, position: 'center' });
    expect(huge.fontPx).toBe(96);
  });
});

describe('buildVideoOutputFilename', () => {
  it('always ends in .webm and keeps the base name', () => {
    expect(buildVideoOutputFilename('holiday.mp4', 'speed-2x')).toBe('holiday_speed-2x.webm');
    expect(buildVideoOutputFilename('clip', 'muted')).toBe('clip_muted.webm');
    expect(buildVideoOutputFilename('my.video.mov', 'trim')).toBe('my.video_trim.webm');
  });
});

describe('validateWebmBytes', () => {
  const validHeader = () => {
    const bytes = new Uint8Array(256);
    bytes[0] = 0x1a;
    bytes[1] = 0x45;
    bytes[2] = 0xdf;
    bytes[3] = 0xa3;
    return bytes;
  };

  it('accepts bytes with the EBML magic and a non-trivial size', () => {
    expect(validateWebmBytes(validHeader())).toEqual({ sizeBytes: 256 });
  });

  it('rejects tiny outputs', () => {
    expect(() => validateWebmBytes(new Uint8Array(50))).toThrow(/only 50 bytes/);
  });

  it('rejects bytes without the EBML magic', () => {
    const bytes = validHeader();
    bytes[0] = 0x00;
    expect(() => validateWebmBytes(bytes)).toThrow(/EBML header/);
    // An MP4 'ftyp' box is not a WebM file.
    const mp4 = new Uint8Array(256);
    mp4.set([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]);
    expect(() => validateWebmBytes(mp4)).toThrow(/EBML header/);
  });
});

describe('validateVideoSegments', () => {
  it('accepts a valid batch', () => {
    expect(() =>
      validateVideoSegments(
        [
          { startTime: 0, endTime: 5 },
          { startTime: 10, endTime: 12.5 },
        ],
        60
      )
    ).not.toThrow();
  });

  it('rejects an empty batch, out-of-range and too-short segments', () => {
    expect(() => validateVideoSegments([], 60)).toThrow(/at least one segment/i);
    expect(() => validateVideoSegments([{ startTime: 0, endTime: 61 }], 60)).toThrow(
      /outside the video/i
    );
    expect(() => validateVideoSegments([{ startTime: 5, endTime: 5.1 }], 60)).toThrow(/at least 0\.2s/);
    expect(() => validateVideoSegments([{ startTime: 8, endTime: 5 }], 60)).toThrow(
      /outside the video/i
    );
  });
});

describe('browser support probe (jsdom has no recording APIs)', () => {
  it('reports unsupported in this environment', () => {
    const support = getVideoReencodeSupport();
    expect(support.supported).toBe(false);
    expect(support.missing).toContain('MediaRecorder');
    expect(support.missing).toContain('canvas.captureStream');
  });

  it('reencodeVideo refuses honestly instead of faking an output', async () => {
    await expect(reencodeVideo({ file: videoFile() })).rejects.toThrow(/not supported in this browser/);
  });

  it('reencodeVideo still validates input before touching the DOM', async () => {
    // A cancelled signal is honoured before any browser API is used.
    const controller = new AbortController();
    controller.abort();
    await expect(reencodeVideo({ file: videoFile(), signal: controller.signal })).rejects.toThrow(
      /not supported in this browser|cancelled/i
    );
  });
});
