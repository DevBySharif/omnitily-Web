/**
 * Search-phrased `<title>` values for every functional (indexable) tool.
 *
 * The H1 on each tool page stays the tool's display name from
 * `src/toolsData.ts`; these titles are only for the `<title>` tag, written
 * in natural search phrasing per the SEO audit (§4 target queries, §5 item 7).
 *
 * Rules applied to every entry:
 * - natural query phrasing, tool's own name (or its core phrase) recognisable
 * - no keyword stuffing, no emojis
 * - at most 65 characters
 *
 * Keyed by tool id. Covers all 101 functional tools.
 */
export const TOOL_SEO_TITLES: Record<string, string> = {
  // Video (17)
  'video-splitter': 'Split Video Online Free — Video Splitter | Omnitily',
  'social-downloader': 'Download Social Media Videos Free | Omnitily',
  'youtube-downloader': 'Download YouTube Videos Free, No Watermark | Omnitily',
  'instagram-downloader': 'Download Instagram Reels & Videos Free | Omnitily',
  'tiktok-downloader': 'Download TikTok Videos Without Watermark | Omnitily',
  'facebook-downloader': 'Download Facebook Videos & Reels Free | Omnitily',
  'gif-maker': 'Make a GIF from Video Online Free | Omnitily',
  'video-to-audio': 'Convert Video to MP3 Online Free | Omnitily',
  'frame-extractor': 'Extract Frames from Video Online Free | Omnitily',
  'video-speed': 'Change Video Speed Online Free | Omnitily',
  'video-muter': 'Remove Audio from Video Online Free | Omnitily',
  'video-compressor': 'Compress Video Online Free | Omnitily',
  'video-looper': 'Loop Video Online Free — Video Looper | Omnitily',
  'video-rotator': 'Rotate Video Online Free | Omnitily',
  'video-resizer': 'Resize Video Online Free | Omnitily',
  'video-watermark': 'Add Watermark to Video Online Free | Omnitily',
  'subtitles-editor': 'Add Subtitles to Video — SRT Editor Online | Omnitily',

  // Image (10)
  'image-converter': 'Convert Images Online — Image Converter | Omnitily',
  'color-extractor': 'Extract Colors from Image — Palette Tool | Omnitily',
  'image-compressor': 'Compress Image Online Free | Omnitily',
  'image-cropper': 'Crop Image Online Free | Omnitily',
  'pixel-art': 'Pixel Art Maker Online Free | Omnitily',
  'exif-viewer': 'View EXIF Data from Photos Online | Omnitily',
  'favicon-generator': 'Favicon Generator Online Free | Omnitily',
  'svg-optimizer': 'Optimize SVG Online Free | Omnitily',
  'image-resizer': 'Resize Image Online Free | Omnitily',
  'gradient-generator': 'CSS Gradient Generator Online Free | Omnitily',

  // Document (8)
  'pdf-compiler': 'JPG to PDF Online Free — Images to PDF | Omnitily',
  'pdf-to-txt': 'Convert PDF to Text Online Free | Omnitily',
  'txt-to-pdf': 'Convert Text to PDF Online Free | Omnitily',
  'pdf-splitter': 'Split PDF Online Free | Omnitily',
  'epub-to-pdf': 'Convert EPUB to PDF Online Free | Omnitily',
  'excel-to-csv': 'Convert Excel to CSV Online Free | Omnitily',
  'pdf-merger': 'Merge PDF Files Online Free | Omnitily',
  'pdf-rotator': 'Rotate PDF Pages Online Free | Omnitily',

  // Audio (9)
  'sound-recorder': 'Record Audio Online Free — Voice Recorder | Omnitily',
  'audio-merger': 'Merge Audio Files Online Free | Omnitily',
  'voice-changer': 'Voice Changer Online Free | Omnitily',
  'vocal-remover': 'Remove Vocals from Audio Online Free | Omnitily',
  'silence-remover': 'Remove Silence from Audio Online Free | Omnitily',
  'audio-speed': 'Change Audio Speed Online Free | Omnitily',
  'bpm-finder': 'Find BPM of a Song Online — Tap Tempo | Omnitily',
  'metronome': 'Online Metronome Free — Rhythm & Tempo | Omnitily',
  'audio-converter': 'Convert Audio to MP3 Online Free | Omnitily',

  // Text & Writing (16)
  'case-converter': 'Convert Text Case Online — Uppercase Tool | Omnitily',
  'word-counter': 'Word Counter Online Free | Omnitily',
  'lorem-ipsum': 'Lorem Ipsum Generator Online Free | Omnitily',
  'text-diff': 'Compare Text Online — Text Diff Checker | Omnitily',
  'markdown-editor': 'Markdown Editor Online Free | Omnitily',
  'regex-tester': 'Test Regex Online Free — RegEx Tester | Omnitily',
  'slug-generator': 'URL Slug Generator Online Free | Omnitily',
  'text-sorter': 'Sort Text Lines Online Free | Omnitily',
  'find-replace': 'Find and Replace Text Online Free | Omnitily',
  'morse-translator': 'Morse Code Translator Online Free | Omnitily',
  'base64-coder': 'Base64 Encoder & Decoder Online Free | Omnitily',
  'url-coder': 'URL Encoder & Decoder Online Free | Omnitily',
  'html-entities': 'HTML Entity Encoder Online Free | Omnitily',
  'text-reverser': 'Reverse Text Online Free | Omnitily',
  'line-remover': 'Remove Duplicate Lines Online Free | Omnitily',
  'sentence-generator': 'Sentence Generator Online Free | Omnitily',

  // Developer Tools (14)
  'qr-generator': 'QR Code Generator Online Free | Omnitily',
  'json-formatter': 'JSON Formatter Online Free | Omnitily',
  'hash-generator': 'Hash Generator Online Free — SHA-256 | Omnitily',
  'uuid-generator': 'UUID Generator Online Free | Omnitily',
  'yaml-to-json': 'Convert YAML to JSON Online Free | Omnitily',
  'xml-beautifier': 'XML Beautifier Online Free | Omnitily',
  'jwt-debugger': 'JWT Decoder Online Free — Token Parser | Omnitily',
  'sql-formatter': 'SQL Formatter Online Free | Omnitily',
  'cron-parser': 'Cron Expression Checker Online Free | Omnitily',
  'color-blender': 'Blend Colors Online — HEX Color Blender | Omnitily',
  'contrast-checker': 'Color Contrast Checker Online Free | Omnitily',
  'base-converter': 'Base Converter Online — Binary, Hex, Decimal | Omnitily',
  'user-agent': 'User Agent Checker Online Free | Omnitily',
  'mock-api': 'Mock API Response Builder Online Free | Omnitily',

  // Math & Finance (8)
  'scientific-calc': 'Scientific Calculator Online Free | Omnitily',
  'unit-converter': 'Unit Converter Online Free | Omnitily',
  'currency-converter': 'Currency Converter Online Free | Omnitily',
  'percent-calc': 'Percentage Calculator Online Free | Omnitily',
  'tip-calc': 'Tip Calculator Online Free — Split the Bill | Omnitily',
  'matrix-calc': 'Matrix Calculator Online Free | Omnitily',
  'binary-math': 'Binary Calculator Online Free | Omnitily',
  'fibonacci-gen': 'Fibonacci Sequence Calculator Online | Omnitily',

  // Health & Lifestyle (9)
  'bmi-calc': 'BMI Calculator Online Free | Omnitily',
  'bmr-calc': 'BMR Calculator Online Free | Omnitily',
  'calorie-counter': 'Calorie Counter Online Free | Omnitily',
  'planner': 'Daily Planner Online Free — Hourly Tasks | Omnitily',
  'breath-guide': 'Box Breathing Exercise Online Free | Omnitily',
  'step-sim': 'Step Counter to Calories Online Free | Omnitily',
  'habit-tracker': 'Habit Tracker Online Free | Omnitily',
  'water-tracker': 'Water Intake Tracker Online Free | Omnitily',
  'sleep-calculator': 'Sleep Calculator Online Free | Omnitily',

  // Fun & Games (10)
  'password-gen': 'Secure Password Generator Online Free | Omnitily',
  'dice-roller': 'Dice Roller Online Free — D4, D6, D20 | Omnitily',
  'rock-paper-scissors': 'Rock Paper Scissors Online Free | Omnitily',
  'tic-tac-toe': 'Play Tic-Tac-Toe Online Free | Omnitily',
  'name-picker': 'Random Name Picker Wheel Online Free | Omnitily',
  'love-calculator': 'Love Calculator Online Free | Omnitily',
  'trivia-quiz': 'Trivia Quiz Online Free | Omnitily',
  'reaction-test': 'Reaction Time Test Online Free | Omnitily',
  'anagram-solver': 'Anagram Solver Online Free | Omnitily',
  'sudoku-solver': 'Sudoku Solver Online Free | Omnitily',
};
