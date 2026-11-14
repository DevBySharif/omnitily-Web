// Wave 2 audio tools: sound-recorder, audio-merger, voice-changer,
// audio-speed, bpm-finder, metronome, audio-converter.
//
// These tests are deliberately deterministic: they exercise the pure DSP /
// planning logic exported by each component (WAV math, resampling, WSOLA
// time-stretch, onset autocorrelation, tap tempo, format probing) plus the
// render + validation paths of every component through jsdom.
//
// What is NOT covered here (needs a real browser: jsdom has no media APIs):
// - decodeAudioData / AudioContext decode flows
// - MediaRecorder capture (sound-recorder) and re-encode (audio-converter)
// - getUserMedia microphone capture
// Those paths are verified in the Playwright evidence run (see
// ~/workspace/omnitily-seo/checks/wave2-audio.md).
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import SoundRecorder, {
  buildRecordingFileName,
  extensionForMimeType,
  formatRecorderTime,
  pickRecorderMimeType
} from '../src/components/SoundRecorder';
import AudioMerger, {
  buildMergedFileName,
  concatenateTracks,
  resampleChannel,
  type DecodedTrack,
  formatTime as mergerFormatTime
} from '../src/components/AudioMerger';
import VoiceChanger, {
  applyEcho,
  applyRingModulation,
  applyVoicePreset,
  buildVoiceChangedFileName,
  resampleByFactor,
  semitonesToRate,
  VOICE_PRESETS
} from '../src/components/VoiceChanger';
import AudioSpeed, {
  clampSpeed,
  dominantFrequencyByZeroCrossing,
  expectedOutputDuration,
  formatSpeed,
  timeStretchWsola
} from '../src/components/AudioSpeed';
import BpmFinder, {
  bpmFromTapTimes,
  buildClickTrain,
  computeOnsetEnvelope,
  estimateBpm
} from '../src/components/BpmFinder';
import Metronome, {
  beatIntervalMs,
  clampBpm,
  isDownbeat,
  nextBeatTimes
} from '../src/components/Metronome';
import AudioConverter, {
  buildConvertedFileName,
  outputFormatOptions,
  pickRecorderMimeType as pickConverterMimeType
} from '../src/components/AudioConverter';
import { ToastProvider } from '../src/components/Toast';
import { encodeWavPcm16, parseWavHeader } from '../src/lib/toolTransforms';

const renderTool = (component: ReactNode) => render(<ToastProvider>{component}</ToastProvider>);

/** A 440 Hz sine at a small sample rate so DSP tests stay fast. */
function sine440(seconds: number, sampleRate = 8000): Float32Array {
  const length = Math.round(seconds * sampleRate);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = 0.8 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  }
  return out;
}

function makeTrack(samples: Float32Array, sampleRate = 8000, name = 'tone.wav'): DecodedTrack {
  return {
    name,
    size: samples.length * 2,
    channels: [samples],
    sampleRate,
    durationSeconds: samples.length / sampleRate,
  };
}

// --- sound-recorder ---------------------------------------------------------

