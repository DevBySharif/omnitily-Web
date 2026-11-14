import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Download,
  FileCode,
  FileSvg,
  Sliders,
  Sparkle,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { formatFileSize } from '../lib/imageTools';

export interface SvgOptimizerProps {
  onBack: () => void;
  initialFile?: File;
}

export interface SvgValidation {
  valid: boolean;
  error?: string;
}

export interface SvgSavings {
  savedBytes: number;
  percent: number;
}

/**
 * Validate that a string is a parseable SVG document.
 * Uses DOMParser and requires an <svg> root with no parser errors.
 */
export function validateSvg(svg: string): SvgValidation {
  if (!svg || svg.trim() === '') {
    return { valid: false, error: 'The SVG input is empty.' };
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const parserErrors = doc.getElementsByTagName('parsererror');
    if (parserErrors.length > 0) {
      const message = parserErrors[0].textContent?.trim().split('\n')[0] || 'Malformed XML';
      return { valid: false, error: `Invalid SVG: ${message}` };
    }
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== 'svg') {
      return { valid: false, error: 'Invalid SVG: the root element is not <svg>.' };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: `Invalid SVG: ${err instanceof Error ? err.message : 'could not be parsed.'}` };
  }
}

function roundSvgNumbers(svg: string): string {
  // Round numbers with more than 3 decimal places to 3 decimals, trimming
  // trailing zeros (e.g. 12.34567 -> 12.346, 10.5000 -> 10.5, 0.0004 -> 0).
  return svg.replace(/-?\d*\.\d{4,}/g, (match) => {
    const rounded = Math.round(parseFloat(match) * 1000) / 1000;
    return rounded === 0 ? '0' : String(rounded);
  });
}

/**
 * Minify an SVG string: strips XML comments, <metadata> blocks, the XML
 * declaration and DOCTYPE, collapses inter-tag whitespace, and rounds
 * over-precise numbers. Only structural whitespace is removed — text content
 * inside the SVG is left untouched.
 */
export function optimizeSvg(svg: string): string {
  let out = svg;
  // XML declaration and DOCTYPE
  out = out.replace(/<\?xml[^>]*\?>\s*/g, '');
  out = out.replace(/<!DOCTYPE[^>]*(\[[^\]]*\])?>\s*/g, '');
  // Comments
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  // <metadata>...</metadata> blocks and self-closing <metadata .../>
  out = out.replace(/<metadata[\s\S]*?<\/metadata>/g, '');
  out = out.replace(/<metadata[^>]*\/>/g, '');
  // Collapse whitespace between tags and trim
  out = out.replace(/>\s+</g, '><');
  out = out.trim();
  // Round over-precise numbers
  out = roundSvgNumbers(out);
  return out;
}

export function computeSvgSavings(originalBytes: number, optimizedBytes: number): SvgSavings {
  if (!Number.isFinite(originalBytes) || originalBytes <= 0) {
    return { savedBytes: 0, percent: 0 };
  }
  const saved = Math.max(0, originalBytes - optimizedBytes);
  return { savedBytes: saved, percent: Math.round((saved / originalBytes) * 100) };
}

