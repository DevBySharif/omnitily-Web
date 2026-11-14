import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  ArrowsCounterClockwise,
  Download,
  FileText,
  Files,
  Trash
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { PdfDropzone, PdfToolHeader, primaryButtonClassName } from './PdfToolShell';
import {
  downloadBytes,
  getPdfPageCount,
  mergePdfBytes,
  validatePdfFile
} from '../lib/pdfTools';
import { formatFileSize } from '../lib/imageTools';

interface PdfMergerProps {
  onBack: () => void;
  initialFile?: File;
}

interface MergeItem {
  id: string;
  file: File;
  bytes: Uint8Array;
  pageCount: number;
  error?: string;
}

export default function PdfMerger({ onBack, initialFile }: PdfMergerProps) {
  const toast = useToast();
  const [items, setItems] = useState<MergeItem[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedBytes, setMergedBytes] = useState<Uint8Array | null>(null);
  const [mergedName, setMergedName] = useState('merged_document.pdf');
  const itemsRef = useRef<MergeItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (initialFile) void handleFiles([initialFile]);
  }, [initialFile]);

  const handleFiles = async (fileList: File[]) => {
    const valid: File[] = [];
    for (const file of fileList) {
      const validation = validatePdfFile(file);
      if (!validation.ok) {
        toast.error('Invalid File', validation.message);
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) return;
    for (const file of valid) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pageCount = await getPdfPageCount(bytes);
        const item: MergeItem = {
          id: Math.random().toString(36).substring(2, 9),
          file,
          bytes,
          pageCount
        };
        setItems((prev) => [...prev, item]);
        setMergedBytes(null);
      } catch (err: any) {
        console.error('PDF load error:', err);
        toast.error('Could Not Read PDF', `"${file.name}": ${err?.message || 'not a readable PDF.'}`);
      }
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const next = [...items];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setItems(next);
    setMergedBytes(null);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setMergedBytes(null);
  };

  const clearAll = () => {
    setItems([]);
    setMergedBytes(null);
  };

  const totalPages = items.reduce((sum, item) => sum + item.pageCount, 0);

  const handleMerge = async () => {
    if (items.length < 2) return;
    setIsMerging(true);
    try {
      const bytes = await mergePdfBytes(items.map((item) => item.bytes));
      setMergedBytes(bytes);
      const base = items[0].file.name.replace(/\.pdf$/i, '');
      setMergedName(`${base}_merged.pdf`);
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      toast.success('PDFs Merged', `${items.length} files combined into one ${totalPages}-page PDF.`);
    } catch (err: any) {
      console.error('PDF merge error:', err);
      toast.error('Merge Failed', err?.message || 'Could not merge these PDFs.');
    } finally {
      setIsMerging(false);
    }
  };

  const handleDownload = () => {
    if (!mergedBytes) return;
    downloadBytes(mergedBytes, mergedName, 'application/pdf');
    toast.success('Download Started', 'Your merged PDF is downloading.');
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="pdf-merger-tool">
      <PdfToolHeader
        onBack={onBack}
        icon={<Files className="w-8 h-8 text-[#10b981]" />}
        title="PDF Merger"
        subtitle="Combine multiple PDFs into one document, in the order you choose. Zero server uploads."
        action={items.length > 0 ? (
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
          <h2 className="font-sans text-lg text-white pb-3 border-b border-[#2a2a2a]">Merge Order</h2>
          {items.length > 0 ? (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Files</span><span className="text-white font-semibold">{items.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total pages</span><span className="text-white font-semibold">{totalPages}</span></div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Add at least two PDFs, then order them with the arrows — the top file comes first in the merged document.</p>
          )}
          <div className="mt-2 flex flex-col gap-2">
            {!mergedBytes ? (
              <button
                onClick={() => void handleMerge()}
                disabled={items.length < 2 || isMerging}
                className={primaryButtonClassName(items.length >= 2)}
              >
                {isMerging ? <><ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Merging…</> : <><Files className="w-4 h-4" /> Merge PDFs</>}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDownload}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Merged PDF
                </button>
                <button
                  onClick={() => setMergedBytes(null)}
                  className="w-full py-2 px-4 border border-rose-900/40 hover:bg-rose-950/20 text-rose-400 rounded font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowsCounterClockwise className="w-3.5 h-3.5" /> Re-merge / Make Changes
                </button>
              </div>
            )}
            {items.length === 1 && (
              <span className="text-[10px] text-gray-500 text-center">Add one more PDF to merge.</span>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <PdfDropzone
            accept="application/pdf,.pdf"
            multiple
            label="Drag & drop PDFs to merge"
            hint="Files are merged in the order shown below — reorder with the arrows"
            buttonLabel="Choose PDFs"
            ariaLabel="Upload PDFs to merge. Drop files or press Enter to browse."
            disabled={isMerging}
            onFiles={(files) => void handleFiles(files)}
          />

          <div className="flex flex-col gap-3">
            {items.length > 0 && (
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Merge order ({items.length} files, {totalPages} pages)
              </span>
            )}
            <AnimatePresence>
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-sm group hover:border-[#10b981]/30 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="text-xs font-bold text-gray-400 bg-[#151515] w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-[#2a2a2a]">
                      {index + 1}
                    </div>
                    <div className="p-2 bg-[#151515] border border-[#2a2a2a] rounded text-[#10b981] shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-semibold text-white truncate" title={item.file.name}>{item.file.name}</h4>
                      <span className="text-xs text-gray-400 font-semibold">
                        {item.pageCount} page{item.pageCount !== 1 ? 's' : ''} · {formatFileSize(item.file.size)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="p-2 min-h-10 min-w-10 inline-flex items-center justify-center bg-[#151515] hover:bg-[#1a1a1a] border border-[#2a2a2a] rounded text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Move Up"
                      aria-label={`Move ${item.file.name} up`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === items.length - 1}
                      className="p-2 min-h-10 min-w-10 inline-flex items-center justify-center bg-[#151515] hover:bg-[#1a1a1a] border border-[#2a2a2a] rounded text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Move Down"
                      aria-label={`Move ${item.file.name} down`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 min-h-10 min-w-10 inline-flex items-center justify-center border border-transparent hover:bg-rose-950/20 text-gray-500 hover:text-rose-400 rounded transition-colors cursor-pointer ml-1"
                      title="Remove from merge"
                      aria-label={`Remove ${item.file.name} from merge`}
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm select-none font-medium">
                No PDFs added. Add at least two to get started!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