describe('sound-recorder', () => {
  it('picks the first MediaRecorder type the browser supports', () => {
    expect(pickRecorderMimeType(() => false)).toBeNull();
    expect(pickRecorderMimeType((t) => t === 'audio/webm')).toBe('audio/webm');
    expect(pickRecorderMimeType((t) => t === 'audio/ogg')).toBe('audio/ogg');
    expect(pickRecorderMimeType(() => true)).toBe('audio/webm;codecs=opus');
  });

  it('maps MIME types to file extensions', () => {
    expect(extensionForMimeType('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionForMimeType('audio/ogg')).toBe('ogg');
    expect(extensionForMimeType('audio/mp4')).toBe('m4a');
    expect(extensionForMimeType('audio/wav')).toBe('wav');
  });

  it('builds a timestamped recording filename', () => {
    expect(buildRecordingFileName('audio/webm;codecs=opus', new Date('2026-11-15T10:30:00Z'))).toBe(
      'recording_2026-11-15_10-30-00.webm'
    );
  });

  it('formats the recorder timer as MM:SS', () => {
    expect(formatRecorderTime(0)).toBe('00:00');
    expect(formatRecorderTime(65)).toBe('01:05');
    expect(formatRecorderTime(NaN)).toBe('00:00');
  });

  it('renders the recorder workspace and explains the jsdom mic gap honestly', () => {
    renderTool(<SoundRecorder onBack={() => undefined} />);
    expect(screen.getByText(/High-Fidelity Voice Recorder/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Recording/i })).toBeInTheDocument();
    // jsdom has no mediaDevices, so the component must say so, not crash.
    expect(screen.getByText(/does not expose microphone capture/i)).toBeInTheDocument();
  });
});

// --- audio-merger -----------------------------------------------------------

describe('audio-merger', () => {
  it('resamples a channel linearly to a new sample rate', () => {
    const data = new Float32Array([0, 1, 0, -1]);
    const down = resampleChannel(data, 8000, 4000);
    expect(down.length).toBe(2);
    expect(down[0]).toBeCloseTo(0, 5);
    expect(down[1]).toBeCloseTo(0, 5);
    const up = resampleChannel(data, 4000, 8000);
    expect(up.length).toBe(8);
    expect(() => resampleChannel(data, 0, 8000)).toThrow();
  });

  it('concatenates two tracks with a gap, preserving sample order', () => {
    const a = makeTrack(new Float32Array([0.1, 0.2, 0.3]), 8000, 'a.wav');
    const b = makeTrack(new Float32Array([0.9, 0.8]), 8000, 'b.wav');
    const merged = concatenateTracks([a, b], 0.5);
    // 3 + 4000 (0.5s gap) + 2 frames
    expect(merged.channels[0].length).toBe(4005);
    expect(merged.durationSeconds).toBeCloseTo(0.500625, 6);
    expect(merged.channels[0][0]).toBeCloseTo(0.1, 5);
    expect(merged.channels[0][2]).toBeCloseTo(0.3, 5);
    expect(merged.channels[0][3]).toBe(0); // gap silence
    expect(merged.channels[0][4003]).toBeCloseTo(0.9, 5);
    expect(merged.channels[0][4004]).toBeCloseTo(0.8, 5);
    expect(() => concatenateTracks([], 0)).toThrow();
  });

  it('merges tracks recorded at different sample rates', () => {
    const a = makeTrack(sine440(1, 8000), 8000, 'a.wav');
    const b = makeTrack(sine440(1, 16000), 16000, 'b.wav');
    const merged = concatenateTracks([a, b], 0);
    expect(merged.sampleRate).toBe(8000);
    expect(merged.channels[0].length).toBe(16000);
    expect(merged.durationSeconds).toBeCloseTo(2, 6);
  });

  it('round-trips a merged track through the WAV encoder', () => {
    const merged = concatenateTracks(
      [makeTrack(sine440(1), 8000, 'a.wav'), makeTrack(sine440(1), 8000, 'b.wav')],
      0
    );
    const wav = encodeWavPcm16(merged.channels, merged.sampleRate);
    const info = parseWavHeader(new Uint8Array(wav));
    expect(info.channels).toBe(1);
    expect(info.sampleRate).toBe(8000);
    expect(info.durationSeconds).toBeCloseTo(2, 6);
    expect(buildMergedFileName(['intro.mp3', 'outro.mp3'])).toBe('intro_merged_2tracks.wav');
  });

  it('renders with a disabled merge button until two tracks exist', () => {
    renderTool(<AudioMerger onBack={() => undefined} />);
    expect(screen.getByText(/Audio Clip Merger/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload audio tracks to merge/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Merge \(0\) Tracks/i })).toBeDisabled();
  });

  it('rejects a non-audio file with a toast', () => {
    renderTool(<AudioMerger onBack={() => undefined} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['plain text'], 'notes.txt', { type: 'text/plain' })] } });
    expect(screen.getByText('Skipped File')).toBeInTheDocument();
    expect(mergerFormatTime(65)).toBe('01:05');
  });
});

// --- voice-changer ----------------------------------------------------------

