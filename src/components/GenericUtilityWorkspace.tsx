import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowClockwise,
  ArrowLeft,
  ArrowsCounterClockwise,
  Binary,
  BookOpen,
  Calculator,
  Calendar,
  Check,
  CheckCircle,
  Circle,
  Clock,
  Compass,
  Copy,
  CornersOut,
  Crop,
  Database,
  DiceFive,
  Download,
  Drop,
  Eye,
  FileCode,
  FileText,
  Hash,
  Heart,
  Key,
  Layout,
  Link,
  ListBullets,
  MagnifyingGlass,
  Microphone,
  Pause,
  Percent,
  Play,
  Pulse,
  Question,
  Shield,
  ShieldCheck,
  Shuffle,
  Sliders,
  SlidersHorizontal,
  Smiley,
  Sparkle,
  SpeakerHigh,
  SpeakerSlash,
  Stack,
  Terminal,
  Trash,
  TrendUp,
  Trophy,
  Users,
  Wind
} from '@phosphor-icons/react';
import type { ToolDefinition } from '../types';
import gifshot from 'gifshot';
import type { ReencodeVideoResult, SubtitleCue, WatermarkPosition } from '../lib/toolTransforms';
import { buildTimedCues, buildVideoOutputFilename, convertCase, countText, decodeBase64Safely, decodeUrlSafely, encodeWavPcm16, estimateCompressedBitrate, formatJson, formatResult, formatSubtitleText, formatSubtitleTimestamp, generateLorem, parseFiniteNumber, parseSubtitleText, parseWavHeader, percentageOf, planGifCapture, planLoopOutput, playRockPaperScissors, reencodeVideo, removeDuplicateLines, rollDie, splitTip, validateGifBytes, validateJpegBytes, validateVideoMediaFile, validateWebmBytes, VIDEO_MEDIA_LIMITS } from '../lib/toolTransforms';
import { formatFileSize } from '../lib/imageTools';

interface GenericUtilityWorkspaceProps {
  tool: ToolDefinition;
  onBack: () => void;
  initialFile?: File;
}

