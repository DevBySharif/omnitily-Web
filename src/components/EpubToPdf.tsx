import React, { useEffect, useState } from 'react';
import {
  ArrowsCounterClockwise,
  BookOpen,
  Download,
  ListBullets
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { PdfDropzone, PdfToolHeader, primaryButtonClassName } from './PdfToolShell';
import {
  buildTextPdf,
  downloadBytes,
  parseEpub,
  stripExtension,
  validateEpubFile,
  type EpubBook
} from '../lib/pdfTools';
import { formatFileSize } from '../lib/imageTools';
import { sanitizePdfTitle } from '../lib/imageTools';

interface EpubToPdfProps {
  onBack: () => void;
  initialFile?: File;
}

export default function EpubToPdf({ onBack, initialFile }: EpubToPdfProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [book, setBook] = useState<EpubBook | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

  useEffect(() => {
    if (initialFile) void handleFile(initialFile);
  }, [initialFile]);

  const handleFile = async (selected: File) => {
    const validation = validateEpubFile(selected);
    if (!validation.ok) {
      toast.error('Invalid File', validation.message);
      return;
    }
    setFile(selected);
    setBook(null);
    setPdfBytes(null);
    setIsParsing(true);
    try {
      const bytes = new Uint8Array(await selected.arrayBuffer());
      const parsed = await parseEpub(bytes);
      setBook(parsed);
      const totalWords = parsed.chapters.reduce(
        (sum, c) => sum + (c.text.trim() ? c.text.trim().split(/\s+/).length : 0),
        0
      );
      toast.success('EPUB Read', `"${parsed.title}" — ${parsed.chapters.length} chapter${parsed.chapters.length !== 1 ? 's' : ''}, ${totalWords.toLocaleString()} words.`);
    } catch (err: any) {
      console.error('EPUB parse error:', err);
      toast.error('Could Not Read EPUB', err?.message || 'This file could not be parsed as an EPUB.');
      setFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConvert = () => {
    if (!book) return;
    setIsConverting(true);
    try {
      const bytes = buildTextPdf(
        book.chapters.map((c) => ({ heading: c.heading, text: c.text })),
        { title: book.title }
      );
      setPdfBytes(bytes);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      toast.success('EPUB Converted', `"${book.title}" is now a ${(bytes.length / 1024).toFixed(0)} KB PDF.`);
    } catch (err: any) {
      console.error('EPUB to PDF error:', err);
      toast.error('Conversion Failed', err?.message || 'Could not build the PDF.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!file || !pdfBytes) return;
    const base = book?.title ? sanitizePdfTitle(book.title) : stripExtension(file.name);
    downloadBytes(pdfBytes, `${base}.pdf`, 'application/pdf');
    toast.success('Download Started', 'Your PDF is downloading.');
  };

  const clearAll = () => {
    setFile(null);
    setBook(null);
    setPdfBytes(null);
  };

  const totalWords = book
    ? book.chapters.reduce((sum, c) => sum + (c.text.trim() ? c.text.trim().split(/\s+/).length : 0), 0)
    : 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="epub-to-pdf-tool">
      <PdfToolHeader
        onBack={onBack}
        icon={<BookOpen className="w-8 h-8 text-[#10b981]" />}
        title="EPUB to PDF"
        subtitle="Turn an ebook into a paginated PDF — chapters become headed sections. Runs entirely in your browser."
        action={file ? (
          <button
            onClick={clearAll}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="font-sans text-lg text-white pb-3 border-b border-[#2a2a2a]">Book Details</h2>
          {file && book ? (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Title</span><span className="text-white font-semibold truncate max-w-[160px]" title={book.title}>{book.title}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Chapters</span><span className="text-white font-semibold">{book.chapters.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Words</span><span className="text-white font-semibold">{totalWords.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">File size</span><span className="text-white font-semibold">{formatFileSize(file.size)}</span></div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Upload an .epub file. Its chapters are read in spine order and rendered as a paginated PDF.
              <br /><br />
              Note: only the book&apos;s text converts — embedded images and complex layouts are not carried over.
            </p>
          )}
          <div className="mt-2 flex flex-col gap-2">
            {!pdfBytes ? (
              <button
                onClick={handleConvert}
                disabled={!book || isConverting}
                className={primaryButtonClassName(Boolean(book))}
              >
                {isConverting ? <><ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Converting…</> : <><BookOpen className="w-4 h-4" /> Convert to PDF</>}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDownload}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download PDF Now
                </button>
                <button
                  onClick={() => setPdfBytes(null)}
                  className="w-full py-2 px-4 border border-rose-900/40 hover:bg-rose-950/20 text-rose-400 rounded font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowsCounterClockwise className="w-3.5 h-3.5" /> Re-convert
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <PdfDropzone
            accept=".epub,application/epub+zip"
            label="Drag & drop your EPUB here"
            hint="The ebook stays on your device — conversion happens locally"
            buttonLabel="Choose EPUB"
            ariaLabel="Upload an EPUB to convert to PDF. Drop a file or press Enter to browse."
            disabled={isParsing || isConverting}
            onFiles={(files) => { if (files[0]) void handleFile(files[0]); }}
          />

          {isParsing && (
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
              <ArrowsCounterClockwise className="w-4 h-4 animate-spin text-[#10b981]" /> Reading EPUB chapters…
            </div>
          )}

          {book && (
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ListBullets className="w-4 h-4 text-[#10b981]" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Chapters ({book.chapters.length})
                </span>
              </div>
              <ol className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
                {book.chapters.map((chapter, i) => (
                  <li key={`${chapter.heading}-${i}`} className="flex items-baseline gap-3 text-sm bg-[#151515] border border-[#2a2a2a] rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-gray-500 shrink-0 w-6">{i + 1}.</span>
                    <span className="text-white font-semibold truncate" title={chapter.heading}>{chapter.heading}</span>
                    <span className="text-xs text-gray-500 ml-auto shrink-0">
                      {chapter.text.trim() ? chapter.text.trim().split(/\s+/).length.toLocaleString() : 0} words
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {!file && !isParsing && (
            <div className="text-center py-8 text-gray-500 text-sm select-none font-medium">
              No EPUB loaded. Add one to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
