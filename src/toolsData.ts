import type { ProcessingType, ToolCategory, ToolComponentKey, ToolDefinition, ToolStatus } from './types.ts';

interface ToolCatalogSeed {
  id: string;
  title: string;
  description: string;
  category: ToolCategory;
  icon: string;
  color: string;
  badge?: string;
}

const TOOL_CATALOG = [
  // --- VIDEO & ANIMATION (12 tools) ---
  {
    id: 'video-splitter',
    title: 'Video Splitting & Cutting',
    description: 'Trim, segment and extract ranges from MP4 and WebM files client-side.',
    category: 'Video',
    icon: 'Scissors',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5',
    badge: 'Popular'
  },
  {
    id: 'social-downloader',
    title: 'Social Video Downloader',
    description: 'Download HD videos and extracts from YouTube, TikTok, Instagram, Facebook, and Twitter.',
    category: 'Video',
    icon: 'Download',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5',
    badge: 'Popular'
  },
  {
    id: 'youtube-downloader',
    title: 'YouTube Downloader',
    description: 'Download public YouTube videos, shorts, and music via a self-hosted Cobalt API backend.',
    category: 'Video',
    icon: 'YoutubeLogo',
    color: 'border-red-500/20 hover:border-red-500/60 text-red-400 bg-red-500/5'
  },
  {
    id: 'instagram-downloader',
    title: 'Instagram Downloader',
    description: 'Download public Instagram reels, posts, and stories via a self-hosted Cobalt API backend.',
    category: 'Video',
    icon: 'InstagramLogo',
    color: 'border-pink-500/20 hover:border-pink-500/60 text-pink-400 bg-pink-500/5'
  },
  {
    id: 'tiktok-downloader',
    title: 'TikTok Downloader',
    description: 'Download public TikTok videos via a self-hosted Cobalt API backend.',
    category: 'Video',
    icon: 'TiktokLogo',
    color: 'border-cyan-500/20 hover:border-cyan-500/60 text-cyan-400 bg-cyan-500/5'
  },
  {
    id: 'facebook-downloader',
    title: 'Facebook Downloader',
    description: 'Download public Facebook videos and reels via a self-hosted Cobalt API backend.',
    category: 'Video',
    icon: 'FacebookLogo',
    color: 'border-blue-500/20 hover:border-blue-500/60 text-blue-400 bg-blue-500/5'
  },
  {
    id: 'gif-maker',
    title: 'GIF Converter & Maker',
    description: 'Convert MP4 videos or multiple static images into lightweight animated GIFs.',
    category: 'Video',
    icon: 'FilmStrip',
    color: 'border-blue-500/20 hover:border-blue-500/60 text-blue-400 bg-blue-500/5'
  },
  {
    id: 'video-to-audio',
    title: 'Video to Audio Extractor',
    description: 'Extract the audio track from MP4/WebM video files as a WAV file entirely in your browser.',
    category: 'Video',
    icon: 'Radio',
    color: 'border-cyan-500/20 hover:border-cyan-500/60 text-cyan-400 bg-cyan-500/5'
  },
  {
    id: 'frame-extractor',
    title: 'Video Frame Grabber',
    description: 'Scrub and extract pixel-perfect JPEG image frames from raw video files.',
    category: 'Video',
    icon: 'Camera',
    color: 'border-sky-500/20 hover:border-sky-500/60 text-sky-400 bg-sky-500/5'
  },
  {
    id: 'video-speed',
    title: 'Video Speed Controller',
    description: 'Speed up or slow down video playbacks (0.25x - 4x) and export the adjusted clip.',
    category: 'Video',
    icon: 'Gauge',
    color: 'border-violet-500/20 hover:border-violet-500/60 text-violet-400 bg-violet-500/5'
  },
  {
    id: 'video-muter',
    title: 'Video Audio Remover',
    description: 'Instantly strip audio tracks from video clips with one click before sharing.',
    category: 'Video',
    icon: 'SpeakerSlash',
    color: 'border-purple-500/20 hover:border-purple-500/60 text-purple-400 bg-purple-500/5'
  },
  {
    id: 'video-compressor',
    title: 'Video Compressor',
    description: 'Reduce MP4/WebM file sizes using localized client-side bitrate configurations.',
    category: 'Video',
    icon: 'CornersIn',
    color: 'border-pink-500/20 hover:border-pink-500/60 text-pink-400 bg-pink-500/5'
  },
  {
    id: 'video-looper',
    title: 'Video Looper & Repeater',
    description: 'Chain a small video clip back-to-back to create infinite decorative loop segments.',
    category: 'Video',
    icon: 'ArrowsCounterClockwise',
    color: 'border-fuchsia-500/20 hover:border-fuchsia-500/60 text-fuchsia-400 bg-fuchsia-500/5'
  },
  {
    id: 'video-rotator',
    title: 'Video Rotator',
    description: 'Rotate skewed video feeds 90, 180, or 270 degrees client-side.',
    category: 'Video',
    icon: 'ArrowClockwise',
    color: 'border-rose-500/20 hover:border-rose-500/60 text-rose-400 bg-rose-500/5'
  },
  {
    id: 'video-resizer',
    title: 'Video Aspect Ratio Resizer',
    description: 'Resize video dimensions to fit portrait, landscape, or square feed aspect ratios.',
    category: 'Video',
    icon: 'Crop',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'video-watermark',
    title: 'Video Watermark Adder',
    description: 'Overlay secure customized text or floating brand logo icons on video clips.',
    category: 'Video',
    icon: 'Stack',
    color: 'border-teal-500/20 hover:border-teal-500/60 text-teal-400 bg-teal-500/5'
  },
  {
    id: 'subtitles-editor',
    title: 'SRT Subtitle Creator',
    description: 'Draft, validate, and export standard SRT/VTT subtitle files, or build timed cues from plain lines.',
    category: 'Video',
    icon: 'FileText',
    color: 'border-amber-500/20 hover:border-amber-500/60 text-amber-400 bg-amber-500/5'
  },

  // --- IMAGE & DESIGN (13 tools) ---
  {
    id: 'image-converter',
    title: 'Image Format Converter',
    description: 'Convert, compress and resize JPEG, PNG and WebP files in batches.',
    category: 'Image',
    icon: 'FileImage',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5',
    badge: 'Popular'
  },
  {
    id: 'color-extractor',
    title: 'Color Palette Extractor',
    description: 'Analyze pixels in any uploaded image to harvest distinct HEX color clusters.',
    category: 'Image',
    icon: 'Palette',
    color: 'border-fuchsia-500/20 hover:border-fuchsia-500/60 text-fuchsia-400 bg-fuchsia-500/5'
  },
  {
    id: 'image-compressor',
    title: 'Smart Image Compressor',
    description: 'Reduce PNG/JPEG file size by up to 80% without losing visual fidelity.',
    category: 'Image',
    icon: 'Download',
    color: 'border-teal-500/20 hover:border-teal-500/60 text-teal-400 bg-teal-500/5'
  },
  {
    id: 'image-cropper',
    title: 'Client-Side Image Cropper',
    description: 'Crop, flip, rotate, and scale photos with highly responsive visual drag handles.',
    category: 'Image',
    icon: 'Crop',
    color: 'border-sky-500/20 hover:border-sky-500/60 text-sky-400 bg-sky-500/5'
  },
  {
    id: 'meme-generator',
    title: 'Aesthetic Meme Generator',
    description: 'Upload custom layouts and overlay multi-line bold impact text caps instantly.',
    category: 'Image',
    icon: 'Smiley',
    color: 'border-pink-500/20 hover:border-pink-500/60 text-pink-400 bg-pink-500/5'
  },
  {
    id: 'pixel-art',
    title: 'Interactive Pixel Art Maker',
    description: 'Design custom 8-bit visual artwork using a retro canvas board grid.',
    category: 'Image',
    icon: 'SquaresFour',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'exif-viewer',
    title: 'EXIF Metadata Inspector',
    description: 'Read underlying shutter, camera sensor details, and location geotags from photos.',
    category: 'Image',
    icon: 'Eye',
    color: 'border-blue-500/20 hover:border-blue-500/60 text-blue-400 bg-blue-500/5'
  },
  {
    id: 'favicon-generator',
    title: 'Favicon & App Icon Generator',
    description: 'Generate multi-size .ico files and Android/iOS apple-touch configuration icons.',
    category: 'Image',
    icon: 'Lightning',
    color: 'border-cyan-500/20 hover:border-cyan-500/60 text-cyan-400 bg-cyan-500/5'
  },
  {
    id: 'svg-optimizer',
    title: 'SVG Optimizer & Beautifier',
    description: 'Clean up nested tags, optimize coordinates, and minify vector files.',
    category: 'Image',
    icon: 'Sparkle',
    color: 'border-amber-500/20 hover:border-amber-500/60 text-amber-400 bg-amber-500/5'
  },
  {
    id: 'image-filters',
    title: 'CSS Photo Filters',
    description: 'Apply high-fidelity sepia, grayscale, saturation, or blur adjustments client-side.',
    category: 'Image',
    icon: 'Sliders',
    color: 'border-violet-500/20 hover:border-violet-500/60 text-violet-400 bg-violet-500/5'
  },
  {
    id: 'image-resizer',
    title: 'Image Dimension Scaler',
    description: 'Scale width and height coordinates while preserving proportional aspect lock ratios.',
    category: 'Image',
    icon: 'CornersOut',
    color: 'border-rose-500/20 hover:border-rose-500/60 text-rose-400 bg-rose-500/5'
  },
  {
    id: 'gradient-generator',
    title: 'Aesthetic CSS Gradient Designer',
    description: 'Create multi-stop radial and linear gradients and export ready-made CSS variables.',
    category: 'Image',
    icon: 'Palette',
    color: 'border-orange-500/20 hover:border-orange-500/60 text-orange-400 bg-orange-500/5'
  },
  {
    id: 'ascii-art',
    title: 'Image to ASCII Converter',
    description: 'Map pixels into mono character sets to create nostalgic terminal text art.',
    category: 'Image',
    icon: 'Terminal',
    color: 'border-stone-500/20 hover:border-stone-500/60 text-stone-400 bg-stone-500/5'
  },

  // --- DOCUMENTS & PDF (11 tools) ---
  {
    id: 'pdf-compiler',
    title: 'PDF Compiler (Images to PDF)',
    description: 'Sort and compile screenshots, receipts or photos into clean, multi-page PDFs.',
    category: 'Document',
    icon: 'FileText',
    color: 'border-rose-500/20 hover:border-rose-500/60 text-rose-400 bg-rose-500/5',
    badge: 'Popular'
  },
  {
    id: 'pdf-to-txt',
    title: 'PDF to Text Extractor',
    description: 'Scan and extract raw strings or paragraphs out of structural PDF files offline.',
    category: 'Document',
    icon: 'File',
    color: 'border-amber-500/20 hover:border-amber-500/60 text-amber-400 bg-amber-500/5'
  },
  {
    id: 'txt-to-pdf',
    title: 'Plain Text to PDF Maker',
    description: 'Format, style, and print raw TXT documents into clean, structured PDF reports.',
    category: 'Document',
    icon: 'FileArrowUp',
    color: 'border-teal-500/20 hover:border-teal-500/60 text-teal-400 bg-teal-500/5'
  },
  {
    id: 'pdf-splitter',
    title: 'PDF Page Splitter',
    description: 'Extract specific pages or segment a multi-page PDF into separate file chunks.',
    category: 'Document',
    icon: 'Scissors',
    color: 'border-blue-500/20 hover:border-blue-500/60 text-blue-400 bg-blue-500/5'
  },
  {
    id: 'epub-to-pdf',
    title: 'EPUB to PDF Converter',
    description: 'Convert standard reflowable ePUB files into highly readable fixed PDF pages.',
    category: 'Document',
    icon: 'BookOpen',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'csv-to-json',
    title: 'CSV to JSON Structurer',
    description: 'Deconstruct spreadsheet tables into structured JSON datasets and arrays.',
    category: 'Document',
    icon: 'Binary',
    color: 'border-cyan-500/20 hover:border-cyan-500/60 text-cyan-400 bg-cyan-500/5'
  },
  {
    id: 'excel-to-csv',
    title: 'Excel to CSV Converter',
    description: 'Parse legacy and modern .xlsx files client-side and export them as standard CSV.',
    category: 'Document',
    icon: 'FileCsv',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'pdf-merger',
    title: 'PDF File Merger',
    description: 'Stitch and combine multiple complete PDF volumes together in sequential order.',
    category: 'Document',
    icon: 'FilePlus',
    color: 'border-purple-500/20 hover:border-purple-500/60 text-purple-400 bg-purple-500/5'
  },
  {
    id: 'pdf-rotator',
    title: 'PDF Page Rotator',
    description: 'Correct skewed portrait or landscape orientations of PDF file pages.',
    category: 'Document',
    icon: 'ArrowClockwise',
    color: 'border-pink-500/20 hover:border-pink-500/60 text-pink-400 bg-pink-500/5'
  },
  {
    id: 'json-to-csv',
    title: 'JSON to CSV Converter',
    description: 'Flatten structured JSON arrays and nested logs into standard table-ready CSVs.',
    category: 'Document',
    icon: 'ListBullets',
    color: 'border-violet-500/20 hover:border-violet-500/60 text-violet-400 bg-violet-500/5'
  },
  {
    id: 'markdown-to-html',
    title: 'Markdown to HTML compiler',
    description: 'Compile GitHub-flavored Markdown text directly into semantic HTML scripts.',
    category: 'Document',
    icon: 'Code',
    color: 'border-rose-500/20 hover:border-rose-500/60 text-rose-400 bg-rose-500/5'
  },

  // --- AUDIO & MUSIC (11 tools) ---
  {
    id: 'audio-trimmer',
    title: 'Audio Waveform Trimmer',
    description: 'Visualize waveforms, trim segments and encode custom WAV/MP3 clips.',
    category: 'Audio',
    icon: 'MusicNotes',
    color: 'border-purple-500/20 hover:border-purple-500/60 text-purple-400 bg-purple-500/5',
    badge: 'Popular'
  },
  {
    id: 'audio-transcriber',
    title: 'AI Audio Transcriber',
    description: 'Transcribe voice notes, tracks, or audio clips with exact timestamp blocks using AI.',
    category: 'Audio',
    icon: 'Sparkle',
    color: 'border-amber-500/20 hover:border-amber-500/60 text-amber-400 bg-amber-500/5',
    badge: 'New'
  },
  {
    id: 'sound-recorder',
    title: 'High-Fidelity Voice Recorder',
    description: 'Record high-quality vocal memos and sound feeds using customizable mic levels.',
    category: 'Audio',
    icon: 'Microphone',
    color: 'border-red-500/20 hover:border-red-500/60 text-red-400 bg-red-500/5'
  },
  {
    id: 'audio-merger',
    title: 'Audio Clip Merger',
    description: 'Seamlessly glue and combine multiple audio feeds (WAV/MP3) into one solid track.',
    category: 'Audio',
    icon: 'FilePlus',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'voice-changer',
    title: 'Real-Time Voice Modulator',
    description: 'Pitch-shift vocal frequencies or apply robot, chipmunk, or cathedral reverb sounds.',
    category: 'Audio',
    icon: 'Radio',
    color: 'border-pink-500/20 hover:border-pink-500/60 text-pink-400 bg-pink-500/5'
  },
  {
    id: 'vocal-remover',
    title: 'Vocal Splitter',
    description: 'Synthesize audio files to isolate clean vocals and instrumental karaoke tracks.',
    category: 'Audio',
    icon: 'SpeakerHigh',
    color: 'border-cyan-500/20 hover:border-cyan-500/60 text-cyan-400 bg-cyan-500/5'
  },
  {
    id: 'silence-remover',
    title: 'Audio Silence Cutter',
    description: 'Analyze acoustic frequencies to strip long segments of dead silence automatically.',
    category: 'Audio',
    icon: 'SpeakerSlash',
    color: 'border-teal-500/20 hover:border-teal-500/60 text-teal-400 bg-teal-500/5'
  },
  {
    id: 'audio-speed',
    title: 'Audio Speed Changer',
    description: 'Change sound speeds (0.5x - 2.0x) without altering base acoustic pitches.',
    category: 'Audio',
    icon: 'Gauge',
    color: 'border-violet-500/20 hover:border-violet-500/60 text-violet-400 bg-violet-500/5'
  },
  {
    id: 'bpm-finder',
    title: 'Tap Tempo & BPM Counter',
    description: 'Tap along to any music track beat to identify precise Beats Per Minute counts.',
    category: 'Audio',
    icon: 'Pulse',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'metronome',
    title: 'Rhythm & Tempo Metronome',
    description: 'Keep perfect time with a customizable tick clock metronome for instrument practice.',
    category: 'Audio',
    icon: 'Timer',
    color: 'border-blue-500/20 hover:border-blue-500/60 text-blue-400 bg-blue-500/5'
  },
  {
    id: 'audio-converter',
    title: 'Audio Format Converter',
    description: 'Convert raw files client-side between standard MP3, WAV, OGG, and FLAC formats.',
    category: 'Audio',
    icon: 'Shuffle',
    color: 'border-rose-500/20 hover:border-rose-500/60 text-rose-400 bg-rose-500/5'
  },

  // --- TEXT & WRITING (17 tools) ---
  {
    id: 'case-converter',
    title: 'Text Case Converter',
    description: 'Convert strings to UPPERCASE, lowercase, Title Case, camelCase, or snake_case.',
    category: 'Text & Writing',
    icon: 'TextT',
    color: 'border-orange-500/20 hover:border-orange-500/60 text-orange-400 bg-orange-500/5'
  },
  {
    id: 'word-counter',
    title: 'Word & Character Counter',
    description: 'Count paragraphs, words, letters, reading speeds, and density logs in real time.',
    category: 'Text & Writing',
    icon: 'FileText',
    color: 'border-amber-500/20 hover:border-amber-500/60 text-amber-400 bg-amber-500/5'
  },
  {
    id: 'lorem-ipsum',
    title: 'Lorem Ipsum Generator',
    description: 'Generate standard dummy placeholder strings, paragraphs, or lists for layout drafts.',
    category: 'Text & Writing',
    icon: 'ListBullets',
    color: 'border-teal-500/20 hover:border-teal-500/60 text-teal-400 bg-teal-500/5'
  },
  {
    id: 'text-diff',
    title: 'Text Diff Checker',
    description: 'Compare two text logs side-by-side to pinpoint line and character variances.',
    category: 'Text & Writing',
    icon: 'Shuffle',
    color: 'border-rose-500/20 hover:border-rose-500/60 text-rose-400 bg-rose-500/5'
  },
  {
    id: 'markdown-editor',
    title: 'Interactive Markdown Editor',
    description: 'Write, preview, and render full GitHub-flavored Markdown text to styled HTML pages.',
    category: 'Text & Writing',
    icon: 'Edit3',
    color: 'border-blue-500/20 hover:border-blue-500/60 text-blue-400 bg-blue-500/5'
  },
  {
    id: 'regex-tester',
    title: 'Interactive RegEx Tester',
    description: 'Test, parse, and validate complex regular expression strings with matched highlighting.',
    category: 'Text & Writing',
    icon: 'Sparkle',
    color: 'border-purple-500/20 hover:border-purple-500/60 text-purple-400 bg-purple-500/5'
  },
  {
    id: 'slug-generator',
    title: 'URL Slug & SEO Link Maker',
    description: 'Cleanse and convert raw article titles into search engine-friendly URL strings.',
    category: 'Text & Writing',
    icon: 'Link',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'text-sorter',
    title: 'Alphabetical Line Sorter',
    description: 'Sort lists alphabetically, numerically, in reverse, or by string length with filters.',
    category: 'Text & Writing',
    icon: 'ListBullets',
    color: 'border-violet-500/20 hover:border-violet-500/60 text-violet-400 bg-violet-500/5'
  },
  {
    id: 'find-replace',
    title: 'Find & Replace Text Engine',
    description: 'Find strings or matches and replace them globally with selective ignore-case rules.',
    category: 'Text & Writing',
    icon: 'MagnifyingGlass',
    color: 'border-sky-500/20 hover:border-sky-500/60 text-sky-400 bg-sky-500/5'
  },
  {
    id: 'morse-translator',
    title: 'Morse Code Translator',
    description: 'Translate standard text to Morse code and play back the audio sound.',
    category: 'Text & Writing',
    icon: 'SpeakerHigh',
    color: 'border-cyan-500/20 hover:border-cyan-500/60 text-cyan-400 bg-cyan-500/5'
  },
  {
    id: 'binary-translator',
    title: 'Binary to Text Translator',
    description: 'Encode characters to 8-bit binary numbers or translate binary sequences back.',
    category: 'Text & Writing',
    icon: 'Binary',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'base64-coder',
    title: 'Base64 Encoder & Decoder',
    description: 'Convert characters to Base64 formats or decode secured parameters.',
    category: 'Text & Writing',
    icon: 'ShieldCheck',
    color: 'border-pink-500/20 hover:border-pink-500/60 text-pink-400 bg-pink-500/5'
  },
  {
    id: 'url-coder',
    title: 'URL Encoder & Decoder',
    description: 'Encode special characters into clean web-safe URL address parameters.',
    category: 'Text & Writing',
    icon: 'Link',
    color: 'border-fuchsia-500/20 hover:border-fuchsia-500/60 text-fuchsia-400 bg-fuchsia-500/5'
  },
  {
    id: 'html-entities',
    title: 'HTML Entity Encoder',
    description: 'Safely convert signs like <, >, and & into standard safe HTML browser codes.',
    category: 'Text & Writing',
    icon: 'Code',
    color: 'border-violet-500/20 hover:border-violet-500/60 text-violet-400 bg-violet-500/5'
  },
  {
    id: 'text-reverser',
    title: 'Text Reverser & Mirror',
    description: 'Instantly flip characters, complete words, or entire lists backward.',
    category: 'Text & Writing',
    icon: 'ArrowsCounterClockwise',
    color: 'border-stone-500/20 hover:border-stone-500/60 text-stone-400 bg-stone-500/5'
  },
  {
    id: 'line-remover',
    title: 'Duplicate Line Remover',
    description: 'Clean lists of strings by removing empty spaces and matching duplicate lines.',
    category: 'Text & Writing',
    icon: 'Trash',
    color: 'border-rose-500/20 hover:border-rose-500/60 text-rose-400 bg-rose-500/5'
  },
  {
    id: 'sentence-generator',
    title: 'Creative Prompt Generator',
    description: 'Generate random sentence prompts and vocabulary combinations for writing exercises.',
    category: 'Text & Writing',
    icon: 'Sparkle',
    color: 'border-lime-500/20 hover:border-lime-500/60 text-lime-400 bg-lime-500/5'
  },

  // --- DEVELOPER UTILITIES (15 tools) ---
  {
    id: 'qr-generator',
    title: 'QR Code Generator',
    description: 'Create customized scannable QR codes with custom background and colors.',
    category: 'Developer Tools',
    icon: 'QrCode',
    color: 'border-amber-500/20 hover:border-amber-500/60 text-amber-400 bg-amber-500/5',
    badge: 'Online API'
  },
  {
    id: 'json-formatter',
    title: 'JSON Beautifier & Validator',
    description: 'Beautify nested key structures, fix syntax, and validate JSON objects instantly.',
    category: 'Developer Tools',
    icon: 'FileCode',
    color: 'border-blue-500/20 hover:border-blue-500/60 text-blue-400 bg-blue-500/5'
  },
  {
    id: 'hash-generator',
    title: 'Cryptographic Hash Solver',
    description: 'Generate standard MD5, SHA-1, SHA-256, and SHA-512 values from text strings.',
    category: 'Developer Tools',
    icon: 'Hash',
    color: 'border-red-500/20 hover:border-red-500/60 text-red-400 bg-red-500/5'
  },
  {
    id: 'uuid-generator',
    title: 'UUID Batch Generator',
    description: 'Generate cryptographically secure RFC4122 Version 4 UUID strings in batches.',
    category: 'Developer Tools',
    icon: 'Lightning',
    color: 'border-violet-500/20 hover:border-violet-500/60 text-violet-400 bg-violet-500/5'
  },
  {
    id: 'yaml-to-json',
    title: 'YAML to JSON Converter',
    description: 'Convert legible YAML configurations into clean structured JSON formats.',
    category: 'Developer Tools',
    icon: 'Shuffle',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'xml-beautifier',
    title: 'XML Beautifier & Pretty-Printer',
    description: 'Pretty print, re-align, and format dense nested XML documents.',
    category: 'Developer Tools',
    icon: 'Layout',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'jwt-debugger',
    title: 'JSON Web Token (JWT) Parser',
    description: 'Decode, inspect, and audit headers, payloads, and signatures of JWT credentials.',
    category: 'Developer Tools',
    icon: 'ShieldCheck',
    color: 'border-pink-500/20 hover:border-pink-500/60 text-pink-400 bg-pink-500/5'
  },
  {
    id: 'sql-formatter',
    title: 'SQL Query Formatter',
    description: 'Pretty print dense database queries with clean indent structures.',
    category: 'Developer Tools',
    icon: 'Database',
    color: 'border-cyan-500/20 hover:border-cyan-500/60 text-cyan-400 bg-cyan-500/5'
  },
  {
    id: 'cron-parser',
    title: 'Cron Expression Checker',
    description: 'Check cron schedule expressions to discover standard recurring timetables.',
    category: 'Developer Tools',
    icon: 'Clock',
    color: 'border-sky-500/20 hover:border-sky-500/60 text-sky-400 bg-sky-500/5'
  },
  {
    id: 'port-scanner',
    title: 'Port Ingress Simulator',
    description: 'Safely test and audit local network connection port parameters inside the sandbox.',
    category: 'Developer Tools',
    icon: 'Pulse',
    color: 'border-orange-500/20 hover:border-orange-500/60 text-orange-400 bg-orange-500/5'
  },
  {
    id: 'color-blender',
    title: 'HEX Color Blender & Mixer',
    description: 'Blend Hex colors together in proportional steps to generate custom palettes.',
    category: 'Developer Tools',
    icon: 'Palette',
    color: 'border-fuchsia-500/20 hover:border-fuchsia-500/60 text-fuchsia-400 bg-fuchsia-500/5'
  },
  {
    id: 'contrast-checker',
    title: 'WCAG Accessibility Checker',
    description: 'Verify background and foreground colors to make sure layouts meet accessibility standards.',
    category: 'Developer Tools',
    icon: 'Eye',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'base-converter',
    title: 'Base System Number Converter',
    description: 'Convert values between standard Hex, Octal, Decimal, and Binary bases.',
    category: 'Developer Tools',
    icon: 'Shuffle',
    color: 'border-rose-500/20 hover:border-rose-500/60 text-rose-400 bg-rose-500/5'
  },
  {
    id: 'user-agent',
    title: 'User Agent Inspector',
    description: 'Deconstruct browser headers, operating system, and hardware rendering details.',
    category: 'Developer Tools',
    icon: 'Sliders',
    color: 'border-stone-500/20 hover:border-stone-500/60 text-stone-400 bg-stone-500/5'
  },
  {
    id: 'mock-api',
    title: 'Mock API Response Builder',
    description: 'Draft and test customized mock JSON responses for rapid front-end scaffolding.',
    category: 'Developer Tools',
    icon: 'Play',
    color: 'border-teal-500/20 hover:border-teal-500/60 text-teal-400 bg-teal-500/5'
  },

  // --- MATH & SCIENCE (11 tools) ---
  {
    id: 'scientific-calc',
    title: 'Scientific Algebra Calculator',
    description: 'Standard & advanced equations with visual logarithm, sine, cosine, and memory blocks.',
    category: 'Math & Finance',
    icon: 'Calculator',
    color: 'border-sky-500/20 hover:border-sky-500/60 text-sky-400 bg-sky-500/5'
  },
  {
    id: 'unit-converter',
    title: 'Universal Unit Converter',
    description: 'Convert lengths, temperatures, weights, speeds, areas, and fluid measures.',
    category: 'Math & Finance',
    icon: 'Shuffle',
    color: 'border-orange-500/20 hover:border-orange-500/60 text-orange-400 bg-orange-500/5'
  },
  {
    id: 'currency-converter',
    title: 'Universal Currency Rates',
    description: 'Convert assets between USD, EUR, GBP, JPY, CAD, AUD, and other major world feeds.',
    category: 'Math & Finance',
    icon: 'DollarSign',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'percent-calc',
    title: 'Percentage Calculator',
    description: 'Find what X% of any number equals with an instant, accurate percentage calculator.',
    category: 'Math & Finance',
    icon: 'Percent',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'tip-calc',
    title: 'Friendly Bill & Tip Splitter',
    description: 'Calculate fair split payments and custom percentages for dinners and group tabs.',
    category: 'Math & Finance',
    icon: 'Users',
    color: 'border-cyan-500/20 hover:border-cyan-500/60 text-cyan-400 bg-cyan-500/5'
  },
  {
    id: 'gpa-calc',
    title: 'Academic GPA Calculator',
    description: 'Add course names, grades, and credit hours to estimate cumulative indexes.',
    category: 'Math & Finance',
    icon: 'Trophy',
    color: 'border-amber-500/20 hover:border-amber-500/60 text-amber-400 bg-amber-500/5'
  },
  {
    id: 'age-calc',
    title: 'Age & Millisecond Calculator',
    description: 'Find age durations down to exact minutes, hours, and week calendar days.',
    category: 'Math & Finance',
    icon: 'Calendar',
    color: 'border-blue-500/20 hover:border-blue-500/60 text-blue-400 bg-blue-500/5'
  },
  {
    id: 'loan-calc',
    title: 'Amortization & Loan Planner',
    description: 'Estimate monthly interest payments and complete principal payoff timelines.',
    category: 'Math & Finance',
    icon: 'TrendUp',
    color: 'border-violet-500/20 hover:border-violet-500/60 text-violet-400 bg-violet-500/5'
  },
  {
    id: 'matrix-calc',
    title: 'Matrix Algebra Solver',
    description: 'Calculate determinants, matrix additions, transposes, and products instantly.',
    category: 'Math & Finance',
    icon: 'SquaresFour',
    color: 'border-purple-500/20 hover:border-purple-500/60 text-purple-400 bg-purple-500/5'
  },
  {
    id: 'binary-math',
    title: 'Binary Mathematics Solver',
    description: 'Add, subtract, multiply, or divide binary numbers with clear workflow steps.',
    category: 'Math & Finance',
    icon: 'Code',
    color: 'border-rose-500/20 hover:border-rose-500/60 text-rose-400 bg-rose-500/5'
  },
  {
    id: 'fibonacci-gen',
    title: 'Fibonacci Sequence Solver',
    description: 'Analyze sequence counts, golden ratios, and positional values instantly.',
    category: 'Math & Finance',
    icon: 'Pulse',
    color: 'border-teal-500/20 hover:border-teal-500/60 text-teal-400 bg-teal-500/5'
  },

  // --- HEALTH & LIFESTYLE (11 tools) ---
  {
    id: 'bmi-calc',
    title: 'BMI Healthy Weight Solver',
    description: 'Calculate Body Mass Index values with customized visual fitness feedback logs.',
    category: 'Health & Lifestyle',
    icon: 'Pulse',
    color: 'border-rose-500/20 hover:border-rose-500/60 text-rose-400 bg-rose-500/5'
  },
  {
    id: 'bmr-calc',
    title: 'BMR Energy Estimator',
    description: 'Check your Basal Metabolic Rate and estimate calorie thresholds based on active lifestyle scales.',
    category: 'Health & Lifestyle',
    icon: 'Gauge',
    color: 'border-orange-500/20 hover:border-orange-500/60 text-orange-400 bg-orange-500/5'
  },
  {
    id: 'calorie-counter',
    title: 'Calorie Tracker & Food Diary',
    description: 'Add meals, log standard values, and trace daily energy balances dynamically.',
    category: 'Health & Lifestyle',
    icon: 'Heart',
    color: 'border-pink-500/20 hover:border-pink-500/60 text-pink-400 bg-pink-500/5'
  },
  {
    id: 'noise-maker',
    title: 'Sleep Aid Ambient Sounds',
    description: 'Synthesize custom relaxing brown noise, white noise, pink noise, or cozy rain sounds.',
    category: 'Health & Lifestyle',
    icon: 'SpeakerHigh',
    color: 'border-cyan-500/20 hover:border-cyan-500/60 text-cyan-400 bg-cyan-500/5'
  },
  {
    id: 'planner',
    title: 'Hourly Daily Task Planner',
    description: 'Draft schedule blocks, set task alerts, and track daily plans visually.',
    category: 'Health & Lifestyle',
    icon: 'Calendar',
    color: 'border-blue-500/20 hover:border-blue-500/60 text-blue-400 bg-blue-500/5'
  },
  {
    id: 'breath-guide',
    title: 'Symmetrical Box Breathing',
    description: 'A visual breathing sphere with timers to regulate stress and guide lung exercises.',
    category: 'Health & Lifestyle',
    icon: 'Wind',
    color: 'border-teal-500/20 hover:border-teal-500/60 text-teal-400 bg-teal-500/5'
  },
  {
    id: 'step-sim',
    title: 'Step & Cardio Estimator',
    description: 'Convert daily walking step counts into estimated miles, kilometers, and active calories.',
    category: 'Health & Lifestyle',
    icon: 'Lightning',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'pomodoro',
    title: 'Pomodoro Productivity Clock',
    description: 'Organize work sprints and relaxation intervals with visual ring timelines.',
    category: 'Health & Lifestyle',
    icon: 'Timer',
    color: 'border-red-500/20 hover:border-red-500/60 text-red-400 bg-red-500/5'
  },
  {
    id: 'habit-tracker',
    title: 'Daily Streak Habit Tracker',
    description: 'Log positive actions, unlock milestones, and keep a visual calendar of streaks.',
    category: 'Health & Lifestyle',
    icon: 'CheckSquare',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'water-tracker',
    title: 'Daily Water Intake Logger',
    description: 'Log and monitor daily water targets with responsive fluid level metrics.',
    category: 'Health & Lifestyle',
    icon: 'Drop',
    color: 'border-sky-500/20 hover:border-sky-500/60 text-sky-400 bg-sky-500/5'
  },
  {
    id: 'sleep-calculator',
    title: 'Optimal Sleep Stage Planner',
    description: 'Plan exact sleep and wakeup cycles matching REM intervals to wake up refreshed.',
    category: 'Health & Lifestyle',
    icon: 'Moon',
    color: 'border-violet-500/20 hover:border-violet-500/60 text-violet-400 bg-violet-500/5'
  },

  // --- FUN & QUICK GAMES (11 tools) ---
  {
    id: 'password-gen',
    title: 'Secure Password Generator',
    description: 'Generate customizable, secure strings with numbers, symbols, and letter filters.',
    category: 'Fun & Games',
    icon: 'Key',
    color: 'border-amber-500/20 hover:border-amber-500/60 text-amber-400 bg-amber-500/5'
  },
  {
    id: 'dice-roller',
    title: 'Polyhedral Dice Roller',
    description: 'Roll d4, d6, d8, d10, d12, or d20 game dice instantly for tabletop entertainment.',
    category: 'Fun & Games',
    icon: 'Dice',
    color: 'border-red-500/20 hover:border-red-500/60 text-red-400 bg-red-500/5'
  },
  {
    id: 'coin-flipper',
    title: 'Coin Flipper & Odds Checker',
    description: 'Flip virtual silver coins and track lifetime ratios of heads or tails.',
    category: 'Fun & Games',
    icon: 'Circle',
    color: 'border-yellow-500/20 hover:border-yellow-500/60 text-yellow-400 bg-yellow-500/5'
  },
  {
    id: 'rock-paper-scissors',
    title: 'Rock Paper Scissors vs. Computer',
    description: 'Play classic Rock, Paper, Scissors against a random computer opponent for quick, fun rounds.',
    category: 'Fun & Games',
    icon: 'Shield',
    color: 'border-orange-500/20 hover:border-orange-500/60 text-orange-400 bg-orange-500/5'
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic-Tac-Toe Board',
    description: 'Play standard 3x3 tic-tac-toe grids with a responsive virtual opponent.',
    category: 'Fun & Games',
    icon: 'SquaresFour',
    color: 'border-blue-500/20 hover:border-blue-500/60 text-blue-400 bg-blue-500/5'
  },
  {
    id: 'name-picker',
    title: 'Random Selector Wheel',
    description: 'Enter names or choices to spin a selection wheel and pick an absolute winner.',
    category: 'Fun & Games',
    icon: 'ArrowsCounterClockwise',
    color: 'border-fuchsia-500/20 hover:border-fuchsia-500/60 text-fuchsia-400 bg-fuchsia-500/5'
  },
  {
    id: 'love-calculator',
    title: 'Compatibility Love Solver',
    description: 'A fun name comparison script analyzing matching sound waves for fun compatibility percentages.',
    category: 'Fun & Games',
    icon: 'Heart',
    color: 'border-pink-500/20 hover:border-pink-500/60 text-pink-400 bg-pink-500/5'
  },
  {
    id: 'trivia-quiz',
    title: 'Offline General Trivia',
    description: 'Challenge your knowledge with built-in multichoice general knowledge trivia logs.',
    category: 'Fun & Games',
    icon: 'Question',
    color: 'border-cyan-500/20 hover:border-cyan-500/60 text-cyan-400 bg-cyan-500/5'
  },
  {
    id: 'reaction-test',
    title: 'Reaction Time Tester',
    description: 'Measure your visual reflexes down to exact milliseconds during random screen color flashes.',
    category: 'Fun & Games',
    icon: 'Lightning',
    color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
  },
  {
    id: 'anagram-solver',
    title: 'Word Anagram Solver',
    description: 'Unscramble mixed characters and find valid high-scoring Scrabble words.',
    category: 'Fun & Games',
    icon: 'TextT',
    color: 'border-violet-500/20 hover:border-violet-500/60 text-violet-400 bg-violet-500/5'
  },
  {
    id: 'sudoku-solver',
    title: 'Mini Sudoku Board',
    description: 'Draft, solve, or play a 9x9 Sudoku grid with automatic constraint-checking guidelines.',
    category: 'Fun & Games',
    icon: 'SquaresFour',
    color: 'border-teal-500/20 hover:border-teal-500/60 text-teal-400 bg-teal-500/5'
  }
] as const satisfies readonly ToolCatalogSeed[];