export function byteSize(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function buildOptimizedSvgFileName(originalName?: string): string {
  if (!originalName) return 'optimized.svg';
  const rawName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
  const sanitizedBase = rawName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${sanitizedBase}_optimized.svg`;
}

export default function SvgOptimizer({ onBack, initialFile }: SvgOptimizerProps) {
  const toast = useToast();
  const [input, setInput] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [optimized, setOptimized] = useState<string>('');
  const [optimizedUrl, setOptimizedUrl] = useState<string>('');
  const [originalBytes, setOriginalBytes] = useState(0);
  const [optimizedBytes, setOptimizedBytes] = useState(0);
  const [error, setError] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optimizedUrlRef = useRef('');

  useEffect(() => {
    optimizedUrlRef.current = optimizedUrl;
  }, [optimizedUrl]);

  useEffect(() => {
    return () => {
      if (optimizedUrlRef.current) {
        try { URL.revokeObjectURL(optimizedUrlRef.current); } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (initialFile) {
      handleFiles([initialFile]);
    }
  }, [initialFile]);

  const handleFiles = async (fileList: File[]) => {
    const selected = fileList[0];
    if (!selected) return;
    if (selected.size === 0) {
      toast.error('Empty File Skipped', `"${selected.name}" is 0 bytes and cannot be processed.`);
      return;
    }
    if (!selected.name.toLowerCase().endsWith('.svg') && selected.type !== 'image/svg+xml') {
      toast.error('Unsupported Format', `"${selected.name}" is not an SVG file.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setInput(text);
      setFileName(selected.name);
      setOptimized('');
      setOptimizedUrl('');
      setOriginalBytes(0);
      setOptimizedBytes(0);
      setError('');
      toast.success('SVG Loaded', `"${selected.name}" is ready to optimize.`);
    };
    reader.onerror = () => {
      toast.error('Read Failed', `Could not read "${selected.name}".`);
    };
    try {
      reader.readAsText(selected);
    } catch (err) {
      toast.error('Read Failed', `Could not read "${selected.name}".`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      void handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const clearAll = () => {
    if (optimizedUrlRef.current) {
      try { URL.revokeObjectURL(optimizedUrlRef.current); } catch (e) {}
    }
    setInput('');
    setFileName('');
    setOptimized('');
    setOptimizedUrl('');
    setOriginalBytes(0);
    setOptimizedBytes(0);
    setError('');
  };

  const handleOptimize = () => {
    setIsOptimizing(true);
    setError('');
    const before = validateSvg(input);
    if (!before.valid) {
      setError(before.error || 'The input is not a valid SVG.');
      setOptimized('');
      setOptimizedUrl('');
      toast.error('Invalid SVG', before.error || 'The input is not a valid SVG.');
      setIsOptimizing(false);
      return;
    }
    const result = optimizeSvg(input);
    const after = validateSvg(result);
    if (!after.valid) {
      // Never emit a corrupt SVG: refuse to output anything.
      setError(`Optimization produced an invalid SVG and was discarded: ${after.error || 'parse failed.'}`);
      setOptimized('');
      setOptimizedUrl('');
      toast.error('Optimization Refused', 'The optimized output failed validation, so nothing was produced.');
      setIsOptimizing(false);
      return;
    }
    const origSize = byteSize(input);
    const optSize = byteSize(result);
    if (optimizedUrlRef.current) {
      try { URL.revokeObjectURL(optimizedUrlRef.current); } catch (e) {}
    }
    const blob = new Blob([result], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    setOptimized(result);
    setOptimizedUrl(url);
    setOriginalBytes(origSize);
    setOptimizedBytes(optSize);
    try {
      confetti({ particleCount: 50, spread: 40 });
    } catch (e) {}
    const savings = computeSvgSavings(origSize, optSize);
    toast.success(
      'SVG Optimized',
      savings.percent > 0
        ? `Saved ${formatFileSize(savings.savedBytes)} (${savings.percent}% smaller).`
        : 'Already minimal — no bytes could be saved.'
    );
    setIsOptimizing(false);
  };

  const triggerDownload = () => {
    if (!optimizedUrl) return;
    const a = document.createElement('a');
    a.href = optimizedUrl;
    a.download = buildOptimizedSvgFileName(fileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const savings = computeSvgSavings(originalBytes, optimizedBytes);
  const hasResult = optimized !== '';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="svg-optimizer-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <FileSvg className="w-8 h-8 text-[#10b981]" />
            SVG Optimizer
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Minify your SVG — comments, metadata and excess precision removed. Validated before and after, so a corrupt file is never produced.
          </p>
        </div>
        {input !== '' && (
          <button
            onClick={clearAll}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: settings / actions */}
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a]">
            <Sliders className="w-5 h-5 text-[#10b981]" />
            <h2 className="font-sans text-lg text-white">Optimization</h2>
          </div>

          <div className="flex flex-col gap-2 text-sm text-gray-400">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">What gets removed</span>
            <ul className="list-disc list-inside space-y-1 text-xs leading-relaxed">
              <li>XML comments and <code className="text-gray-300">&lt;metadata&gt;</code> blocks</li>
              <li>XML declaration and DOCTYPE</li>
              <li>Whitespace between tags</li>
              <li>Excess number precision (rounded to 3 decimals)</li>
            </ul>
            <span className="text-[10px] text-gray-500">
              Shapes, paths, text and attributes are preserved. The result is re-parsed before it is shown — if it ever fails validation, nothing is output.
            </span>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Upload an SVG file to optimize. Drop a file or press Enter to browse."
            className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group focus:outline-none focus:border-[#10b981]/70 ${
              isDragging
                ? 'border-[#10b981] bg-[#10b981]/10'
                : 'border-[#2a2a2a] hover:border-[#10b981]/40 bg-[#0d0d0d]'
            }`}
          >
            <input
              id="svg-optimizer-file-input"
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files) void handleFiles(Array.from(e.target.files));
              }}
              accept=".svg,image/svg+xml"
              aria-label="Choose an SVG file to optimize"
              className="hidden"
            />
            <div className="p-2.5 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-2 group-hover:scale-105 transition-transform text-[#10b981]">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-white font-sans text-sm">Upload an .svg file</h3>
            {fileName && (
              <p className="text-gray-500 text-xs mt-1 truncate max-w-full">{fileName}</p>
            )}
          </div>

          <div className="mt-2">
            <button
              onClick={handleOptimize}
              disabled={input.trim() === '' || isOptimizing}
              className={`w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                input.trim() === ''
                  ? 'bg-[#151515] text-gray-600 border border-[#2a2a2a] cursor-not-allowed shadow-none'
                  : 'bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md'
              }`}
            >
              {isOptimizing ? (
                <>
                  <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Optimizing...
                </>
              ) : (
                <>
                  <Sparkle className="w-4 h-4" /> Optimize SVG
                </>
              )}
            </button>
            {hasResult && (
              <button
                onClick={triggerDownload}
                className="w-full mt-2 py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Optimized SVG
              </button>
            )}
          </div>

          {hasResult && (
            <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm font-semibold text-white">Optimized &amp; validated</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Original</div>
                  <div className="text-sm font-bold text-gray-300">{formatFileSize(originalBytes)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Optimized</div>
                  <div className="text-sm font-bold text-emerald-300">{formatFileSize(optimizedBytes)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Saved</div>
                  <div className="text-sm font-bold text-emerald-300">{savings.percent}%</div>
                </div>
              </div>
              <span className="text-[10px] text-gray-500 text-center">
                {formatFileSize(savings.savedBytes)} smaller than the original
              </span>
            </div>
          )}
        </div>

        {/* Right: input + output */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 shadow-sm">
            <label htmlFor="svg-input" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-2">
              <FileCode className="w-3.5 h-3.5 text-gray-500" /> Paste SVG Code
            </label>
            <textarea
              id="svg-input"
              rows={10}
              placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">...</svg>'
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setOptimized('');
                setOptimizedUrl('');
                setOriginalBytes(0);
                setOptimizedBytes(0);
                setError('');
              }}
              spellCheck={false}
              className="w-full text-xs font-mono border border-[#2a2a2a] focus:border-[#10b981] rounded px-4 py-3 bg-[#151515] text-white focus:outline-none resize-y placeholder-gray-500"
            />
          </div>

          {error !== '' && (
            <div className="flex items-start gap-2 text-rose-400 text-xs font-semibold bg-rose-950/20 border border-rose-900/40 rounded-xl px-4 py-3">
              <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {hasResult && (
            <>
              <div className="bg-[#0d0d0d] border border-emerald-900/40 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Optimized Preview</span>
                <div className="rounded border border-[#2a2a2a] bg-[#151515] p-4 flex items-center justify-center min-h-[120px]">
                  <img
                    src={optimizedUrl}
                    alt="Optimized SVG preview"
                    className="max-w-full max-h-[240px]"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 shadow-sm">
                <label htmlFor="svg-output" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                  Optimized SVG Code
                </label>
                <textarea
                  id="svg-output"
                  rows={6}
                  readOnly
                  value={optimized}
                  spellCheck={false}
                  aria-label="Optimized SVG code"
                  className="w-full text-xs font-mono border border-[#2a2a2a] rounded px-4 py-3 bg-[#151515] text-gray-300 focus:outline-none resize-y"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
