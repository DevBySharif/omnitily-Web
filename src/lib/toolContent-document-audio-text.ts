/**
 * SEO on-page content (how-to + FAQ + features) for the Document, Audio,
 * and Text & Writing tools. Content is prerendered into tool pages and
 * FAQPage JSON-LD, so every claim here must stay true to the tool UI.
 * Sources: TOOL_CHECK.md evidence, src/toolsData.ts descriptions, and the
 * tool components in src/components/. Never invent limits, formats, or
 * capabilities — if a claim cannot be verified, it does not belong here.
 */

export interface ToolFaq {
  question: string;
  answer: string;
}

export interface ToolContent {
  id: string;
  howToTitle: string;
  howToIntro: string;
  howToSteps: string[];
  faqs: ToolFaq[];
  features: string[];
}

export const TOOL_CONTENT_DOCUMENT_AUDIO_TEXT: Record<string, ToolContent> = {
  'pdf-compiler': {
    id: 'pdf-compiler',
    howToTitle: 'How to compile images into a PDF',
    howToIntro:
      'The PDF Compiler turns screenshots, receipts, or photos into one clean, multi-page PDF, with one page per image. You can reorder the pages, name the file, and choose the page size, orientation, and margins before compiling. Everything runs in your browser, so your images are never uploaded to a server.',
    howToSteps: [
      'Drop your images onto the upload area, or choose them from your device.',
      'Reorder the pages with the Move Up and Move Down buttons, then set the file name, page size, orientation, and margins.',
      'Click "Compile into PDF", then click "Download PDF Now" to save the finished document.',
    ],
    faqs: [
      {
        question: 'What image files can I compile into a PDF?',
        answer:
          'Any image file your browser can open. Drop in screenshots, photos, or scans, and each one becomes one page of the PDF.',
      },
      {
        question: 'Can I change the order of the pages?',
        answer:
          'Yes. Each image in the list has Move Up and Move Down buttons, so you can arrange the pages in any order before compiling.',
      },
      {
        question: 'What page size does the PDF use?',
        answer:
          'You choose the page size (A4 or Letter), the orientation (portrait or landscape), and the margins in the PDF Configuration panel.',
      },
      {
        question: 'Are my images uploaded anywhere?',
        answer:
          'No. The PDF is compiled entirely in your browser, and your images never leave your device.',
      },
    ],
    features: [
      'One PDF page per image',
      'Reorder pages before compiling',
      'A4 or Letter, portrait or landscape, with margin choices',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'pdf-to-txt': {
    id: 'pdf-to-txt',
    howToTitle: 'How to extract text from a PDF',
    howToIntro:
      'The PDF to Text Extractor reads a PDF in your browser and pulls out its text, page by page, with a header marking each page. It shows the file size, page count, and character count, and you can copy the result or download it as a plain text file. No account or upload is needed.',
    howToSteps: [
      'Drop your PDF onto the upload area, or click "Choose PDF" to pick it from your device.',
      'Extraction starts automatically. Review the extracted text and the file, page, and character counts.',
      'Click Copy to copy the text, or download it as a .txt file named after your PDF.',
    ],
    faqs: [
      {
        question: 'Does it work on scanned PDFs?',
        answer:
          'No. Scanned PDFs are pictures of text, not real text, so there is nothing to extract. The tool tells you when a PDF has no extractable text — use a text-based PDF instead.',
      },
      {
        question: 'Does the extracted text keep the original layout?',
        answer:
          'No. It extracts the raw text, grouped page by page under "--- Page N ---" headers. Fonts, columns, and exact positioning are not preserved.',
      },
      {
        question: 'Is my PDF uploaded to a server?',
        answer:
          'No. The PDF is read and processed entirely in your browser, and the file never leaves your device.',
      },
      {
        question: 'What file do I get at the end?',
        answer:
          'A plain .txt file containing the extracted text from every page, named after your original PDF.',
      },
    ],
    features: [
      'Automatic text extraction on upload',
      'Text grouped page by page',
      'File, page, and character counts',
      'Copy or download as .txt',
      'Free, no signup',
    ],
  },
  'txt-to-pdf': {
    id: 'txt-to-pdf',
    howToTitle: 'How to convert text to a PDF',
    howToIntro:
      'The Plain Text to PDF Maker turns raw text into a clean, paginated PDF. Paste your text or upload a .txt file, then set the document title, page size, and font size. The tool builds the PDF in your browser, so your text is never uploaded to a server.',
    howToSteps: [
      'Paste or type your text into the editor, or click to choose a .txt file from your device.',
      'Set the document title, pick a page size (A4 or Letter), and choose a font size.',
      'Click "Generate PDF", then click "Download PDF Now" to save the finished PDF.',
    ],
    faqs: [
      {
        question: 'Can I upload a .txt file instead of pasting?',
        answer:
          'Yes. Click the upload area to choose a .txt file from your device, and its contents appear in the editor ready to convert.',
      },
      {
        question: 'What can I change about the PDF?',
        answer:
          'You can set the document title, choose A4 or Letter page size, and pick a font size of 11, 12, or 14 points.',
      },
      {
        question: 'Is my text uploaded anywhere?',
        answer:
          'No. The PDF is generated entirely in your browser, and your text never leaves your device.',
      },
    ],
    features: [
      'Paste text or upload a .txt file',
      'A4 or Letter page size',
      'Font sizes 11, 12, or 14 points',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'pdf-splitter': {
    id: 'pdf-splitter',
    howToTitle: 'How to split a PDF',
    howToIntro:
      'The PDF Page Splitter breaks a multi-page PDF into separate files. Split by page ranges, such as pages 1 to 3 and page 5, or split the document into equal chunks of a set number of pages. Each part downloads as its own PDF, and everything runs in your browser.',
    howToSteps: [
      'Drop your PDF onto the upload area, or click "Choose PDF" to pick it from your device.',
      'Pick a split mode: enter page ranges like "1-3,5", or choose "Every N Pages" and set the pages per file.',
      'Click "Split PDF", then download all parts at once or download each part separately.',
    ],
    faqs: [
      {
        question: 'How do I write a page range?',
        answer:
          'Type ranges like "1-3,5" in the Page Ranges box: that example takes pages 1, 2, and 3 as one part and page 5 as another part.',
      },
      {
        question: 'Can I split a PDF into equal chunks?',
        answer:
          'Yes. Choose the "Every N Pages" mode and set how many pages each file should hold, and the tool splits the whole document that way.',
      },
      {
        question: 'Does splitting change the order of the pages?',
        answer:
          'No. Each part keeps the pages in their original order from the source PDF.',
      },
      {
        question: 'Is my PDF uploaded to a server?',
        answer:
          'No. The PDF is split entirely in your browser, and the file never leaves your device.',
      },
    ],
    features: [
      'Split by page ranges or into equal chunks',
      'Each part downloads as its own PDF',
      'Download all parts at once',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'epub-to-pdf': {
    id: 'epub-to-pdf',
    howToTitle: 'How to convert an EPUB to a PDF',
    howToIntro:
      'The EPUB to PDF Converter turns a standard reflowable ebook into a fixed, paginated PDF that is easy to read and print. Each chapter becomes a headed section in the PDF. The conversion runs entirely in your browser, so your ebook is never uploaded to a server.',
    howToSteps: [
      'Drop your EPUB file onto the upload area, or click "Choose EPUB" to pick it from your device.',
      'Review the book details shown — title, chapter count, word count, and file size.',
      'Click "Convert to PDF", then click "Download PDF Now" to save the finished PDF.',
    ],
    faqs: [
      {
        question: 'What happens to the chapters in the EPUB?',
        answer:
          'Each chapter becomes a headed section in the PDF, so you can still find your way around the book after conversion.',
      },
      {
        question: 'What information does the tool show about my ebook?',
        answer:
          'After you upload it, the tool shows the book title, the number of chapters, the total word count, and the file size.',
      },
      {
        question: 'Is my ebook uploaded anywhere?',
        answer:
          'No. The EPUB is read and converted entirely in your browser, and the file never leaves your device.',
      },
    ],
    features: [
      'Chapters become headed PDF sections',
      'Paginated, print-friendly PDF output',
      'Shows title, chapters, and word count',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'excel-to-csv': {
    id: 'excel-to-csv',
    howToTitle: 'How to convert Excel to CSV',
    howToIntro:
      'The Excel to CSV Converter reads a modern .xlsx spreadsheet in your browser and exports it as a standard CSV file. If the workbook has more than one sheet, you pick which sheet to export. Formulas export their cached values, and dates export as serial numbers.',
    howToSteps: [
      'Drop your .xlsx file onto the upload area, or click to choose it from your device.',
      'If the workbook has several sheets, pick the one you want from the "Sheet to Export" dropdown.',
      'Click "Download CSV" to save the converted file.',
    ],
    faqs: [
      {
        question: 'Does it work with old .xls files?',
        answer:
          'No. The tool only reads modern .xlsx files. The older binary .xls format is not supported and is refused with an error.',
      },
      {
        question: 'My workbook has several sheets. Which one is converted?',
        answer:
          'You choose. The "Sheet to Export" dropdown lists every sheet with its row count, and only the sheet you pick is exported to CSV.',
      },
      {
        question: 'What happens to formulas and dates?',
        answer:
          'Formulas export their cached values rather than the formula itself, and dates export as serial numbers.',
      },
      {
        question: 'Is my spreadsheet uploaded anywhere?',
        answer:
          'No. The file is parsed entirely in your browser, and it never leaves your device.',
      },
    ],
    features: [
      'Reads real .xlsx files in the browser',
      'Pick which sheet to export',
      'Standard CSV output',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'pdf-merger': {
    id: 'pdf-merger',
    howToTitle: 'How to merge PDFs into one file',
    howToIntro:
      'The PDF File Merger stitches several complete PDFs together into one document, in the order you choose. Add your files, drag them into the right sequence with the Move Up and Move Down buttons, and download a single merged PDF. Everything runs in your browser.',
    howToSteps: [
      'Drop your PDFs onto the upload area, or click "Choose PDFs" to pick them from your device.',
      'Arrange the files in merge order with the Move Up and Move Down buttons, and remove any file you do not want.',
      'Click "Merge PDFs", then click "Download Merged PDF" to save the combined document.',
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
    features: [
      'Merge several PDFs into one document',
      'Reorder files before merging',
      'Shows total page count',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'pdf-rotator': {
    id: 'pdf-rotator',
    howToTitle: 'How to rotate PDF pages',
    howToIntro:
      'The PDF Page Rotator fixes sideways scans and skewed pages by rotating individual pages 90, 180, or 270 degrees. You add one rule per set of pages, so different pages can be rotated by different amounts, and only the pages you list are changed.',
    howToSteps: [
      'Drop your PDF onto the upload area, or click "Choose PDF" to pick it from your device.',
      'Enter the pages to rotate, like "1-3,5", pick an angle of 90, 180, or 270 degrees, and click Add Rule. Repeat for other pages if needed.',
      'Run the rotation and download the corrected PDF.',
    ],
    faqs: [
      {
        question: 'Can I rotate just one page of a PDF?',
        answer:
          'Yes. Enter only that page number in the Pages box, pick the angle, and add the rule. Pages you do not list are left unchanged.',
      },
      {
        question: 'Can different pages be rotated by different amounts?',
        answer:
          'Yes. Add a separate rule for each set of pages, each with its own angle of 90, 180, or 270 degrees.',
      },
      {
        question: 'How do I rotate the whole document?',
        answer:
          'Add a rule whose page range covers every page of the document, pick the angle, and run the rotation.',
      },
      {
        question: 'Is my PDF uploaded to a server?',
        answer:
          'No. The PDF is rotated entirely in your browser, and the file never leaves your device.',
      },
    ],
    features: [
      'Rotate individual pages by 90, 180, or 270 degrees',
      'Several rotation rules per file',
      'Only listed pages are changed',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'sound-recorder': {
    id: 'sound-recorder',
    howToTitle: 'How to record audio in your browser',
    howToIntro:
      'The Voice Recorder captures sound from your microphone using your browser, with a live input level meter so you can see that it is hearing you. You can pause and resume while recording, and every take is listed so you can play it back, download it, or delete it.',
    howToSteps: [
      'Click "Start Recording" and allow microphone access when your browser asks for it.',
      'Speak or play sound into the microphone. Pause and resume when you need to, then stop the recording.',
      'Find your take in the recordings list, play it back, and download or delete it.',
    ],
    faqs: [
      {
        question: 'Do I need to install anything to record?',
        answer:
          'No. Recording uses your browser and your microphone. Your browser will ask for microphone permission the first time you record.',
      },
      {
        question: 'What format are the recordings saved in?',
        answer:
          'Recordings are saved as WebM audio (Opus) in Chromium-based browsers. Firefox may save OGG instead. The file name includes the date and time of the recording.',
      },
      {
        question: 'Can I pause a recording and continue it later?',
        answer:
          'Yes. The pause button holds the current take, and resuming continues the same recording instead of starting a new one.',
      },
      {
        question: 'Are my recordings uploaded anywhere?',
        answer:
          'No. Recording and playback happen entirely in your browser, and your audio never leaves your device.',
      },
    ],
    features: [
      'Live microphone input level meter',
      'Pause and resume while recording',
      'Play back, download, or delete each take',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'audio-merger': {
    id: 'audio-merger',
    howToTitle: 'How to merge audio files into one track',
    howToIntro:
      'The Audio Clip Merger glues several audio clips together into one solid track, in the order you choose. You can add a short silence between tracks and reorder the clips before merging. The result is a standard 16-bit WAV file, and everything runs in your browser.',
    howToSteps: [
      'Drop your audio tracks onto the upload area, or choose them from your device. At least two tracks are needed to merge.',
      'Arrange the tracks in order with the Move Up and Move Down buttons, and set the silence between tracks if you want a gap.',
      'Click the merge button, preview the result, then click "Download Merged WAV" to save it.',
    ],
    faqs: [
      {
        question: 'Which audio formats can I merge?',
        answer:
          'MP3, WAV, OGG, M4A, and FLAC files are all accepted. Add as many as you like, in merge order.',
      },
      {
        question: 'What format is the merged file?',
        answer:
          'The merged track is exported as a WAV file in 16-bit PCM format.',
      },
      {
        question: 'Can I add a pause between the tracks?',
        answer:
          'Yes. The "Silence Between Tracks" setting inserts a gap of up to 2 seconds between each pair of tracks.',
      },
      {
        question: 'How many tracks do I need to merge?',
        answer:
          'At least two. The merge button stays disabled until you have added two or more tracks.',
      },
    ],
    features: [
      'Joins several clips into one track',
      'Reorder tracks before merging',
      'Optional silence gap between tracks',
      'WAV 16-bit PCM output',
      'Free, no signup',
    ],
  },
  'voice-changer': {
    id: 'voice-changer',
    howToTitle: 'How to change your voice with an effect',
    howToIntro:
      'The Voice Modulator applies fun effects to a voice recording: Chipmunk, Deep Voice, Darth Vader, Robot, or Cathedral Echo. Pick an effect, apply it, and preview the result before downloading it as a WAV file. Everything runs in your browser.',
    howToSteps: [
      'Drop a voice recording onto the upload area, or choose an audio file from your device.',
      'Pick an effect: Chipmunk, Deep Voice, Darth Vader, Robot, or Cathedral Echo.',
      'Click the "Apply Effect" button, preview the result, then click "Download Changed Voice (WAV)".',
    ],
    faqs: [
      {
        question: 'Which voice effects are available?',
        answer:
          'Five: Chipmunk (high-pitched), Deep Voice (low and slow), Darth Vader (very low, with echo), Robot (metallic ring-modulated), and Cathedral Echo (spacious repeating echoes).',
      },
      {
        question: 'Does changing the pitch also change the speed?',
        answer:
          'For the pitch presets (Chipmunk, Deep Voice, and Darth Vader), yes — the voice gets faster or slower along with the pitch. Robot and Echo keep the original tempo.',
      },
      {
        question: 'What format is the changed voice saved as?',
        answer:
          'The result is exported as a 16-bit WAV file, ready to play or edit elsewhere.',
      },
      {
        question: 'Is my recording uploaded anywhere?',
        answer:
          'No. The effect is applied entirely in your browser, and your audio never leaves your device.',
      },
    ],
    features: [
      'Five voice effects to choose from',
      'Preview before downloading',
      '16-bit WAV export',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'vocal-remover': {
    id: 'vocal-remover',
    howToTitle: 'How to reduce vocals in a song',
    howToIntro:
      'The Vocal Reducer lowers centered vocals in a stereo mix using center-channel extraction: sounds panned dead-center are cancelled by subtracting one channel from the other, leaving the stereo difference. This is an approximation, not AI source separation, so judge the result by listening.',
    howToSteps: [
      'Drop a stereo audio file onto the upload area, or choose one from your device.',
      'Click "Reduce Center Vocals & Make WAV" to run the center-channel extraction.',
      'Download the resulting WAV file and listen to check how much of the vocal is left.',
    ],
    faqs: [
      {
        question: 'Does it completely remove the vocals?',
        answer:
          'No. It reduces vocals that are panned dead-center in a stereo mix. It is an approximation, not true AI source separation, so some vocal usually remains.',
      },
      {
        question: 'Does it work on mono audio files?',
        answer:
          'No. The method needs two stereo channels to subtract, so mono files are refused with an honest error message.',
      },
      {
        question: 'What else gets removed besides the vocals?',
        answer:
          'Anything else panned dead-center, such as some bass or reverb, is reduced too, because the tool cannot tell a vocal from any other centered sound.',
      },
      {
        question: 'What format is the result?',
        answer:
          'The reduced mix is exported as a WAV file containing the stereo difference signal.',
      },
    ],
    features: [
      'Center-channel vocal reduction',
      'Shows the stereo mix analysis',
      'WAV export',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'silence-remover': {
    id: 'silence-remover',
    howToTitle: 'How to remove silence from audio',
    howToIntro:
      'The Audio Silence Cutter finds long stretches of dead silence in a recording and cuts them out, leaving the spoken or played parts joined together. You control the silence threshold, the minimum silence length, and the padding kept around the remaining audio. The result is exported as a WAV file.',
    howToSteps: [
      'Drop an audio file onto the upload area, or choose one from your device.',
      'Adjust the Silence Threshold, Minimum Silence, and Padding Kept settings if the defaults do not suit your recording.',
      'Click "Detect Silence" to find the silent regions, then click "Remove Silence" and download the trimmed WAV.',
    ],
    faqs: [
      {
        question: 'What are the default detection settings?',
        answer:
          'The silence threshold is -40 dB, the minimum silence length is 300 milliseconds, and the padding kept around the remaining audio is 100 milliseconds.',
      },
      {
        question: 'What does the padding setting do?',
        answer:
          'Padding Kept keeps a short buffer of audio around the parts that remain, so the cuts do not sound abrupt.',
      },
      {
        question: 'Does it change the volume of the parts that stay?',
        answer:
          'No. It only removes the silent regions. The audio that remains is kept as it was.',
      },
      {
        question: 'What format is the trimmed audio saved as?',
        answer:
          'The result is exported as a WAV file.',
      },
    ],
    features: [
      'Automatic silence detection',
      'Adjustable threshold, length, and padding',
      'Shows the silent regions found',
      'WAV export',
      'Free, no signup',
    ],
  },
  'audio-speed': {
    id: 'audio-speed',
    howToTitle: 'How to change audio speed without changing pitch',
    howToIntro:
      'The Audio Speed Changer speeds up or slows down a track from 0.5x to 2.0x while keeping the pitch the same, using WSOLA time-stretching. Drag the slider or pick a quick preset, check the new duration, and download the result as a WAV file.',
    howToSteps: [
      'Drop an audio file onto the upload area, or choose one from your device.',
      'Drag the Playback Speed slider, or pick a quick preset such as 0.75x, 1.25x, or 1.5x.',
      'Apply the change, preview the result, then download the sped-up or slowed-down WAV.',
    ],
    faqs: [
      {
        question: 'Does the pitch change when I change the speed?',
        answer:
          'No. The tool uses WSOLA time-stretching, which changes the tempo while keeping the original pitch.',
      },
      {
        question: 'What speeds can I choose?',
        answer:
          'From 0.5x (half speed) to 2.0x (double speed), in 0.05x steps, with quick presets at 0.5x, 0.75x, 1.0x, 1.25x, 1.5x, and 2.0x.',
      },
      {
        question: 'Will the sound quality suffer at extreme speeds?',
        answer:
          'It can. Dense mixes may smear a little at the fastest and slowest settings, so preview the result before downloading.',
      },
      {
        question: 'What format is the result saved as?',
        answer:
          'The speed-changed audio is exported as a WAV file.',
      },
    ],
    features: [
      'Pitch-preserving speed change (WSOLA)',
      'Speed range 0.5x to 2.0x',
      'Quick presets for common speeds',
      'Shows the new output duration',
      'Free, no signup',
    ],
  },
  'bpm-finder': {
    id: 'bpm-finder',
    howToTitle: 'How to find the BPM of a song',
    howToIntro:
      'The BPM Counter finds the tempo of a track two ways: tap along to the beat yourself, or upload an audio file and let the tool analyse it. The tap mode needs at least four taps, and the analysis mode reports a confidence percentage with the result.',
    howToSteps: [
      'Choose "Tap Tempo" to tap along, or "File Analysis" to analyse an uploaded track.',
      'In tap mode, tap the big button on every beat, at least four times. In analysis mode, upload your track and click the analyse button.',
      'Read the beats-per-minute result, and in analysis mode you can download a report of the result.',
    ],
    faqs: [
      {
        question: 'How many taps do I need in tap mode?',
        answer:
          'At least four taps. Tap the big button on every beat of the music, and the tool works out the tempo from the gaps between your taps.',
      },
      {
        question: 'How accurate is the file analysis?',
        answer:
          'The analysis reports a confidence percentage next to the BPM result, so you can see how sure the tool is about the tempo it found.',
      },
      {
        question: 'What happens with a steady tone or silence?',
        answer:
          'The tool correctly reports that there is no beat to find, instead of guessing a tempo for audio with no rhythm.',
      },
      {
        question: 'Is my audio file uploaded anywhere?',
        answer:
          'No. The analysis runs entirely in your browser, and your file never leaves your device.',
      },
    ],
    features: [
      'Tap Tempo mode for any music',
      'File analysis with a confidence score',
      'Downloadable analysis report',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'metronome': {
    id: 'metronome',
    howToTitle: 'How to use the online metronome',
    howToIntro:
      'The Metronome keeps perfect time while you practise an instrument, with a tempo from 40 to 208 beats per minute. Set the tempo with the slider, by typing a number, or by tapping along. You can also choose the beats per bar, accent the first beat, and set the click volume.',
    howToSteps: [
      'Set the tempo with the slider or number field, or click "Tap to set tempo" and tap along to the beat.',
      'Choose the beats per bar (2, 3, 4, or 6), turn the first-beat accent on or off, and set the click volume.',
      'Click "Start Metronome" to begin the clicks, and stop it when you are done practising.',
    ],
    faqs: [
      {
        question: 'What tempo range does the metronome cover?',
        answer:
          'From 40 to 208 beats per minute, which covers slow practice tempos right up to fast performance tempos.',
      },
      {
        question: 'Can I change the time signature?',
        answer:
          'You can set the beats per bar to 2, 3, 4, or 6, and turn on the accent so the first beat of each bar sounds stronger.',
      },
      {
        question: 'How do I set the tempo by tapping?',
        answer:
          'Click "Tap to set tempo" and tap the button in time with the music. The metronome takes its tempo from your taps.',
      },
      {
        question: 'Does the metronome need an internet connection to tick?',
        answer:
          'No. The clicks are generated in your browser once the page has loaded.',
      },
    ],
    features: [
      'Tempo from 40 to 208 BPM',
      'Tap tempo to set the speed',
      'Beats per bar with first-beat accent',
      'Adjustable click volume',
      'Free, no signup',
    ],
  },
  'audio-converter': {
    id: 'audio-converter',
    howToTitle: 'How to convert an audio file to another format',
    howToIntro:
      'The Audio Format Converter changes an audio file between the formats your browser can actually record: WAV, WebM (Opus), and OGG (Opus), depending on browser support. MP3 and FLAC are shown as unavailable with the reason, because browsers ship no encoder for them.',
    howToSteps: [
      'Drop an audio file onto the upload area, or choose one from your device.',
      'Pick an output format: WAV (16-bit PCM), WebM (Opus), or OGG (Opus), where your browser supports it.',
      'Click the "Convert to" button for your chosen format, then download the converted file.',
    ],
    faqs: [
      {
        question: 'Can I convert audio to MP3?',
        answer:
          'No. Browsers ship no MP3 encoder, so MP3 output is not possible in the browser. The MP3 option is shown as unavailable with that reason instead of producing a mislabelled file.',
      },
      {
        question: 'Can I convert audio to FLAC?',
        answer:
          'No, for the same reason as MP3: browsers ship no FLAC encoder, so the FLAC option is shown as unavailable with an explanation.',
      },
      {
        question: 'Which output formats do work?',
        answer:
          'WAV (16-bit PCM) always works. WebM (Opus) and OGG (Opus) work where your browser supports recording them — Firefox supports OGG, for example.',
      },
      {
        question: 'Is my audio file uploaded anywhere?',
        answer:
          'No. The conversion runs entirely in your browser, and your file never leaves your device.',
      },
    ],
    features: [
      'WAV, WebM, and OGG output',
      'Honest labels for unavailable formats',
      'No fake or mislabelled files',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'word-counter': {
    id: 'word-counter',
    howToTitle: 'How to count words and characters online',
    howToIntro:
      'The Word and Character Counter counts your text live as you type or paste it: words, characters, characters without spaces, lines, paragraphs, and an estimated reading time. The counts appear in the output panel the moment the text changes, with no upload and no signup.',
    howToSteps: [
      'Type or paste your text into the Source Text Input box.',
      'Watch the counts update live in the Processed Content Output panel as you type.',
      'Copy the counts with the Copy button, or download them as a text file.',
    ],
    faqs: [
      {
        question: 'What exactly does the word counter count?',
        answer:
          'Words, characters, characters without spaces, lines, paragraphs, and an estimated reading time — all shown together in the output panel.',
      },
      {
        question: 'Do the counts update while I type?',
        answer:
          'Yes. The counts are recalculated live on every change to the text, so you always see the current numbers.',
      },
      {
        question: 'How is the reading time estimated?',
        answer:
          'The tool shows an estimated reading time next to the counts, labelled as an estimate rather than an exact measure.',
      },
      {
        question: 'Is my text uploaded anywhere?',
        answer:
          'No. Counting runs entirely in your browser, and your text never leaves your device.',
      },
    ],
    features: [
      'Live word, character, line, and paragraph counts',
      'Characters counted with and without spaces',
      'Estimated reading time',
      'Copy or download the results',
      'Free, no signup',
    ],
  },
  'case-converter': {
    id: 'case-converter',
    howToTitle: 'How to change text case online',
    howToIntro:
      'The Text Case Converter changes your text into any common case style with one click: UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case, or kebab-case. Paste your text, pick a style, and copy the converted result from the output panel.',
    howToSteps: [
      'Type or paste your text into the Source Text Input box.',
      'Click the case button you want, such as UPPERCASE, Title Case, camelCase, or snake_case.',
      'Copy the converted text from the output panel, or download it as a text file.',
    ],
    faqs: [
      {
        question: 'Which case styles are available?',
        answer:
          'Eight: UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case, and kebab-case.',
      },
      {
        question: 'Does converting change my original text?',
        answer:
          'No. Your text stays in the input box, and the converted version appears separately in the output panel.',
      },
      {
        question: 'Can I convert code identifiers like variable names?',
        answer:
          'Yes. The camelCase, PascalCase, snake_case, and kebab-case buttons are made for exactly that kind of text.',
      },
      {
        question: 'Is my text uploaded anywhere?',
        answer:
          'No. The conversion runs entirely in your browser, and your text never leaves your device.',
      },
    ],
    features: [
      'Eight case styles in one click',
      'Works on any pasted text',
      'Copy or download the result',
      'Free, no signup',
      'Text never leaves your browser',
    ],
  },
  'base64-coder': {
    id: 'base64-coder',
    howToTitle: 'How to encode and decode Base64',
    howToIntro:
      'The Base64 Encoder and Decoder converts text to Base64 and back again. Paste plain text and click Encode Base64, or paste a Base64 string and click Decode Base64. It handles Unicode text safely, and an invalid Base64 string shows an error message instead of a wrong result.',
    howToSteps: [
      'Type or paste your text — or a Base64 string — into the Source Text Input box.',
      'Click "Encode Base64" to encode, or "Decode Base64" to decode.',
      'Copy the result from the output panel, or download it as a text file.',
    ],
    faqs: [
      {
        question: 'What is Base64 used for?',
        answer:
          'Base64 turns binary or special data into plain text characters, so it can be pasted into text fields, URLs, configuration files, or messages that only accept text.',
      },
      {
        question: 'Does it handle non-English text?',
        answer:
          'Yes. The encoder handles Unicode text safely, so accented letters and other scripts encode and decode correctly.',
      },
      {
        question: 'What happens if I decode an invalid Base64 string?',
        answer:
          'The tool shows an error message telling you the input is not valid Base64, instead of returning a wrong result.',
      },
      {
        question: 'Is my text uploaded anywhere?',
        answer:
          'No. Encoding and decoding run entirely in your browser, and your text never leaves your device.',
      },
    ],
    features: [
      'Encode and decode in one click',
      'Unicode-safe encoding',
      'Clear error for invalid input',
      'Copy or download the result',
      'Free, no signup',
    ],
  },
  'url-coder': {
    id: 'url-coder',
    howToTitle: 'How to encode and decode a URL',
    howToIntro:
      'The URL Encoder and Decoder makes text safe to put in a web address. Click Encode URL to turn special characters into percent codes — a space becomes %20, for example — or click Decode URL to turn a coded address back into readable text. Everything runs in your browser.',
    howToSteps: [
      'Type or paste a URL, or any text with special characters, into the Source Text Input box.',
      'Click "Encode URL" to encode it, or "Decode URL" to decode it.',
      'Copy the result from the output panel, or download it as a text file.',
    ],
    faqs: [
      {
        question: 'Which characters get encoded?',
        answer:
          'Special characters such as spaces, question marks, ampersands, and equals signs. For example, "hello world?x=1&y=2" encodes to "hello%20world%3Fx%3D1%26y%3D2".',
      },
      {
        question: 'When do I need to encode a URL?',
        answer:
          'When a value you put in a link or a query string contains spaces or characters like ? and &, which would otherwise break the address or change its meaning.',
      },
      {
        question: 'What happens if I decode an invalid URL?',
        answer:
          'The tool shows an error message instead of returning a wrong result.',
      },
      {
        question: 'Is my text uploaded anywhere?',
        answer:
          'No. Encoding and decoding run entirely in your browser, and your text never leaves your device.',
      },
    ],
    features: [
      'Encode and decode in one click',
      'Handles query strings and special characters',
      'Clear error for invalid input',
      'Copy or download the result',
      'Free, no signup',
    ],
  },
  'markdown-editor': {
    id: 'markdown-editor',
    howToTitle: 'How to write and preview Markdown',
    howToIntro:
      'The Interactive Markdown Editor lets you write Markdown and see the rendered result live. Switch between Write, Split, and Preview views, use headings, bold and italic text, code, lists, tables, blockquotes, and rules, then copy the HTML or download your work as Markdown or a standalone HTML file.',
    howToSteps: [
      'Type your Markdown in the editor, or click Load Sample to start from an example document.',
      'Switch between Write, Split, and Preview views to write, compare, or check the rendered result.',
      'Click Copy HTML to copy the rendered HTML, or download your work as a .md or .html file.',
    ],
    faqs: [
      {
        question: 'What Markdown does the editor support?',
        answer:
          'Headings, bold and italic text, inline and fenced code, ordered and unordered lists, tables, blockquotes, and horizontal rules, with a live preview as you type.',
      },
      {
        question: 'Is raw HTML in my Markdown executed?',
        answer:
          'No. Raw HTML such as a script tag is escaped and shown as text, never executed, so pasted Markdown cannot run code in your browser.',
      },
      {
        question: 'Can I download what I wrote?',
        answer:
          'Yes. You can download the Markdown source as a .md file, or the rendered result as a standalone .html file.',
      },
      {
        question: 'Is my text uploaded anywhere?',
        answer:
          'No. Writing and previewing run entirely in your browser, and your text never leaves your device.',
      },
    ],
    features: [
      'Live preview as you type',
      'Write, Split, and Preview views',
      'Tables, code blocks, and lists',
      'Copy HTML or download .md and .html',
      'Free, no signup',
    ],
  },
  'regex-tester': {
    id: 'regex-tester',
    howToTitle: 'How to test a regular expression',
    howToIntro:
      'The Interactive RegEx Tester checks a regular expression against your text and highlights every match. Type a pattern, paste the text to test it on, and toggle the global, case-insensitive, multiline, dot-all, and Unicode flags. A quick-reference panel offers common tokens to add to your pattern.',
    howToSteps: [
      'Enter your pattern in the Regular Expression box, or click "Load Sample" to start from the sample email pattern.',
      'Paste the text you want to test into the test text box.',
      'Toggle the flags you need and read the highlighted matches and the match count.',
    ],
    faqs: [
      {
        question: 'Which regex flags can I use?',
        answer:
          'Five: Global (g) finds all matches, Case-insensitive (i) ignores upper and lower case, Multiline (m) makes ^ and $ match line boundaries, Dot-all (s) lets . match newlines, and Unicode (u) enables full Unicode matching.',
      },
      {
        question: 'What does the sample pattern test?',
        answer:
          'The sample is an email pattern tested against sample text. It finds the email addresses in the text and highlights each one.',
      },
      {
        question: 'Can I copy the matches I found?',
        answer:
          'Yes. A Copy Matches button copies the matched text so you can paste it elsewhere.',
      },
      {
        question: 'Is my text uploaded anywhere?',
        answer:
          'No. The pattern is tested entirely in your browser, and your text never leaves your device.',
      },
    ],
    features: [
      'Live match highlighting',
      'Five regex flags (g, i, m, s, u)',
      'Match count and copy matches',
      'Quick-reference token panel',
      'Free, no signup',
    ],
  },
  'text-diff': {
    id: 'text-diff',
    howToTitle: 'How to compare two texts',
    howToIntro:
      'The Text Diff Checker compares two texts side by side and pinpoints the differences line by line. Paste the original text on the left and the changed text on the right, and the tool highlights added and removed lines and counts how many lines were added, removed, or left unchanged.',
    howToSteps: [
      'Paste the original text into the left box.',
      'Paste the changed text into the right box.',
      'Read the diff result below, which highlights the differences and counts added, removed, and unchanged lines.',
    ],
    faqs: [
      {
        question: 'How does the diff show changes?',
        answer:
          'It compares the two texts line by line. Lines that were added and lines that were removed are highlighted, and the result counts added, removed, and unchanged lines.',
      },
      {
        question: 'Can I try it with sample text first?',
        answer:
          'Yes. The "Load Sample" button fills both boxes with example texts so you can see how the diff looks before pasting your own.',
      },
      {
        question: 'Can I copy the diff result?',
        answer:
          'Yes. A Copy Diff button copies the comparison so you can paste it elsewhere.',
      },
      {
        question: 'Is my text uploaded anywhere?',
        answer:
          'No. The comparison runs entirely in your browser, and your text never leaves your device.',
      },
    ],
    features: [
      'Side-by-side text comparison',
      'Line-by-line added and removed highlighting',
      'Added, removed, and unchanged counts',
      'Copy the diff result',
      'Free, no signup',
    ],
  },
  'find-replace': {
    id: 'find-replace',
    howToTitle: 'How to find and replace text',
    howToIntro:
      'The Find and Replace Text Engine finds every occurrence of a string or pattern in your text and replaces it in one go. You can match case-sensitively, use a regular expression with capture groups, or match whole words only. Matches are counted and highlighted as you type.',
    howToSteps: [
      'Paste your text, then enter the text to find in the Find box and the replacement in the Replace With box.',
      'Turn on Case-sensitive, Regular expression, or Whole word if you need a stricter match.',
      'Click "Replace All" to replace every match at once, then copy the result or download it as a .txt file.',
    ],
    faqs: [
      {
        question: 'Can I use a regular expression to find text?',
        answer:
          'Yes. Turn on the Regular expression toggle, and the Find box accepts a pattern. Capture groups such as $1 and $& are supported in the replacement.',
      },
      {
        question: 'Does Replace All change every match at once?',
        answer:
          'Yes. Replace All replaces all of the counted matches in one step, and the match count on the button shows how many will be replaced.',
      },
      {
        question: 'Can I match whole words only?',
        answer:
          'Yes. The Whole word toggle makes sure the search only matches complete words, so "cat" will not match inside "cats" or "scatter".',
      },
      {
        question: 'Is my text uploaded anywhere?',
        answer:
          'No. Finding and replacing run entirely in your browser, and your text never leaves your device.',
      },
    ],
    features: [
      'Replace all matches in one click',
      'Regular expressions with capture groups',
      'Case-sensitive and whole-word options',
      'Live match count and highlighting',
      'Free, no signup',
    ],
  },
  'slug-generator': {
    id: 'slug-generator',
    howToTitle: 'How to create a URL slug',
    howToIntro:
      'The URL Slug Maker turns an article title into a clean, search-engine-friendly URL slug. It lowercases the text, strips accents from letters, removes punctuation, and joins the words with single hyphens, so a title becomes a tidy address you can use in a link.',
    howToSteps: [
      'Type or paste your article title into the Source Text Input box.',
      'Click "Generate URL Slug".',
      'Copy the slug from the output panel, or download it as a text file.',
    ],
    faqs: [
      {
        question: 'What does a generated slug look like?',
        answer:
          '"Hello World! Café 2026" becomes "hello-world-cafe-2026": lowercased, the accent stripped, punctuation removed, and words joined with hyphens.',
      },
      {
        question: 'What happens to accented letters?',
        answer:
          'Accents are stripped, so "Café" becomes "cafe" and other accented letters become their plain equivalents.',
      },
      {
        question: 'What happens to spaces and punctuation?',
        answer:
          'Spaces become single hyphens, punctuation is removed, repeated hyphens are collapsed into one, and leading or trailing hyphens are trimmed.',
      },
      {
        question: 'Is my text uploaded anywhere?',
        answer:
          'No. The slug is generated entirely in your browser, and your text never leaves your device.',
      },
    ],
    features: [
      'Lowercase, hyphenated slugs',
      'Strips accents and punctuation',
      'Collapses repeated hyphens',
      'Copy or download the result',
      'Free, no signup',
    ],
  },
  'lorem-ipsum': {
    id: 'lorem-ipsum',
    howToTitle: 'How to generate Lorem Ipsum text',
    howToIntro:
      'The Lorem Ipsum Generator creates standard dummy placeholder text for layout drafts. Choose how many paragraphs you need, from 1 to 20, and click Generate. The output is deterministic, so the same paragraph count always gives the same text, which keeps drafts consistent.',
    howToSteps: [
      'Set the paragraph count in the number box, from 1 to 20.',
      'Click "Generate Lorem Ipsum".',
      'Copy the generated text from the output panel, or download it as a text file.',
    ],
    faqs: [
      {
        question: 'How many paragraphs can I generate?',
        answer:
          'From 1 to 20 paragraphs. Set the count in the number box before clicking Generate Lorem Ipsum.',
      },
      {
        question: 'What does the generated text start with?',
        answer:
          'The classic opening: "Lorem ipsum dolor sit amet, consectetur…" followed by standard placeholder sentences.',
      },
      {
        question: 'Is the generated text random?',
        answer:
          'No. The output is deterministic, so generating the same number of paragraphs always produces the same text.',
      },
      {
        question: 'What is Lorem Ipsum used for?',
        answer:
          'It is placeholder text for layout drafts, so designers can see how a page looks with real-looking text before the final copy is written.',
      },
    ],
    features: [
      'From 1 to 20 paragraphs',
      'Deterministic placeholder output',
      'Standard Lorem Ipsum text',
      'Copy or download the result',
      'Free, no signup',
    ],
  },
};
