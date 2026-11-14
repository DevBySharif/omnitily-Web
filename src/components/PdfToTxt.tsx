import React, { useEffect, useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  ClipboardText,
  Download,
  FileText,
  Trash
} from '@phosphor-icons/react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { PdfDropzone, PdfToolHeader, primaryButtonClassName } from './PdfToolShell';
import {
  downloadText,
  extractPdfText,
  stripExtension,
  validatePdfFile,
  type PdfJsLibLike
} from '../lib/pdfTools';
import { formatFileSize } from '../lib/imageTools';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface PdfToTxtProps {
  onBack: () => void;
  initialFile?: File;
}

export default function PdfToTxt({ onBack, initialFile }: PdfToTxtProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [pages, setPages] = useState<string[] | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialFile) handleFile(initialFile);
  }, [initialFile]);

  const handleFile = async (selected: File) => {
    const validation = validatePdfFile(selected);
    if (!validation.ok) {
      toast.error('Invalid File', validation.message);
      return;
    }
    setFile(selected);
    setFileSize(selected.size);
    setPages(null);
    setCopied(false);
    setIsExtracting(true);
    try {
      const bytes = new Uint8Array(await selected.arrayBuffer());
      const extracted = await extractPdfText(bytes, pdfjsLib as unknown as PdfJsLibLike);
      setPages(extracted);
      const nonEmpty = extracted.filter((p) => p.trim().length > 0).length;
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      if (nonEmpty === 0) {
        toast.toast({
          title: 'No Text Found',
          description: 'This PDF has no extractable text — it may be scanned images. Try a text-based PDF.',
          type: 'warning'
        });
      } else {
        toast.success('Text Extracted', `Found text on ${nonEmpty} of ${extracted.length} page${extracted.length !== 1 ? 's' : ''}.`);
      }
    } catch (err: any) {
      console.error('PDF text extraction error:', err);
      toast.error('Extraction Failed', err?.message || 'Could not read the text from this PDF.');
      setFile(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const fullText = pages ? pages.map((text, i) => `--- Page ${i + 1} ---\n${text}`).join('\n\n') : '';
  const charCount = pages ? pages.reduce((sum, p) => sum + p.length, 0) : 0;

  const handleCopy = async () => {
    if (!fullText) return;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success('Copied', 'Extracted text copied to the clipboard.');
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Copy Failed', 'Clipboard access was blocked. Select the text manually instead.');
    }
  };

  const handleDownload = () => {
    if (!file || !fullText) return;
    downloadText(fullText, `${stripExtension(file.name)}.txt`);
    toast.success('Download Started', 'Your .txt file is downloading.');
  };

  const clearAll = () => {
    setFile(null);
    setPages(null);
    setCopied(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="pdf-to-txt-tool">
      <PdfToolHeader
        onBack={onBack}
        icon={<FileText className="w-8 h-8 text-[#10b981]" />}
        title="PDF to Text"
        subtitle="Extract the text from any PDF, right in your browser. Zero server uploads."
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
          <h2 className="font-sans text-lg text-white pb-3 border-b border-[#2a2a2a]">Extracted Text</h2>
          {file ? (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">File</span><span className="text-white font-semibold truncate max-w-[160px]" title={file.name}>{file.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Size</span><span className="text-white font-semibold">{formatFileSize(fileSize)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Pages</span><span className="text-white font-semibold">{pages ? pages.length : '…'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Characters</span><span className="text-white font-semibold">{charCount.toLocaleString()}</span></div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Upload a PDF to extract its text. Scanned image-only PDFs have no text to extract.</p>
          )}
          <div className="mt-2 flex flex-col gap-2">
            <button
              onClick={handleCopy}
              disabled={!fullText}
              className={primaryButtonClassName(Boolean(fullText))}
            >
              {copied ? <><CheckCircle className="w-4 h-4" /> Copied!</> : <><ClipboardText className="w-4 h-4" /> Copy Text</>}
            </button>
            <button
              onClick={handleDownload}
              disabled={!fullText}
              className={`w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                fullText
                  ? 'border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40'
                  : 'border-[#2a2a2a] text-gray-600 cursor-not-allowed'
              }`}
            >
              <Download className="w-4 h-4" /> Download .txt
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <PdfDropzone
            accept="application/pdf,.pdf"
            label="Drag & drop your PDF here"
            hint="One PDF at a time — text is extracted from every page"
            buttonLabel="Choose PDF"
            ariaLabel="Upload a PDF to extract its text. Drop a file or press Enter to browse."
            disabled={isExtracting}
            onFiles={(files) => { if (files[0]) void handleFile(files[0]); }}
          />

          {isExtracting && (
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
              <ArrowsCounterClockwise className="w-4 h-4 animate-spin text-[#10b981]" /> Extracting text…
            </div>
          )}

          {pages && (
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Extracted text ({pages.length} page{pages.length !== 1 ? 's' : ''})
                </span>
                <button
                  onClick={clearAll}
                  className="text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Clear results"
                  aria-label="Clear extracted text"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-words text-sm text-gray-200 bg-[#151515] border border-[#2a2a2a] rounded-lg p-4 max-h-[480px] overflow-y-auto font-mono">
                {fullText || 'No extractable text found in this PDF.'}
              </pre>
            </div>
          )}

          {!file && !isExtracting && (
            <div className="text-center py-8 text-gray-500 text-sm select-none font-medium">
              No PDF loaded. Add one to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