export type ToolId = (typeof TOOL_CATALOG)[number]['id'];

const STATUS_BY_ID: Record<ToolId, ToolStatus> = {
  'video-splitter': 'functional',
  'social-downloader': 'functional',
  'youtube-downloader': 'functional',
  'instagram-downloader': 'beta',
  'tiktok-downloader': 'functional',
  'facebook-downloader': 'beta',
  'gif-maker': 'functional',
  'video-to-audio': 'functional',
  'frame-extractor': 'functional',
  'video-speed': 'functional',
  'video-muter': 'functional',
  'video-compressor': 'functional',
  'video-looper': 'functional',
  'video-rotator': 'functional',
  'video-resizer': 'functional',
  'video-watermark': 'functional',
  'subtitles-editor': 'functional',
  'image-converter': 'functional',
  'color-extractor': 'functional',
  'image-compressor': 'beta',
  'image-cropper': 'coming-soon',
  'meme-generator': 'beta',
  'pixel-art': 'coming-soon',
  'exif-viewer': 'disabled',
  'favicon-generator': 'disabled',
  'svg-optimizer': 'coming-soon',
  'image-filters': 'beta',
  'image-resizer': 'beta',
  'gradient-generator': 'coming-soon',
  'ascii-art': 'beta',
  'pdf-compiler': 'functional',
  'pdf-to-txt': 'coming-soon',
  'txt-to-pdf': 'coming-soon',
  'pdf-splitter': 'coming-soon',
  'epub-to-pdf': 'coming-soon',
  'csv-to-json': 'beta',
  'excel-to-csv': 'disabled',
  'pdf-merger': 'coming-soon',
  'pdf-rotator': 'coming-soon',
  'json-to-csv': 'beta',
  'markdown-to-html': 'beta',
  'audio-trimmer': 'beta',
  'audio-transcriber': 'disabled',
  'sound-recorder': 'coming-soon',
  'audio-merger': 'coming-soon',
  'voice-changer': 'coming-soon',
  'vocal-remover': 'disabled',
  'silence-remover': 'disabled',
  'audio-speed': 'coming-soon',
  'bpm-finder': 'coming-soon',
  'metronome': 'coming-soon',
  'audio-converter': 'coming-soon',
  'case-converter': 'functional',
  'word-counter': 'functional',
  'lorem-ipsum': 'functional',
  'text-diff': 'coming-soon',
  'markdown-editor': 'coming-soon',
  'regex-tester': 'coming-soon',
  'slug-generator': 'functional',
  'text-sorter': 'functional',
  'find-replace': 'coming-soon',
  'morse-translator': 'functional',
  'binary-translator': 'beta',
  'base64-coder': 'functional',
  'url-coder': 'functional',
  'html-entities': 'functional',
  'text-reverser': 'functional',
  'line-remover': 'functional',
  'sentence-generator': 'coming-soon',
  'qr-generator': 'beta',
  'json-formatter': 'functional',
  'hash-generator': 'disabled',
  'uuid-generator': 'functional',
  'yaml-to-json': 'disabled',
  'xml-beautifier': 'coming-soon',
  'jwt-debugger': 'coming-soon',
  'sql-formatter': 'coming-soon',
  'cron-parser': 'coming-soon',
  'port-scanner': 'coming-soon',
  'color-blender': 'coming-soon',
  'contrast-checker': 'functional',
  'base-converter': 'functional',
  'user-agent': 'coming-soon',
  'mock-api': 'coming-soon',
  'scientific-calc': 'disabled',
  'unit-converter': 'beta',
  'currency-converter': 'disabled',
  'percent-calc': 'functional',
  'tip-calc': 'functional',
  'gpa-calc': 'beta',
  'age-calc': 'beta',
  'loan-calc': 'beta',
  'matrix-calc': 'coming-soon',
  'binary-math': 'coming-soon',
  'fibonacci-gen': 'coming-soon',
  'bmi-calc': 'beta',
  'bmr-calc': 'disabled',
  'calorie-counter': 'coming-soon',
  'noise-maker': 'beta',
  'planner': 'coming-soon',
  'breath-guide': 'beta',
  'step-sim': 'disabled',
  'pomodoro': 'beta',
  'habit-tracker': 'beta',
  'water-tracker': 'beta',
  'sleep-calculator': 'coming-soon',
  'password-gen': 'disabled',
  'dice-roller': 'functional',
  'coin-flipper': 'beta',
  'rock-paper-scissors': 'functional',
  'tic-tac-toe': 'coming-soon',
  'name-picker': 'coming-soon',
  'love-calculator': 'coming-soon',
  'trivia-quiz': 'coming-soon',
  'reaction-test': 'coming-soon',
  'anagram-solver': 'coming-soon',
  'sudoku-solver': 'coming-soon',
};