describe('voice-changer', () => {
  it('converts semitones to a resample factor', () => {
    expect(semitonesToRate(12)).toBeCloseTo(2, 6);
    expect(semitonesToRate(-12)).toBeCloseTo(0.5, 6);
    expect(semitonesToRate(0)).toBeCloseTo(1, 6);
    expect(semitonesToRate(8)).toBeCloseTo(1.5874, 3);
  });

  it('resamples by a factor, shortening and lengthening correctly', () => {
    const data = sine440(2);
    const fast = resampleByFactor(data, 2);
    expect(fast.length).toBe(8000);
    const slow = resampleByFactor(data, 0.5);
    expect(slow.length).toBe(32000);
    expect(() => resampleByFactor(data, 0)).toThrow();
  });

  it('chipmunk preset raises pitch AND shortens duration (resample truth)', () => {
    const data = sine440(2);
    const result = applyVoicePreset([data], 8000, 'chipmunk');
    expect(result.durationSeconds).toBeCloseTo(2 / semitonesToRate(8), 2);
    const middle = result.channels[0].slice(2000, 6000);
    const freq = dominantFrequencyByZeroCrossing(middle, 8000);
    expect(freq).toBeGreaterThan(600);
    expect(freq).toBeLessThan(800); // 440 * 2^(8/12) ≈ 698 Hz
  });

  it('deep preset lowers pitch and lengthens duration', () => {
    const data = sine440(2);
    const result = applyVoicePreset([data], 8000, 'deep');
    expect(result.durationSeconds).toBeCloseTo(2 / semitonesToRate(-7), 2);
    expect(result.channels[0].length).toBeGreaterThan(data.length);
  });

  it('robot preset keeps the length and modulates the waveform', () => {
    const data = sine440(1);
    const robot = applyRingModulation(data, 8000, 45);
    expect(robot.length).toBe(data.length);
    // Ring modulation moves energy away from 440 Hz: original peak sample
    // values must change at carrier zero crossings.
    expect(robot.some((v, i) => Math.abs(v - data[i]) > 0.1)).toBe(true);
  });

  it('echo preset appends decaying repeats and never clips past 1.0', () => {
    const data = new Float32Array(8000).fill(0.9);
    const echoed = applyEcho(data, 8000, 0.1, 0.9, 3);
    expect(echoed.length).toBe(8000 + 800 * 3);
    let peak = 0;
    for (const v of echoed) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeLessThanOrEqual(1.0001);
    // The first repeat stacks on the original, so it must read louder than
    // the un-echoed head of the signal (both measured after normalization).
    expect(echoed[800]).toBeGreaterThan(echoed[0]);
  });

  it('exports a valid WAV from a changed voice', () => {
    const result = applyVoicePreset([sine440(1)], 8000, 'echo');
    const wav = encodeWavPcm16(result.channels, result.sampleRate);
    const info = parseWavHeader(new Uint8Array(wav));
    expect(info.durationSeconds).toBeGreaterThan(1);
    expect(buildVoiceChangedFileName('my voice.mp3', 'robot')).toBe('my_voice_robot.wav');
    expect(VOICE_PRESETS.map((p) => p.id)).toEqual(
      expect.arrayContaining(['chipmunk', 'deep', 'robot', 'echo'])
    );
  });

  it('renders all presets and rejects a non-audio file', () => {
    renderTool(<VoiceChanger onBack={() => undefined} />);
    expect(screen.getByText(/Real-Time Voice Modulator/i)).toBeInTheDocument();
    expect(screen.getByText('Chipmunk')).toBeInTheDocument();
    expect(screen.getByText('Robot')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply Chipmunk Effect/i })).toBeDisabled();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });
    expect(screen.getByText('Unsupported File')).toBeInTheDocument();
  });
});

// --- audio-speed (WSOLA) ----------------------------------------------------

describe('audio-speed', () => {
  it('clamps and formats the speed range 0.5x–2.0x', () => {
    expect(clampSpeed(0.1)).toBe(0.5);
    expect(clampSpeed(3)).toBe(2.0);
    expect(clampSpeed(1.5)).toBe(1.5);
    expect(formatSpeed(1.5)).toBe('1.50x');
    expect(expectedOutputDuration(10, 2)).toBe(5);
    expect(expectedOutputDuration(10, 0.5)).toBe(20);
  });

  it('stretches a 440 Hz sine to 1.5x with pitch preserved', () => {
    const data = sine440(2);
    const stretched = timeStretchWsola(data, 1.5, 8000);
    expect(stretched.length / 8000).toBeCloseTo(2 / 1.5, 2);
    const middle = stretched.slice(2000, stretched.length - 2000);
    const freq = dominantFrequencyByZeroCrossing(middle, 8000);
    expect(freq).toBeGreaterThan(418); // 440 ± 5%
    expect(freq).toBeLessThan(462);
    // Output must not be silent or clipped.
    let peak = 0;
    for (const v of stretched) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeGreaterThan(0.3);
    expect(peak).toBeLessThanOrEqual(1.0001);
  });

  it('slows a sine to 0.5x (double duration) with pitch preserved', () => {
    const data = sine440(2);
    const stretched = timeStretchWsola(data, 0.5, 8000);
    expect(stretched.length / 8000).toBeCloseTo(4, 2);
    const middle = stretched.slice(4000, stretched.length - 4000);
    const freq = dominantFrequencyByZeroCrossing(middle, 8000);
    expect(freq).toBeGreaterThan(418);
    expect(freq).toBeLessThan(462);
  });

  it('returns the input unchanged at 1.0x and handles empty input', () => {
    const data = sine440(1);
    expect(timeStretchWsola(data, 1, 8000)).toEqual(data);
    expect(timeStretchWsola(new Float32Array(0), 1.5, 8000).length).toBe(0);
  });

  it('exports a valid WAV from a stretched track', () => {
    const stretched = timeStretchWsola(sine440(2), 1.5, 8000);
    const wav = encodeWavPcm16([stretched], 8000);
    const info = parseWavHeader(new Uint8Array(wav));
    expect(info.durationSeconds).toBeCloseTo(2 / 1.5, 2);
  });

  it('renders the speed slider, presets, and rejects a non-audio file', () => {
    renderTool(<AudioSpeed onBack={() => undefined} />);
    expect(screen.getByText(/Audio Speed Changer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Playback Speed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1.50x/ })).toBeInTheDocument();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });
    expect(screen.getByText('Unsupported File')).toBeInTheDocument();
  });
});

