// Video media tools (worker B): gif-maker, video-to-audio, frame-extractor,
// video-compressor, video-looper, subtitles-editor.
//
// These tests are deliberately deterministic: they exercise the pure
// byte-building / byte-validating / subtitle / planning logic in
// src/lib/toolTransforms.ts, plus the subtitles-editor UI path through the
// real GenericUtilityWorkspace component.
//
// What is NOT covered here (needs a real browser, jsdom has no media APIs):
// - decodeAudioData / AudioContext (video-to-audio decode)
// - <video> seeking, canvas drawImage, gifshot encoding (gif-maker /
//   frame-extractor capture)
// - MediaRecorder + captureStream re-encode (video-compressor /
//   video-looper). For those paths the component validates the produced
//   bytes with validateGifBytes / validateJpegBytes / validateWebmBytes /
//   parseWavHeader — the validators themselves are tested below.
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GenericUtilityWorkspace from '../src/components/GenericUtilityWorkspace';
import { TOOL_BY_ID } from '../src/toolsData';
import {
  buildTimedCues,
  encodeWavPcm16,
  estimateCompressedBitrate,
  formatSubtitleText,
  formatSubtitleTimestamp,
  parseSubtitleText,
  parseSubtitleTimestamp,
  parseWavHeader,
  planGifCapture,
  planLoopOutput,
  validateGifBytes,
  validateJpegBytes,
  validateVideoMediaFile,
  validateWebmBytes,
} from '../src/lib/toolTransforms';

// --- Minimal byte fixtures -------------------------------------------------

function buildGif(frames: number): Uint8Array {
  const bytes: number[] = [];
  const push = (...ns: number[]) => bytes.push(...ns);
  push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // GIF89a
  push(1, 0, 1, 0, 0x80, 0, 0); // LSD: 1x1, global color table of 2 colors
  push(0, 0, 0, 255, 255, 255); // GCT
  for (let f = 0; f < frames; f++) {
    push(0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0x00); // image descriptor
    push(2); // LZW minimum code size
    push(2, 0x4c, 0x01, 0x00); // one sub-block + terminator
  }
  push(0x3b); // trailer
  return new Uint8Array(bytes);
}

function buildJpeg(width: number, height: number): Uint8Array {
  const bytes: number[] = [0xff, 0xd8]; // SOI
  bytes.push(0xff, 0xe0, 0x00, 0x10); // APP0, length 16
  bytes.push(0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00); // JFIF payload
  bytes.push(0xff, 0xc0, 0x00, 0x11, 0x08); // SOF0, length 17, precision 8
  bytes.push((height >> 8) & 0xff, height & 0xff, (width >> 8) & 0xff, width & 0xff, 0x03);
  bytes.push(1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1); // 3 components
  bytes.push(0xff, 0xd9); // EOI
  return new Uint8Array(bytes);
}

function buildWebm(size = 204): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes[0] = 0x1a;
  bytes[1] = 0x45;
  bytes[2] = 0xdf;
  bytes[3] = 0xa3;
  return bytes;
}

// --- validateVideoMediaFile ------------------------------------------------