const DISABLED_REASONS: Partial<Record<ToolId, string>> = {
  'audio-transcriber': 'Server-based transcription is temporarily unavailable in the free deployment.',
  'exif-viewer': 'The previous workspace displayed fabricated metadata instead of reading the uploaded image.',
  'favicon-generator': 'The previous export labeled PNG bytes as an ICO file.',
  'excel-to-csv': 'Excel parsing is not implemented and the current workspace cannot produce a valid CSV conversion.',
  'vocal-remover': 'The current implementation does not separate vocals and instrumentals.',
  'silence-remover': 'The current implementation does not detect or remove silence.',
  'hash-generator': 'The previous implementation mislabeled non-cryptographic hashes as cryptographic.',
  'yaml-to-json': 'The previous implementation returned fabricated output instead of parsing YAML.',
  'scientific-calc': 'The previous calculator executed user input as JavaScript and is unsafe.',
  'currency-converter': 'The previous implementation displayed fabricated exchange-rate results.',
  'bmr-calc': 'The previous implementation displayed a fabricated health calculation.',
  'step-sim': 'The previous implementation displayed fabricated health estimates.',
  'password-gen': 'The previous implementation used Math.random and did not meet its secure-password claim.',
};

const DEDICATED_COMPONENTS: Partial<Record<ToolId, ToolComponentKey>> = {
  'image-converter': 'image-converter',
  'pdf-compiler': 'pdf-compiler',
  'audio-trimmer': 'audio-trimmer',
  'qr-generator': 'qr-generator',
  'color-extractor': 'color-extractor',
  'youtube-downloader': 'youtube-downloader',
  'instagram-downloader': 'instagram-downloader',
  'tiktok-downloader': 'tiktok-downloader',
  'facebook-downloader': 'facebook-downloader',
  'social-downloader': 'social-downloader',
  'video-splitter': 'video-splitter',
};

