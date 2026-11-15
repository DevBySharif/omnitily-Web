/**
 * Category hub pages (`/tools/<slug>`), per the SEO audit §5 item 8.
 *
 * One hub per tool category. `title` is the hub page's `<title>`,
 * `description` is its meta description (1-2 sentences), and `intro` is
 * 60-100 words of copy that is true to the actual tools in the category
 * (names, counts and capabilities taken from `src/toolsData.ts`).
 *
 * Tool counts per category (functional tools, Nov 2026):
 * Video 17, Image 10, Document 8, Audio 9, Text & Writing 16,
 * Developer Tools 14, Math & Finance 8, Health & Lifestyle 9,
 * Fun & Games 10 — 101 in total.
 */
export interface CategoryHub {
  slug: string;
  category: string;
  title: string;
  description: string;
  intro: string;
}

export const CATEGORY_HUBS: CategoryHub[] = [
  {
    slug: 'video',
    category: 'Video',
    title: 'Free Video Tools Online | Omnitily',
    description:
      'Free online video tools: download, split, compress, convert, edit and subtitle videos in your browser — no sign-up, no watermark.',
    intro:
      "Omnitily's video tools cover the whole clip workflow: download public videos from YouTube, TikTok, Instagram and Facebook, split, trim, compress, resize, rotate, loop, mute and watermark clips, speed them up or slow them down, pull out the audio as MP3 or grab a single frame, turn clips into GIFs, and write SRT subtitles. Everything runs free in your browser with no sign-up, no watermark and no uploads for most tools, so a quick edit stays quick.",
  },
  {
    slug: 'image',
    category: 'Image',
    title: 'Free Image Tools Online | Omnitily',
    description:
      'Free online image tools: convert, compress, crop, resize and inspect photos and graphics in your browser — no sign-up, no install.',
    intro:
      'The image tools handle everyday photo jobs without installing anything: convert between JPEG, PNG and WebP, compress photos by up to 80%, crop and resize to exact dimensions, pull a colour palette from any picture, read EXIF camera data, clean up SVG files, build a favicon, design pixel art, or generate ready-to-paste CSS gradients. Most work entirely in your browser, so your photos never leave your device.',
  },
  {
    slug: 'document',
    category: 'Document',
    title: 'Free PDF & Document Tools Online | Omnitily',
    description:
      'Free online document tools: build, split, merge, rotate and convert PDFs, EPUBs, text files and spreadsheets in your browser.',
    intro:
      'These document tools turn files into the format you need: compile photos into a PDF, split or merge PDF pages, rotate skewed pages, extract the text from a PDF, turn plain text or an EPUB ebook into a PDF, and convert Excel spreadsheets to CSV. They run free in your browser with no account and no uploads for most jobs, so contracts, homework and receipts stay on your own device.',
  },
  {
    slug: 'audio',
    category: 'Audio',
    title: 'Free Audio Tools Online | Omnitily',
    description:
      'Free online audio tools: record, merge, edit, convert and analyse sound in your browser — no sign-up, no install.',
    intro:
      "The audio tools cover recording, editing and converting sound: record voice memos in high fidelity, merge clips into one track, change pitch with a voice modulator, reduce centred vocals, cut dead silence automatically, speed audio up or slow it down without changing pitch, convert between MP3, WAV, OGG and FLAC, tap out a song's BPM, or keep time with a metronome while you practise.",
  },
  {
    slug: 'text-writing',
    category: 'Text & Writing',
    title: 'Free Text Tools Online | Omnitily',
    description:
      'Free online text tools: count words, convert case, compare drafts, test regex, encode text and draft Markdown — no sign-up.',
    intro:
      'Writers, students and developers use these text tools every day: count words and characters in real time, convert text case, compare two drafts side by side, sort and deduplicate lines, find and replace across a document, test regular expressions, build URL slugs, encode Base64, URLs and HTML entities, translate Morse code, reverse text, draft Markdown with a live preview, generate lorem ipsum, or spark ideas with a prompt generator.',
  },
  {
    slug: 'developer-tools',
    category: 'Developer Tools',
    title: 'Free Developer Tools Online | Omnitily',
    description:
      'Free online developer tools: format JSON, XML and SQL, decode JWTs, generate UUIDs and hashes, check cron and contrast — no sign-up.',
    intro:
      'These developer utilities solve the small jobs that interrupt real work: format and validate JSON, XML and SQL, convert YAML to JSON, decode JWT tokens, generate UUIDs and cryptographic hashes, check cron schedules, blend hex colours, test colour contrast against WCAG standards, convert number bases, inspect your user agent, mock API responses, or generate a QR code for any link. All free, no sign-up, and most run entirely in your browser.',
  },
  {
    slug: 'math-finance',
    category: 'Math & Finance',
    title: 'Free Math & Finance Calculators Online | Omnitily',
    description:
      'Free online calculators: scientific maths, unit and currency conversion, percentages, matrices, tips and bills — no sign-up.',
    intro:
      'From homework to household budgets, these calculators give instant answers: a scientific calculator for algebra and trigonometry, a universal unit converter, live currency conversion, percentage and matrix maths, binary arithmetic, Fibonacci sequences, and a friendly bill and tip splitter that divides dinner fairly between friends. Every calculator is free, needs no sign-up, and shows its working step by step where it helps.',
  },
  {
    slug: 'health-lifestyle',
    category: 'Health & Lifestyle',
    title: 'Free Health & Lifestyle Tools Online | Omnitily',
    description:
      'Free online health tools: BMI and BMR, calories, steps, water, sleep, habits and breathing — private, no account needed.',
    intro:
      'These health and lifestyle tools help you track the small daily numbers that add up: body mass index and basal metabolic rate, calories and meals, steps and cardio, water intake, sleep cycles timed to REM stages, daily habits and streaks, hourly plans, and a guided box-breathing exercise for stressful moments. They are free, private by design, and need no account to use.',
  },
  {
    slug: 'fun-games',
    category: 'Fun & Games',
    title: 'Free Games & Fun Tools Online | Omnitily',
    description:
      'Free online games and fun tools: dice, tic-tac-toe, trivia, Sudoku, reaction tests and more — no sign-up, play instantly.',
    intro:
      'Play a quick game or settle a friendly debate: roll polyhedral dice for tabletop nights, play rock paper scissors or tic-tac-toe against the computer, test your reaction time, solve Sudoku and anagrams, take a general-knowledge trivia quiz, spin a random name-picker wheel, or check your compatibility with the love calculator. The same shelf also holds a secure password generator for when the fun is over.',
  },
];