describe('video media file validation', () => {
  it('rejects a 0-byte file', () => {
    const result = validateVideoMediaFile({ name: 'clip.mp4', size: 0, type: 'video/mp4' }, ['video']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('0 bytes');
  });

  it('rejects files above the 200MB cap', () => {
    const result = validateVideoMediaFile({ name: 'clip.mp4', size: 200 * 1024 * 1024 + 1, type: 'video/mp4' }, ['video']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('200MB');
  });

  it('accepts a file exactly at the 200MB cap', () => {
    expect(validateVideoMediaFile({ name: 'clip.mp4', size: 200 * 1024 * 1024, type: 'video/mp4' }, ['video']).ok).toBe(true);
  });

  it('rejects a wrong MIME kind', () => {
    const result = validateVideoMediaFile({ name: 'notes.txt', size: 10, type: 'text/plain' }, ['video']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('video');
  });

  it('accepts a video by extension when the MIME type is empty', () => {
    expect(validateVideoMediaFile({ name: 'clip.mkv', size: 10, type: '' }, ['video']).ok).toBe(true);
  });

  it('accepts audio input when audio is allowed', () => {
    expect(validateVideoMediaFile({ name: 'song.mp3', size: 10, type: 'audio/mpeg' }, ['video', 'audio']).ok).toBe(true);
  });

  it('rejects an image when only video is allowed', () => {
    expect(validateVideoMediaFile({ name: 'photo.png', size: 10, type: 'image/png' }, ['video']).ok).toBe(false);
  });
});

// --- WAV encode + validate round-trip --------------------------------------

describe('WAV encode / parse round-trip', () => {
  it('encodes mono PCM and parses back matching duration and channels', () => {
    const sampleRate = 8000;
    const frames = 8000; // 1s
    const sine = new Float32Array(frames);
    for (let i = 0; i < frames; i++) sine[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.5;
    const wav = encodeWavPcm16([sine], sampleRate);
    const info = parseWavHeader(new Uint8Array(wav));
    expect(info.channels).toBe(1);
    expect(info.sampleRate).toBe(8000);
    expect(info.bitsPerSample).toBe(16);
    expect(info.dataBytes).toBe(16000);
    expect(info.durationSeconds).toBeCloseTo(1, 6);
  });

  it('encodes stereo with interleaved samples and the right data size', () => {
    const left = new Float32Array([0.5, -0.5, 0]);
    const right = new Float32Array([0.25, 0.25, 0.25]);
    const wav = encodeWavPcm16([left, right], 44100);
    const info = parseWavHeader(new Uint8Array(wav));
    expect(info.channels).toBe(2);
    expect(info.dataBytes).toBe(12);
    expect(info.durationSeconds).toBeCloseTo(3 / 44100, 9);
    // Interleaving: frame 0 = left[0], right[0]. PCM conversion truncates
    // toward zero (0.5 * 32767 = 16383.5 -> 16383).
    const view = new DataView(wav);
    expect(view.getInt16(44, true)).toBe(Math.trunc(0.5 * 0x7fff));
    expect(view.getInt16(46, true)).toBe(Math.trunc(0.25 * 0x7fff));
  });

  it('clamps out-of-range samples instead of overflowing', () => {
    const wav = encodeWavPcm16([new Float32Array([2, -2])], 8000);
    const view = new DataView(wav);
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x8000);
  });

  it('rejects empty channels and mismatched channel lengths', () => {
    expect(() => encodeWavPcm16([], 8000)).toThrow(/at least one audio channel/);
    expect(() => encodeWavPcm16([new Float32Array(4), new Float32Array(2)], 8000)).toThrow(/same length/);
    expect(() => encodeWavPcm16([new Float32Array(4)], 0)).toThrow(/sample rate/);
  });

  it('rejects non-WAV bytes, truncated headers, and non-PCM format', () => {
    expect(() => parseWavHeader(new Uint8Array([1, 2, 3]))).toThrow(/fewer than 44 bytes/);
    const notWav = new Uint8Array(44);
    expect(() => parseWavHeader(notWav)).toThrow(/RIFF\/WAVE/);
    const wav = new Uint8Array(encodeWavPcm16([new Float32Array(4)], 8000));
    const truncated = wav.slice(0, 30);
    expect(() => parseWavHeader(truncated)).toThrow(/fewer than 44 bytes|Truncated/);
    // Flip fmt audio format (offset 20) from PCM (1) to float (3).
    const floatWav = new Uint8Array(wav);
    new DataView(floatWav.buffer).setUint16(20, 3, true);
    expect(() => parseWavHeader(floatWav)).toThrow(/not PCM/);
  });
});

// --- GIF validation ----------------------------------------------------------

describe('GIF byte validation', () => {
  it('accepts a minimal GIF89a and counts frames', () => {
    expect(validateGifBytes(buildGif(1))).toEqual({ version: '89a', width: 1, height: 1, frames: 1 });
    expect(validateGifBytes(buildGif(3)).frames).toBe(3);
  });

  it('rejects bad magic, missing trailer, and frame-less GIFs', () => {
    const badMagic = buildGif(1);
    badMagic[0] = 0x58; // 'X'
    expect(() => validateGifBytes(badMagic)).toThrow(/GIF87a\/GIF89a/);
    expect(() => validateGifBytes(buildGif(1).slice(0, -1))).toThrow(/trailer/);
    const noFrames = buildGif(0);
    expect(() => validateGifBytes(noFrames)).toThrow(/no image frames/);
    expect(() => validateGifBytes(new Uint8Array([0x47, 0x49]))).toThrow(/fewer than 13 bytes/);
  });
});

// --- JPEG validation ---------------------------------------------------------

describe('JPEG byte validation', () => {
  it('accepts a minimal JPEG and reports its SOF dimensions', () => {
    expect(validateJpegBytes(buildJpeg(640, 480))).toEqual({ width: 640, height: 480 });
    expect(validateJpegBytes(buildJpeg(1920, 1080))).toEqual({ width: 1920, height: 1080 });
  });

  it('rejects bad SOI, missing EOI, and SOF-less data', () => {
    const badSoi = buildJpeg(10, 10);
    badSoi[0] = 0x00;
    expect(() => validateJpegBytes(badSoi)).toThrow(/SOI/);
    expect(() => validateJpegBytes(buildJpeg(10, 10).slice(0, -2))).toThrow(/EOI/);
    const noSof = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    expect(() => validateJpegBytes(noSof)).toThrow(/SOF frame header/);
    expect(() => validateJpegBytes(new Uint8Array([0xff]))).toThrow(/fewer than 4 bytes/);
  });
});

// --- WebM validation ---------------------------------------------------------

describe('WebM byte validation', () => {
  it('accepts EBML-headed bytes of a non-trivial size', () => {
    expect(validateWebmBytes(buildWebm(204)).sizeBytes).toBe(204);
  });

  it('rejects tiny payloads and wrong magic — no renamed/empty file passes', () => {
    expect(() => validateWebmBytes(buildWebm(50))).toThrow(/only 50 bytes/);
    const wrong = buildWebm(204);
    wrong[0] = 0x00;
    expect(() => validateWebmBytes(wrong)).toThrow(/EBML header/);
    expect(() => validateWebmBytes(new Uint8Array(0))).toThrow(/only 0 bytes/);
  });
});

// --- Subtitles -----------------------------------------------------------------

const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:03,500
Hello world

2
00:00:04,000 --> 00:00:06,000
Second cue
`;

const SAMPLE_VTT = `WEBVTT

00:00:01.000 --> 00:00:03.500
Hello world

00:00:04.000 --> 00:00:06.000
Second cue
`;

describe('subtitle timestamps', () => {
  it('parses SRT and VTT timestamps to milliseconds', () => {
    expect(parseSubtitleTimestamp('00:00:01,000')).toBe(1000);
    expect(parseSubtitleTimestamp('01:02:03,456')).toBe(3723456);
    expect(parseSubtitleTimestamp('00:01.500')).toBe(1500);
    expect(() => parseSubtitleTimestamp('not-a-time')).toThrow(/Invalid subtitle timestamp/);
    expect(() => parseSubtitleTimestamp('00:61:00,000')).toThrow(/under 60/);
  });

  it('formats timestamps with the right separator per format', () => {
    expect(formatSubtitleTimestamp(3723456, 'srt')).toBe('01:02:03,456');
    expect(formatSubtitleTimestamp(3723456, 'vtt')).toBe('01:02:03.456');
    expect(formatSubtitleTimestamp(0, 'srt')).toBe('00:00:00,000');
    expect(() => formatSubtitleTimestamp(-1, 'srt')).toThrow(/non-negative/);
  });
});

describe('subtitle parse / format', () => {
  it('parses SRT cues with timings and text', () => {
    const cues = parseSubtitleText(SAMPLE_SRT, 'srt');
    expect(cues).toHaveLength(2);
    expect(cues[0]).toEqual({ index: 1, startMs: 1000, endMs: 3500, text: 'Hello world' });
    expect(cues[1].startMs).toBe(4000);
  });

  it('parses VTT (header + dot timestamps) and round-trips losslessly', () => {
    const cues = parseSubtitleText(SAMPLE_VTT, 'vtt');
    expect(cues).toHaveLength(2);
    const reserialized = formatSubtitleText(cues, 'vtt');
    expect(parseSubtitleText(reserialized, 'vtt')).toEqual(cues);
    const srt = formatSubtitleText(cues, 'srt');
    expect(srt).toContain('00:00:01,000 --> 00:00:03,500');
    expect(parseSubtitleText(srt, 'srt')).toEqual(cues);
  });

  it('formats VTT with a WEBVTT header and SRT with numbered blocks', () => {
    const cues = parseSubtitleText(SAMPLE_SRT, 'srt');
    expect(formatSubtitleText(cues, 'vtt').startsWith('WEBVTT\n\n')).toBe(true);
    expect(formatSubtitleText(cues, 'srt').startsWith('1\n00:00:01,000')).toBe(true);
  });

  it('rejects empty input and files with no valid cues', () => {
    expect(() => parseSubtitleText('', 'srt')).toThrow(/empty/);
    expect(() => parseSubtitleText('just some words, no timings', 'srt')).toThrow(/No valid subtitle cues/);
  });

  it('rejects end-before-start and overlapping cues with a precise message', () => {
    const badOrder = '1\n00:00:05,000 --> 00:00:05,000\nNope\n';
    expect(() => parseSubtitleText(badOrder, 'srt')).toThrow(/end time must be after start time/);
    const overlap = '1\n00:00:01,000 --> 00:00:04,000\nFirst\n\n2\n00:00:03,000 --> 00:00:05,000\nSecond\n';
    expect(() => parseSubtitleText(overlap, 'srt')).toThrow(/overlapping/);
    const badTime = '1\n99:99:99,999 --> 00:00:05,000\nNope\n';
    expect(() => parseSubtitleText(badTime, 'srt')).toThrow(/No valid subtitle cues/);
  });

  it('rejects nothing to export', () => {
    expect(() => formatSubtitleText([], 'srt')).toThrow(/no subtitle cues/);
  });
});

describe('subtitle build from lines', () => {
  it('builds one timed cue per non-empty line', () => {
    const cues = buildTimedCues(['  Hello  ', '', 'World'], 2, 1);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toEqual({ index: 1, startMs: 1000, endMs: 3000, text: 'Hello' });
    expect(cues[1]).toEqual({ index: 2, startMs: 3000, endMs: 5000, text: 'World' });
  });

  it('rejects empty lines, bad per-cue seconds, and negative offsets', () => {
    expect(() => buildTimedCues(['', '   '], 2)).toThrow(/at least one line/);
    expect(() => buildTimedCues(['Hi'], 0.1)).toThrow(/between 0.5 and 30/);
    expect(() => buildTimedCues(['Hi'], 31)).toThrow(/between 0.5 and 30/);
    expect(() => buildTimedCues(['Hi'], 2, -1)).toThrow(/0 or more/);
  });

  it('round-trips built cues through SRT serialization', () => {
    const cues = buildTimedCues(['One', 'Two'], 3, 0);
    const parsed = parseSubtitleText(formatSubtitleText(cues, 'srt'), 'srt');
    expect(parsed).toEqual(cues);
  });
});

// --- Planning helpers ----------------------------------------------------------

describe('GIF capture planning', () => {
  it('samples at most the first 60s of a long video', () => {
    const plan = planGifCapture(120);
    expect(plan.sampledSeconds).toBe(60);
    expect(plan.frameCount).toBe(10);
    expect(plan.intervalSeconds).toBe(6);
  });

  it('uses the full duration of a short video', () => {
    const plan = planGifCapture(5);
    expect(plan.sampledSeconds).toBe(5);
    expect(plan.intervalSeconds).toBe(0.5);
  });

  it('caps the frame count at 24 and rejects unknown durations', () => {
    expect(planGifCapture(120, 100).frameCount).toBe(24);
    expect(() => planGifCapture(0)).toThrow(/positive duration/);
    expect(() => planGifCapture(Number.NaN)).toThrow(/positive duration/);
  });
});

describe('loop planning', () => {
  it('computes total output duration', () => {
    expect(planLoopOutput(10, 3)).toEqual({ loopCount: 3, totalSeconds: 30 });
  });

  it('rejects counts outside 2–10 and totals over 5 minutes', () => {
    expect(() => planLoopOutput(10, 1)).toThrow(/2 to 10/);
    expect(() => planLoopOutput(10, 11)).toThrow(/2 to 10/);
    expect(() => planLoopOutput(10, 2.5)).toThrow(/2 to 10/);
    expect(() => planLoopOutput(100, 4)).toThrow(/limit is 300s/);
    expect(() => planLoopOutput(0, 3)).toThrow(/positive duration/);
  });
});

describe('compression bitrate estimate', () => {
  it('scales the source average bitrate by the target percentage', () => {
    // 8MB over 100s = 640 kbps source; 50% target = 320 kbps.
    expect(estimateCompressedBitrate(8 * 1024 * 1024, 100, 50)).toBe(335544);
  });

  it('clamps to the 100 kbps–8 Mbps range', () => {
    expect(estimateCompressedBitrate(1024, 100, 10)).toBe(100000);
    expect(estimateCompressedBitrate(1024 * 1024 * 1024, 10, 90)).toBe(8000000);
  });

  it('rejects bad inputs', () => {
    expect(() => estimateCompressedBitrate(0, 10, 50)).toThrow(/non-empty/);
    expect(() => estimateCompressedBitrate(1000, 0, 50)).toThrow(/positive duration/);
    expect(() => estimateCompressedBitrate(1000, 10, 5)).toThrow(/10% and 90%/);
    expect(() => estimateCompressedBitrate(1000, 10, 95)).toThrow(/10% and 90%/);
  });
});

// --- Subtitles editor UI (real component, jsdom) ---------------------------------

describe('subtitles-editor workspace', () => {
  const back = () => undefined;

  it('shows the editor without any upload and errors honestly on empty input', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['subtitles-editor']} onBack={back} />);
    expect(screen.getByPlaceholderText(/Paste SRT or VTT text/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Validate & Export/i }));
    expect(screen.getByText(/Subtitle Error: Paste or load subtitle text first/i)).toBeInTheDocument();
    expect(screen.queryByText(/Subtitle file ready/)).not.toBeInTheDocument();
  });

  it('validates pasted SRT and reports the real cue count', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['subtitles-editor']} onBack={back} />);
    fireEvent.change(screen.getByPlaceholderText(/Paste SRT or VTT text/i), { target: { value: SAMPLE_SRT } });
    fireEvent.click(screen.getByRole('button', { name: /Validate & Export/i }));
    expect(screen.getByText(/Subtitle file ready \(2 cues\)/)).toBeInTheDocument();
    expect(screen.getByText(/Format: SRT/)).toBeInTheDocument();
    expect(screen.getByText(/sidecar \.srt file/)).toBeInTheDocument();
  });

  it('builds timed cues from plain lines in build mode', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['subtitles-editor']} onBack={back} />);
    fireEvent.change(screen.getByDisplayValue('Edit SRT / VTT'), { target: { value: 'build' } });
    fireEvent.change(screen.getByPlaceholderText(/One subtitle per line/i), { target: { value: 'First line\nSecond line' } });
    fireEvent.click(screen.getByRole('button', { name: /Build Subtitles/i }));
    expect(screen.getByText(/Subtitle file ready \(2 cues\)/)).toBeInTheDocument();
    expect(screen.getByText(/built from plain lines/)).toBeInTheDocument();
  });
});

// --- Media tool option blocks ------------------------------------------------------

describe('video tool option blocks', () => {
  const back = () => undefined;
  const videoFile = new File(['fake-video-bytes'], 'clip.mp4', { type: 'video/mp4' });

  it('frame-extractor shows a timestamp input', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['frame-extractor']} onBack={back} initialFile={videoFile} />);
    expect(screen.getByText(/Timestamp \(seconds\)/)).toBeInTheDocument();
    expect(document.querySelector('input[type="number"]')).toBeInTheDocument();
  });

  it('video-compressor shows a target-bitrate slider', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['video-compressor']} onBack={back} initialFile={videoFile} />);
    expect(screen.getByText(/Target Bitrate \(50% of original\)/)).toBeInTheDocument();
    const slider = document.querySelector('input[type="range"]');
    expect(slider).not.toBeNull();
    expect(slider?.getAttribute('min')).toBe('10');
    expect(slider?.getAttribute('max')).toBe('90');
    expect(screen.getByText(/MP4 output is not possible in-browser/)).toBeInTheDocument();
  });

  it('video-looper shows a loop-count input bounded 2–10', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['video-looper']} onBack={back} initialFile={videoFile} />);
    expect(screen.getByText(/Loop Count/)).toBeInTheDocument();
    const input = document.querySelector('input[type="number"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input?.getAttribute('min')).toBe('2');
    expect(input?.getAttribute('max')).toBe('10');
  });

  it('gif-maker shows a Cancel action while processing is not available without a run', () => {
    // No processing is in flight on mount, so no Cancel button — this guards
    // that the control only appears during a real run.
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['gif-maker']} onBack={back} initialFile={videoFile} />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});
