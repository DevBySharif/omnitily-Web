// D1 (2026-11-20 re-check): reencodeVideo exports took (range + 30)s wall time
// and the splitter reported a false duration (32.0s for a 2.09s file).
//
// Root cause, two halves:
//  1. The draw loop's stop condition only ran inside requestVideoFrameCallback,
//     which stops firing at end-of-stream — so the recorder ran until the
//     (range + 30)s wall timeout. The stop decision must also be reachable
//     from the video `ended` event / a `timeupdate` poll, i.e. it must be
//     true when the video has ended even if currentTime never crossed the
//     near-end threshold in a frame callback.
//  2. The reported duration fell back to wall time because MediaRecorder
//     WebM files carry no duration metadata. The verified duration must be
//     resolved from the output itself (container metadata, else the last
//     recorded frame's video time, else the requested range) — never from
//     wall time, so a 32s wall timeout can never surface as "32.0s".
//
// These tests exercise the pure helpers behind that fix. The browser-level
// behaviour (recorder actually stopping at end-of-stream) is covered by the
// Playwright repro against the local dist build, not by jsdom.
import { describe, expect, it } from 'vitest';
import {
  hasReachedReencodeEnd,
  measureRecordedDurationSeconds,
  resolveOutputDurationSeconds,
} from '../src/lib/toolTransforms';

describe('hasReachedReencodeEnd (D1: stop must not depend on rVFC alone)', () => {
  it('returns false mid-clip while frames are still flowing', () => {
    expect(hasReachedReencodeEnd(1.0, 2.003, false)).toBe(false);
  });

  it('returns true when currentTime is within 0.02s of endTime', () => {
    expect(hasReachedReencodeEnd(1.99, 2.003, false)).toBe(true);
  });

  it('returns true when the video ended even if currentTime is short of endTime', () => {
    // End-of-stream: no further frames will be presented, so no further
    // rVFC callback will ever re-check the condition. The `ended` event
    // must stop the recorder on its own.
    expect(hasReachedReencodeEnd(1.5, 2.003, true)).toBe(true);
  });

  it('returns true when the video ended exactly at endTime', () => {
    expect(hasReachedReencodeEnd(2.003, 2.003, true)).toBe(true);
  });

  it('returns false just short of the threshold while still playing', () => {
    expect(hasReachedReencodeEnd(1.9, 2.003, false)).toBe(false);
  });
});

describe('measureRecordedDurationSeconds (D1: duration from the output, not wall time)', () => {
  it('measures a full-range 2s trim as ~2s from the last drawn frame', () => {
    expect(
      measureRecordedDurationSeconds({ lastFrameVideoTimeSeconds: 2.0, startTimeSeconds: 0, playbackRate: 1 })
    ).toBeCloseTo(2.0, 6);
  });

  it('divides by playbackRate for a 2x speed export', () => {
    // 2s of source video played at 2x produces ~1s of output.
    expect(
      measureRecordedDurationSeconds({ lastFrameVideoTimeSeconds: 2.0, startTimeSeconds: 0, playbackRate: 2 })
    ).toBeCloseTo(1.0, 6);
  });

  it('subtracts the trim start time', () => {
    expect(
      measureRecordedDurationSeconds({ lastFrameVideoTimeSeconds: 2.0, startTimeSeconds: 0.5, playbackRate: 1 })
    ).toBeCloseTo(1.5, 6);
  });

  it('returns null when no frame was ever drawn', () => {
    expect(
      measureRecordedDurationSeconds({ lastFrameVideoTimeSeconds: null, startTimeSeconds: 0, playbackRate: 1 })
    ).toBeNull();
  });

  it('never returns a negative duration', () => {
    expect(
      measureRecordedDurationSeconds({ lastFrameVideoTimeSeconds: 0.1, startTimeSeconds: 0.5, playbackRate: 1 })
    ).toBe(0);
  });
});

describe('resolveOutputDurationSeconds (D1: wall time must never be the reported duration)', () => {
  it('prefers finite container metadata when the browser wrote it', () => {
    expect(
      resolveOutputDurationSeconds({
        metadataDurationSeconds: 2.1,
        measuredDurationSeconds: 2.0,
        expectedDurationSeconds: 2.003,
      })
    ).toBeCloseTo(2.1, 6);
  });

  it('uses the frame-measured duration when metadata is missing (MediaRecorder WebM)', () => {
    // The D1 symptom: metadata null + 32.0s wall time produced a "32.0s"
    // verified duration. The resolver takes no wall-time input at all, so
    // the measured 2.0s is what gets reported.
    expect(
      resolveOutputDurationSeconds({
        metadataDurationSeconds: null,
        measuredDurationSeconds: 2.0,
        expectedDurationSeconds: 2.003,
      })
    ).toBeCloseTo(2.0, 6);
  });

  it('falls back to the requested range only when nothing was measured', () => {
    expect(
      resolveOutputDurationSeconds({
        metadataDurationSeconds: null,
        measuredDurationSeconds: null,
        expectedDurationSeconds: 2.003,
      })
    ).toBeCloseTo(2.003, 6);
  });

  it('ignores non-finite metadata instead of reporting Infinity', () => {
    expect(
      resolveOutputDurationSeconds({
        metadataDurationSeconds: Number.POSITIVE_INFINITY,
        measuredDurationSeconds: 2.0,
        expectedDurationSeconds: 2.003,
      })
    ).toBeCloseTo(2.0, 6);
  });
});