function formatsFor(category: ToolCategory): { input: string[]; output: string[] } {
  switch (category) {
    case 'Video': return { input: ['video/*'], output: ['video/webm', 'image/jpeg', 'image/gif', 'audio/wav'] };
    case 'Image': return { input: ['image/*'], output: ['image/jpeg', 'image/png', 'image/webp', 'text/plain'] };
    case 'Document': return { input: ['text/plain', 'text/csv', 'application/json', 'application/pdf', 'image/*'], output: ['text/plain', 'text/csv', 'application/json', 'text/html', 'application/pdf'] };
    case 'Audio': return { input: ['audio/*'], output: ['audio/wav', 'text/plain', 'text/srt'] };
    case 'Text & Writing': return { input: ['text/plain'], output: ['text/plain'] };
    case 'Developer Tools': return { input: ['text/plain'], output: ['text/plain', 'application/json', 'image/png'] };
    case 'Math & Finance':
    case 'Health & Lifestyle':
    case 'Fun & Games': return { input: ['text/plain'], output: ['text/plain'] };
  }
}

function processingFor(id: ToolId, status: ToolStatus): ProcessingType {
  if (status === 'disabled' || status === 'coming-soon') return 'none';
  if (id === 'audio-transcriber') return 'server';
  if (id === 'qr-generator') return 'external';
  return 'browser';
}