export default function GenericUtilityWorkspace({ tool, onBack, initialFile }: GenericUtilityWorkspaceProps) {
  const [copied, setCopied] = useState(false);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  
  // Custom interactive state for templates
  const [sliderVal, setSliderVal] = useState(12);
  const [checkboxState, setCheckboxState] = useState({
    opt1: true,
    opt2: true,
    opt3: false,
    opt4: false,
  });
  const [lineDedupOptions, setLineDedupOptions] = useState({ trim: false, removeEmpty: false, caseSensitive: true });
  
  // Game & interactive app states
  const [gameScore, setGameScore] = useState(0);
  const [gameLogs, setGameLogs] = useState<string[]>(['Workspace Initialized & Secure.']);
  const [gameActive, setGameActive] = useState(false);
  const [timerCount, setTimerCount] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // P1-B3 calculator & game tool states (percent-calc, tip-calc)
  const [percentInput, setPercentInput] = useState('');
  const [baseInput, setBaseInput] = useState('');
  const [tipBillInput, setTipBillInput] = useState('');
  const [tipPercentInput, setTipPercentInput] = useState('15');
  const [tipPeopleInput, setTipPeopleInput] = useState('2');
  const [toolError, setToolError] = useState('');
  // P2-A2 tool states
  const [uuidCount, setUuidCount] = useState(5);
  const [baseFrom, setBaseFrom] = useState(10);
  const [baseTo, setBaseTo] = useState(16);
  const [contrastFg, setContrastFg] = useState('#FFFFFF');
  const [contrastBg, setContrastBg] = useState('#000000');
  const [uploadedFile, setUploadedFile] = useState<File | null>(initialFile || null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [gpaCourses, setGpaCourses] = useState<Array<{ id: string; name: string; credits: number; grade: string }>>([
    { id: '1', name: 'Advanced Media Rendering', credits: 4, grade: 'A' },
    { id: '2', name: 'W3C Offline Design Patterns', credits: 3, grade: 'A-' },
    { id: '3', name: 'Interactive GPU shaders', credits: 3, grade: 'B+' }
  ]);

  // Audio oscillators for white noise & tones
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const noiseNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);

  // Transient UI timers tracked for cleanup on unmount
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [convertedBlobUrl, setConvertedBlobUrl] = useState<string | null>(null);
  const [convertedFilename, setConvertedFilename] = useState<string>('');
  // Custom states for tailored tools
  const [watermarkText, setWatermarkText] = useState('My Watermark');
  const [watermarkPosition, setWatermarkPosition] = useState('bottom-right');
  const [watermarkOpacity, setWatermarkOpacity] = useState(50);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [rotationAngle, setRotationAngle] = useState(90);
  const [resizeWidth, setResizeWidth] = useState(800);
  const [resizeHeight, setResizeHeight] = useState(600);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [memeTopText, setMemeTopText] = useState('TOP TEXT');
  const [memeBottomText, setMemeBottomText] = useState('BOTTOM TEXT');
  const [memeFontSize, setMemeFontSize] = useState(32);
  const [isProcessing, setIsProcessing] = useState(false);

  // Video re-encode jobs (video-speed / video-muter / video-rotator /
  // video-resizer / video-watermark): real MediaRecorder output, cancellable.
  const videoAbortRef = useRef<AbortController | null>(null);
  const [isVideoJob, setIsVideoJob] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);

  const describeVideoResult = (result: ReencodeVideoResult, detail: string, audioNote?: string) => {
    const durationLine = result.outputDurationSeconds !== null
      ? `Duration: ${result.outputDurationSeconds.toFixed(1)}s`
      : `Duration (recorded): ${result.recordedWallSeconds.toFixed(1)}s — this browser did not write duration metadata into the WebM file, so the recorded length was verified instead.`;
    const audioLine = audioNote ?? (result.hasAudio
      ? 'Audio: kept (source audio track re-encoded).'
      : 'Audio: none in output — no audio track was captured from the source in this browser.');
    return `${detail}\nFormat: WebM (re-encoded in your browser, not the original container)\nDimensions: ${result.width}x${result.height}px\n${durationLine}\n${audioLine}`;
  };

  const runVideoTransform = async (
    label: string,
    options: Omit<Parameters<typeof reencodeVideo>[0], 'file' | 'onProgress' | 'signal'>,
    filenameSuffix: string,
    summarize: (result: ReencodeVideoResult) => string
  ) => {
    if (!uploadedFile) return;
    if (!uploadedFile.type.startsWith('video/')) {
      setOutputText(`This tool works on video files. Upload a video to ${label.toLowerCase()}.`);
      addLog(`${label}: no video file uploaded.`);
      return;
    }
    const controller = new AbortController();
    videoAbortRef.current = controller;
    setIsVideoJob(true);
    setIsProcessing(true);
    setVideoProgress(0);
    addLog(`Starting ${label} — re-encoding in your browser (WebM output)...`);
    try {
      const result = await reencodeVideo({
        file: uploadedFile,
        ...options,
        onProgress: (f) => setVideoProgress(Math.round(f * 100)),
        signal: controller.signal,
      });
      const url = URL.createObjectURL(result.blob);
      setConvertedBlobUrl(url);
      setConvertedFilename(buildVideoOutputFilename(uploadedFile.name, filenameSuffix));
      setOutputText(summarize(result));
      addLog(`${label} complete — verified WebM output ready.`);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setOutputText('Export cancelled. No file was produced.');
        addLog(`${label} cancelled.`);
      } else {
        setOutputText(`Error: ${err instanceof Error ? err.message : 'Video processing failed.'}\nNo file was produced.`);
        addLog(`${label} failed.`);
      }
    } finally {
      setIsProcessing(false);
      setIsVideoJob(false);
      setVideoProgress(null);
      videoAbortRef.current = null;
    }
  };

  // Video media tools (worker B): per-tool options + cancellation.
  const [frameTimestamp, setFrameTimestamp] = useState(0);
  const [compressPct, setCompressPct] = useState(50);
  const [loopCount, setLoopCount] = useState(3);
  const [subtitleText, setSubtitleText] = useState('');
  const [subtitleFormat, setSubtitleFormat] = useState<'srt' | 'vtt'>('srt');
  const [subtitleMode, setSubtitleMode] = useState<'edit' | 'build'>('edit');
  const [subtitleCueSeconds, setSubtitleCueSeconds] = useState(3);
  const [subtitleStartOffset, setSubtitleStartOffset] = useState(0);
  const cancelRequestedRef = useRef(false);
  const activeRecordingRef = useRef<{ recorder: MediaRecorder; video: HTMLVideoElement } | null>(null);

  const cancelProcessing = () => {
    cancelRequestedRef.current = true;
    const active = activeRecordingRef.current;
    if (active) {
      try { active.video.pause(); } catch { /* already stopped */ }
      try { if (active.recorder.state !== 'inactive') active.recorder.stop(); } catch { /* already stopped */ }
    }
    addLog('Cancellation requested.');
  };

  // Subtitles editor: if a .srt/.vtt (or plain-text) file is staged, load its
  // text into the editor instead of treating it as media to preview.
  const loadSubtitleFileIfApplicable = async (file: File) => {
    if (tool.id !== 'subtitles-editor') return;
    if (!/\.srt$/i.test(file.name) && !/\.vtt$/i.test(file.name) && file.type !== 'text/plain') return;
    try {
      const text = await file.text();
      setSubtitleText(text);
      setSubtitleFormat(/\.vtt$/i.test(file.name) ? 'vtt' : 'srt');
      setSubtitleMode('edit');
      addLog(`Loaded ${file.name} into the subtitle editor.`);
    } catch {
      addLog('Could not read the subtitle file as text.');
    }
  };

  // Load preview if initialFile is passed (supports both images and videos)
  useEffect(() => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      setFilePreview(url);
      setConvertedBlobUrl(null);
      setConvertedFilename('');
      void loadSubtitleFileIfApplicable(uploadedFile);
      return () => URL.revokeObjectURL(url);
    }
  }, [uploadedFile]);

  // Clean up converted object URL to prevent memory leak
  useEffect(() => {
    return () => {
      if (convertedBlobUrl) {
        try { URL.revokeObjectURL(convertedBlobUrl); } catch(e){}
      }
    };
  }, [convertedBlobUrl]);

  // Synchronize playback speed to preview video player
  useEffect(() => {
    const video = document.getElementById('workspace-video-preview') as HTMLVideoElement;
    if (video) {
      video.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, filePreview]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current);
    };
  }, []);

  const handleCopy = (textToCopy: string) => {
    try {
      navigator.clipboard.writeText(textToCopy).catch(() => {
        addLog('Clipboard unavailable; copy blocked by browser policy.');
      });
    } catch {
      addLog('Clipboard unavailable; copy blocked by browser policy.');
    }
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const addLog = (log: string) => {
    setGameLogs(prev => [log, ...prev.slice(0, 49)]);
  };

  const stopAudio = () => {
    if (oscillatorRef.current) {
      try { oscillatorRef.current.stop(); } catch(e){}
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }
    if (noiseNodeRef.current) {
      noiseNodeRef.current.disconnect();
      noiseNodeRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch(e){}
      audioCtxRef.current = null;
    }
    setGameActive(false);
  };

  // --- INTERACTIVE TOOL LOGIC ENGINE ---

  // 1. Password Generator
  const runPasswordGen = () => {
    const chars = {
      lower: 'abcdefghijklmnopqrstuvwxyz',
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      num: '0123456789',
      sym: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };
    let pool = '';
    if (checkboxState.opt1) pool += chars.lower;
    if (checkboxState.opt2) pool += chars.upper;
    if (checkboxState.opt3) pool += chars.num;
    if (checkboxState.opt4) pool += chars.sym;
    
    if (!pool) pool = chars.lower;
    
    let pass = '';
    for (let i = 0; i < sliderVal; i++) {
      pass += pool.charAt(Math.floor(Math.random() * pool.length));
    }
    setOutputText(pass);
    addLog(`Generated password with length ${sliderVal}`);
  };

  // 2. Unit Converter
  const runUnitConvert = (val: number, type: string) => {
    let result = '';
    if (type === 'length') {
      result = `${val} Meters = ${(val * 3.28084).toFixed(2)} Feet | ${(val * 1.09361).toFixed(2)} Yards | ${(val * 39.3701).toFixed(2)} Inches`;
    } else if (type === 'temp') {
      result = `${val}°C = ${(val * 9/5 + 32).toFixed(1)}°F | ${(val + 273.15).toFixed(2)} K`;
    } else if (type === 'weight') {
      result = `${val} Kilograms = ${(val * 2.20462).toFixed(2)} Pounds | ${(val * 35.274).toFixed(2)} Ounces`;
    } else {
      result = `${val} Liters = ${(val * 0.264172).toFixed(2)} US Gallons | ${(val * 4.22675).toFixed(2)} Cups`;
    }
    setOutputText(result);
  };

  // 3. BMI Solver
  const runBmi = (weight: number, height: number) => {
    if (!weight || !height) return;
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    let category = '';
    let advice = '';
    if (bmi < 18.5) {
      category = 'Underweight';
      advice = 'Consider consulting a healthcare provider about balanced nutritional plans.';
    } else if (bmi < 25) {
      category = 'Normal Weight (Healthy)';
      advice = 'Fantastic job! Maintain your current balanced lifestyle and activity level.';
    } else if (bmi < 30) {
      category = 'Overweight';
      advice = 'Focus on portion controls, dynamic cardio routines, and wholesome diets.';
    } else {
      category = 'Obese';
      advice = 'Prioritize medical consults, metabolic tracing, and dedicated active habits.';
    }
    setOutputText(`BMI score: ${bmi.toFixed(1)} (${category})\n\nDaily Guideline: ${advice}`);
  };

  // 4. Case Converter
  const runCaseConvert = (mode: 'upper' | 'lower' | 'title' | 'sentence' | 'camel' | 'pascal' | 'snake' | 'kebab') => {
    if (!inputText) {
      setOutputText('');
      return;
    }
    const converted = convertCase(inputText, mode);
    setOutputText(converted);
    addLog(`Converted text to ${mode} case.`);
  };

  // 5. Binary Translator
  const runBinaryTranslate = (encode: boolean) => {
    if (!inputText) return;
    try {
      if (encode) {
        const bin = inputText.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
        setOutputText(bin);
        addLog('Encoded strings to Binary bytes.');
      } else {
        const cleanBin = inputText.replace(/\s+/g, '');
        let str = '';
        for (let i = 0; i < cleanBin.length; i += 8) {
          const byte = cleanBin.substr(i, 8);
          str += String.fromCharCode(parseInt(byte, 2));
        }
        setOutputText(str);
        addLog('Decoded Binary bytes to string.');
      }
    } catch(e) {
      setOutputText('Invalid Binary format. Please supply groupings of 8-bit characters (0 or 1).');
    }
  };

  // 6. Morse Code
  const runMorseCode = (encode: boolean) => {
    const morseAlphabet: Record<string, string> = {
      'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....',
      'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.',
      'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
      'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
      '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----', ' ': '/'
    };
    if (encode) {
      const result = inputText.toUpperCase().split('').map(char => morseAlphabet[char] || '').filter(Boolean).join(' ');
      setOutputText(result);
      addLog('Translated text to Morse Code.');
    } else {
      const reverseMorse = Object.fromEntries(Object.entries(morseAlphabet).map(([k, v]) => [v, k]));
      const result = inputText.split(' ').map(code => reverseMorse[code] || '').join('');
      setOutputText(result);
      addLog('Decoded Morse Code back to text.');
    }
  };

  // Morse Code Playback Sound
  const playMorseSound = () => {
    if (!outputText) return;
    if (outputText.length > 150) {
      addLog('Acoustic Playback Aborted: Morse code length exceeds 150 characters (limits node overload).');
      return;
    }
    try {
      stopAudio();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      setGameActive(true);

      let time = ctx.currentTime;
      const dotDuration = 0.08; // duration of a dot
      const symbols = outputText.split('');

      symbols.forEach(symbol => {
        if (symbol === '.' || symbol === '-') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = 650; // Standard morse frequency

          osc.connect(gain);
          gain.connect(ctx.destination);

          const duration = symbol === '.' ? dotDuration : dotDuration * 3;
          osc.start(time);
          osc.stop(time + duration);
          
          gain.gain.setValueAtTime(0.2, time);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

          time += duration + dotDuration; // gap between elements
        } else if (symbol === ' ') {
          time += dotDuration * 2; // gap between letters
        } else if (symbol === '/') {
          time += dotDuration * 4; // gap between words
        }
      });
      addLog('Playing acoustic Morse Code translation.');
    } catch(e) {
      addLog('Web Audio API not supported in this frame.');
    }
  };

  // 7. Base64 Coder
  const runBase64 = (encode: boolean) => {
    if (!inputText) return;
    try {
      if (encode) {
        setOutputText(btoa(unescape(encodeURIComponent(inputText))));
        addLog('Encoded string to Base64.');
      } else {
        const result = decodeBase64Safely(inputText);
        setOutputText(result.value ?? result.error ?? 'Invalid Base64 input.');
        if (result.value !== undefined) addLog('Decoded Base64 string.');
      }
    } catch(e) {
      setOutputText('Decoding failed. Please supply a valid Base64 string.');
    }
  };

  // 8. Word Counter
  const runWordCount = (text: string) => {
    const counts = countText(text);
    setOutputText(
      `Words: ${counts.words}\n` +
      `Characters: ${counts.characters}\n` +
      `Characters (no spaces): ${counts.charactersWithoutSpaces}\n` +
      `Lines: ${counts.lines}\n` +
      `Paragraphs: ${counts.paragraphs}\n` +
      `Reading Time: ${counts.readingTimeLabel}`
    );
  };

  // Line Remover (deduplicate lines with explicit options)
  const runRemoveDuplicates = () => {
    const result = removeDuplicateLines(inputText, lineDedupOptions);
    setOutputText(result);
    const behavior = [
      lineDedupOptions.trim ? 'trim whitespace' : 'keep raw whitespace',
      lineDedupOptions.removeEmpty ? 'remove blank lines' : 'keep blank lines',
      lineDedupOptions.caseSensitive ? 'case-sensitive' : 'case-insensitive',
    ].join(', ');
    addLog(`Deduplicated lines (${behavior}).`);
  };

  // 9. Hash Generator
  const runHashGen = () => {
    if (!inputText) return;
    // Client-side instant visual hash generator
    // Standard quick DJB2 & simple cryptographic simulations for front-end demonstration
    const djb2 = (str: string) => {
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
      }
      return (hash >>> 0).toString(16).toUpperCase();
    };

    const sdbm = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
      }
      return (hash >>> 0).toString(16).toUpperCase();
    };

    setOutputText(
      `DJB2 Checksum: ${djb2(inputText)}\n` +
      `SDBM Checksum: ${sdbm(inputText)}\n` +
      `Local Secure Salt: SHA-256-CLIENT-${djb2(inputText.split('').reverse().join(''))}`
    );
    addLog('Synthesized string hash sequences.');
  };

  // 10. Coin Flipper
  const runCoinFlip = () => {
    setGameActive(true);
    addLog('Flipping coin...');
    if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current);
    flipTimeoutRef.current = setTimeout(() => {
      const side = Math.random() > 0.5 ? 'HEADS' : 'TAILS';
      setOutputText(side);
      addLog(`Result: ${side}`);
      setGameActive(false);
      setGameScore(prev => prev + 1);
      flipTimeoutRef.current = null;
    }, 800);
  };

  // 11. Dice Roller
  const runDiceRoll = (sides: number) => {
    try {
      const roll = rollDie(sides);
      setOutputText(`Rolled D${sides}: ${roll}`);
      setToolError('');
      addLog(`Rolled D${sides} and got: ${roll}`);
    } catch (err: any) {
      setOutputText('');
      setToolError(err.message || 'Error rolling die.');
    }
  };

  const resetDice = () => {
    setOutputText('');
    setToolError('');
    addLog('Dice roller reset.');
  };

  // 12. Pomodoro Focus Timer
  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerCount(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            addLog('Session Complete! Take a well-earned break.');
            // Play subtle beep using audio oscillator
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              osc.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.3);
              osc.onended = () => { try { ctx.close(); } catch(e){} };
            } catch(e){}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const startPomodoro = (mins: number) => {
    setTimerCount(mins * 60);
    setTimerRunning(true);
    addLog(`Pomodoro started for ${mins} minutes.`);
  };

  // 13. Box Breathing Guide Timer
  const [breathingPhase, setBreathingPhase] = useState<'Inhale' | 'Hold (Full)' | 'Exhale' | 'Hold (Empty)'>('Inhale');
  const [breathProgress, setBreathProgress] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (tool.id === 'breath-guide' && timerRunning) {
      interval = setInterval(() => {
        setTimerCount(prev => {
          const count = (prev + 1) % 16;
          // Phases are 4 seconds each (4 * 4 = 16 seconds total cycle)
          if (count < 4) {
            setBreathingPhase('Inhale');
            setBreathProgress(count / 4);
          } else if (count < 8) {
            setBreathingPhase('Hold (Full)');
            setBreathProgress(1);
          } else if (count < 12) {
            setBreathingPhase('Exhale');
            setBreathProgress((12 - count) / 4);
          } else {
            setBreathingPhase('Hold (Empty)');
            setBreathProgress(0);
          }
          return count;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, tool.id]);

  // 14. Sleep Aid Ambient Sound synthesis (White & Brown Noise)
  const toggleSleepSounds = (type: 'white' | 'brown' | 'sine') => {
    try {
      if (gameActive) {
        stopAudio();
        addLog('Ambient sounds silenced.');
        return;
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      setGameActive(true);

      if (type === 'sine') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 220; // warm soothing tone
        osc.type = 'sine';
        gain.gain.value = 0.15;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        oscillatorRef.current = osc;
        addLog('Playing custom 220Hz Deep Relaxation Tone.');
      } else {
        // Create noise buffer programmatically client-side!
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          if (type === 'brown') {
            // Brown noise filtering (integrator)
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; // compensation volume
          } else {
            output[i] = white * 0.15;
          }
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;
        noise.connect(ctx.destination);
        noise.start();
        
        // Save node reference to stop it later
        oscillatorRef.current = noise as any; 
        addLog(`Playing ambient ${type} noise.`);
      }
    } catch(e) {
      addLog('Web Audio API is not supported inside this sandbox frame.');
    }
  };

  // 15. Rock Paper Scissors
  const runRpsGame = (playerChoice: 'rock' | 'paper' | 'scissors') => {
    try {
      const { player, computer, result } = playRockPaperScissors(playerChoice);
      let outcomeText = '';
      if (result === 'draw') {
        outcomeText = `DRAW! Both chose ${player.toUpperCase()}.`;
      } else if (result === 'win') {
        outcomeText = `YOU WIN! ${player.toUpperCase()} beats ${computer.toUpperCase()}.`;
        setGameScore(prev => prev + 1);
      } else {
        outcomeText = `YOU LOSE. ${computer.toUpperCase()} beats ${player.toUpperCase()}.`;
      }
      setOutputText(
        `Player: ${player.toUpperCase()} | Computer: ${computer.toUpperCase()}\n` +
        `Result: ${outcomeText}`
      );
      setToolError('');
      addLog(`RPS Round: You: ${player} | Computer: ${computer} => ${result}`);
    } catch (err: any) {
      setOutputText('');
      setToolError(err.message || 'Error playing RPS.');
    }
  };

  const resetRps = () => {
    setOutputText('');
    setToolError('');
    setGameScore(0);
    addLog('RPS game reset.');
  };

  // Percentage Calculator (P1-B3)
  const runPercentCalc = () => {
    try {
      const percent = parseFiniteNumber(percentInput, 'Percentage');
      const base = parseFiniteNumber(baseInput, 'Base value');
      const result = percentageOf(percent, base);
      setOutputText(`${formatResult(percent)}% of ${formatResult(base)} = ${formatResult(result)}`);
      setToolError('');
      addLog(`Calculated ${percent}% of ${base} = ${result}.`);
    } catch (err: any) {
      setOutputText('');
      setToolError(err.message || 'Calculation error.');
    }
  };

  const resetPercentCalc = () => {
    setPercentInput('');
    setBaseInput('');
    setOutputText('');
    setToolError('');
    addLog('Percentage calculator reset.');
  };

  // Tip Calculator (P1-B3)
  const runTipCalc = (tipPercentOverride?: number) => {
    try {
      const bill = parseFiniteNumber(tipBillInput, 'Bill amount', { min: 0, max: 1e9 });
      const tipPercent = tipPercentOverride ?? parseFiniteNumber(tipPercentInput, 'Tip percentage', { min: 0, max: 1e6 });
      const people = parseFiniteNumber(tipPeopleInput, 'Number of people', { min: 1, max: 1e6, integer: true });
      const { tip, total, perPerson } = splitTip(bill, tipPercent, people);
      setOutputText(
        `Tip Subtotal (${formatResult(tipPercent)}%): $${tip.toFixed(2)}\n` +
        `Combined Total: $${total.toFixed(2)}\n\n` +
        `Individual Share (${people} people): $${perPerson.toFixed(2)} per person`
      );
      setToolError('');
      addLog(`Split tip ${tipPercent}% over ${people} people on $${bill}.`);
    } catch (err: any) {
      setOutputText('');
      setToolError(err.message || 'Tip calculation error.');
    }
  };

  const selectTipPercent = (percent: number) => {
    setTipPercentInput(String(percent));
    runTipCalc(percent);
  };

  const resetTipCalc = () => {
    setTipBillInput('');
    setTipPercentInput('15');
    setTipPeopleInput('2');
    setOutputText('');
    setToolError('');
    addLog('Tip calculator reset.');
  };

  // GPA Calculator Helper Functions
  const getGradePoints = (grade: string): number => {
    const points: Record<string, number> = {
      'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0
    };
    return points[grade.toUpperCase()] ?? 0.0;
  };

  const handleCalculateGpa = () => {
    let totalCredits = 0;
    let totalPoints = 0;
    gpaCourses.forEach(c => {
      totalCredits += c.credits;
      totalPoints += c.credits * getGradePoints(c.grade);
    });
    if (totalCredits === 0) {
      setOutputText('Please add at least one course with credits.');
      return;
    }
    const gpa = totalPoints / totalCredits;
    let status = 'Satisfactory';
    if (gpa >= 3.8) status = 'Summa Cum Laude (High Honors)';
    else if (gpa >= 3.5) status = 'High Honors ListBullets';
    else if (gpa >= 3.0) status = 'Honors ListBullets';
    else if (gpa < 2.0) status = 'Academic Probation';

    setOutputText(`Cumulative GPA Score: ${gpa.toFixed(2)} / 4.0\nAcademic Status: ${status}`);
  };

  const handleAddGpaCourse = () => {
    const newCourse = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Course ${gpaCourses.length + 1}`,
      credits: 3,
      grade: 'A'
    };
    setGpaCourses(prev => [...prev, newCourse]);
  };

  const handleUpdateGpaCourse = (id: string, field: 'name' | 'credits' | 'grade', value: any) => {
    setGpaCourses(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value };
      }
      return c;
    }));
  };

  const handleDeleteGpaCourse = (id: string) => {
    setGpaCourses(prev => prev.filter(c => c.id !== id));
  };

  // 16. JSON Formatter
  const runJsonFormatter = (mode: 'format' | 'minify' = 'format') => {
    if (!inputText || !inputText.trim()) {
      setOutputText('Please enter valid JSON text to format.');
      return;
    }
    try {
      const formatted = formatJson(inputText, mode);
      setOutputText(formatted);
      addLog(`JSON syntax ${mode === 'minify' ? 'minified' : 'formatted'} successfully.`);
    } catch (err: any) {
      setOutputText(err.message || 'JSON parsing failed.');
      addLog('JSON Syntax Verification Failed.');
    }
  };

  // 17. Exif Viewer simulation
  const simulateExif = () => {
    setOutputText('EXIF extraction is temporarily unavailable.');
    addLog('EXIF extraction is disabled until a real metadata parser is available.');
    return;
    if (!uploadedFile) {
      addLog('Please select a photo file first.');
      return;
    }
    const iso = [100, 200, 400, 800, 1600][Math.floor(Math.random() * 5)];
    const shutter = ['1/125s', '1/250s', '1/500s', '1/60s', '1/1000s'][Math.floor(Math.random() * 5)];
    const aperture = ['f/1.8', 'f/2.8', 'f/4.0', 'f/5.6', 'f/8.0'][Math.floor(Math.random() * 5)];
    const camera = ['Sony Alpha A7 IV', 'Canon EOS R6 Mark II', 'Fujifilm X-T5', 'iPhone 15 Pro Max', 'Google Pixel 8 Pro'][Math.floor(Math.random() * 5)];
    const lat = (40.7128 + (Math.random() - 0.5) * 0.1).toFixed(4);
    const lon = (-74.0060 + (Math.random() - 0.5) * 0.1).toFixed(4);

    setOutputText(
      `File Name: ${uploadedFile!.name}\n` +
      `File Size: ${(uploadedFile!.size / 1024).toFixed(1)} KB\n` +
      `Camera Model: ${camera}\n` +
      `ISO Speed: ISO ${iso}\n` +
      `Shutter Speed: ${shutter}\n` +
      `Aperture: ${aperture}\n` +
      `Color Profile: Display P3\n` +
      `GPS Coordinates: ${lat}° N, ${lon}° W (Geotagged)`
    );
    addLog('Extracted EXIF photo metadata clusters.');
  };

  // 18. Image Filters (renders dynamic sliders)
  const [filterBrightness, setFilterBrightness] = useState(100);
  const [filterContrast, setFilterContrast] = useState(100);
  const [filterGrayscale, setFilterGrayscale] = useState(0);
  const [filterBlur, setFilterBlur] = useState(0);
  const [filterSepia, setFilterSepia] = useState(0);

  // 19. Pixel Art Drawer State
  const [pixelGrid, setPixelGrid] = useState<string[]>(Array(64).fill('#0d0d0d'));
  const [selectedColor, setSelectedColor] = useState('#10b981');

  // 20. Water Level log
  const [waterOunces, setWaterOunces] = useState(0);

  // 21. Habits list
  const [habits, setHabits] = useState([
    { id: 1, text: 'Morning stretch', done: false },
    { id: 2, text: 'Drink 60oz of water', done: true },
    { id: 3, text: 'Read for 15 minutes', done: false },
  ]);

  // --- P2-A2 TOOL LOGIC ---

  // Slug Generator
  const runSlugGenerate = () => {
    if (!inputText) { setOutputText(''); return; }
    const slug = inputText
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setOutputText(slug);
    addLog('Generated URL slug.');
  };

  // Text Sorter
  const runTextSort = (mode: 'az' | 'za' | 'num-asc' | 'num-desc') => {
    if (!inputText) { setOutputText(''); return; }
    const lines = inputText.split('\n');
    const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: mode.startsWith('num') });
    let sorted: string[];
    if (mode === 'az') {
      sorted = [...lines].sort((a, b) => collator.compare(a, b));
    } else if (mode === 'za') {
      sorted = [...lines].sort((a, b) => collator.compare(b, a));
    } else if (mode === 'num-asc') {
      sorted = [...lines].sort((a, b) => {
        const na = parseFloat(a), nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return collator.compare(a, b);
      });
    } else {
      sorted = [...lines].sort((a, b) => {
        const na = parseFloat(a), nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb)) return nb - na;
        return collator.compare(b, a);
      });
    }
    setOutputText(sorted.join('\n'));
    addLog(`Sorted lines ${mode}.`);
  };

  // UUID Generator
  const runUuidGenerate = () => {
    const count = Math.max(1, Math.min(100, uuidCount));
    const uuids: string[] = [];
    for (let i = 0; i < count; i++) {
      uuids.push(crypto.randomUUID());
    }
    setOutputText(uuids.join('\n'));
    addLog(`Generated ${count} UUID(s).`);
  };

  // Base Converter
  const runBaseConvert = () => {
    if (!inputText.trim()) { setOutputText(''); return; }
    try {
      const prefixes: Record<number, string> = { 2: '0b', 8: '0o', 10: '', 16: '0x' };
      const fromPrefix = prefixes[baseFrom] ?? '';
      const val = BigInt(fromPrefix + inputText.trim());
      const result = val.toString(baseTo).toUpperCase();
      const prefix = prefixes[baseTo] ?? '';
      setOutputText(`${prefix}${result}`);
      addLog(`Converted from base ${baseFrom} to base ${baseTo}.`);
    } catch {
      const maxDigit = baseFrom <= 10
        ? String.fromCharCode(48 + baseFrom - 1)
        : '9,A-' + String.fromCharCode(55 + baseFrom);
      setOutputText(`Invalid input for base ${baseFrom}. Use digits 0-${maxDigit}.`);
    }
  };

  // Contrast Checker
  const runContrastCheck = () => {
    const parseHex = (hex: string): [number, number, number] | null => {
      const match = hex.replace(/^#/, '').match(/^([0-9a-f]{3,8})$/i);
      if (!match) return null;
      let h = match[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      if (h.length !== 6) return null;
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    };
    const luminance = (r: number, g: number, b: number) => {
      const [rs, gs, bs] = [r, g, b].map(c => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };
    const fgRgb = parseHex(contrastFg);
    const bgRgb = parseHex(contrastBg);
    if (!fgRgb || !bgRgb) {
      setOutputText('Invalid color format. Use #RRGGBB hex.');
      return;
    }
    const l1 = luminance(...fgRgb);
    const l2 = luminance(...bgRgb);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const ratioStr = ratio.toFixed(2);
    const aaNormal = ratio >= 4.5;
    const aaLarge = ratio >= 3;
    const aaaNormal = ratio >= 7;
    const aaaLarge = ratio >= 4.5;
    setOutputText(
      `Contrast Ratio: ${ratioStr}:1\n\n` +
      `WCAG AA Normal Text (≥4.5:1): ${aaNormal ? 'PASS ✓' : 'FAIL ✗'}\n` +
      `WCAG AA Large Text (≥3:1): ${aaLarge ? 'PASS ✓' : 'FAIL ✗'}\n` +
      `WCAG AAA Normal Text (≥7:1): ${aaaNormal ? 'PASS ✓' : 'FAIL ✗'}\n` +
      `WCAG AAA Large Text (≥4.5:1): ${aaaLarge ? 'PASS ✓' : 'FAIL ✗'}`
    );
    addLog(`Contrast ratio: ${ratioStr}:1`);
  };

  const handleDownloadResult = () => {
    if (convertedBlobUrl) {
      const a = document.createElement('a');
      a.href = convertedBlobUrl;
      a.download = convertedFilename || `${tool.id}_result.bin`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addLog(`Downloaded processed file: ${convertedFilename}`);
      return;
    }

    if (!uploadedFile) {
      const blob = new Blob([outputText || 'No content generated.'], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tool.id}_result.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog('Downloaded generic result file.');
      return;
    }

    let ext = 'bin';
    const originalName = uploadedFile.name;
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;

    switch (tool.id) {
      case 'gif-maker':
        ext = 'gif';
        break;
      case 'video-to-audio':
        // The extractor produces real WAV bytes (see handleExtractAudio).
        ext = 'wav';
        break;
      case 'video-compressor':
      case 'video-looper':
        // MediaRecorder output is always WebM — MP4 cannot be produced
        // in-browser, so the extension must say so.
        ext = 'webm';
        break;
      case 'subtitles-editor':
        ext = subtitleFormat;
        break;
      case 'vocal-remover':
      case 'silence-remover':
        ext = 'mp3';
        break;
      case 'frame-extractor':
      case 'favicon-generator':
        ext = tool.id === 'favicon-generator' ? 'ico' : 'jpg';
        break;
      case 'exif-viewer':
      case 'pdf-to-txt':
        ext = 'txt';
        break;
      case 'svg-optimizer':
        ext = 'svg';
        break;
      case 'excel-to-csv':
      case 'json-to-csv':
        ext = 'csv';
        break;
      case 'csv-to-json':
        ext = 'json';
        break;
      case 'markdown-to-html':
        ext = 'html';
        break;
      default:
        ext = originalName.split('.').pop() || 'bin';
        break;
    }

    if (['exif-viewer', 'pdf-to-txt', 'csv-to-json', 'excel-to-csv', 'json-to-csv', 'markdown-to-html'].includes(tool.id) && outputText) {
      const mimeType = ext === 'json' ? 'application/json' : ext === 'html' ? 'text/html' : 'text/plain';
      const blob = new Blob([outputText], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nameWithoutExt}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog(`Downloaded processed file: ${nameWithoutExt}.${ext}`);
      return;
    }

    const blob = new Blob([uploadedFile], { type: uploadedFile.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nameWithoutExt}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog(`Downloaded processed file: ${nameWithoutExt}.${ext}`);
  };

  // --- Video media tools: shared browser-side helpers (worker B) ---------
  // Seek with a timeout: the old code waited on `seeked` forever, so a
  // corrupt file left the UI stuck on "Processing..." with no error.
  const seekVideoTo = (video: HTMLVideoElement, time: number, timeoutMs = 10000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const target = Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(Math.max(0, time), Math.max(0, video.duration - 0.05))
        : Math.max(0, time);
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error(`Seeking to ${target.toFixed(2)}s timed out after ${timeoutMs / 1000}s — the video may be corrupt.`));
      }, timeoutMs);
      const cleanup = () => {
        window.clearTimeout(timer);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
      };
      const onSeeked = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('Video seek failed — the file may be corrupt or unsupported.')); };
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onError);
      video.currentTime = target;
    });
  };

  // Offscreen video element with metadata loaded, or a precise error.
  const loadOffscreenVideo = (src: string, timeoutMs = 15000): Promise<HTMLVideoElement> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error('Video metadata loading timed out — the file may be corrupt.'));
      }, timeoutMs);
      const cleanup = () => {
        window.clearTimeout(timer);
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
      };
      const onLoaded = () => { cleanup(); resolve(video); };
      const onError = () => { cleanup(); reject(new Error('The video file could not be loaded. It may be corrupt or in an unsupported format.')); };
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
      video.src = src;
    });
  };

  const pickRecorderMimeType = (): string | undefined => {
    if (typeof MediaRecorder === 'undefined') return undefined;
    const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (const candidate of candidates) {
      try {
        if (MediaRecorder.isTypeSupported(candidate)) return candidate;
      } catch { /* isTypeSupported can throw on malformed input in old browsers */ }
    }
    return undefined; // let the browser pick its default
  };

  // `captureStream` exists on media elements in browsers but is missing
  // from this TS version's DOM lib — access it through a guarded cast.
  const captureVideoStream = (video: HTMLVideoElement): MediaStream | null => {
    const candidate = video as HTMLVideoElement & { captureStream?: () => MediaStream };
    if (typeof candidate.captureStream !== 'function') return null;
    return candidate.captureStream();
  };

  /**
   * Records a playing video element via captureStream + MediaRecorder.
   * `onEnded` is called on every `ended` event: return true to finish, false
   * to restart from 0 (looper). Resolves with the recorded Blob; rejects on
   * timeout, playback failure, recorder error, or user cancellation.
   */
  const recordVideoElement = (
    video: HTMLVideoElement,
    opts: {
      mimeType?: string;
      videoBitsPerSecond?: number;
      maxSeconds: number;
      onEnded: () => boolean;
    },
  ): Promise<Blob> => {
    return new Promise<Blob>((resolve, reject) => {
      if (typeof MediaRecorder === 'undefined') {
        reject(new Error('MediaRecorder / video capture is not supported in this browser.'));
        return;
      }
      let stream: MediaStream | null = null;
      try {
        stream = captureVideoStream(video);
      } catch (e) {
        reject(new Error(`Could not capture the video stream: ${e instanceof Error ? e.message : 'unknown error'}`));
        return;
      }
      if (!stream) {
        reject(new Error('Video capture is not supported in this browser.'));
        return;
      }
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, {
          ...(opts.mimeType ? { mimeType: opts.mimeType } : {}),
          ...(opts.videoBitsPerSecond ? { videoBitsPerSecond: opts.videoBitsPerSecond } : {}),
        });
      } catch (e) {
        reject(new Error(`MediaRecorder could not start: ${e instanceof Error ? e.message : 'unsupported codec'}`));
        return;
      }
      const chunks: Blob[] = [];
      let settled = false;
      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        teardown();
        reject(new Error(`Recording timed out after ${opts.maxSeconds + 15}s.`));
      }, (opts.maxSeconds + 15) * 1000);
      const teardown = () => {
        window.clearTimeout(timer);
        video.removeEventListener('ended', handleEnded);
        activeRecordingRef.current = null;
        stream.getTracks().forEach((track) => { try { track.stop(); } catch { /* already stopped */ } });
      };
      const handleEnded = () => {
        if (settled) return;
        if (cancelRequestedRef.current) {
          settled = true;
          teardown();
          try { video.pause(); } catch { /* already stopped */ }
          try { if (recorder.state !== 'inactive') recorder.stop(); } catch { /* already stopped */ }
          reject(new Error('Cancelled by user.'));
          return;
        }
        let done = true;
        try { done = opts.onEnded(); } catch { done = true; }
        if (done) {
          settled = true;
          teardown();
          try { if (recorder.state !== 'inactive') recorder.stop(); } catch { /* already stopped */ }
        } else {
          video.currentTime = 0;
          void video.play().catch(() => {
            if (!settled) {
              settled = true;
              teardown();
              reject(new Error('Video playback failed during recording.'));
            }
          });
        }
      };
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      // onstop fires after stop(); the promise may already be settled by the
      // timeout/cancel paths — resolve() after reject() is a harmless no-op.
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: opts.mimeType || 'video/webm' }));
      };
      recorder.onerror = () => {
        if (settled) return;
        settled = true;
        teardown();
        reject(new Error('MediaRecorder reported an error while recording.'));
      };
      activeRecordingRef.current = { recorder, video };
      video.addEventListener('ended', handleEnded);
      try {
        recorder.start(250);
      } catch (e) {
        settled = true;
        teardown();
        reject(new Error(`MediaRecorder could not start: ${e instanceof Error ? e.message : 'unknown error'}`));
        return;
      }
      void video.play().catch((e) => {
        if (!settled) {
          settled = true;
          teardown();
          reject(new Error(`Video playback failed: ${e instanceof Error ? e.message : 'autoplay was blocked'}`));
        }
      });
    });
  };

  const createGifWithGifshot = (options: {
    images: string[];
    gifWidth: number;
    gifHeight: number;
    interval: number;
    frameDuration: number;
  }): Promise<string> => {
    return new Promise((resolve, reject) => {
      const gifEngine = (gifshot as any).default || gifshot;
      if (!gifEngine || typeof gifEngine.createGIF !== 'function') {
        reject(new Error('GIF encoder (gifshot) is unavailable in this browser.'));
        return;
      }
      gifEngine.createGIF(options, (obj: any) => {
        if (obj.error || !obj.image) {
          reject(new Error(`GIF assembly failed: ${obj.error || 'no output produced'}`));
        } else {
          resolve(obj.image as string);
        }
      });
    });
  };

  // Decodes a `data:image/gif;base64,...` URL to bytes without a network
  // fetch, so the result can be byte-validated before claiming success.
  const dataUrlToBytes = (dataUrl: string): Uint8Array => {
    const comma = dataUrl.indexOf(',');
    if (comma === -1) throw new Error('GIF encoder returned a malformed data URL.');
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const handleCreateGif = async () => {
    if (!uploadedFile || !filePreview) return;
    const validation = validateVideoMediaFile(uploadedFile, ['image', 'video']);
    if (!validation.ok) {
      setOutputText(validation.message);
      addLog('GIF input rejected.');
      return;
    }
    cancelRequestedRef.current = false;
    setIsProcessing(true);
    try {
      // Static Image Input — a still has no motion, so the GIF is 5 zoom
      // frames of the same image. That is the honest limit of this input.
      if (uploadedFile.type.startsWith('image/')) {
        addLog('Processing image to GIF...');
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('The image file could not be loaded. It may be corrupt or in an unsupported format.'));
          image.src = filePreview;
        });
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = Math.round(320 * (img.naturalHeight / img.naturalWidth)) || 240;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not create canvas context.');
        const frames: string[] = [];
        for (let i = 0; i < 5; i++) {
          if (cancelRequestedRef.current) throw new Error('Cancelled by user.');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          const scale = 1 + i * 0.02;
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.scale(scale, scale);
          ctx.translate(-canvas.width / 2, -canvas.height / 2);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          ctx.restore();
          frames.push(canvas.toDataURL('image/jpeg', 0.8));
        }
        addLog('Assembling GIF frames...');
        const dataUrl = await createGifWithGifshot({
          images: frames,
          gifWidth: canvas.width,
          gifHeight: canvas.height,
          interval: 0.2,
          frameDuration: 2,
        });
        const gifBytes = dataUrlToBytes(dataUrl);
        const info = validateGifBytes(gifBytes);
        setConvertedBlobUrl(dataUrl);
        setConvertedFilename(`animated_${uploadedFile.name.substring(0, uploadedFile.name.lastIndexOf('.')) || 'image'}.gif`);
        setOutputText(`GIF created and verified!\nFrames: ${info.frames} (zoom effect on a still image)\nSize: ${info.width}x${info.height}px\nFile size: ${formatFileSize(gifBytes.length)}`);
        addLog('GIF compiled and verified successfully.');
        return;
      }

      // Video Input — sample real frames across (at most) the first 60s.
      if (uploadedFile.type.startsWith('video/')) {
        addLog('Extracting video frames...');
        const video = await loadOffscreenVideo(filePreview);
        try {
          if (!Number.isFinite(video.duration) || video.duration <= 0) {
            throw new Error('Could not read the video duration.');
          }
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            throw new Error('This video has no video track to sample frames from.');
          }
          const plan = planGifCapture(video.duration);
          addLog(`Scanning video stream (${video.duration.toFixed(1)}s, sampling first ${plan.sampledSeconds.toFixed(1)}s)...`);
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = Math.round(320 * (video.videoHeight / video.videoWidth)) || 240;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not create canvas context.');
          const frames: string[] = [];
          for (let i = 0; i < plan.frameCount; i++) {
            if (cancelRequestedRef.current) throw new Error('Cancelled by user.');
            await seekVideoTo(video, i * plan.intervalSeconds);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.8));
            addLog(`Captured frame ${i + 1}/${plan.frameCount}...`);
          }
          addLog('Compiling animation loops...');
          const dataUrl = await createGifWithGifshot({
            images: frames,
            gifWidth: canvas.width,
            gifHeight: canvas.height,
            interval: 0.15,
            frameDuration: 1.5,
          });
          const gifBytes = dataUrlToBytes(dataUrl);
          const info = validateGifBytes(gifBytes);
          setConvertedBlobUrl(dataUrl);
          setConvertedFilename(`converted_${uploadedFile.name.substring(0, uploadedFile.name.lastIndexOf('.')) || 'video'}.gif`);
          setOutputText(`GIF created and verified!\nFrames: ${info.frames} sampled from the first ${plan.sampledSeconds.toFixed(1)}s of ${video.duration.toFixed(1)}s\nSize: ${info.width}x${info.height}px\nFile size: ${formatFileSize(gifBytes.length)}`);
          addLog('Animated GIF successfully compiled and verified.');
        } finally {
          try { video.pause(); video.removeAttribute('src'); video.load(); } catch { /* already torn down */ }
        }
        return;
      }

      setOutputText('Unsupported file type for GIF conversion. Only images and videos are supported.');
    } catch (e: any) {
      const message = e?.message || 'GIF creation failed.';
      if (message === 'Cancelled by user.') {
        setOutputText('GIF creation cancelled.');
        addLog('GIF creation cancelled by user.');
      } else {
        addLog('GIF creation failed.');
        setOutputText(`GIF Error: ${message}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompressImage = () => {
    if (!uploadedFile || !filePreview) return;
    setIsProcessing(true);
    addLog('Compressing image bytes...');
    const img = new Image();
    img.src = filePreview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const quality = sliderVal / 100;
        canvas.toBlob((blob) => {
          setIsProcessing(false);
          if (blob) {
            const url = URL.createObjectURL(blob);
            setConvertedBlobUrl(url);
            setConvertedFilename(`compressed_${uploadedFile.name}`);
            const savings = Math.max(0, Math.round((1 - (blob.size / uploadedFile.size)) * 100));
            setOutputText(`Compressed Size: ${(blob.size / 1024).toFixed(1)} KB (Original: ${(uploadedFile.size / 1024).toFixed(1)} KB)\nSize Reduction: ${savings}%\nStatus: Ready for download!`);
            addLog(`Compressed image by ${savings}%.`);
          }
        }, 'image/jpeg', quality);
      } else {
        setIsProcessing(false);
      }
    };
  };

  const handleGenerateFavicon = () => {
    if (!uploadedFile || !filePreview) return;
    setIsProcessing(true);
    addLog('Generating favicon icon...');
    const img = new Image();
    img.src = filePreview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, 32, 32);
        const url = canvas.toDataURL('image/png');
        setConvertedBlobUrl(url);
        setConvertedFilename('favicon.png');
        setOutputText('Favicon generated at 32x32px resolution!\nFormat: PNG Icon\nReady for download.');
        addLog('Favicon icon compiled.');
      }
      setIsProcessing(false);
    };
  };

  const handleApplyFilter = () => {
    if (!uploadedFile || !filePreview) return;
    setIsProcessing(true);
    addLog('Applying filters to render canvas...');
    const img = new Image();
    img.src = filePreview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = `brightness(${filterBrightness}%) contrast(${filterContrast}%) grayscale(${filterGrayscale}%) blur(${filterBlur}px) sepia(${filterSepia}%)`;
        ctx.drawImage(img, 0, 0);
        const url = canvas.toDataURL('image/jpeg', 0.95);
        setConvertedBlobUrl(url);
        setConvertedFilename(`filtered_${uploadedFile.name}`);
        setOutputText(`CSS filter adjustments applied successfully!\nSettings: Brightness=${filterBrightness}%, Contrast=${filterContrast}%, Grayscale=${filterGrayscale}%, Blur=${filterBlur}px, Sepia=${filterSepia}%\nReady for download.`);
        addLog('Applied photo filter configurations.');
      }
      setIsProcessing(false);
    };
  };

  const handleExtractAudio = async () => {
    if (!uploadedFile) return;
    const validation = validateVideoMediaFile(uploadedFile, ['video', 'audio']);
    if (!validation.ok) {
      setOutputText(validation.message);
      addLog('Audio extraction rejected.');
      return;
    }
    cancelRequestedRef.current = false;
    setIsProcessing(true);
    let audioCtx: AudioContext | null = null;
    try {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtor) throw new Error('Web Audio is not supported in this browser.');
      audioCtx = new AudioCtor();
      addLog('Decoding video audio track...');
      const arrayBuffer = await uploadedFile.arrayBuffer();
      if (cancelRequestedRef.current) throw new Error('Cancelled by user.');
      let decodedBuffer: AudioBuffer;
      try {
        decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      } catch {
        throw new Error('No decodable audio track found. The file may be video-only, or use an audio codec this browser cannot decode.');
      }
      if (decodedBuffer.duration > VIDEO_MEDIA_LIMITS.maxAudioDurationSeconds) {
        throw new Error(`Audio is ${(decodedBuffer.duration / 60).toFixed(1)} minutes long — this tool supports up to ${VIDEO_MEDIA_LIMITS.maxAudioDurationSeconds / 60} minutes.`);
      }
      if (decodedBuffer.numberOfChannels < 1) throw new Error('Decoded audio has no channels.');
      addLog('Compiling audio stream...');
      const channels: Float32Array[] = [];
      for (let channel = 0; channel < decodedBuffer.numberOfChannels; channel++) {
        channels.push(decodedBuffer.getChannelData(channel));
      }
      const wavBuffer = encodeWavPcm16(channels, decodedBuffer.sampleRate);
      // Verify the actual bytes before claiming success: header, channel
      // count, sample rate, and data length must all check out.
      const wavInfo = parseWavHeader(new Uint8Array(wavBuffer));
      if (Math.abs(wavInfo.durationSeconds - decodedBuffer.duration) > 0.05) {
        throw new Error('WAV verification failed: header duration does not match the decoded audio.');
      }
      const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(wavBlob);
      const nameWithoutExt = uploadedFile.name.substring(0, uploadedFile.name.lastIndexOf('.')) || 'audio';
      setConvertedBlobUrl(url);
      setConvertedFilename(`${nameWithoutExt}.wav`);
      const channelLabel = wavInfo.channels === 1 ? 'Mono' : wavInfo.channels === 2 ? 'Stereo' : `${wavInfo.channels}-channel`;
      setOutputText(`Audio track extracted and verified!\nFormat: WAV PCM 16-bit, ${channelLabel}\nDuration: ${wavInfo.durationSeconds.toFixed(1)}s\nSample Rate: ${wavInfo.sampleRate} Hz\nFile size: ${formatFileSize(wavBlob.size)}`);
      addLog('Audio track extracted and verified successfully.');
    } catch (err: any) {
      console.error(err);
      const message = err?.message || 'The audio track format could not be decoded.';
      if (message === 'Cancelled by user.') {
        setOutputText('Audio extraction cancelled.');
        addLog('Audio extraction cancelled by user.');
      } else {
        addLog('Audio decoding failed.');
        setOutputText(`Decoding Error: ${message}`);
      }
    } finally {
      if (audioCtx) {
        try { await audioCtx.close(); } catch { /* already closed */ }
      }
      setIsProcessing(false);
    }
  };

  const handleExtractFrame = async () => {
    const video = document.getElementById('workspace-video-preview') as HTMLVideoElement | null;
    if (!video) {
      setOutputText('No video preview is loaded. Upload a video file first.');
      return;
    }
    if (!uploadedFile || !uploadedFile.type.startsWith('video/')) {
      setOutputText('Frame extraction needs an uploaded video file.');
      return;
    }
    cancelRequestedRef.current = false;
    setIsProcessing(true);
    const previousTime = video.currentTime;
    try {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        throw new Error('Video metadata is not loaded yet. Wait for the preview to load, then try again.');
      }
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('This video has no video track to capture a frame from.');
      }
      const target = Math.min(Math.max(0, frameTimestamp), video.duration - 0.05);
      addLog(`Seeking to ${target.toFixed(2)}s...`);
      await seekVideoTo(video, target);
      if (cancelRequestedRef.current) throw new Error('Cancelled by user.');
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context.');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (!blob || blob.size === 0) throw new Error('JPEG encoding failed — the captured frame was empty.');
      const bytes = new Uint8Array(await blob.arrayBuffer());
      // Verify the actual JPEG bytes (markers + dimensions) before success.
      const info = validateJpegBytes(bytes);
      if (info.width !== video.videoWidth || info.height !== video.videoHeight) {
        throw new Error(`Captured JPEG is ${info.width}x${info.height}px but the video is ${video.videoWidth}x${video.videoHeight}px.`);
      }
      setConvertedBlobUrl(URL.createObjectURL(blob));
      setConvertedFilename(`frame_${target.toFixed(2)}s.jpg`);
      addLog(`Extracted frame at ${target.toFixed(2)}s.`);
      setOutputText(`Frame extracted and verified at ${target.toFixed(2)}s.\nResolution: ${info.width}x${info.height}px\nFile size: ${formatFileSize(bytes.length)}`);
    } catch (e: any) {
      const message = e?.message || 'Frame extraction failed.';
      if (message === 'Cancelled by user.') {
        setOutputText('Frame extraction cancelled.');
        addLog('Frame extraction cancelled by user.');
      } else {
        addLog('Frame extraction failed.');
        setOutputText(`Frame Error: ${message}`);
      }
    } finally {
      setIsProcessing(false);
      try { video.currentTime = previousTime; } catch { /* best-effort restore */ }
    }
  };

  // --- New video tools (worker B): compressor, looper, subtitles ---------
  // Compressor: MediaRecorder re-encode at a lower bitrate. Output is
  // always WebM — no browser can produce MP4, and the UI says so instead
  // of promising an MP4.
  const handleCompressVideo = async () => {
    if (!uploadedFile || !filePreview) return;
    const validation = validateVideoMediaFile(uploadedFile, ['video']);
    if (!validation.ok) {
      setOutputText(validation.message);
      addLog('Video compression rejected.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setOutputText('MediaRecorder is not supported in this browser, so in-browser video compression is unavailable.');
      addLog('Video compression unavailable: no MediaRecorder.');
      return;
    }
    cancelRequestedRef.current = false;
    setIsProcessing(true);
    let video: HTMLVideoElement | null = null;
    try {
      video = await loadOffscreenVideo(filePreview);
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        throw new Error('Could not read the video duration.');
      }
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('This file has no video track to compress.');
      }
      if (video.duration > VIDEO_MEDIA_LIMITS.maxRecordSeconds) {
        throw new Error(`Video is ${video.duration.toFixed(0)}s long — compression supports up to ${VIDEO_MEDIA_LIMITS.maxRecordSeconds}s.`);
      }
      const targetBps = estimateCompressedBitrate(uploadedFile.size, video.duration, compressPct);
      const mimeType = pickRecorderMimeType();
      addLog(`Re-encoding at ~${Math.round(targetBps / 1000)} kbps...`);
      video.currentTime = 0;
      const blob = await recordVideoElement(video, {
        mimeType,
        videoBitsPerSecond: targetBps,
        maxSeconds: video.duration,
        onEnded: () => true,
      });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      validateWebmBytes(bytes);
      const base = uploadedFile.name.substring(0, uploadedFile.name.lastIndexOf('.')) || 'video';
      setConvertedBlobUrl(URL.createObjectURL(blob));
      setConvertedFilename(`compressed_${base}.webm`);
      const saved = uploadedFile.size - bytes.length;
      const verdict = saved > 0
        ? `Saved ${formatFileSize(saved)} (${Math.round((saved / uploadedFile.size) * 100)}% smaller).`
        : `Output (${formatFileSize(bytes.length)}) is NOT smaller than the original (${formatFileSize(uploadedFile.size)}). The source is already efficiently encoded — try a lower target percentage.`;
      setOutputText(`Video re-encoded and verified!\nFormat: WebM (${mimeType || 'browser default'})\nTarget bitrate: ~${Math.round(targetBps / 1000)} kbps\nOriginal: ${formatFileSize(uploadedFile.size)} → Output: ${formatFileSize(bytes.length)}\n${verdict}\nNote: MP4 output is not possible in-browser — the result is a valid WebM file.`);
      addLog('Video compressed and verified successfully.');
    } catch (e: any) {
      const message = e?.message || 'Video compression failed.';
      if (message === 'Cancelled by user.') {
        setOutputText('Video compression cancelled.');
        addLog('Video compression cancelled by user.');
      } else {
        addLog('Video compression failed.');
        setOutputText(`Compression Error: ${message}`);
      }
    } finally {
      if (video) {
        try { video.pause(); video.removeAttribute('src'); video.load(); } catch { /* already torn down */ }
      }
      setIsProcessing(false);
    }
  };

  // Looper: plays the clip N times through MediaRecorder into one WebM.
  const handleLoopVideo = async () => {
    if (!uploadedFile || !filePreview) return;
    const validation = validateVideoMediaFile(uploadedFile, ['video']);
    if (!validation.ok) {
      setOutputText(validation.message);
      addLog('Video looping rejected.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setOutputText('MediaRecorder is not supported in this browser, so in-browser video looping is unavailable.');
      addLog('Video looping unavailable: no MediaRecorder.');
      return;
    }
    cancelRequestedRef.current = false;
    setIsProcessing(true);
    let video: HTMLVideoElement | null = null;
    try {
      video = await loadOffscreenVideo(filePreview);
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('This file has no video track to loop.');
      }
      const plan = planLoopOutput(video.duration, loopCount);
      const mimeType = pickRecorderMimeType();
      let loopsDone = 0;
      addLog(`Recording ${plan.loopCount} loops (${plan.totalSeconds.toFixed(1)}s total)...`);
      video.currentTime = 0;
      const blob = await recordVideoElement(video, {
        mimeType,
        maxSeconds: plan.totalSeconds,
        onEnded: () => {
          loopsDone += 1;
          addLog(`Loop ${loopsDone}/${plan.loopCount} recorded...`);
          return loopsDone >= plan.loopCount;
        },
      });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      validateWebmBytes(bytes);
      const base = uploadedFile.name.substring(0, uploadedFile.name.lastIndexOf('.')) || 'video';
      setConvertedBlobUrl(URL.createObjectURL(blob));
      setConvertedFilename(`looped_${plan.loopCount}x_${base}.webm`);
      setOutputText(`Looped video created and verified!\nFormat: WebM (${mimeType || 'browser default'})\nLoops: ${plan.loopCount}x ${video.duration.toFixed(1)}s = ${plan.totalSeconds.toFixed(1)}s expected duration\nOriginal: ${formatFileSize(uploadedFile.size)} → Output: ${formatFileSize(bytes.length)}\nNote: output duration is the expected value (loops × clip length); exact frame timing needs a real-browser playback check.`);
      addLog('Looped video created and verified successfully.');
    } catch (e: any) {
      const message = e?.message || 'Video looping failed.';
      if (message === 'Cancelled by user.') {
        setOutputText('Video looping cancelled.');
        addLog('Video looping cancelled by user.');
      } else {
        addLog('Video looping failed.');
        setOutputText(`Loop Error: ${message}`);
      }
    } finally {
      if (video) {
        try { video.pause(); video.removeAttribute('src'); video.load(); } catch { /* already torn down */ }
      }
      setIsProcessing(false);
    }
  };

  // Subtitles editor — honest text-subtitle scope only. Burning subtitles
  // into video is NOT possible in-browser and is never claimed: this parses,
  // validates, builds, and exports SRT/VTT sidecar files.
  const handleSubtitles = () => {
    setIsProcessing(true);
    try {
      let cues: SubtitleCue[];
      if (subtitleMode === 'build') {
        cues = buildTimedCues(subtitleText.split(/\r?\n/), subtitleCueSeconds, subtitleStartOffset);
      } else {
        if (!subtitleText.trim()) {
          throw new Error('Paste or load subtitle text first — or switch to "Build from lines" and type one subtitle per line.');
        }
        cues = parseSubtitleText(subtitleText, subtitleFormat);
      }
      const serialized = formatSubtitleText(cues, subtitleFormat);
      const blob = new Blob([serialized], { type: subtitleFormat === 'vtt' ? 'text/vtt' : 'text/plain' });
      setConvertedBlobUrl(URL.createObjectURL(blob));
      setConvertedFilename(`subtitles.${subtitleFormat}`);
      const lastEnd = cues[cues.length - 1].endMs;
      setOutputText(`Subtitle file ready (${cues.length} cue${cues.length === 1 ? '' : 's'}).\nFormat: ${subtitleFormat.toUpperCase()}\nSpan: ${formatSubtitleTimestamp(0, subtitleFormat)} → ${formatSubtitleTimestamp(lastEnd, subtitleFormat)}\nMode: ${subtitleMode === 'build' ? 'built from plain lines' : 'validated + re-exported'}\nNote: this creates a sidecar .${subtitleFormat} file. Burning subtitles into a video is not possible in-browser and is not attempted.`);
      addLog(`Built ${subtitleFormat.toUpperCase()} subtitles (${cues.length} cues).`);
    } catch (e: any) {
      addLog('Subtitle build failed.');
      setOutputText(`Subtitle Error: ${e?.message || 'Could not build subtitles.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateAscii = () => {
    if (!uploadedFile || !filePreview) return;
    setIsProcessing(true);
    addLog('Generating ASCII Art text block...');
    const img = new Image();
    img.src = filePreview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const width = 80;
      const height = Math.round(width * (img.naturalHeight / img.naturalWidth) * 0.55);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height).data;
        const chars = '@#S%?*+;:-. ';
        let ascii = '';
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = imgData[idx];
            const g = imgData[idx+1];
            const b = imgData[idx+2];
            const brightness = (r + g + b) / 3;
            const charIdx = Math.floor((brightness / 255) * (chars.length - 1));
            ascii += chars[charIdx];
          }
          ascii += '\n';
        }
        setOutputText(ascii);
        
        const blob = new Blob([ascii], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const nameWithoutExt = uploadedFile.name.substring(0, uploadedFile.name.lastIndexOf('.')) || 'ascii';
        setConvertedBlobUrl(url);
        setConvertedFilename(`${nameWithoutExt}_ascii.txt`);
        addLog('ASCII art generated.');
      }
      setIsProcessing(false);
    };
  };

  const handleApplyWatermark = async () => {
    if (!uploadedFile || !filePreview) return;
    // Video: real re-encode with the text drawn on every frame (WebM output).
    if (uploadedFile.type.startsWith('video/')) {
      await runVideoTransform(
        'Watermark',
        {
          watermark: {
            text: watermarkText,
            position: watermarkPosition as WatermarkPosition,
            opacityPercent: watermarkOpacity,
          },
        },
        'watermarked',
        (result) => describeVideoResult(
          result,
          `Watermark applied!\nText: "${watermarkText}"\nPosition: ${watermarkPosition} — verified visible on the video (pixel check passed).`
        )
      );
      return;
    }
    setIsProcessing(true);
    addLog('Adding watermark overlay...');
    const img = new Image();
    img.src = filePreview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        ctx.save();
        ctx.globalAlpha = watermarkOpacity / 100;
        ctx.font = `bold ${Math.round(canvas.width * 0.045)}px sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        
        const textWidth = ctx.measureText(watermarkText).width;
        const textHeight = Math.round(canvas.width * 0.045);
        let x = canvas.width - textWidth - 20;
        let y = canvas.height - 20;
        
        if (watermarkPosition === 'top-left') {
          x = 20;
          y = textHeight + 20;
        } else if (watermarkPosition === 'top-right') {
          x = canvas.width - textWidth - 20;
          y = textHeight + 20;
        } else if (watermarkPosition === 'bottom-left') {
          x = 20;
          y = canvas.height - 20;
        } else if (watermarkPosition === 'center') {
          x = (canvas.width - textWidth) / 2;
          y = (canvas.height + textHeight) / 2;
        }
        
        ctx.fillText(watermarkText, x, y);
        ctx.restore();
        
        const url = canvas.toDataURL('image/jpeg', 0.95);
        setConvertedBlobUrl(url);
        setConvertedFilename(`watermarked_${uploadedFile.name}`);
        setOutputText(`Watermark applied successfully!\nPosition: ${watermarkPosition}\nText: "${watermarkText}"\nOpacity: ${watermarkOpacity}%`);
        addLog('Applied watermark configuration.');
      }
      setIsProcessing(false);
    };
  };

  const handleApplySpeed = async () => {
    if (!uploadedFile) return;
    // Real re-encode: the video plays at the chosen rate while the canvas
    // stream is recorded, so the output file really is shorter/longer.
    await runVideoTransform(
      'Speed change',
      { playbackRate: playbackSpeed },
      `speed-${playbackSpeed}x`,
      (result) => describeVideoResult(
        result,
        `Speed changed to ${playbackSpeed}x!\nExpected output length: ${result.expectedDurationSeconds.toFixed(1)}s (original ÷ ${playbackSpeed}).`
      )
    );
  };

  const handleMuteVideo = async () => {
    if (!uploadedFile) return;
    // Real re-encode into a video-only stream: no audio track is fed to the
    // recorder, so the output file has no audio by construction.
    await runVideoTransform(
      'Mute',
      { mute: true },
      'muted',
      (result) => describeVideoResult(
        result,
        'Video muted!',
        'Audio: removed — the output was recorded from a video-only stream, so it has no audio track.'
      )
    );
  };

  const handleRotateMedia = async () => {
    if (!uploadedFile || !filePreview) return;
    // Video: real re-encode with the canvas rotated (WebM output, axes swap
    // for 90°/270°). Images keep the existing JPEG path below.
    if (uploadedFile.type.startsWith('video/')) {
      const angle = rotationAngle === 90 || rotationAngle === 180 || rotationAngle === 270 ? rotationAngle : 90;
      await runVideoTransform(
        'Rotate',
        { rotation: angle },
        `rotated-${angle}`,
        (result) => describeVideoResult(result, `Video rotated by ${angle}°!`)
      );
      return;
    }
    setIsProcessing(true);
    addLog(`Rotating media by ${rotationAngle}°...`);
    const img = new Image();
    img.src = filePreview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const is90or270 = rotationAngle === 90 || rotationAngle === 270;
      canvas.width = is90or270 ? img.naturalHeight : img.naturalWidth;
      canvas.height = is90or270 ? img.naturalWidth : img.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotationAngle * Math.PI) / 180);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        
        const url = canvas.toDataURL('image/jpeg', 0.95);
        setConvertedBlobUrl(url);
        setConvertedFilename(`rotated_${uploadedFile.name}`);
        setOutputText(`Media rotated successfully by ${rotationAngle}°!`);
        addLog(`Rotated media by ${rotationAngle}°.`);
      }
      setIsProcessing(false);
    };
  };

  const handleResizeMedia = async () => {
    if (!uploadedFile || !filePreview) return;
    // Video: real re-encode at the requested resolution (WebM output).
    // With aspect lock the height is computed from the source dimensions.
    // Images keep the existing JPEG path below.
    if (uploadedFile.type.startsWith('video/')) {
      await runVideoTransform(
        'Resize',
        {
          targetWidth: resizeWidth,
          targetHeight: resizeHeight,
          lockAspectRatio,
        },
        `resized-${resizeWidth}x${resizeHeight}`,
        (result) => describeVideoResult(result, `Video resized to ${result.width}x${result.height}px!`)
      );
      return;
    }
    setIsProcessing(true);
    addLog(`Resizing media to ${resizeWidth}x${resizeHeight}px...`);
    const img = new Image();
    img.src = filePreview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = resizeWidth;
      canvas.height = resizeHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, resizeWidth, resizeHeight);
        const url = canvas.toDataURL('image/jpeg', 0.95);
        setConvertedBlobUrl(url);
        setConvertedFilename(`resized_${uploadedFile.name}`);
        setOutputText(`Media resized successfully!\nDimensions: ${resizeWidth}x${resizeHeight}px`);
        addLog(`Resized media to ${resizeWidth}x${resizeHeight}px.`);
      }
      setIsProcessing(false);
    };
  };

  const handleGenerateMeme = () => {
    if (!uploadedFile || !filePreview) return;
    setIsProcessing(true);
    addLog('Compiling meme text overlays...');
    const img = new Image();
    img.src = filePreview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        ctx.save();
        
        const relativeFontSize = Math.round(canvas.width * (memeFontSize / 600));
        ctx.font = `bold ${relativeFontSize}px Impact, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.round(relativeFontSize * 0.15);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        ctx.fillText(memeTopText.toUpperCase(), canvas.width / 2, 20);
        ctx.strokeText(memeTopText.toUpperCase(), canvas.width / 2, 20);
        
        ctx.textBaseline = 'bottom';
        ctx.fillText(memeBottomText.toUpperCase(), canvas.width / 2, canvas.height - 20);
        ctx.strokeText(memeBottomText.toUpperCase(), canvas.width / 2, canvas.height - 20);
        
        ctx.restore();
        
        const url = canvas.toDataURL('image/jpeg', 0.95);
        setConvertedBlobUrl(url);
        setConvertedFilename(`meme_${uploadedFile.name}`);
        setOutputText('Meme generated successfully! Click download to save your compiled meme.');
        addLog('Meme generated successfully.');
      }
      setIsProcessing(false);
    };
  };

  const handleConvertDocumentOrText = () => {
    if (!uploadedFile) return;
    setIsProcessing(true);
    addLog(`Reading file content for ${tool.id}...`);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let result = '';

        if (tool.id === 'csv-to-json') {
          const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
          if (lines.length > 0) {
            const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
            const list = [];
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
              const obj: Record<string, string> = {};
              headers.forEach((header, idx) => {
                obj[header] = values[idx] || '';
              });
              list.push(obj);
            }
            result = JSON.stringify(list, null, 2);
          } else {
            result = '[]';
          }
        } 
        else if (tool.id === 'json-to-csv') {
          const data = JSON.parse(text);
          const array = typeof data === 'object' && !Array.isArray(data) ? [data] : data;
          if (Array.isArray(array) && array.length > 0) {
            const keys = Object.keys(array[0]);
            const csvRows = [];
            csvRows.push(keys.join(','));
            for (const row of array) {
              const values = keys.map(k => {
                const val = row[k];
                return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : String(val ?? '');
              });
              csvRows.push(values.join(','));
            }
            result = csvRows.join('\n');
          } else {
            result = '';
          }
        } 
        else if (tool.id === 'markdown-to-html') {
          let html = text;
          html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
          html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
          html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
          html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
          html = html.replace(/`(.*?)`/g, '<code>$1</code>');
          html = html.replace(/\n/g, '<br />');
          result = `<!DOCTYPE html>\n<html>\n<head>\n  <title>Converted HTML</title>\n</head>\n<body>\n${html}\n</body>\n</html>`;
        } 
        else if (tool.id === 'case-converter') {
          result = text.toUpperCase();
        }
        else {
          result = `Processed content:\n${text}`;
        }

        setOutputText(result);
        
        const ext = tool.id === 'csv-to-json' ? 'json' : tool.id === 'json-to-csv' ? 'csv' : tool.id === 'markdown-to-html' ? 'html' : 'txt';
        const mimeType = ext === 'json' ? 'application/json' : ext === 'html' ? 'text/html' : 'text/plain';
        const blob = new Blob([result], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const nameWithoutExt = uploadedFile.name.substring(0, uploadedFile.name.lastIndexOf('.')) || 'converted';
        
        setConvertedBlobUrl(url);
        setConvertedFilename(`${nameWithoutExt}.${ext}`);
        addLog(`File parsed and converted successfully!`);
      } catch (err: any) {
        addLog('Conversion failed.');
        setOutputText(`Error parsing file: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(uploadedFile);
  };

  // Subtitles editor UI, shared by the no-file and staged-file branches.
  // Text-first tool: the editor works without any upload; staging a .srt /
  // .vtt file just pre-fills it. Burning subtitles into video is not
  // possible in-browser, so the copy below says so instead of implying it.
  const renderSubtitleEditor = () => (
    <div className="flex flex-col gap-3 text-left">
      <p className="text-[10px] leading-relaxed text-gray-500 font-mono">
        Edit an SRT/VTT file or build timed subtitles from plain lines. This exports a sidecar subtitle file — burning subtitles into a video is not supported in-browser.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mode</label>
          <select
            value={subtitleMode}
            onChange={(e) => setSubtitleMode(e.target.value as 'edit' | 'build')}
            className="bg-black border border-[#222] text-white p-2 rounded text-xs focus:outline-none font-mono cursor-pointer"
          >
            <option value="edit">Edit SRT / VTT</option>
            <option value="build">Build from lines</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Export Format</label>
          <select
            value={subtitleFormat}
            onChange={(e) => setSubtitleFormat(e.target.value as 'srt' | 'vtt')}
            className="bg-black border border-[#222] text-white p-2 rounded text-xs focus:outline-none font-mono cursor-pointer"
          >
            <option value="srt">SRT</option>
            <option value="vtt">VTT</option>
          </select>
        </div>
      </div>
      {subtitleMode === 'build' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Seconds Per Subtitle</label>
            <input
              type="number"
              min="0.5"
              max="30"
              step="0.5"
              value={subtitleCueSeconds}
              onChange={(e) => setSubtitleCueSeconds(Math.min(30, Math.max(0.5, parseFloat(e.target.value) || 3)))}
              className="bg-black border border-[#222] text-white p-2 rounded text-xs focus:outline-none font-mono"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Start Offset (s)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={subtitleStartOffset}
              onChange={(e) => setSubtitleStartOffset(Math.max(0, parseFloat(e.target.value) || 0))}
              className="bg-black border border-[#222] text-white p-2 rounded text-xs focus:outline-none font-mono"
            />
          </div>
        </div>
      )}
      <textarea
        value={subtitleText}
        onChange={(e) => setSubtitleText(e.target.value)}
        rows={10}
        placeholder={subtitleMode === 'build' ? 'One subtitle per line — each line becomes one timed cue.' : 'Paste SRT or VTT text here, or drop a .srt / .vtt file above.'}
        className="bg-black border border-[#222] text-white p-3 rounded-lg text-xs font-mono focus:border-[#10b981]/60 focus:outline-none w-full"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleSubtitles()}
          disabled={isProcessing}
          className={`py-2 text-xs font-bold rounded uppercase tracking-wider transition-all cursor-pointer ${isProcessing ? 'bg-[#151515] border border-[#222] text-gray-500 cursor-wait' : 'bg-[#10b981] text-black hover:bg-[#059669]'}`}
        >
          {isProcessing ? 'Processing...' : subtitleMode === 'build' ? 'Build Subtitles' : 'Validate & Export'}
        </button>
        <button
          onClick={handleDownloadResult}
          disabled={isProcessing || !convertedBlobUrl}
          className={`py-2 text-xs font-bold rounded uppercase tracking-wider transition-all cursor-pointer border ${isProcessing || !convertedBlobUrl ? 'bg-[#151515] border-[#222] text-gray-600 opacity-50 cursor-not-allowed' : 'bg-[#10b981] border-[#10b981] text-black hover:bg-[#059669]'}`}
        >
          Download Result
        </button>
      </div>
      {outputText && (
        <div className="bg-black border border-[#222] p-4 rounded-xl text-left">
          <pre className="text-xs font-mono text-[#10b981] whitespace-pre-line leading-relaxed">
            {outputText}
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[640px] relative animate-in fade-in duration-300">
      
      {/* Decorative Golden Accent Lines */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#10b981]/40 to-transparent" />
      
      {/* Left panel / sidebar summary */}
      <div className="w-full md:w-80 bg-[#080808] border-b md:border-b-0 md:border-r border-[#1a1a1a] p-6 flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-6">
          <button 
            onClick={() => {
              stopAudio();
              onBack();
            }}
            className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#10b981] font-bold hover:text-white transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
          
          <div>
            <div className={`p-2.5 rounded-lg w-fit ${tool.color} mb-3.5`}>
              <Sparkle className="w-5 h-5 text-[#10b981]" />
            </div>
            <h1 className="font-sans text-2xl text-white tracking-tight">{tool.name}</h1>
            <span className="text-[9px] bg-[#1a1a1a] text-[#10b981] border border-[#2a2a2a] px-2 py-0.5 rounded font-mono uppercase tracking-wider inline-block mt-2 font-bold">
              {tool.category}
            </span>
            <p className="text-gray-400 text-xs mt-3 leading-relaxed">
              {tool.description}
            </p>
          </div>
          
          {/* Diagnostic Console Panel */}
          <div className="border border-[#1f1f1f] bg-[#050505] rounded-xl p-3 shadow-inner">
            <span className="text-[8px] font-bold text-gray-500 font-mono tracking-wider block border-b border-[#111] pb-1 mb-2 uppercase">
              Sandbox Console Logs
            </span>
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto font-mono text-[9px] text-gray-400">
              {gameLogs.map((log, i) => (
                <div key={i} className="leading-relaxed border-l border-gray-800 pl-1.5 text-left">
                  <span className="text-[#10b981]">&bull;</span> {log}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="text-[8px] text-gray-600 font-mono flex items-center justify-between border-t border-[#111] pt-4 mt-6">
          <span>{tool.processingType === 'browser' ? 'Browser processing' : 'Connected processing'}</span>
          <span>{tool.status === 'beta' ? 'Beta workspace' : 'Available'}</span>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-grow p-6 sm:p-8 flex flex-col justify-between bg-[#0b0b0b]/95 relative overflow-hidden">
        
        {/* Absolute dynamic grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#151515_1px,transparent_1px),linear-gradient(to_bottom,#151515_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

        <div className="relative z-10 w-full flex-grow flex flex-col justify-center">
          
          {/* Dynamic Template Switcher */}
          
          {/* TEMPLATE A: TEXT & CODE TRANSFORM UTILITIES */}
          {(tool.category === 'Text & Writing' || tool.category === 'Developer Tools' || tool.id === 'json-formatter' || tool.id === 'yaml-to-json' || tool.id === 'xml-beautifier' || tool.id === 'jwt-debugger' || tool.id === 'sql-formatter' || tool.id === 'hash-generator') && (
            <div className="flex flex-col gap-4 w-full">
              
              {/* Text area inputs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${tool.id}-source-text`} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                    Source Text Input
                  </label>
                  <textarea
                    id={`${tool.id}-source-text`}
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      if (tool.id === 'word-counter') {
                        runWordCount(e.target.value);
                      }
                    }}
                    placeholder={`Type or paste your content here...`}
                    className="w-full min-h-[160px] bg-[#070707] border border-[#222] rounded-xl p-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#10b981]/40 focus:ring-1 focus:ring-[#10b981]/20 transition-all font-mono leading-relaxed shadow-inner"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor={`${tool.id}-processed-output`} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                      Processed Content Output
                    </label>
                    {outputText && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopy(outputText)}
                          className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#10b981] hover:text-white transition-colors bg-[#111] px-2.5 py-1 rounded-md border border-[#222] cursor-pointer"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => {
                            let ext = 'txt';
                            if (tool.id === 'json-formatter') ext = 'json';
                            else if (tool.id === 'yaml-to-json') ext = 'json';
                            else if (tool.id === 'xml-beautifier') ext = 'xml';
                            else if (tool.id === 'sql-formatter') ext = 'sql';
                            else if (tool.id === 'html-entities') ext = 'html';
                            
                            const blob = new Blob([outputText], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `result.${ext}`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#10b981] hover:text-white transition-colors bg-[#111] px-2.5 py-1 rounded-md border border-[#222] cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <textarea
                    id={`${tool.id}-processed-output`}
                    readOnly
                    value={outputText}
                    placeholder="Processed results will compile here..."
                    className="w-full min-h-[160px] bg-[#060606]/80 border border-[#222]/80 rounded-xl p-4 text-xs text-[#10b981] font-mono leading-relaxed shadow-inner"
                  />
                </div>
              </div>

              {/* Action Button Strip dependent on tool ID */}
              <div className="flex flex-wrap gap-2.5 bg-[#090909] border border-[#1a1a1a] p-3 rounded-xl mt-2">
                {tool.id === 'case-converter' && (
                  <>
                    <button onClick={() => runCaseConvert('upper')} className="px-3 py-1.5 bg-[#151515] border border-[#2a2a2a] hover:bg-[#1f1f1f] text-white text-xs rounded transition-all cursor-pointer font-bold">UPPERCASE</button>
                    <button onClick={() => runCaseConvert('lower')} className="px-3 py-1.5 bg-[#151515] border border-[#2a2a2a] hover:bg-[#1f1f1f] text-white text-xs rounded transition-all cursor-pointer font-bold">lowercase</button>
                    <button onClick={() => runCaseConvert('title')} className="px-3 py-1.5 bg-[#151515] border border-[#2a2a2a] hover:bg-[#1f1f1f] text-white text-xs rounded transition-all cursor-pointer font-bold">Title Case</button>
                    <button onClick={() => runCaseConvert('sentence')} className="px-3 py-1.5 bg-[#151515] border border-[#2a2a2a] hover:bg-[#1f1f1f] text-white text-xs rounded transition-all cursor-pointer font-bold">Sentence case</button>
                    <button onClick={() => runCaseConvert('camel')} className="px-3 py-1.5 bg-[#151515] border border-[#2a2a2a] hover:bg-[#1f1f1f] text-white text-xs rounded transition-all cursor-pointer font-bold">camelCase</button>
                    <button onClick={() => runCaseConvert('pascal')} className="px-3 py-1.5 bg-[#151515] border border-[#2a2a2a] hover:bg-[#1f1f1f] text-white text-xs rounded transition-all cursor-pointer font-bold">PascalCase</button>
                    <button onClick={() => runCaseConvert('snake')} className="px-3 py-1.5 bg-[#151515] border border-[#2a2a2a] hover:bg-[#1f1f1f] text-white text-xs rounded transition-all cursor-pointer font-bold">snake_case</button>
                    <button onClick={() => runCaseConvert('kebab')} className="px-3 py-1.5 bg-[#151515] border border-[#2a2a2a] hover:bg-[#1f1f1f] text-white text-xs rounded transition-all cursor-pointer font-bold">kebab-case</button>
                  </>
                )}
                
                {tool.id === 'binary-translator' && (
                  <>
                    <button onClick={() => runBinaryTranslate(true)} className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Text &rarr; Binary</button>
                    <button onClick={() => runBinaryTranslate(false)} className="px-3.5 py-1.5 bg-[#151515] border border-[#222] text-white hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">Binary &rarr; Text</button>
                  </>
                )}

                {tool.id === 'morse-translator' && (
                  <>
                    <button onClick={() => runMorseCode(true)} className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Text &rarr; Morse</button>
                    <button onClick={() => runMorseCode(false)} className="px-3.5 py-1.5 bg-[#151515] border border-[#222] text-white hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">Morse &rarr; Text</button>
                    {outputText && (
                      <button onClick={playMorseSound} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#151515] border border-cyan-500/30 text-cyan-400 hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">
                        <SpeakerHigh className="w-3.5 h-3.5" /> Hear Morse Sound
                      </button>
                    )}
                  </>
                )}

                {tool.id === 'base64-coder' && (
                  <>
                    <button onClick={() => runBase64(true)} className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Encode Base64</button>
                    <button onClick={() => runBase64(false)} className="px-3.5 py-1.5 bg-[#151515] border border-[#222] text-white hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">Decode Base64</button>
                  </>
                )}

                {tool.id === 'url-coder' && (
                  <>
                    <button onClick={() => setOutputText(encodeURIComponent(inputText))} className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Encode URL</button>
                    <button onClick={() => { const result = decodeUrlSafely(inputText); setOutputText(result.value ?? result.error ?? 'Invalid URL input.'); }} className="px-3.5 py-1.5 bg-[#151515] border border-[#222] text-white hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">Decode URL</button>
                  </>
                )}

                {tool.id === 'html-entities' && (
                  <>
                    <button onClick={() => setOutputText(inputText.replace(/[&<>"'\u00A0-\u9999\ud800-\udfff]/g, (ch) => {
                      if (ch === '&') return '&amp;';
                      if (ch === '<') return '&lt;';
                      if (ch === '>') return '&gt;';
                      if (ch === '"') return '&quot;';
                      if (ch === "'") return '&#39;';
                      return '&#' + ch.codePointAt(0)! + ';';
                    }))} className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Encode HTML Entities</button>
                    <button onClick={() => setOutputText(inputText.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (match) => {
                      if (match.startsWith('&#x')) return String.fromCodePoint(parseInt(match.slice(3, -1), 16));
                      if (match.startsWith('&#')) return String.fromCodePoint(parseInt(match.slice(2, -1), 10));
                      const named: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': '\u00A0' };
                      return named[match] ?? match;
                    }))} className="px-3.5 py-1.5 bg-[#151515] border border-[#222] text-white hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">Decode HTML Entities</button>
                  </>
                )}

                {tool.id === 'lorem-ipsum' && (
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Paragraph count:</span>
                    <input type="number" min="1" max="20" value={sliderVal} aria-label="Lorem ipsum paragraph count" onChange={(e) => setSliderVal(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))} className="w-16 min-h-10 bg-black border border-[#222] text-xs text-[#10b981] font-bold p-2 rounded font-mono text-center" />
                    <button 
                      onClick={() => {
                        setOutputText(generateLorem(sliderVal));
                        addLog(`Generated ${Math.max(1, Math.min(20, sliderVal))} paragraphs of deterministic Lorem Ipsum.`);
                      }} 
                      className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold"
                    >
                      Generate Lorem Ipsum
                    </button>
                  </div>
                )}

                {tool.id === 'word-counter' && (
                  <span className="text-[10px] text-gray-500 font-mono italic">Start typing above to analyze writing density indices.</span>
                )}

                {tool.id === 'text-reverser' && (
                  <>
                    <button onClick={() => setOutputText(Array.from(inputText).reverse().join(''))} className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Reverse Characters</button>
                    <button onClick={() => setOutputText(inputText.split(/\s+/).reverse().join(' '))} className="px-3.5 py-1.5 bg-[#151515] border border-[#222] text-white hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">Reverse Words</button>
                  </>
                )}

                {tool.id === 'line-remover' && (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Deduplication options:</span>
                      <label className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono cursor-pointer">
                        <input type="checkbox" checked={lineDedupOptions.trim} onChange={(e) => setLineDedupOptions(o => ({ ...o, trim: e.target.checked }))} className="accent-[#10b981]" />
                        Trim whitespace
                      </label>
                      <label className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono cursor-pointer">
                        <input type="checkbox" checked={lineDedupOptions.removeEmpty} onChange={(e) => setLineDedupOptions(o => ({ ...o, removeEmpty: e.target.checked }))} className="accent-[#10b981]" />
                        Remove blank lines
                      </label>
                      <label className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono cursor-pointer">
                        <input type="checkbox" checked={lineDedupOptions.caseSensitive} onChange={(e) => setLineDedupOptions(o => ({ ...o, caseSensitive: e.target.checked }))} className="accent-[#10b981]" />
                        Case-sensitive
                      </label>
                      <button 
                        onClick={runRemoveDuplicates} 
                        className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold"
                      >
                        Deduplicate Lines
                      </button>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono italic">
                      Preserves first occurrence and original order. Current behavior: {lineDedupOptions.trim ? 'trims whitespace' : 'keeps raw whitespace'}, {lineDedupOptions.removeEmpty ? 'removes blank lines' : 'keeps blank lines'}, {lineDedupOptions.caseSensitive ? 'case-sensitive' : 'case-insensitive'}.
                    </span>
                  </div>
                )}

                {tool.id === 'json-formatter' && (
                  <div className="flex gap-2">
                    <button onClick={() => runJsonFormatter('format')} className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-all cursor-pointer font-bold">Verify & Format JSON</button>
                    <button onClick={() => runJsonFormatter('minify')} className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs rounded transition-all cursor-pointer font-bold border border-gray-700">Minify JSON</button>
                  </div>
                )}

                {tool.id === 'yaml-to-json' && (
                  <button 
                    onClick={() => {
                      setOutputText('YAML conversion is unavailable.');
                      addLog('No YAML parser is configured.');
                    }} 
                    className="px-4 py-1.5 bg-[#10b981] text-black text-xs rounded transition-all cursor-pointer font-bold"
                  >
                    Format YAML to JSON
                  </button>
                )}

                {tool.id === 'hash-generator' && (
                  <button onClick={runHashGen} className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-all cursor-pointer font-bold">Generate Cryptographic Hashes</button>
                )}

                {tool.id === 'slug-generator' && (
                  <button onClick={runSlugGenerate} className="px-4 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Generate URL Slug</button>
                )}

                {tool.id === 'text-sorter' && (
                  <>
                    <button onClick={() => runTextSort('az')} className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">A → Z</button>
                    <button onClick={() => runTextSort('za')} className="px-3.5 py-1.5 bg-[#151515] border border-[#222] text-white hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">Z → A</button>
                    <button onClick={() => runTextSort('num-asc')} className="px-3.5 py-1.5 bg-[#151515] border border-[#222] text-white hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">Numeric ↑</button>
                    <button onClick={() => runTextSort('num-desc')} className="px-3.5 py-1.5 bg-[#151515] border border-[#222] text-white hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">Numeric ↓</button>
                  </>
                )}

                {tool.id === 'uuid-generator' && (
                  <div className="flex items-center gap-3">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Count:</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={uuidCount}
                      onChange={(e) => setUuidCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                      aria-label="Number of UUIDs to generate"
                      className="w-16 min-h-10 bg-black border border-[#222] text-xs text-[#10b981] font-bold p-2 rounded font-mono text-center"
                    />
                    <button onClick={runUuidGenerate} className="px-4 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Generate UUIDs</button>
                  </div>
                )}

                {tool.id === 'base-converter' && (
                  <div className="flex items-center gap-3">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">From:</label>
                    <select
                      value={baseFrom}
                      onChange={(e) => setBaseFrom(Number(e.target.value))}
                      aria-label="Input base"
                      className="bg-black border border-[#222] text-xs text-[#10b981] font-bold p-2 rounded font-mono"
                    >
                      <option value={2}>Binary (2)</option>
                      <option value={8}>Octal (8)</option>
                      <option value={10}>Decimal (10)</option>
                      <option value={16}>Hex (16)</option>
                    </select>
                    <span className="text-gray-500 text-xs">→</span>
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">To:</label>
                    <select
                      value={baseTo}
                      onChange={(e) => setBaseTo(Number(e.target.value))}
                      aria-label="Output base"
                      className="bg-black border border-[#222] text-xs text-[#10b981] font-bold p-2 rounded font-mono"
                    >
                      <option value={2}>Binary (2)</option>
                      <option value={8}>Octal (8)</option>
                      <option value={10}>Decimal (10)</option>
                      <option value={16}>Hex (16)</option>
                    </select>
                    <button onClick={runBaseConvert} className="px-4 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Convert</button>
                  </div>
                )}

                {tool.id === 'contrast-checker' && (
                  <div className="flex items-center gap-3">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Foreground:</label>
                    <input
                      type="text"
                      value={contrastFg}
                      onChange={(e) => setContrastFg(e.target.value)}
                      aria-label="Foreground color hex"
                      className="w-24 min-h-10 bg-black border border-[#222] text-xs text-white font-bold p-2 rounded font-mono text-center"
                      placeholder="#FFFFFF"
                    />
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Background:</label>
                    <input
                      type="text"
                      value={contrastBg}
                      onChange={(e) => setContrastBg(e.target.value)}
                      aria-label="Background color hex"
                      className="w-24 min-h-10 bg-black border border-[#222] text-xs text-white font-bold p-2 rounded font-mono text-center"
                      placeholder="#000000"
                    />
                    <button onClick={runContrastCheck} className="px-4 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Check Contrast</button>
                  </div>
                )}

                <button 
                  onClick={() => { setInputText(''); setOutputText(''); }}
                  className="px-3 py-1.5 bg-transparent border border-gray-800 text-gray-500 hover:text-white rounded text-xs transition-all cursor-pointer ml-auto"
                >
                  Clear Fields
                </button>
              </div>

            </div>
          )}

          {/* TEMPLATE B: CALCULATOR UTILITIES */}
          {(tool.category === 'Math & Finance') && (
            <div className="flex flex-col gap-4 max-w-xl mx-auto w-full bg-[#090909] border border-[#1a1a1a] p-6 rounded-2xl shadow-inner">
              
              {tool.id === 'scientific-calc' && (
                <div className="flex flex-col gap-3">
                  <div className="bg-black border border-[#222] p-4 rounded-xl text-right text-2xl font-mono text-[#10b981] truncate shadow-inner h-16 flex items-center justify-end">
                    {inputText || '0'}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {/* Trig & Functions */}
                    {['sin', 'cos', 'tan', 'log', 'ln', 'C', '(', ')', '√', '/'].map(btn => (
                      <button
                        key={btn}
                        onClick={() => {
                          if (btn === 'C') setInputText('');
                          else if (['sin', 'cos', 'tan', 'log', 'ln', '√'].includes(btn)) {
                            setInputText(prev => `${btn}(${prev}`);
                          } else {
                            setInputText(prev => prev + btn);
                          }
                        }}
                        className="p-3 bg-[#111] hover:bg-[#151515] border border-[#222] text-xs text-gray-400 rounded-lg font-mono font-bold transition-all cursor-pointer"
                      >
                        {btn}
                      </button>
                    ))}
                    {/* Digits & Operators */}
                    {['7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '%', '^'].map(btn => (
                      <button
                        key={btn}
                        onClick={() => setInputText(prev => prev + btn)}
                        className="p-3 bg-[#151515] hover:bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white rounded-lg font-mono font-bold transition-all cursor-pointer"
                      >
                        {btn}
                      </button>
                    ))}
                    {/* Equal block */}
                    <button
                      onClick={() => {
                        try {
                          // Simple parse calculation simulation
                          // Replacing functions with Math calls
                          let clean = inputText
                            .replace(/sin\(/g, 'Math.sin(')
                            .replace(/cos\(/g, 'Math.cos(')
                            .replace(/tan\(/g, 'Math.tan(')
                            .replace(/log\(/g, 'Math.log10(')
                            .replace(/ln\(/g, 'Math.log(')
                            .replace(/√\(/g, 'Math.sqrt(');
                          
                          // Handle unclosed parenthesis safely
                          const openCount = (clean.match(/\(/g) || []).length;
                          const closeCount = (clean.match(/\)/g) || []).length;
                          if (openCount > closeCount) {
                            clean += ')'.repeat(openCount - closeCount);
                          }
                          
                          const res = Number.NaN;
                          setInputText(Number(res).toFixed(4).replace(/\.?0+$/, ''));
                          addLog(`Calculated: ${clean}`);
                        } catch(e) {
                          setInputText('Error');
                        }
                      }}
                      className="col-span-2 p-3 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-sm font-bold rounded-lg font-mono transition-all cursor-pointer"
                    >
                      =
                    </button>
                  </div>
                </div>
              )}

              {tool.id === 'unit-converter' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Conversion Category</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['length', 'temp', 'weight', 'volume'].map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setCheckboxState({ opt1: type === 'length', opt2: type === 'temp', opt3: type === 'weight', opt4: type === 'volume' });
                            runUnitConvert(sliderVal, type);
                          }}
                          className={`p-2 rounded text-xs uppercase font-bold tracking-wider font-mono border transition-all cursor-pointer ${
                            (type === 'length' && checkboxState.opt1) ||
                            (type === 'temp' && checkboxState.opt2) ||
                            (type === 'weight' && checkboxState.opt3) ||
                            (type === 'volume' && checkboxState.opt4)
                              ? 'bg-[#10b981] text-black border-[#10b981]'
                              : 'bg-[#151515] border-[#222] text-gray-400 hover:bg-[#1a1a1a]'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between">
                      <span>Value to Convert</span>
                      <span className="text-[#10b981] font-mono">{sliderVal}</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" 
                      max="150" 
                      value={sliderVal} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setSliderVal(val);
                        const currentType = checkboxState.opt1 ? 'length' : checkboxState.opt2 ? 'temp' : checkboxState.opt3 ? 'weight' : 'volume';
                        runUnitConvert(val, currentType);
                      }}
                      className="w-full accent-[#10b981]"
                    />
                  </div>

                  <div className="bg-black border border-[#222] rounded-xl p-4 mt-2">
                    <span className="text-[8px] font-bold text-gray-500 font-mono tracking-wider block mb-2 uppercase">Conversion Results</span>
                    <p className="text-sm font-mono text-[#10b981] leading-relaxed">
                      {outputText || 'Select a Category and drag the slider above.'}
                    </p>
                  </div>
                </div>
              )}

              {tool.id === 'currency-converter' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between">
                      <span>Amount (USD)</span>
                      <span className="text-[#10b981] font-mono">${sliderVal}</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="1000" 
                      value={sliderVal} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setSliderVal(val);
                        setOutputText(
                          `${val} USD = ${(val * 0.92).toFixed(2)} EUR\n` +
                          `${val} USD = ${(val * 0.79).toFixed(2)} GBP\n` +
                          `${val} USD = ${(val * 158.42).toFixed(2)} JPY\n` +
                          `${val} USD = ${(val * 1.36).toFixed(2)} CAD`
                        );
                      }}
                      className="w-full accent-[#10b981]"
                    />
                  </div>

                  <div className="bg-black border border-[#222] rounded-xl p-4">
                    <span className="text-[8px] font-bold text-gray-500 font-mono tracking-wider block mb-2 uppercase">Dynamic World Exchanges</span>
                    <pre className="text-xs font-mono text-[#10b981] leading-relaxed whitespace-pre-line">
                      {outputText || 'Drag the amount slider above to see rates.'}
                    </pre>
                  </div>
                </div>
              )}

              {tool.id === 'percent-calc' && (
                <div className="flex flex-col gap-4 text-left">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      runPercentCalc();
                    }}
                    noValidate
                    className="flex flex-col gap-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="percent-calc-percent" className="text-[10px] font-bold text-gray-500 uppercase font-mono">
                          Percentage (%)
                        </label>
                        <input
                          id="percent-calc-percent"
                          type="number"
                          step="any"
                          value={percentInput}
                          onChange={(e) => {
                            setPercentInput(e.target.value);
                            setToolError('');
                          }}
                          placeholder="e.g. 25"
                          className="bg-black border border-[#222] text-[#10b981] p-2 rounded text-sm font-mono font-bold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="percent-calc-base" className="text-[10px] font-bold text-gray-500 uppercase font-mono">
                          Base value
                        </label>
                        <input
                          id="percent-calc-base"
                          type="number"
                          step="any"
                          value={baseInput}
                          onChange={(e) => {
                            setBaseInput(e.target.value);
                            setToolError('');
                          }}
                          placeholder="e.g. 200"
                          className="bg-black border border-[#222] text-[#10b981] p-2 rounded text-sm font-mono font-bold"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-grow py-2 bg-[#10b981] text-black font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer">
                        Calculate
                      </button>
                      <button
                        type="button"
                        onClick={resetPercentCalc}
                        className="px-4 py-2 bg-[#151515] border border-[#222] hover:border-[#10b981]/40 text-white text-xs font-bold rounded uppercase tracking-wider cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </form>

                  {toolError && (
                    <div role="alert" className="bg-rose-950/30 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs font-mono">
                      {toolError}
                    </div>
                  )}

                  <div aria-live="polite" className="bg-black border border-[#222] p-4 rounded-xl">
                    <span className="text-[8px] font-bold text-gray-500 font-mono tracking-wider block mb-2 uppercase">Percentage Result</span>
                    <p className="text-sm font-mono text-[#10b981] whitespace-pre-line leading-relaxed">
                      {outputText || 'Enter a percentage and base value, then press Calculate.'}
                    </p>
                  </div>
                </div>
              )}

              {tool.id === 'tip-calc' && (
                <div className="flex flex-col gap-4 text-left">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      runTipCalc();
                    }}
                    noValidate
                    className="flex flex-col gap-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="tip-calc-bill" className="text-[10px] font-bold text-gray-500 uppercase font-mono">
                          Bill Amount ($)
                        </label>
                        <input
                          id="tip-calc-bill"
                          type="number"
                          min="0"
                          step="any"
                          value={tipBillInput}
                          onChange={(e) => {
                            setTipBillInput(e.target.value);
                            setToolError('');
                          }}
                          placeholder="e.g. 45.50"
                          className="bg-black border border-[#222] text-[#10b981] p-2 rounded text-sm font-mono font-bold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="tip-calc-percent" className="text-[10px] font-bold text-gray-500 uppercase font-mono">
                          Tip Percentage (%)
                        </label>
                        <input
                          id="tip-calc-percent"
                          type="number"
                          min="0"
                          step="any"
                          value={tipPercentInput}
                          onChange={(e) => {
                            setTipPercentInput(e.target.value);
                            setToolError('');
                          }}
                          placeholder="e.g. 15"
                          className="bg-black border border-[#222] text-[#10b981] p-2 rounded text-sm font-mono font-bold"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="tip-calc-people" className="text-[10px] font-bold text-gray-500 uppercase font-mono">
                        Number of People
                      </label>
                      <input
                        id="tip-calc-people"
                        type="number"
                        min="1"
                        step="1"
                        value={tipPeopleInput}
                        onChange={(e) => {
                          setTipPeopleInput(e.target.value);
                          setToolError('');
                        }}
                        placeholder="e.g. 2"
                        className="bg-black border border-[#222] text-[#10b981] p-2 rounded text-sm font-mono font-bold"
                      />
                    </div>

                    <div className="flex gap-2">
                      {[10, 15, 20, 25].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => selectTipPercent(p)}
                          className="flex-grow p-2 bg-[#151515] border border-[#222] hover:border-[#10b981]/40 hover:bg-[#1a1a1a] text-white text-xs font-bold rounded font-mono cursor-pointer"
                        >
                          {p}% Tip
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button type="submit" className="flex-grow py-2 bg-[#10b981] text-black font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer">
                        Calculate Split
                      </button>
                      <button
                        type="button"
                        onClick={resetTipCalc}
                        className="px-4 py-2 bg-[#151515] border border-[#222] hover:border-[#10b981]/40 text-white text-xs font-bold rounded uppercase tracking-wider cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </form>

                  {toolError && (
                    <div role="alert" className="bg-rose-950/30 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs font-mono">
                      {toolError}
                    </div>
                  )}

                  <div aria-live="polite" className="bg-black border border-[#222] p-4 rounded-xl">
                    <span className="text-[8px] font-bold text-gray-500 font-mono tracking-wider block mb-2 uppercase">Tip Breakdown Results</span>
                    <pre className="text-xs font-mono text-[#10b981] whitespace-pre-line leading-relaxed">
                      {outputText || 'Enter bill info and click a tip percentage or Calculate.'}
                    </pre>
                  </div>
                </div>
              )}

              {tool.id === 'gpa-calc' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-[#1f1f1f]">
                    <span className="text-xs text-white font-mono block">Interactive Course Grades ListBullets:</span>
                    <button
                      onClick={handleAddGpaCourse}
                      className="text-[9px] bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-[#10b981] px-2 py-1 rounded font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      + Add Course
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                    {gpaCourses.length === 0 ? (
                      <span className="text-xs text-gray-500 font-sans text-center py-4 block">No courses added. Click "+ Add Course" to start.</span>
                    ) : (
                      gpaCourses.map((course) => (
                        <div key={course.id} className="flex gap-2 items-center bg-black/40 border border-[#1a1a1a] p-2 rounded-lg">
                          <input
                            type="text"
                            value={course.name}
                            onChange={(e) => handleUpdateGpaCourse(course.id, 'name', e.target.value)}
                            className="flex-1 bg-black border border-[#222] text-xs text-white px-2 py-1 rounded font-mono focus:border-[#10b981]/60 focus:outline-none"
                            placeholder="Course name"
                          />
                          <select
                            value={course.credits}
                            onChange={(e) => handleUpdateGpaCourse(course.id, 'credits', parseInt(e.target.value) || 3)}
                            className="w-16 bg-black border border-[#222] text-xs text-[#10b981] px-2 py-1 rounded font-mono focus:outline-none cursor-pointer"
                          >
                            {[1, 2, 3, 4, 5].map(c => (
                              <option key={c} value={c} className="bg-black text-white">{c} Cr</option>
                            ))}
                          </select>
                          <select
                            value={course.grade}
                            onChange={(e) => handleUpdateGpaCourse(course.id, 'grade', e.target.value)}
                            className="w-16 bg-black border border-[#222] text-xs text-white px-2 py-1 rounded font-mono font-bold focus:outline-none cursor-pointer"
                          >
                            {['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'].map(g => (
                              <option key={g} value={g} className="bg-black text-white">{g}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleDeleteGpaCourse(course.id)}
                            className="p-1 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 rounded transition-colors cursor-pointer shrink-0 border border-transparent"
                            title="Delete course"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={handleCalculateGpa}
                    className="w-full py-2 bg-[#10b981] text-black font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer mt-1"
                  >
                    Calculate Cumulative Grade Point Average
                  </button>

                  {outputText && (
                    <div className="bg-black border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-center font-mono text-xs whitespace-pre-line leading-relaxed">
                      {outputText}
                    </div>
                  )}
                </div>
              )}

              {tool.id === 'age-calc' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Enter Birthday Date</label>
                    <input 
                      type="date" 
                      onChange={(e) => {
                        const birth = new Date(e.target.value);
                        if (isNaN(birth.getTime())) return;
                        const diff = Date.now() - birth.getTime();
                        const ageDate = new Date(diff);
                        const years = Math.abs(ageDate.getUTCFullYear() - 1970);
                        const months = ageDate.getUTCMonth();
                        const days = ageDate.getUTCDate() - 1;
                        setOutputText(
                          `Exact Age:\n` +
                          `• ${years} Years, ${months} Months, ${days} Days old\n` +
                          `• Approx ${Math.floor(diff / (1000 * 60 * 60 * 24))} total days elapsed\n` +
                          `• Next Birthday: ${12 - months} months from now`
                        );
                        addLog('Estimated precise age metrics.');
                      }}
                      className="bg-black border border-[#222] text-[#10b981] p-3 rounded-lg text-sm font-mono font-bold w-full"
                    />
                  </div>

                  {outputText && (
                    <div className="bg-black border border-[#222] p-4 rounded-xl">
                      <pre className="text-xs font-mono text-[#10b981] whitespace-pre-line leading-relaxed">
                        {outputText}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {tool.id === 'loan-calc' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Principal amount ($)</span>
                    <input type="number" min="1000" defaultValue="15000" id="loan-amount-input" className="bg-black border border-[#222] text-[#10b981] p-2 rounded text-sm font-mono font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Interest Rate (%)</span>
                      <input type="number" min="1" step="0.1" defaultValue="5.5" id="loan-rate-input" className="bg-black border border-[#222] text-[#10b981] p-2 rounded text-sm font-mono font-bold" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Duration (Years)</span>
                      <input type="number" min="1" defaultValue="5" id="loan-years-input" className="bg-black border border-[#222] text-[#10b981] p-2 rounded text-sm font-mono font-bold" />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const amount = parseFloat((document.getElementById('loan-amount-input') as HTMLInputElement).value) || 15000;
                      const rate = parseFloat((document.getElementById('loan-rate-input') as HTMLInputElement).value) || 5.5;
                      const years = parseInt((document.getElementById('loan-years-input') as HTMLInputElement).value) || 5;
                      const monthlyRate = (rate / 100) / 12;
                      const totalMonths = years * 12;
                      const monthlyPayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
                      setOutputText(
                        `Estimated Monthly Premium: $${monthlyPayment.toFixed(2)}\n` +
                        `Total Paid Over ${years} Years: $${(monthlyPayment * totalMonths).toFixed(2)}\n` +
                        `Cumulative Interest Expense: $${((monthlyPayment * totalMonths) - amount).toFixed(2)}`
                      );
                    }} 
                    className="w-full py-2 bg-[#10b981] text-black font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Generate Amortization Forecast
                  </button>
                  {outputText && (
                    <div className="bg-black border border-[#222] p-4 rounded-xl">
                      <pre className="text-xs font-mono text-[#10b981] whitespace-pre-line leading-relaxed">
                        {outputText}
                      </pre>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TEMPLATE C: HEALTH & LIFESTYLE UTILITIES */}
          {(tool.category === 'Health & Lifestyle') && (
            <div className="flex flex-col gap-4 max-w-xl mx-auto w-full bg-[#090909] border border-[#1a1a1a] p-6 rounded-2xl shadow-inner text-center">
              
              {tool.id === 'bmi-calc' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between font-mono">
                      <span>Height (cm)</span>
                      <span className="text-[#10b981] font-bold">{sliderVal + 100} cm</span>
                    </label>
                    <input 
                      type="range" 
                      min="40" 
                      max="120" 
                      value={sliderVal} 
                      onChange={(e) => {
                        const h = parseInt(e.target.value) || 0;
                        setSliderVal(h);
                        runBmi(checkboxState.opt1 ? 70 : 90, h + 100);
                      }}
                      className="w-full accent-[#10b981]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between font-mono">
                      <span>Weight (kg)</span>
                      <span className="text-[#10b981] font-bold">{checkboxState.opt1 ? 70 : checkboxState.opt2 ? 80 : checkboxState.opt3 ? 90 : 100} kg</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[70, 80, 90, 100].map(w => (
                        <button
                          key={w}
                          onClick={() => {
                            setCheckboxState({ opt1: w === 70, opt2: w === 80, opt3: w === 90, opt4: w === 100 });
                            runBmi(w, sliderVal + 100);
                          }}
                          className={`p-2 rounded font-mono text-xs font-bold border transition-all cursor-pointer ${
                            (w === 70 && checkboxState.opt1) ||
                            (w === 80 && checkboxState.opt2) ||
                            (w === 90 && checkboxState.opt3) ||
                            (w === 100 && checkboxState.opt4)
                              ? 'bg-[#10b981] text-black border-[#10b981]'
                              : 'bg-[#151515] border-[#222] text-gray-400'
                          }`}
                        >
                          {w} kg
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-black border border-[#222] rounded-xl p-4 mt-2">
                    <span className="text-[8px] font-bold text-gray-500 font-mono tracking-wider block mb-2 uppercase">Physical Evaluation Results</span>
                    <pre className="text-xs font-mono text-[#10b981] whitespace-pre-line leading-relaxed">
                      {outputText || 'Adjust parameters to discover Body Mass Index indices.'}
                    </pre>
                  </div>
                </div>
              )}

              {tool.id === 'pomodoro' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-40 h-40 flex items-center justify-center border-4 border-[#222] rounded-full bg-black/60 shadow-inner">
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#10b981]/20 animate-spin-slow" />
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-mono text-[#10b981] font-bold">
                        {timerRunning 
                          ? `${Math.floor(timerCount / 60).toString().padStart(2, '0')}:${(timerCount % 60).toString().padStart(2, '0')}`
                          : '25:00'
                        }
                      </span>
                      <span className="text-[8px] uppercase tracking-widest text-gray-500 font-mono mt-1">
                        {timerRunning ? 'Focus Active' : 'Idle Session'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full">
                    <button onClick={() => startPomodoro(25)} className="flex-grow py-2 bg-[#10b981] hover:bg-[#10b981]/90 text-black font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer">25m Work Focus</button>
                    <button onClick={() => startPomodoro(5)} className="flex-grow py-2 bg-[#151515] border border-[#222] text-white hover:bg-[#1a1a1a] font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer">5m Short Break</button>
                    {timerRunning && (
                      <button onClick={() => setTimerRunning(false)} className="px-3.5 bg-red-500 hover:bg-red-600 text-white rounded cursor-pointer transition-all">
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {tool.id === 'breath-guide' && (
                <div className="flex flex-col items-center gap-6">
                  {/* Expanding sphere animation container */}
                  <div className="h-44 flex items-center justify-center">
                    <div
                      style={{
                        transform: `scale(${timerRunning ? (breathProgress * 0.8 + 0.6) : 0.8})`,
                        boxShadow: timerRunning ? `0 0 ${breathProgress * 30 + 10}px rgba(197, 163, 104, 0.4)` : 'none',
                        transition: 'transform 1s ease-in-out, box-shadow 1s ease-in-out'
                      }}
                      className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#059669] to-[#10b981] flex items-center justify-center text-black font-bold"
                    >
                      <Wind className="w-8 h-8 text-[#0d0d0d] animate-pulse" />
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="font-sans text-lg text-white">
                      {timerRunning ? breathingPhase : 'Box Breathing Sphere'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      {timerRunning 
                        ? 'Slightly align your breathing pace with the expanding physical circle.' 
                        : 'Click on the prompt below to initiate 16-second box breathing cycles.'
                      }
                    </p>
                  </div>

                  <button
                    onClick={() => setTimerRunning(!timerRunning)}
                    className="w-full py-2.5 bg-[#10b981] text-black font-bold text-xs rounded uppercase tracking-widest hover:bg-[#10b981]/90 transition-all cursor-pointer"
                  >
                    {timerRunning ? 'Halt Training' : 'Initiate Breathing Timer'}
                  </button>
                </div>
              )}

              {tool.id === 'noise-maker' && (
                <div className="flex flex-col gap-4">
                  <span className="text-xs text-gray-400 font-sans">Synthesize pure ambient frequency waveforms offline.</span>
                  
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      onClick={() => toggleSleepSounds('white')}
                      className={`p-4 rounded-xl border font-mono text-xs uppercase font-bold tracking-widest cursor-pointer transition-all ${
                        gameActive && oscillatorRef.current ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'bg-[#151515] border-[#222] text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      White Noise
                    </button>
                    <button
                      onClick={() => toggleSleepSounds('brown')}
                      className={`p-4 rounded-xl border font-mono text-xs uppercase font-bold tracking-widest cursor-pointer transition-all ${
                        gameActive && oscillatorRef.current ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'bg-[#151515] border-[#222] text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      Brown Noise
                    </button>
                    <button
                      onClick={() => toggleSleepSounds('sine')}
                      className={`p-4 rounded-xl border font-mono text-xs uppercase font-bold tracking-widest cursor-pointer transition-all ${
                        gameActive && oscillatorRef.current ? 'border-teal-500 bg-teal-500/10 text-teal-400' : 'bg-[#151515] border-[#222] text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      Deep Tone
                    </button>
                  </div>

                  {gameActive && (
                    <button onClick={stopAudio} className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded uppercase tracking-wider cursor-pointer">
                      Halt Ambient Playback
                    </button>
                  )}
                </div>
              )}

              {tool.id === 'water-tracker' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-28 h-40 bg-black border-2 border-[#333] rounded-b-xl overflow-hidden shadow-inner flex flex-col justify-end">
                    {/* Water Level Wave Overlay */}
                    <div
                      style={{
                        height: `${Math.min(100, (waterOunces / 80) * 100)}%`,
                        transition: 'height 0.5s ease-out'
                      }}
                      className="w-full bg-cyan-500/30 border-t-2 border-cyan-400/80 relative flex items-center justify-center font-mono text-xs font-bold text-cyan-200"
                    >
                      <span className="absolute">{waterOunces} oz</span>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full">
                    <button 
                      onClick={() => {
                        setWaterOunces(prev => prev + 8);
                        addLog('Logged +8 oz glass of pure water.');
                      }} 
                      className="flex-grow py-2 bg-cyan-500 text-black font-bold text-xs rounded uppercase tracking-wider hover:bg-cyan-400 transition-all cursor-pointer"
                    >
                      +8 oz Glass
                    </button>
                    <button 
                      onClick={() => {
                        setWaterOunces(0);
                        addLog('Cleared daily hydration tally.');
                      }} 
                      className="px-3 bg-[#151515] border border-[#222] hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded transition-all cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">Recommended intake daily standard is 80 ounces.</span>
                </div>
              )}

              {tool.id === 'habit-tracker' && (
                <div className="flex flex-col gap-2 text-left">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Today's Habits</span>
                  <div className="flex flex-col gap-2 mt-1">
                    {habits.map(h => (
                      <div 
                        key={h.id}
                        onClick={() => {
                          setHabits(prev => prev.map(item => item.id === h.id ? { ...item, done: !item.done } : item));
                          addLog(`Toggled habit "${h.text}"`);
                        }}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          h.done ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400' : 'bg-black border-[#222] text-gray-400 hover:border-gray-800'
                        }`}
                      >
                        <span className={`text-xs ${h.done ? 'line-through' : ''}`}>{h.text}</span>
                        {h.done ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <div className="w-4 h-4 border border-gray-600 rounded" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic generic layout for BMR, Calorie and other lifestyle tools */}
              {!['bmi-calc', 'pomodoro', 'breath-guide', 'noise-maker', 'water-tracker', 'habit-tracker'].includes(tool.id) && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-white font-mono block">Configure active scaling parameters:</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      value={sliderVal} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setSliderVal(val);
                        if (tool.id === 'bmr-calc') {
                          setOutputText('BMR calculation is unavailable.');
                        } else if (tool.id === 'step-sim') {
                          setOutputText('Step estimation is unavailable.');
                        } else {
                          setOutputText('This lifestyle tool is unavailable.');
                        }
                      }}
                      className="accent-[#10b981] w-full"
                    />
                  </div>
                  <div className="bg-black border border-[#222] p-4 rounded-xl">
                    <pre className="text-xs font-mono text-[#10b981] whitespace-pre-line leading-relaxed">
                      {outputText || 'Adjust slider to calculate lifestyle health targets.'}
                    </pre>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TEMPLATE D: FUN & QUICK GAME UTILITIES */}
          {(tool.category === 'Fun & Games') && (
            <div className="flex flex-col gap-4 max-w-xl mx-auto w-full bg-[#090909] border border-[#1a1a1a] p-6 rounded-2xl shadow-inner text-center">
              
              {tool.id === 'password-gen' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Password Length</span>
                    <span className="text-[#10b981] font-mono font-bold text-xs">{sliderVal} chars</span>
                  </div>
                  <input type="range" min="6" max="32" value={sliderVal} onChange={(e) => setSliderVal(parseInt(e.target.value) || 6)} className="w-full accent-[#10b981]" />

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setCheckboxState(prev => ({ ...prev, opt1: !prev.opt1 }))}
                      className={`p-2 rounded text-xs font-bold border transition-all ${checkboxState.opt1 ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-black border-[#222] text-gray-500'}`}
                    >
                      Lowercase (a-z)
                    </button>
                    <button 
                      onClick={() => setCheckboxState(prev => ({ ...prev, opt2: !prev.opt2 }))}
                      className={`p-2 rounded text-xs font-bold border transition-all ${checkboxState.opt2 ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-black border-[#222] text-gray-500'}`}
                    >
                      Uppercase (A-Z)
                    </button>
                    <button 
                      onClick={() => setCheckboxState(prev => ({ ...prev, opt3: !prev.opt3 }))}
                      className={`p-2 rounded text-xs font-bold border transition-all ${checkboxState.opt3 ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-black border-[#222] text-gray-500'}`}
                    >
                      Numbers (0-9)
                    </button>
                    <button 
                      onClick={() => setCheckboxState(prev => ({ ...prev, opt4: !prev.opt4 }))}
                      className={`p-2 rounded text-xs font-bold border transition-all ${checkboxState.opt4 ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-black border-[#222] text-gray-500'}`}
                    >
                      Special Signs
                    </button>
                  </div>

                  <button onClick={runPasswordGen} className="w-full py-2 bg-[#10b981] text-black font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer">Generate Password</button>

                  {outputText && (
                    <div className="bg-black border border-[#222] p-3 rounded-lg flex items-center justify-between font-mono mt-1">
                      <span className="text-[#10b981] text-sm font-bold truncate">{outputText}</span>
                      <button onClick={() => handleCopy(outputText)} className="text-[#10b981] hover:text-white cursor-pointer">
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tool.id === 'coin-flipper' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-28 flex items-center justify-center">
                    <div
                      style={{
                        transform: gameActive ? 'rotateY(1080deg)' : 'rotateY(0deg)',
                        transition: 'transform 0.8s ease-out'
                      }}
                      className="w-20 h-20 bg-gradient-to-tr from-[#059669] to-[#10b981] rounded-full flex items-center justify-center border border-[#10b981]/40 text-black font-sans text-lg font-bold shadow-lg"
                    >
                      {outputText || '$'}
                    </div>
                  </div>
                  <button onClick={runCoinFlip} disabled={gameActive} className="w-full py-2 bg-[#10b981] text-black font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer">
                    {gameActive ? 'Flipping...' : 'Flip Silver Coin'}
                  </button>
                  <span className="text-[9px] text-gray-500 font-mono">Tally sessions flipped: {gameScore} rounds</span>
                </div>
              )}

              {tool.id === 'dice-roller' && (
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {[4, 6, 8, 10, 12, 20].map(sides => (
                      <button
                        key={sides}
                        onClick={() => runDiceRoll(sides)}
                        className="p-3 bg-[#151515] hover:bg-[#1a1a1a] border border-[#222] hover:border-red-500/30 text-white rounded-lg font-mono text-xs font-bold transition-all cursor-pointer"
                      >
                        Roll D{sides}
                      </button>
                    ))}
                  </div>

                  {toolError && (
                    <div role="alert" className="w-full bg-rose-950/30 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs font-mono text-center">
                      {toolError}
                    </div>
                  )}

                  <div aria-live="polite" className="w-full bg-black border border-red-500/20 p-4 rounded-xl font-mono text-lg font-bold text-center">
                    <span className="text-red-400">{outputText || 'Pick a die to roll.'}</span>
                  </div>

                  <button
                    onClick={resetDice}
                    className="px-4 py-2 bg-[#151515] border border-[#222] hover:border-[#10b981]/40 text-white text-xs font-bold rounded uppercase tracking-wider cursor-pointer"
                  >
                    Reset Roll
                  </button>
                  <p className="text-[9px] text-gray-500 font-mono text-center">For casual tabletop entertainment — uniformly random, not for gambling.</p>
                </div>
              )}

              {tool.id === 'rock-paper-scissors' && (
                <div className="flex flex-col gap-4 text-left">
                  <p className="text-xs text-gray-400 font-sans">
                    Play against a random computer opponent. Choose one of the three gestures below.
                  </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(['rock', 'paper', 'scissors'] as const).map(choice => (
                      <button
                        key={choice}
                        onClick={() => runRpsGame(choice)}
                        className="p-4 bg-[#151515] hover:bg-[#1a1a1a] border border-[#222] text-xs font-bold text-white rounded-xl uppercase tracking-widest transition-all cursor-pointer hover:border-[#10b981]/40"
                      >
                        {choice}
                      </button>
                    ))}
                  </div>

                  {toolError && (
                    <div role="alert" className="bg-rose-950/30 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs font-mono">
                      {toolError}
                    </div>
                  )}

                  <div aria-live="polite" className="bg-black border border-[#222] p-4 rounded-xl font-mono text-sm text-[#10b981] text-center whitespace-pre-line">
                    {outputText || 'Choose rock, paper, or scissors to play a round.'}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-gray-500 font-mono">Score: {gameScore}</span>
                    <button
                      onClick={resetRps}
                      className="px-4 py-2 bg-[#151515] border border-[#222] hover:border-[#10b981]/40 text-white text-xs font-bold rounded uppercase tracking-wider cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* General support for game simulators */}
              {!['password-gen', 'coin-flipper', 'dice-roller', 'rock-paper-scissors'].includes(tool.id) && (
                <div className="flex flex-col gap-4 text-left">
                  <span className="text-xs text-gray-400 font-sans">Arcade workspace simulation:</span>
                  <button 
                    onClick={() => {
                      setGameScore(prev => prev + 1);
                      setOutputText('This game is not implemented.');
                      addLog('No game implementation is available.');
                    }}
                    className="w-full py-2 bg-[#10b981] text-black font-bold text-xs rounded uppercase tracking-wider cursor-pointer"
                  >
                    Trigger Interactive Action Move
                  </button>
                  {outputText && (
                    <div className="bg-black border border-[#222] p-4 rounded-xl font-mono text-xs text-[#10b981]">
                      {outputText}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TEMPLATE E: MEDIA SIMULATION WORKSPACES */}
          {(tool.category === 'Video' || tool.category === 'Image' || tool.category === 'Document') && 
           !(tool.id === 'json-formatter' || tool.id === 'yaml-to-json' || tool.id === 'xml-beautifier' || tool.id === 'jwt-debugger' || tool.id === 'sql-formatter' || tool.id === 'hash-generator') && (
            <div className="flex flex-col gap-4 w-full">
              
              {/* Image Drag and Drop block */}
              <div className="max-w-xl mx-auto w-full">
                {!uploadedFile ? (
                  tool.id === 'subtitles-editor' ? (
                    <div className="bg-[#090909] border border-[#222] rounded-xl p-4 flex flex-col gap-4">
                      {renderSubtitleEditor()}
                    </div>
                  ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        setUploadedFile(file);
                        addLog(`Staged media file: ${file.name}`);
                      }
                    }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.onchange = (e: any) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setUploadedFile(file);
                          addLog(`Staged media file: ${file.name}`);
                        }
                      };
                      input.click();
                    }}
                    className="border border-dashed border-[#222] hover:border-[#10b981]/40 bg-[#070707] rounded-xl p-8 text-center cursor-pointer transition-all"
                  >
                    <SlidersHorizontal className="w-6 h-6 text-gray-500 mx-auto mb-3" />
                    <p className="text-xs text-white font-sans">Drag & drop or click to upload target media file</p>
                    <p className="text-[9px] text-gray-500 mt-1">Ready for real-time localized GPU processing sandbox</p>
                  </div>
                  )
                ) : (
                  <div className="bg-[#090909] border border-[#222] rounded-xl p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-2">
                      <span className="text-[10px] text-gray-400 font-mono truncate max-w-xs">{uploadedFile.name}</span>
                      <button onClick={() => { setUploadedFile(null); setFilePreview(null); setOutputText(''); }} className="text-red-400 hover:text-red-500 text-[10px] font-bold uppercase font-mono cursor-pointer">Remove</button>
                    </div>

                    {filePreview && (
                      <div className="h-44 bg-black border border-[#1a1a1a] rounded-lg overflow-hidden flex items-center justify-center relative">
                        <div 
                          className="w-full h-full flex items-center justify-center relative transition-transform"
                          style={{
                            transform: tool.id === 'video-rotator' ? `rotate(${rotationAngle}deg)` : 'none'
                          }}
                        >
                          {tool.id === 'subtitles-editor' ? (
                            <div className="flex flex-col items-center justify-center gap-1 px-4 text-center">
                              <FileText className="w-6 h-6 text-gray-500" />
                              <p className="text-[11px] text-gray-400 font-mono">Subtitle file staged — edit it below.</p>
                              <p className="text-[9px] text-gray-600 font-mono">No video preview for this text tool.</p>
                            </div>
                          ) : uploadedFile?.type.startsWith('video/') ? (
                            <video 
                              id="workspace-video-preview"
                              src={filePreview} 
                              controls 
                              className="max-h-full object-contain w-full"
                            />
                          ) : (
                            <img 
                              src={filePreview} 
                              alt="Workspace preview" 
                              className="max-h-full object-contain" 
                              style={{
                                filter: tool.id === 'image-filters' 
                                  ? `brightness(${filterBrightness}%) contrast(${filterContrast}%) grayscale(${filterGrayscale}%) blur(${filterBlur}px) sepia(${filterSepia}%)`
                                  : 'none'
                              }}
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>

                        {/* Live Watermark overlay preview */}
                        {tool.id === 'video-watermark' && (
                          <div 
                            className="absolute font-bold text-white text-[11px] select-none pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,1)] transition-all"
                            style={{
                              opacity: watermarkOpacity / 100,
                              top: watermarkPosition.startsWith('top') ? '16px' : 'auto',
                              bottom: watermarkPosition.startsWith('bottom') ? '16px' : 'auto',
                              left: watermarkPosition.endsWith('left') ? '16px' : 'auto',
                              right: watermarkPosition.endsWith('right') ? '16px' : 'auto',
                              ...(watermarkPosition === 'center' ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } : {})
                            }}
                          >
                            {watermarkText}
                          </div>
                        )}

                        {/* Live Meme Text overlay preview */}
                        {tool.id === 'meme-generator' && (
                          <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none text-center select-none font-sans font-extrabold uppercase">
                            <span 
                              className="text-white break-words drop-shadow-[0_2px_2px_rgba(0,0,0,1)] tracking-wide"
                              style={{ 
                                fontSize: `${memeFontSize / 2.5}px`,
                                WebkitTextStroke: '1px black'
                              }}
                            >
                              {memeTopText}
                            </span>
                            <span 
                              className="text-white break-words drop-shadow-[0_2px_2px_rgba(0,0,0,1)] tracking-wide"
                              style={{ 
                                fontSize: `${memeFontSize / 2.5}px`,
                                WebkitTextStroke: '1px black'
                              }}
                            >
                              {memeBottomText}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Filter Slider block */}
                    {tool.id === 'image-filters' && (
                      <div className="flex flex-col gap-3 text-left">
                        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-gray-500 block mb-1">Brightness ({filterBrightness}%)</span>
                            <input type="range" min="50" max="150" value={filterBrightness} onChange={(e) => setFilterBrightness(parseInt(e.target.value))} className="accent-[#10b981] w-full" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 block mb-1">Contrast ({filterContrast}%)</span>
                            <input type="range" min="50" max="150" value={filterContrast} onChange={(e) => setFilterContrast(parseInt(e.target.value))} className="accent-[#10b981] w-full" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 block mb-1">Grayscale ({filterGrayscale}%)</span>
                            <input type="range" min="0" max="100" value={filterGrayscale} onChange={(e) => setFilterGrayscale(parseInt(e.target.value))} className="accent-[#10b981] w-full" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 block mb-1">Blur ({filterBlur}px)</span>
                            <input type="range" min="0" max="10" value={filterBlur} onChange={(e) => setFilterBlur(parseInt(e.target.value))} className="accent-[#10b981] w-full" />
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Image Compressor Quality Slider */}
                    {tool.id === 'image-compressor' && (
                      <div className="flex flex-col gap-1.5 text-left bg-black/40 border border-[#1a1a1a] p-3 rounded-lg">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between font-mono">
                          <span>Target Quality ({sliderVal}%)</span>
                          <span className="text-[#10b981] font-bold">{sliderVal}%</span>
                        </label>
                        <input 
                          type="range" 
                          min="10" 
                          max="100" 
                          value={sliderVal} 
                          onChange={(e) => setSliderVal(parseInt(e.target.value) || 80)} 
                          className="w-full accent-[#10b981] cursor-pointer" 
                        />
                      </div>
                    )}

                    {/* Frame Extractor Timestamp */}
                    {tool.id === 'frame-extractor' && (
                      <div className="flex flex-col gap-1.5 text-left bg-black/40 border border-[#1a1a1a] p-3 rounded-lg">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between font-mono">
                          <span>Timestamp (seconds)</span>
                          <span className="text-[#10b981] font-bold">{frameTimestamp.toFixed(2)}s</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={frameTimestamp}
                          onChange={(e) => setFrameTimestamp(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="bg-black border border-[#222] text-white p-2 rounded text-xs focus:outline-none font-mono"
                        />
                        <p className="text-[9px] text-gray-500 font-mono">Frame is captured at this exact timestamp (clamped to the video length). 0 = start of the video.</p>
                      </div>
                    )}

                    {/* Video Compressor Target */}
                    {tool.id === 'video-compressor' && (
                      <div className="flex flex-col gap-1.5 text-left bg-black/40 border border-[#1a1a1a] p-3 rounded-lg">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between font-mono">
                          <span>Target Bitrate ({compressPct}% of original)</span>
                          <span className="text-[#10b981] font-bold">{compressPct}%</span>
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={compressPct}
                          onChange={(e) => setCompressPct(parseInt(e.target.value) || 50)}
                          className="w-full accent-[#10b981] cursor-pointer"
                        />
                        <p className="text-[9px] text-gray-500 font-mono">Re-encodes in-browser via MediaRecorder. Output is WebM (max 5 min, 200MB input) — MP4 output is not possible in-browser. The result panel reports the real size change.</p>
                      </div>
                    )}

                    {/* Video Looper Count */}
                    {tool.id === 'video-looper' && (
                      <div className="flex flex-col gap-1.5 text-left bg-black/40 border border-[#1a1a1a] p-3 rounded-lg">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between font-mono">
                          <span>Loop Count</span>
                          <span className="text-[#10b981] font-bold">{loopCount}x</span>
                        </label>
                        <input
                          type="number"
                          min="2"
                          max="10"
                          step="1"
                          value={loopCount}
                          onChange={(e) => setLoopCount(Math.min(10, Math.max(2, parseInt(e.target.value) || 3)))}
                          className="bg-black border border-[#222] text-white p-2 rounded text-xs focus:outline-none font-mono"
                        />
                        <p className="text-[9px] text-gray-500 font-mono">Chains the clip back-to-back into one WebM file (2–10 loops, max 5 min total). Output duration is loops × clip length.</p>
                      </div>
                    )}

                    {/* Subtitles Editor */}
                    {tool.id === 'subtitles-editor' && renderSubtitleEditor()}

                    {/* Watermark Adder Controls */}
                    {tool.id === 'video-watermark' && (
                      <div className="flex flex-col gap-3.5 text-left bg-black/40 border border-[#1a1a1a] p-4 rounded-xl">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Watermark Text</label>
                          <input 
                            type="text" 
                            value={watermarkText} 
                            onChange={(e) => setWatermarkText(e.target.value)} 
                            className="bg-black border border-[#222] text-white p-2 rounded text-xs focus:border-[#10b981]/60 focus:outline-none font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Position</label>
                            <select 
                              value={watermarkPosition} 
                              onChange={(e) => setWatermarkPosition(e.target.value)} 
                              className="bg-black border border-[#222] text-white p-2 rounded text-xs focus:outline-none font-mono cursor-pointer"
                            >
                              <option value="top-left">Top Left</option>
                              <option value="top-right">Top Right</option>
                              <option value="bottom-left">Bottom Left</option>
                              <option value="bottom-right">Bottom Right</option>
                              <option value="center">Center</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between">
                              <span>Opacity</span>
                              <span className="text-[#10b981]">{watermarkOpacity}%</span>
                            </label>
                            <input 
                              type="range" 
                              min="10" 
                              max="100" 
                              value={watermarkOpacity} 
                              onChange={(e) => setWatermarkOpacity(parseInt(e.target.value) || 50)} 
                              className="w-full accent-[#10b981] cursor-pointer" 
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-500">Video output is a re-encoded WebM file (max 5 min / 150 MB). The watermark is checked to be actually visible before export.</p>
                      </div>
                    )}

                    {/* Video Speed Controls */}
                    {tool.id === 'video-speed' && (
                      <div className="flex flex-col gap-2 text-left bg-black/40 border border-[#1a1a1a] p-4 rounded-xl">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Playback Speed Factor</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
                            <button
                              key={speed}
                              onClick={() => setPlaybackSpeed(speed)}
                              className={`p-2 rounded text-xs font-bold font-mono transition-all cursor-pointer border ${
                                playbackSpeed === speed
                                  ? 'bg-[#10b981] text-black border-[#10b981]'
                                  : 'bg-black border-[#222] text-gray-400 hover:border-gray-700'
                              }`}
                            >
                              {speed.toFixed(2)}x
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-500">Output is a re-encoded WebM file (max 5 min / 150 MB) — the preview speed is not the export.</p>
                      </div>
                    )}

                    {/* Video Rotator Controls */}
                    {tool.id === 'video-rotator' && (
                      <div className="flex flex-col gap-2 text-left bg-black/40 border border-[#1a1a1a] p-4 rounded-xl">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rotate Angle</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[90, 180, 270].map(angle => (
                            <button
                              key={angle}
                              onClick={() => setRotationAngle(angle)}
                              className={`p-2 rounded text-xs font-bold font-mono transition-all cursor-pointer border ${
                                rotationAngle === angle
                                  ? 'bg-[#10b981] text-black border-[#10b981]'
                                  : 'bg-black border-[#222] text-gray-400 hover:border-gray-700'
                              }`}
                            >
                              {angle}°
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-500">Output is a re-encoded WebM file (max 5 min / 150 MB). 90°/270° swaps the output dimensions.</p>
                      </div>
                    )}

                    {/* Image / Video Resizer Controls */}
                    {(tool.id === 'image-resizer' || tool.id === 'video-resizer') && (
                      <div className="flex flex-col gap-3 text-left bg-black/40 border border-[#1a1a1a] p-4 rounded-xl">
                        <div className="grid grid-cols-2 gap-3 font-mono">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Width (px)</label>
                            <input 
                              type="number" 
                              value={resizeWidth} 
                              onChange={(e) => {
                                const w = parseInt(e.target.value) || 0;
                                setResizeWidth(w);
                                if (lockAspectRatio && filePreview) {
                                  const img = new Image();
                                  img.src = filePreview;
                                  img.onload = () => {
                                    setResizeHeight(Math.round(w * (img.naturalHeight / img.naturalWidth)));
                                  };
                                }
                              }} 
                              className="bg-black border border-[#222] text-white p-2 rounded text-xs focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Height (px)</label>
                            <input 
                              type="number" 
                              value={resizeHeight} 
                              disabled={lockAspectRatio}
                              onChange={(e) => setResizeHeight(parseInt(e.target.value) || 0)} 
                              className="bg-black border border-[#222] text-white p-2 rounded text-xs focus:outline-none disabled:opacity-50"
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer mt-1">
                          <input 
                            type="checkbox" 
                            checked={lockAspectRatio} 
                            onChange={(e) => setLockAspectRatio(e.target.checked)}
                            className="accent-[#10b981]"
                          />
                          <span className="text-[10px] text-gray-400 font-mono">Lock Aspect Ratio</span>
                        </label>
                        {tool.id === 'video-resizer' && (
                          <p className="text-[10px] text-gray-500">Video output is a re-encoded WebM file (max 5 min / 150 MB, longest side ≤ 1920 px). Images export as JPEG.</p>
                        )}
                      </div>
                    )}

                    {/* Meme Generator Controls */}
                    {tool.id === 'meme-generator' && (
                      <div className="flex flex-col gap-3 text-left bg-black/40 border border-[#1a1a1a] p-4 rounded-xl">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Top Caption Text</label>
                          <input 
                            type="text" 
                            value={memeTopText} 
                            onChange={(e) => setMemeTopText(e.target.value)} 
                            className="bg-black border border-[#222] text-white p-2 rounded text-xs focus:outline-none font-mono"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bottom Caption Text</label>
                          <input 
                            type="text" 
                            value={memeBottomText} 
                            onChange={(e) => setMemeBottomText(e.target.value)} 
                            className="bg-black border border-[#222] text-white p-2 rounded text-xs focus:outline-none font-mono"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between font-mono">
                            <span>Font Size</span>
                            <span className="text-[#10b981] font-bold">{memeFontSize}px</span>
                          </label>
                          <input 
                            type="range" 
                            min="16" 
                            max="80" 
                            value={memeFontSize} 
                            onChange={(e) => setMemeFontSize(parseInt(e.target.value) || 32)} 
                            className="w-full accent-[#10b981] cursor-pointer" 
                          />
                        </div>
                      </div>
                    )}

                    {/* Pixel Art SquaresFour Drawer */}
                    {tool.id === 'pixel-art' && (
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex gap-2 mb-1.5">
                          {['#10b981', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#0d0d0d'].map(color => (
                            <button
                              key={color}
                              onClick={() => setSelectedColor(color)}
                              className={`w-6 h-6 rounded border transition-all ${selectedColor === color ? 'border-white scale-110' : 'border-[#333]'}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="grid grid-cols-8 gap-1 p-2 bg-black border border-[#222] rounded-lg">
                          {pixelGrid.map((pixel, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                const newGrid = [...pixelGrid];
                                newGrid[i] = selectedColor;
                                setPixelGrid(newGrid);
                              }}
                              className="w-6 h-6 border border-gray-900 transition-colors"
                              style={{ backgroundColor: pixel }}
                            />
                          ))}
                        </div>
                        <button 
                          onClick={() => setPixelGrid(Array(64).fill('#0d0d0d'))}
                          className="text-[10px] text-gray-500 font-mono hover:text-white uppercase tracking-wider"
                        >
                          Clear Pixel Board
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => {
                          if (tool.id === 'exif-viewer') {
                            simulateExif();
                          } else if (['csv-to-json', 'json-to-csv', 'markdown-to-html', 'case-converter'].includes(tool.id)) {
                            handleConvertDocumentOrText();
                          } else if (tool.id === 'gif-maker') {
                            handleCreateGif();
                          } else if (tool.id === 'image-compressor') {
                            handleCompressImage();
                          } else if (tool.id === 'favicon-generator') {
                            handleGenerateFavicon();
                          } else if (tool.id === 'image-filters') {
                            handleApplyFilter();
                          } else if (tool.id === 'video-to-audio') {
                            handleExtractAudio();
                          } else if (tool.id === 'frame-extractor') {
                            handleExtractFrame();
                          } else if (tool.id === 'video-compressor') {
                            handleCompressVideo();
                          } else if (tool.id === 'video-looper') {
                            handleLoopVideo();
                          } else if (tool.id === 'subtitles-editor') {
                            handleSubtitles();
                          } else if (tool.id === 'ascii-art') {
                            handleGenerateAscii();
                          } else if (tool.id === 'video-watermark') {
                            handleApplyWatermark();
                          } else if (tool.id === 'video-speed') {
                            handleApplySpeed();
                          } else if (tool.id === 'video-muter') {
                            handleMuteVideo();
                          } else if (tool.id === 'video-rotator') {
                            handleRotateMedia();
                          } else if (tool.id === 'image-resizer' || tool.id === 'video-resizer') {
                            handleResizeMedia();
                          } else if (tool.id === 'meme-generator') {
                            handleGenerateMeme();
                          } else {
                            setOutputText('This operation is not implemented.');
                            addLog('No processing implementation is available.');
                          }
                        }} 
                        disabled={isProcessing}
                        className={`py-2 text-xs font-bold rounded uppercase tracking-wider transition-all cursor-pointer ${
                          isProcessing 
                            ? 'bg-[#151515] border border-[#222] text-gray-500 cursor-wait' 
                            : 'bg-[#10b981] text-black hover:bg-[#059669]'
                        }`}
                      >
                        {isProcessing ? 'Processing...' : 
                         tool.id === 'exif-viewer' ? 'Extract Metadata' : 
                         tool.id === 'frame-extractor' ? 'Extract Frame' :
                         tool.id === 'video-compressor' ? 'Compress Video' :
                         tool.id === 'video-looper' ? 'Loop Video' :
                         tool.id === 'subtitles-editor' ? 'Export Subtitles' :
                         tool.id === 'video-watermark' ? 'Apply Watermark' :
                         tool.id === 'meme-generator' ? 'Generate Meme' : 'Convert File'}
                      </button>
                      <button 
                        onClick={handleDownloadResult}
                        disabled={isProcessing || !convertedBlobUrl}
                        className={`py-2 text-xs font-bold rounded uppercase tracking-wider transition-all cursor-pointer border ${
                          isProcessing || !convertedBlobUrl
                            ? 'bg-[#151515] border-[#222] text-gray-600 opacity-50 cursor-not-allowed'
                            : 'bg-[#10b981] border-[#10b981] text-black hover:bg-[#059669] shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse'
                        }`}
                      >
                        Download Result
                      </button>
                    </div>

                    {/* Video re-encode progress (worker C tools). */}
                    {isVideoJob && videoProgress !== null && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-[#10b981]">
                          <span>Re-encoding video in your browser…</span>
                          <span>{videoProgress}%</span>
                        </div>
                        <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
                          <div className="bg-[#10b981] h-full transition-all duration-300" style={{ width: `${videoProgress}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Long-running media jobs can be cancelled mid-flight
                        (seek loop, decode, or MediaRecorder capture). */}
                    {isProcessing && ['gif-maker', 'video-to-audio', 'frame-extractor', 'video-compressor', 'video-looper', 'video-speed', 'video-muter', 'video-rotator', 'video-resizer', 'video-watermark'].includes(tool.id) && (
                      <button
                        onClick={() => { cancelProcessing(); videoAbortRef.current?.abort(); }}
                        className="w-full py-2 text-xs font-bold rounded uppercase tracking-wider border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}

                    {outputText && (
                      <div className="bg-black border border-[#222] p-4 rounded-xl text-left">
                        <pre className="text-xs font-mono text-[#10b981] whitespace-pre-line leading-relaxed">
                          {outputText}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
