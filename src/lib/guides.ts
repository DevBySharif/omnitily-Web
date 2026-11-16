/**
 * Guide articles (`/guides/<slug>`), per the SEO P2 plan.
 *
 * Content data only — the coordinator wires these into routes,
 * prerender and the sitemap. Every step and claim below was
 * truth-checked against `~/workspace/omnitily-seo/TOOL_CHECK.md`,
 * the P1 FAQ content in `./toolContent-*.ts`, and the tool
 * implementations themselves (Nov 2026):
 *
 * - TikTok: the API requests tikwm's no-watermark `play`/`hdplay`
 *   file (never `wmplay`), with the self-hosted Cobalt resolver as
 *   fallback (`api/index.ts`). Public videos only.
 * - Instagram/Facebook: resolved through the self-hosted Cobalt
 *   resolver; public content only. The free-tier instance can need
 *   about a minute to wake after being idle (503).
 * - Video to Audio: MP4/WebM in, WAV (PCM 16-bit) out ONLY — the
 *   tool cannot produce MP3. Clips up to 30 minutes.
 * - Video Compressor: MP4/WebM in, WebM out ONLY (no browser can
 *   produce MP4). Target Bitrate slider, 10-90% of the original
 *   (default 50%). Max 5 min / 200 MB input.
 * - Image Compressor: PNG/JPEG in, JPEG out ALWAYS (canvas
 *   `toBlob('image/jpeg')`) — a PNG loses transparency.
 * - Image Converter: JPEG, PNG and WebP only, batch supported.
 * - PDF Splitter/Merger: run entirely in the browser.
 *
 * No YouTube-downloader guide: that tool is currently rate-limited
 * externally, so it is not promoted here.
 */

export interface GuideFaq {
  question: string;
  answer: string;
}

/** Shared title/description for the /guides index page (SPA + prerender). */
export const GUIDES_INDEX_TITLE = 'Free Online Tool Guides | Omnitily';
export const GUIDES_INDEX_DESCRIPTION =
  'Step-by-step guides for Omnitily\u2019s free online tools: download TikTok videos and Instagram reels, convert video to audio, compress videos and images, and split or merge PDFs — no signup.';

