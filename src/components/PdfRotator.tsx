import React, { useEffect, useState } from 'react';
import {
  ArrowClockwise,
  ArrowsCounterClockwise,
  Download,
  ArrowsClockwise,
  Trash,
  X
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { PdfDropzone, PdfToolHeader, primaryButtonClassName } from './PdfToolShell';
import {
  downloadBytes,
  getPdfPageCount,
  parsePageRanges,
  rotatePdfBytes,
  stripExtension,
  validatePdfFile,
  type RotationMap
} from '../lib/pdfTools';
import { formatFileSize } from '../lib/imageTools';

interface PdfRotatorProps {
  onBack: () => void;
  initialFile?: File;
}

interface RotationRule {
  id: string;
  pagesSpec: string;
  pages: number[];
  angle: 90 | 180 | 270;
}

export default function PdfRotator({ onBack, initialFile }: PdfRotatorProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pagesInput, setPagesInput] = useState('1');
  const [angle, setAngle] = useState<90 | 180 | 270>(90);
  const [rules, setRules] = useState<RotationRule[]>([]);
  const [isRotating, setIsRotating] = useState(false);
  const [rotatedBytes, setRotatedBytes] = useState<Uint8Array | null>(null);

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
      setRules([]);
      setRotatedBytes(null);
      toast.success('PDF Loaded', `"${selected.name}" has ${count} page${count !== 1 ? 's' : ''}.`);
    } catch (err: any) {
      console.error('PDF load error:', err);
      toast.error('Could Not Read PDF', err?.message || 'This file could not be parsed as a PDF.');
    }
  };

  const addRule = () => {
    if (pageCount === 0) return;
    const parsed = parsePageRanges(pagesInput, pageCount);
    if (!parsed.ok) {
      toast.error('Invalid Pages', parsed.error);
      return;
    }
    setRules((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), pagesSpec: pagesInput.trim(), pages: parsed.pages, angle }
    ]);
    setRotatedBytes(null);
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    setRotatedBytes(null);
  };

  /** Last rule wins for any page covered by more than one rule. */
  const effectiveRotations = (): RotationMap => {
    const map: RotationMap = new Map();
    for (const rule of rules) {
      for (const page of rule.pages) map.set(page, rule.angle);
    }
    return map;
  };

  const handleRotate = async () => {
    if (!fileBytes || rules.length === 0) return;
    setIsRotating(true);
    try {
      const bytes = await rotatePdfBytes(fileBytes, effectiveRotations());
      setRotatedBytes(bytes);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      toast.success('Pages Rotated', `Applied ${rules.length} rotation rule${rules.length !== 1 ? 's' : ''} to ${effectiveRotations().size} page${effectiveRotations().size !== 1 ? 's' : ''}.`);
    } catch (err: any) {
      console.error('PDF rotate error:', err);
      toast.error('Rotation Failed', err?.message || 'Could not rotate this PDF.');
    } finally {
      setIsRotating(false);
    }
  };

  const handleDownload = () => {
    if (!file || !rotatedBytes) return;
    downloadBytes(rotatedBytes, `${stripExtension(file.name)}_rotated.pdf`, 'application/pdf');
    toast.success('Download Started', 'Your rotated PDF is downloading.');
  };

  const clearAll = () => {
    setFile(null);
    setFileBytes(null);
    setPageCount(0);
    setRules([]);
    setRotatedBytes(null);
  };

  const rotationSummary = effectiveRotations();

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="pdf-rotator-tool">
      <PdfToolHeader
        onBack={onBack}
        icon={<ArrowsClockwise className="w-8 h-8 text-[#10b981]" />}
        title="PDF Rotator"
        subtitle="Rotate individual pages by 90°, 180° or 270° — fix sideways scans in seconds."
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
          <h2 className="font-sans text-lg text-white pb-3 border-b border-[#2a2a2a]">Rotation Rules</h2>

          {file ? (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">File</span><span className="text-white font-semibold truncate max-w-[160px]" title={file.name}>{file.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Size</span><span className="text-white font-semibold">{formatFileSize(file.size)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Pages</span><span className="text-white font-semibold">{pageCount}</span></div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Upload a PDF first, then add rotation rules for its pages.</p>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="rotate-pages" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pages</label>
            <input
              id="rotate-pages"
              type="text"
              value={pagesInput}
              onChange={(e) => setPagesInput(e.target.value)}
              placeholder="1-3,5"
              disabled={pageCount === 0}
              className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] disabled:bg-[#121212] disabled:text-gray-600"
            />
            <span className="text-[10px] text-gray-500">Page numbers or ranges, e.g. 1-3,5{pageCount > 0 ? ` (this PDF has ${pageCount} pages)` : ''}.</span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rotate By</label>
            <div className="grid grid-cols-3 gap-1.5">
              {([90, 180, 270] as const).map((deg) => (
                <button
                  key={deg}
                  onClick={() => setAngle(deg)}
                  disabled={pageCount === 0}
                  className={`py-2 px-1 text-xs font-semibold rounded border transition-all cursor-pointer text-center disabled:opacity-30 disabled:cursor-not-allowed ${
                    angle === deg
                      ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                      : 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={addRule}
            disabled={pageCount === 0}
            className="w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-300 hover:border-[#10b981]/40 hover:text-[#10b981] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ArrowClockwise className="w-4 h-4" /> Add Rotation Rule
          </button>

          <div className="mt-2 flex flex-col gap-2">
            {!rotatedBytes ? (
              <button
                onClick={() => void handleRotate()}
                disabled={rules.length === 0 || isRotating}
                className={primaryButtonClassName(rules.length > 0)}
              >
                {isRotating ? <><ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Rotating…</> : <><ArrowsClockwise className="w-4 h-4" /> Rotate &amp; Download</>}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDownload}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Rotated PDF
                </button>
                <button
                  onClick={() => setRotatedBytes(null)}
                  className="w-full py-2 px-4 border border-rose-900/40 hover:bg-rose-950/20 text-rose-400 rounded font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowsCounterClockwise className="w-3.5 h-3.5" /> Re-rotate / Make Changes
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <PdfDropzone
            accept="application/pdf,.pdf"
            label="Drag & drop your PDF here"
            hint="Rotation is applied locally — your file never leaves your device"
            buttonLabel="Choose PDF"
            ariaLabel="Upload a PDF to rotate. Drop a file or press Enter to browse."
            disabled={isRotating}
            onFiles={(files) => { if (files[0]) void handleFile(files[0]); }}
          />

          {rules.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Rules ({rules.length}) — {rotationSummary.size} page{rotationSummary.size !== 1 ? 's' : ''} affected
              </span>
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-sm hover:border-[#10b981]/30 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-[#151515] border border-[#2a2a2a] rounded text-[#10b981] shrink-0">
                      <ArrowsClockwise className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-semibold text-white">
                        Pages {rule.pagesSpec} → {rule.angle}°
                      </h4>
                      <span className="text-xs text-gray-400 font-semibold">
                        {rule.pages.length} page{rule.pages.length !== 1 ? 's' : ''}
                        {rule.pages.some((p) => rotationSummary.get(p) !== rule.angle) ? ' · overridden by a later rule on some pages' : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="p-2 min-h-10 min-w-10 inline-flex items-center justify-center border border-transparent hover:bg-rose-950/20 text-gray-500 hover:text-rose-400 rounded transition-colors cursor-pointer shrink-0"
                    title="Remove rule"
                    aria-label={`Remove rotation rule for pages ${rule.pagesSpec}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {rules.length === 0 && !file && (
            <div className="text-center py-8 text-gray-500 text-sm select-none font-medium">
              No PDF loaded. Add one to get started!
            </div>
          )}
          {rules.length === 0 && file && (
            <div className="text-center py-8 text-gray-500 text-sm select-none font-medium flex items-center justify-center gap-2">
              <Trash className="w-4 h-4 hidden" />
              Enter pages and an angle, then add a rotation rule.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