// --- bpm-finder -------------------------------------------------------------

describe('bpm-finder', () => {
  it('computes BPM from tap intervals using the median', () => {
    expect(bpmFromTapTimes([0, 500, 1000, 1500, 2000])?.bpm).toBe(120);
    expect(bpmFromTapTimes([0, 1000, 2000])?.bpm).toBe(60);
    expect(bpmFromTapTimes([0])?.bpm).toBeUndefined();
    expect(bpmFromTapTimes([])).toBeNull();
    // One wild tap (2000 ms among 500 ms taps) must not move the median.
    expect(bpmFromTapTimes([0, 500, 1000, 3000, 3500, 4000])?.bpm).toBe(120);
  });

  it('estimates 120 BPM from a synthetic click train', () => {
    const train = buildClickTrain(120, 8, 44100);
    const flux = computeOnsetEnvelope(train, 512);
    const result = estimateBpm(flux, 44100, 512);
    expect(result).not.toBeNull();
    expect(result!.bpm).toBeGreaterThanOrEqual(118);
    expect(result!.bpm).toBeLessThanOrEqual(122);
    expect(result!.confidence).toBeGreaterThan(0.3);
  });

  it('estimates 90 BPM and 150 BPM click trains', () => {
    for (const bpm of [90, 150]) {
      const train = buildClickTrain(bpm, 10, 44100);
      const flux = computeOnsetEnvelope(train, 512);
      const result = estimateBpm(flux, 44100, 512);
      expect(result).not.toBeNull();
      expect(result!.bpm).toBeGreaterThanOrEqual(bpm - 3);
      expect(result!.bpm).toBeLessThanOrEqual(bpm + 3);
    }
  });

  it('returns null for silence and for a steady tone with no onsets', () => {
    const silent = new Float32Array(44100 * 4);
    expect(estimateBpm(computeOnsetEnvelope(silent, 512), 44100, 512)).toBeNull();
    const tone = sine440(4, 44100);
    expect(estimateBpm(computeOnsetEnvelope(tone, 512), 44100, 512)).toBeNull();
  });

  it('tap tempo UI: five taps at 500 ms intervals read 120 BPM', () => {
    vi.useFakeTimers();
    try {
      renderTool(<BpmFinder onBack={() => undefined} />);
      const tapButton = screen.getByRole('button', { name: /Tap to the beat/i });
      let now = 10000;
      vi.setSystemTime(now);
      for (let i = 0; i < 5; i++) {
        fireEvent.click(tapButton);
        now += 500;
        vi.setSystemTime(now);
      }
      expect(screen.getByTestId('tap-bpm-value')).toHaveTextContent('120');
      expect(screen.getByText(/5 taps recorded/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders both modes and rejects a non-audio file in analyze mode', () => {
    renderTool(<BpmFinder onBack={() => undefined} />);
    expect(screen.getByText(/Tap Tempo & BPM Counter/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Analyze Audio File/i }));
    expect(screen.getByText(/Detect BPM/i)).toBeInTheDocument();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });
    expect(screen.getByText('Unsupported File')).toBeInTheDocument();
  });
});

// --- metronome --------------------------------------------------------------

