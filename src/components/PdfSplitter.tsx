import React, { useEffect, useState } from 'react';
import {
  ArrowsCounterClockwise,
  Download,
  FileText,
  Scissors,
  Trash
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { PdfDropzone, PdfToolHeader, primaryButtonClassName } from './PdfToolShell';
import {
  downloadBytes,
  getPdfPageCount,
  splitByRangeGroups,
  splitEveryN,
  splitPdfBytes,
  stripExtension,
  validatePdfFile,
  type SplitPart
} from '../lib/pdfTools';
import { formatFileSize } from '../lib/imageTools';

interface PdfSplitterProps {
  onBack: () => void;
  initialFile?: File;
}

interface SplitResult {
  label: string;
  pages: number[];
  bytes: Uint8Array;
}

export default function PdfSplitter({ onBack, initialFile }: PdfSplitterProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<'ranges' | 'every'>('ranges');
  const [rangesInput, setRangesInput] = useState('1-3,5');
  const [everyN, setEveryN] = useState('2');
  const [isSplitting, setIsSplitting] = useState(false);
  const [results, setResults] = useState<SplitResult[]>([]);

  useEffect(() => {
    if (initialFile) void handleFile(initialFile);
  }, [initialFile]);

  const handleFile = async (selected: File) => {
    const validation = validatePdfFile(selected);
    if (!validation.ok) {
      toast.error('Invalid File', validation.message);
      return;
    }
    try {
      const bytes = new Uint8Array(await selected.arrayBuffer());
      const count = await getPdfPageCount(bytes);
      setFile(selected);
      setFileBytes(bytes);
      setPageCount(count);
      setResults([]);
      toast.success('PDF Loaded', `"${selected.name}" has ${count} page${count !== 1 ? 's' : ''}.`);
    } catch (err: any) {
      console.error('PDF load error:', err);
      toast.error('Could Not Read PDF', err?.message || 'This file could not be parsed as a PDF.');
    }
  };

  const handleSplit = async () => {
    if (!fileBytes || pageCount === 0) return;
    let parts: SplitPart[];
    if (mode === 'ranges') {
      const parsed = splitByRangeGroups(rangesInput, pageCount);
      if (!parsed.ok) {
        toast.error('Invalid Page Ranges', parsed.error);
        return;
      }
      parts = parsed.parts ?? [];
    } else {
      const n = parseInt(everyN, 10);
      if (!Number.isFinite(n) || n < 1 || n > pageCount) {
        toast.error('Invalid Interval', `Enter a number of pages between 1 and ${pageCount}.`);
        return;
      }
      parts = splitEveryN(pageCount, n);
    }
    if (parts.length === 0) return;
    setIsSplitting(true);
    try {
      const split = await splitPdfBytes(fileBytes, parts);
      const mergedResults: SplitResult[] = split.map((s) => ({
        label: s.label,
        pages: parts.find((p) => p.label === s.label)?.pages ?? [],
        bytes: s.bytes
      }));
      setResults(mergedResults);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      toast.success('PDF Split', `Split into ${mergedResults.length} file${mergedResults.length !== 1 ? 's' : ''}.`);
    } catch (err: any) {
      console.error('PDF split error:', err);
      toast.error('Split Failed', err?.message || 'Could not split this PDF.');
    } finally {
      setIsSplitting(false);
    }
  };

  const downloadPart = (result: SplitResult) => {
    if (!file) return;
    downloadBytes(result.bytes, `${stripExtension(file.name)}_${result.label}.pdf`, 'application/pdf');
  };

  const downloadAll = () => {
    results.forEach((result, i) => {
      window.setTimeout(() => downloadPart(result), i * 250);
    });
    toast.success('Downloads Started', `${results.length} split file${results.length !== 1 ? 's' : ''} downloading.`);
  };

  const clearAll = () => {
    setFile(null);
    setFileBytes(null);
    setPageCount(0);
    setResults([]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="pdf-splitter-tool">
      <PdfToolHeader
        onBack={onBack}
        icon={<Scissors className="w-8 h-8 text-[#10b981]" />}
        title="PDF Splitter"
        subtitle="Split a PDF by page ranges or into equal chunks — each part downloads as its own PDF."
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
          <h2 className="font-sans text-lg text-white pb-3 border-b border-[#2a2a2a]">Split Options</h2>

          {file ? (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">File</span><span className="text-white font-semibold truncate max-w-[160px]" title={file.name}>{file.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Size</span><span className="text-white font-semibold">{formatFileSize(file.size)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Pages</span><span className="text-white font-semibold">{pageCount}</span></div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Upload a PDF first, then choose how to split it.</p>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Split Mode</label>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                { id: 'ranges', label: 'Page Ranges' },
                { id: 'every', label: 'Every N Pages' }
              ] as const).map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setMode(m.id); setResults([]); }}
                  className={`py-2 px-1 text-xs font-semibold rounded border transition-all cursor-pointer text-center ${
                    mode === m.id
                      ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                      : 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'ranges' ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="split-ranges" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Page Ranges</label>
              <input
                id="split-ranges"
                type="text"
                value={rangesInput}
                onChange={(e) => { setRangesInput(e.target.value); setResults([]); }}
                placeholder="1-3,5"
                className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
              />
              <span className="text-[10px] text-gray-500">Each group becomes its own file. Example: 1-3,5,8-10{pageCount > 0 ? ` (this PDF has ${pageCount} pages)` : ''}.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor="split-every-n" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pages Per File</label>
              <input
                id="split-every-n"
                type="number"
                min="1"
                value={everyN}
                onChange={(e) => { setEveryN(e.target.value); setResults([]); }}
                className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
              />
              <span className="text-[10px] text-gray-500">Splits the whole document into equal chunks of N pages.</span>
            </div>
          )}

          <div className="mt-2 flex flex-col gap-2">
            <button
              onClick={() => void handleSplit()}
              disabled={!fileBytes || isSplitting}
              className={primaryButtonClassName(Boolean(fileBytes))}
            >
              {isSplitting ? <><ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Splitting…</> : <><Scissors className="w-4 h-4" /> Split PDF</>}
            </button>
            {results.length > 0 && (
              <button
                onClick={downloadAll}
                className="w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download All Parts
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <PdfDropzone
            accept="application/pdf,.pdf"
            label="Drag & drop your PDF here"
            hint="The PDF stays on your device — splitting happens locally"
            buttonLabel="Choose PDF"
            ariaLabel="Upload a PDF to split. Drop a file or press Enter to browse."
            disabled={isSplitting}
            onFiles={(files) => { if (files[0]) void handleFile(files[0]); }}
          />

          {results.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Split parts ({results.length})
              </span>
              {results.map((result) => (
                <div
                  key={result.label}
                  className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-sm hover:border-[#10b981]/30 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-[#151515] border border-[#2a2a2a] rounded text-[#10b981] shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-semibold text-white truncate">
                        {file ? `${stripExtension(file.name)}_${result.label}.pdf` : `${result.label}.pdf`}
                      </h4>
                      <span className="text-xs text-gray-400 font-semibold">
                        {result.pages.length} page{result.pages.length !== 1 ? 's' : ''} · {(result.bytes.length / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadPart(result)}
                    className="p-2 min-h-10 min-w-10 inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 rounded text-white shadow-sm transition-colors cursor-pointer shrink-0"
                    title="Download this part"
                    aria-label={`Download ${result.label}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && !file && (
            <div className="text-center py-8 text-gray-500 text-sm select-none font-medium">
              No PDF loaded. Add one to get started!
            </div>
          )}
          {results.length === 0 && file && (
            <div className="text-center py-8 text-gray-500 text-sm select-none font-medium flex items-center justify-center gap-2">
              <Trash className="w-4 h-4 hidden" />
              Choose a split mode above, then press Split PDF.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