function privacyFor(id: ToolId): string | undefined {
  if (id === 'audio-transcriber') return 'Audio is sent to Omnitily’s server, which sends it to Google Gemini. Provider availability affects processing.';
  if (id === 'qr-generator') return 'QR contents are sent to the external QR rendering provider.';
  return undefined;
}

export const TOOL_REGISTRY = TOOL_CATALOG.map((seed): ToolDefinition & { id: ToolId } => {
  const status = STATUS_BY_ID[seed.id];
  const unavailable = status === 'disabled' || status === 'coming-soon';
  const formats = formatsFor(seed.category);
  const badge = 'badge' in seed ? seed.badge : undefined;
  return {
    id: seed.id,
    name: seed.title,
    description: seed.description,
    category: seed.category,
    status,
    statusReason: DISABLED_REASONS[seed.id],
    processingType: processingFor(seed.id, status),
    privacyNotice: unavailable ? undefined : privacyFor(seed.id),
    supportedInputTypes: unavailable ? [] : formats.input,
    supportedOutputTypes: unavailable ? [] : formats.output,
    isFeatured: status === 'functional' && Boolean(badge),
    isIndexable: status === 'functional',
    componentKey: unavailable ? undefined : (DEDICATED_COMPONENTS[seed.id] ?? 'generic'),
    icon: seed.icon,
    color: seed.color,
    badge: unavailable ? undefined : badge,
  };
});

