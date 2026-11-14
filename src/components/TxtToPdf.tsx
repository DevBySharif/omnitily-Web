import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowsCounterClockwise,
  Download,
  FileText,
  Upload
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { PdfToolHeader, primaryButtonClassName } from './PdfToolShell';
import { buildTextPdf, downloadBytes } from '../lib/pdfTools';
import { sanitizePdfTitle } from '../lib/imageTools';

interface TxtToPdfProps {
  onBack: () => void;
  initialFile?: File;
}

export default function TxtToPdf({ onBack, initialFile }: TxtToPdfProps) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('document');
  const [fontSize, setFontSize] = useState<11 | 12 | 14>(12);
  const [pageFormat, setPageFormat] = useState<'a4' | 'letter'>('a4');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialFile) void loadTxtFile(initialFile);
  }, [initialFile]);

  const loadTxtFile = async (file: File) => {
    if (file.size === 0) {
      toast.error('Empty File Skipped', `"${file.name}" is 0 bytes.`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File Too Large', `"${file.name}" exceeds the 10MB limit for text files.`);
      return;
    }
    const content = await file.text();
    setText(content);
    setPdfBytes(null);
    setLoadedFileName(file.name);
    if (!title || title === 'document') {
      const base = file.name.replace(/\.txt$/i, '');
      if (base) setTitle(base);
    }
    toast.success('Text Loaded', `"${file.name}" loaded — ${content.length.toLocaleString()} characters.`);
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const generatePdf = () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    try {
      const bytes = buildTextPdf([{ text }], {
        title: title.trim() || undefined,
        fontSize,
        pageFormat
      });
      setPdfBytes(bytes);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      toast.success('PDF Generated', `Your text is now a paginated ${(bytes.length / 1024).toFixed(0)} KB PDF.`);
    } catch (err: any) {
      console.error('TXT to PDF error:', err);
      toast.error('Generation Failed', err?.message || 'Could not generate the PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBytes) return;
    downloadBytes(pdfBytes, `${sanitizePdfTitle(title)}.pdf`, 'application/pdf');
    toast.success('Download Started', 'Your PDF is downloading.');
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="txt-to-pdf-tool">
      <PdfToolHeader
        onBack={onBack}
        icon={<FileText className="w-8 h-8 text-[#10b981]" />}
        title="Text to PDF"
        subtitle="Paste text or upload a .txt file and get a clean, paginated PDF. Zero server uploads."
        action={text ? (
          <button
            onClick={() => { setText(''); setPdfBytes(null); setLoadedFileName(null); }}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="font-sans text-lg text-white pb-3 border-b border-[#2a2a2a]">PDF Settings</h2>

          <div className="flex flex-col gap-2">
            <label htmlFor="txt-pdf-title" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Document Title</label>
            <div className="flex rounded border border-[#2a2a2a] bg-[#151515] text-white focus-within:border-[#10b981] overflow-hidden text-sm">
              <input
                id="txt-pdf-title"
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setPdfBytes(null); }}
                className="w-full px-3 py-2 bg-transparent focus:outline-none"
              />
              <span className="bg-[#111] text-gray-500 px-3 py-2 border-l border-[#2a2a2a] font-medium shrink-0 flex items-center select-none text-xs">.pdf</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Page Size</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['a4', 'letter'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => { setPageFormat(fmt); setPdfBytes(null); }}
                  className={`py-2 px-1 text-xs font-semibold rounded border transition-all cursor-pointer text-center ${
                    pageFormat === fmt
                      ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                      : 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                  }`}
                >
                  {fmt === 'a4' ? 'A4' : 'Letter'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Font Size</label>
            <div className="grid grid-cols-3 gap-1.5">
              {([11, 12, 14] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => { setFontSize(size); setPdfBytes(null); }}
                  className={`py-2 px-1 text-xs font-semibold rounded border transition-all cursor-pointer text-center ${
                    fontSize === size
                      ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                      : 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                  }`}
                >
                  {size} pt
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {!pdfBytes ? (
              <button
                onClick={generatePdf}
                disabled={!text.trim() || isGenerating}
                className={primaryButtonClassName(Boolean(text.trim()))}
              >
                {isGenerating ? <><ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Generating…</> : <><FileText className="w-4 h-4" /> Generate PDF</>}
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
                  <ArrowsCounterClockwise className="w-3.5 h-3.5" /> Re-generate / Make Changes
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Your text — {wordCount.toLocaleString()} words, {text.length.toLocaleString()} characters
              {loadedFileName ? ` · from ${loadedFileName}` : ''}
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold text-[#10b981] hover:text-emerald-300 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Upload .txt file
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".txt,text/plain"
              aria-label="Choose a .txt file to convert to PDF"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) void loadTxtFile(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </div>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setPdfBytes(null); }}
            placeholder="Paste or type your text here…"
            aria-label="Text to convert to PDF"
            className="w-full min-h-[420px] bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 text-sm text-gray-200 focus:outline-none focus:border-[#10b981] resize-y font-mono"
          />
          {pdfBytes && (
            <p className="text-xs text-emerald-400 font-semibold">
              PDF ready — {(pdfBytes.length / 1024).toFixed(1)} KB. Download it from the panel on the left.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