describe('metronome', () => {
  it('computes beat intervals and clamps BPM to 40–208', () => {
    expect(beatIntervalMs(120)).toBe(500);
    expect(beatIntervalMs(60)).toBe(1000);
    expect(beatIntervalMs(0)).toBe(0);
    expect(clampBpm(20)).toBe(40);
    expect(clampBpm(300)).toBe(208);
    expect(clampBpm(90)).toBe(90);
  });

  it('builds a beat schedule and detects downbeats', () => {
    expect(nextBeatTimes(1.0, 120, 3)).toEqual([1.0, 1.5, 2.0]);
    expect(nextBeatTimes(0, 60, 0)).toEqual([]);
    expect(isDownbeat(0, 4)).toBe(true);
    expect(isDownbeat(4, 4)).toBe(true);
    expect(isDownbeat(1, 4)).toBe(false);
    expect(isDownbeat(3, 3)).toBe(true);
  });

  it('renders the metronome with 4 beat dots and reports no Web Audio in jsdom', () => {
    renderTool(<Metronome onBack={() => undefined} />);
    expect(screen.getByText(/Rhythm & Tempo Metronome/i)).toBeInTheDocument();
    expect(screen.getByTestId('metronome-bpm-display')).toHaveTextContent('120');
    expect(screen.getByTestId('metronome-beat-0')).toBeInTheDocument();
    expect(screen.getByTestId('metronome-beat-3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Start Metronome/i }));
    expect(screen.getByText('Audio Unsupported')).toBeInTheDocument();
  });

  it('tap tempo on the metronome sets the BPM', () => {
    vi.useFakeTimers();
    try {
      renderTool(<Metronome onBack={() => undefined} />);
      const tapButton = screen.getByRole('button', { name: /Tap to set tempo/i });
      let now = 20000;
      vi.setSystemTime(now);
      for (let i = 0; i < 5; i++) {
        fireEvent.click(tapButton);
        now += 500;
        vi.setSystemTime(now);
      }
      expect(screen.getByTestId('metronome-bpm-display')).toHaveTextContent('120');
    } finally {
      vi.useRealTimers();
    }
  });
});

// --- audio-converter --------------------------------------------------------

describe('audio-converter', () => {
  it('always offers WAV, probes WebM/OGG, and never fakes MP3/FLAC', () => {
    const allSupported = outputFormatOptions(() => true);
    expect(allSupported.find((f) => f.id === 'wav')?.available).toBe(true);
    expect(allSupported.find((f) => f.id === 'webm')?.available).toBe(true);
    expect(allSupported.find((f) => f.id === 'ogg')?.available).toBe(true);
    const mp3 = allSupported.find((f) => f.id === 'mp3');
    const flac = allSupported.find((f) => f.id === 'flac');
    expect(mp3?.available).toBe(false);
    expect(mp3?.unavailableReason).toMatch(/no MP3 encoder/i);
    expect(flac?.available).toBe(false);
    expect(flac?.unavailableReason).toMatch(/no FLAC encoder/i);

    const noneSupported = outputFormatOptions(() => false);
    expect(noneSupported.find((f) => f.id === 'wav')?.available).toBe(true);
    expect(noneSupported.find((f) => f.id === 'webm')?.available).toBe(false);
  });

  it('picks a recorder MIME type per container format', () => {
    expect(pickConverterMimeType('webm', () => true)).toBe('audio/webm;codecs=opus');
    expect(pickConverterMimeType('ogg', (t) => t === 'audio/ogg')).toBe('audio/ogg');
    expect(pickConverterMimeType('mp3', () => true)).toBeNull();
    expect(pickConverterMimeType('webm', () => false)).toBeNull();
  });

  it('builds converted filenames', () => {
    expect(buildConvertedFileName('my song.mp3', 'wav')).toBe('my_song.wav');
    expect(buildConvertedFileName('clip.webm', 'webm')).toBe('clip.webm');
  });

  it('renders formats with MP3/FLAC honestly disabled and rejects a bad file', () => {
    renderTool(<AudioConverter onBack={() => undefined} />);
    expect(screen.getByText(/Audio Format Converter/i)).toBeInTheDocument();
    // The WAV format option and the convert action share the same label.
    expect(
      screen.getAllByRole('button', { name: /Convert to WAV \(16-bit PCM\)/i })
    ).toHaveLength(2);
    const mp3Button = screen.getByRole('button', { name: /MP3 unavailable/i });
    expect(mp3Button).toBeDisabled();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });
    expect(screen.getByText('Unsupported File')).toBeInTheDocument();
  });
});