export interface Guide {
  slug: string;
  title: string; // <=60 chars, query-matched, natural English
  description: string; // ~140-160 chars, meta description
  intro: string[]; // 2-3 honest paragraphs
  steps: string[]; // real numbered steps matching the actual tool's UI/behavior
  faqs: GuideFaq[]; // 3-5, true answers
  relatedToolIds: string[]; // 1-3 real functional tool ids
  lastUpdated: string; // '2026-11-16'
}

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-download-tiktok-videos-without-watermark',
    title: 'How to Download TikTok Videos Without Watermark',
    description:
      'Download any public TikTok video without a watermark, free with no signup. Paste the link, pick a quality, and save the MP4 to your device.',
    intro: [
      "TikTok's own save button burns the creator's username into the video. If you want a clean copy of a public TikTok — to watch offline, or to reuse a clip you have the right to use — Omnitily's TikTok Downloader fetches the no-watermark version of the file itself, so nothing extra is stamped on it.",
      'It works from a pasted link, with no app to install and no account to create. The video is fetched through the tikwm resolver, which returns the no-watermark file TikTok serves, with Omnitily\u2019s self-hosted Cobalt resolver as a fallback. Only public videos can be downloaded: private, deleted, or login-walled videos will not resolve.',
    ],
    steps: [
      'Open TikTok, find the video you want, tap Share, then tap Copy link.',
      'Open Omnitily\u2019s TikTok Downloader and paste the link into the URL field.',
      'Click the download button to fetch the available video options.',
      'Pick a video quality and click Download to save the MP4 file to your device.',
      'If the download fails, wait a moment and try again — the free resolver is rate-limited, and a retry usually works.',
    ],
    faqs: [
      {
        question: 'Does the downloaded TikTok video really have no watermark?',
        answer:
          'Yes. The tool requests the no-watermark version of the video file from the resolver, rather than a screen recording, so no watermark is added by the tool.',
      },
      {
        question: 'Do I need a TikTok account to use it?',
        answer:
          'No. The tool is free, needs no signup, and does not ask for your TikTok login.',
      },
      {
        question: 'Can I download videos from private TikTok accounts?',
        answer:
          'No. Only public videos that the resolver service can reach can be downloaded.',
      },
      {
        question: 'What format is the downloaded video?',
        answer:
          'The downloaded file is an MP4 video, which plays on phones, computers, and most media players.',
      },
      {
        question: 'Is it legal to download a TikTok video?',
        answer:
          'Only download videos you have the right to save, such as your own uploads or content shared under a licence that allows downloading. Respect the creator\u2019s rights and TikTok\u2019s terms.',
      },
    ],
    relatedToolIds: ['tiktok-downloader', 'instagram-downloader', 'facebook-downloader'],
    lastUpdated: '2026-11-16',
  },
  {
    slug: 'how-to-download-instagram-reels',
    title: 'How to Download Instagram Reels for Free',
    description:
      'Save public Instagram reels, posts, and stories as MP4, free with no signup. Paste the link, fetch the options, and download the video file.',
    intro: [
      'Instagram has no built-in way to save someone else\u2019s reel to your device. Omnitily\u2019s Instagram Downloader does it from a pasted link: paste the link to a public reel, post, or story, fetch the available download options, and save the video as an MP4 file.',
      'The download is fetched through Omnitily\u2019s self-hosted Cobalt resolver, and the tool is free with no signup and no app to install. Only public content that the resolver can reach can be downloaded — private accounts and login-walled posts will not resolve. The resolver runs on a free-tier server, so if it has been idle it can take about a minute to wake up; if you see a “server waking up” message, wait a moment and try again.',
    ],
    steps: [
      'Open Instagram, find the reel, post, or story you want, and copy its link.',
      'Open Omnitily\u2019s Instagram Downloader and paste the link into the URL field.',
      'Click the download button to fetch the available video options.',
      'Pick a video option and click Download to save the MP4 file to your device.',
    ],
    faqs: [
      {
        question: 'Can I download Instagram stories with this tool?',
        answer:
          'Yes. The downloader works with public reels, posts, and stories.',
      },
      {
        question: 'Do I need to log in to Instagram to download a reel?',
        answer:
          'No. The tool needs no signup and does not ask for your Instagram login.',
      },
      {
        question: 'Can I download videos from private Instagram accounts?',
        answer:
          'No. Only public content that the resolver service can reach can be downloaded.',
      },
      {
        question: 'What format is the downloaded video?',
        answer:
          'The downloaded file is an MP4 video, which plays on phones, computers, and most media players.',
      },
      {
        question: 'Why does it say the download server is waking up?',
        answer:
          'The self-hosted resolver runs on a free-tier server that sleeps when idle. It usually wakes in about a minute — wait a moment and try again.',
      },
    ],
    relatedToolIds: ['instagram-downloader', 'tiktok-downloader', 'facebook-downloader'],
    lastUpdated: '2026-11-16',
  },
  {
    slug: 'how-to-convert-video-to-mp3',
    title: 'How to Convert Video to MP3 Online',
    description:
      'Pull the sound out of a video clip and keep it as an audio file: extract the audio track from an MP4 or WebM video in your browser, free.',
    intro: [
      'If you only need the sound from a video — a lecture, an interview, a song — you do not need the picture. Omnitily\u2019s Video to Audio Extractor pulls the audio track out of an MP4 or WebM clip and saves it as an audio file, entirely in your browser. Your video never leaves your device, and clips up to 30 minutes long are supported.',
      'One thing to know before you start: the tool exports WAV only, not MP3. That is a hard limit, not a missing button — browsers cannot encode MP3. A WAV file plays in almost every media player and audio editor, and if you specifically need MP3 you can convert the WAV afterwards in any audio converter or editor that supports MP3 encoding.',
    ],
    steps: [
      'Drag and drop your MP4 or WebM video into the upload area.',
      'Click “Convert File” to extract the audio track from the video.',
      'Wait for the extraction to finish, then click “Download Result” to save the audio as a WAV file.',
      'If you need MP3, open the downloaded WAV in an audio converter or editor that can export MP3 and convert it there.',
    ],
    faqs: [
      {
        question: 'What audio format does the extractor produce?',
        answer:
          'The extracted audio is saved as a WAV file (PCM 16-bit), which plays in most media players and audio editors.',
      },
      {
        question: 'Can I convert a video directly to MP3 with this tool?',
        answer:
          'No. The tool exports audio as a WAV file only. You can convert the WAV to MP3 afterwards in any audio converter or editor that supports MP3 encoding.',
      },
      {
        question: 'Which video formats are supported?',
        answer:
          'The tool works with MP4 and WebM video files, up to 30 minutes long.',
      },
      {
        question: 'Does my video get uploaded to a server?',
        answer:
          'No. The audio is extracted in your browser, so your video file never leaves your device.',
      },
    ],
    relatedToolIds: ['video-to-audio', 'video-muter', 'video-splitter'],
    lastUpdated: '2026-11-16',
  },
  {
    slug: 'how-to-compress-a-video-online',
    title: 'How to Compress a Video Online for Free',
    description:
      'Shrink a large MP4 or WebM video so it is easier to send, upload, or store. Re-encode it at a lower bitrate in your browser, free, no signup.',
    intro: [
      'A phone video can be hundreds of megabytes, too big to attach to an email or upload on a slow connection. Omnitily\u2019s Video Compressor shrinks MP4 and WebM files by re-encoding them at a lower bitrate, right in your browser — your video is never uploaded to a server.',
      'You choose how far to go with the Target Bitrate slider, from 10% to 90% of the original bitrate (50% by default): a lower percentage means a smaller file and more visible quality loss. The compressed clip downloads as a WebM file — MP4 output is not possible in a browser. Clips must be under 5 minutes and 200 MB, and the result panel reports the real size change, so you can see exactly how much smaller the file became.',
    ],
    steps: [
      'Drag and drop your MP4 or WebM video into the upload area.',
      'Set the Target Bitrate slider: a lower percentage gives a smaller file with lower quality, a higher percentage keeps more quality.',
      'Click “Compress Video” and wait for the re-encode to finish.',
      'Check the reported size change in the result panel, then click “Download Result” to save the compressed WebM video.',
    ],
    faqs: [
      {
        question: 'How much smaller will my video get?',
        answer:
          'It depends on the source file. The result panel reports the real size change for your video, so you can see the exact saving before you download. A clip that is already efficiently encoded may barely shrink — if the output is not smaller, try a lower target percentage.',
      },
      {
        question: 'Will compression reduce my video quality?',
        answer:
          'Yes, some quality is traded for a smaller file, because compression works by lowering the bitrate. A lighter compression level keeps more quality.',
      },
      {
        question: 'What format is the compressed video?',
        answer:
          'The compressed clip is exported as a WebM file. MP4 output is not possible in-browser, so the tool says so instead of promising an MP4.',
      },
      {
        question: 'Are there size limits?',
        answer:
          'Yes. The video must be under 5 minutes long and under 200 MB.',
      },
      {
        question: 'Does my video get uploaded to a server?',
        answer:
          'No. Compression happens in your browser, so your video file never leaves your device.',
      },
    ],
    relatedToolIds: ['video-compressor', 'video-to-audio', 'video-resizer'],
    lastUpdated: '2026-11-16',
  },
  {
    slug: 'how-to-split-a-pdf-online',
    title: 'How to Split a PDF Online for Free',
    description:
      'Break a multi-page PDF into separate files by page range or into equal chunks. Free, no signup, and your PDF never leaves your browser.',
    intro: [
      'Sometimes you only need a few pages out of a long PDF — a single chapter, a form, or the pages you actually have to send. Omnitily\u2019s PDF Page Splitter breaks a multi-page PDF into separate files, each one downloading as its own PDF.',
      'You can split by page ranges, such as pages 1 to 3 and page 5, or split the whole document into equal chunks of a set number of pages. Each part keeps its pages in their original order, and everything runs in your browser, so the file never leaves your device. A split part is an ordinary PDF, so you can open it, print it, or merge it again just like any other file.',
    ],
    steps: [
      'Drop your PDF onto the upload area, or click “Choose PDF” to pick it from your device.',
      'Pick a split mode: enter page ranges like “1-3,5”, or choose “Every N Pages” and set how many pages each file should hold.',
      'Click “Split PDF”, then download all parts at once or download each part separately.',
    ],
    faqs: [
      {
        question: 'How do I write a page range?',
        answer:
          'Type ranges like “1-3,5” in the Page Ranges box: that example takes pages 1, 2, and 3 as one part and page 5 as another part.',
      },
      {
        question: 'Can I split a PDF into equal chunks?',
        answer:
          'Yes. Choose the “Every N Pages” mode and set how many pages each file should hold, and the tool splits the whole document that way.',
      },
      {
        question: 'Does splitting change the order of the pages?',
        answer:
          'No. Each part keeps the pages in their original order from the source PDF.',
      },
      {
        question: 'Does splitting work on scanned PDFs?',
        answer:
          'Yes. Splitting copies pages exactly as they are, so it works on scanned pages as well as text-based PDFs.',
      },
      {
        question: 'Is my PDF uploaded to a server?',
        answer:
          'No. The PDF is split entirely in your browser, and the file never leaves your device.',
      },
    ],
    relatedToolIds: ['pdf-splitter', 'pdf-merger', 'pdf-rotator'],
    lastUpdated: '2026-11-16',
  },
  {
    slug: 'how-to-merge-pdf-files-online',
    title: 'How to Merge PDF Files Online for Free',
    description:
      'Combine several PDFs into one document, in the order you choose. Free, no signup, and your files never leave your browser.',
    intro: [
      'When a document is spread across several PDFs — scanned chapters, separate forms, a report in parts — Omnitily\u2019s PDF File Merger stitches them together into a single document, in the order you choose.',
      'Add your files, arrange them with the Move Up and Move Down buttons, and download one merged PDF. The tool shows the number of files you added and the total page count before you merge, so you can check the result will be what you expect. Everything runs in your browser, so your files never leave your device.',
    ],
    steps: [
      'Drop your PDFs onto the upload area, or click “Choose PDFs” to pick them from your device.',
      'Arrange the files in merge order with the Move Up and Move Down buttons, and remove any file you do not want.',
      'Click “Merge PDFs”, then click “Download Merged PDF” to save the combined document.',
      'Open the downloaded file and check the first and last pages to confirm the order came out the way you set it.',
    ],
    faqs: [
      {
        question: 'Can I choose the order the PDFs are merged in?',
        answer:
          'Yes. Each file has Move Up and Move Down buttons, and the merged PDF follows the order you set in the list.',
      },
      {
        question: 'Does merging change the pages inside each PDF?',
        answer:
          'No. The pages of each file are kept as they are and simply joined together in sequence into one document.',
      },
      {
        question: 'Can I see how many pages will be in the result?',
        answer:
          'Yes. The tool shows the number of files you added and the total page count before you merge.',
      },
      {
        question: 'Are my PDFs uploaded to a server?',
        answer:
          'No. The PDFs are merged entirely in your browser, and your files never leave your device.',
      },
    ],
    relatedToolIds: ['pdf-merger', 'pdf-splitter', 'pdf-compiler'],
    lastUpdated: '2026-11-16',
  },
  {
    slug: 'how-to-convert-png-to-jpg',
    title: 'How to Convert PNG to JPG Online Free',
    description:
      'Turn PNG images into JPG files for smaller sizes and wider compatibility. Convert JPEG, PNG, and WebP in batches, free, in your browser.',
    intro: [
      'PNG files are often much larger than they need to be, and some sites and apps only accept JPG. Omnitily\u2019s Image Format Converter changes images between JPEG, PNG, and WebP, so a PNG becomes a smaller JPG you can upload anywhere.',
      'You can convert one image or a whole batch at once, pick the target format and quality in the Conversion Settings panel, and download all the finished files together. Everything runs in your browser, so your images never leave your device. One honest trade-off: JPG has no transparency, so a PNG with a transparent background will lose that transparency when saved as JPG.',
    ],
    steps: [
      'Drag and drop your PNG images into the upload area — you can add a batch at once.',
      'Choose JPG as the target format and adjust the quality in the Conversion Settings panel.',
      'Click “Convert All Uploaded”, then click “Download All Converted” to save the finished JPG files.',
    ],
    faqs: [
      {
        question: 'Which image formats can I convert between?',
        answer:
          'The converter works with JPEG, PNG, and WebP files, and can convert between those three formats.',
      },
      {
        question: 'Can I convert several images at once?',
        answer:
          'Yes. You can upload a batch of images, convert them all in one go, and download them together.',
      },
      {
        question: 'Does converting reduce image quality?',
        answer:
          'Converting to JPEG or WebP uses lossy compression, so a lower quality setting means a smaller file with some detail lost. PNG conversion keeps the image lossless. Pick the quality setting that suits your needs.',
      },
      {
        question: 'Will my PNG keep its transparent background as a JPG?',
        answer:
          'No. JPG does not support transparency, so a transparent background is lost when a PNG is converted to JPG.',
      },
      {
        question: 'Do my images get uploaded to a server?',
        answer:
          'No. Conversion happens in your browser, so your images never leave your device.',
      },
    ],
    relatedToolIds: ['image-converter', 'image-compressor', 'image-resizer'],
    lastUpdated: '2026-11-16',
  },
  {
    slug: 'how-to-compress-images-online',
    title: 'How to Compress Images Online for Free',
    description:
      'Shrink PNG and JPEG photos so they load faster, attach easily, and take up less storage. Free, no signup, and your images stay on your device.',
    intro: [
      'Oversized photos slow down websites, bounce back from email limits, and eat storage. Omnitily\u2019s Smart Image Compressor shrinks PNG and JPEG files in your browser, so the image never leaves your device — and the tool reports the real size saving, so you can see exactly how much smaller the file became.',
      'One thing to know before you compress: the compressed file always downloads as a JPEG, even if you uploaded a PNG. That is how the tool squeezes the size down, and it means a PNG with transparency will lose its transparent background. If you need to keep transparency, use the Image Format Converter to stay in PNG instead.',
    ],
    steps: [
      'Drag and drop your PNG or JPEG image into the upload area.',
      'Click “Convert File” to compress the image.',
      'Check the reported size saving, then click “Download Result” to save the compressed JPEG image.',
      'Open the downloaded JPEG and compare it with the original at full size before you delete the original.',
    ],
    faqs: [
      {
        question: 'How much smaller will my image get?',
        answer:
          'It depends on the image. The tool reports the real size change for your file, so you can see the exact saving before you download.',
      },
      {
        question: 'Will compression make my image look worse?',
        answer:
          'Compression trades a little quality for a smaller file. For typical photos the difference is hard to notice, but very detailed images may show some softening at strong compression.',
      },
      {
        question: 'Which formats can I compress?',
        answer:
          'The compressor accepts PNG and JPEG images. The compressed file always downloads as a JPEG, even if you uploaded a PNG.',
      },
      {
        question: 'Does my image get uploaded to a server?',
        answer:
          'No. Compression happens in your browser, so your image never leaves your device.',
      },
    ],
    relatedToolIds: ['image-compressor', 'image-converter', 'image-cropper'],
    lastUpdated: '2026-11-16',
  },
];