export const TOOLS_LIST = TOOL_REGISTRY;

export const TOOL_BY_ID = Object.fromEntries(
  TOOL_REGISTRY.map((tool) => [tool.id, tool]),
) as Record<ToolId, (typeof TOOL_REGISTRY)[number]>;

export function isToolId(value: string): value is ToolId {
  return Object.prototype.hasOwnProperty.call(TOOL_BY_ID, value);
}

export const INDEXABLE_TOOLS = TOOL_REGISTRY.filter((tool) => tool.isIndexable);

// Public catalog = Functional tools only. Beta, coming-soon, and disabled tools
// keep their stable routes but are hidden from every discovery surface.
export const FUNCTIONAL_TOOLS = TOOL_REGISTRY.filter((tool) => tool.status === 'functional');
export const PUBLIC_TOOLS = FUNCTIONAL_TOOLS;
export const HIDDEN_TOOLS = TOOL_REGISTRY.filter((tool) => tool.status !== 'functional');
export const PUBLIC_TOOL_IDS = new Set(PUBLIC_TOOLS.map((tool) => tool.id));

// Map hotkeys for standard tools. For all 112 tools, we generate structured, highly visual tips.
export const TOOL_SHORTCUTS: Record<ToolId, { key: string; label: string; tip: string }> = {} as Record<ToolId, { key: string; label: string; tip: string }>;

// Auto-populate hotkeys dynamically to maintain robustness & prevent manual typos
const hotkeyPool = '123456789abcdefghijklmnopqrstuvwxyz';
TOOLS_LIST.forEach((tool, index) => {
  const hotkeyChar = hotkeyPool[index % hotkeyPool.length].toUpperCase();
  TOOL_SHORTCUTS[tool.id] = {
    key: hotkeyChar,
    label: (index + 1).toString(),
    tip: tool.description
  };
});
