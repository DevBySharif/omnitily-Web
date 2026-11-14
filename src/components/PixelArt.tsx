import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Download,
  GridFour,
  Sliders,
  Sparkle,
  SquaresFour,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { formatFileSize, validateImageFile } from '../lib/imageTools';

export interface PixelArtProps {
  onBack: () => void;
  initialFile?: File;
}

export interface PixelGridSize {
  cols: number;
  rows: number;
}

/** How many pixel columns/rows a pixel size produces for a given image. */
export function computePixelGridSize(naturalWidth: number, naturalHeight: number, pixelSize: number): PixelGridSize {
  const px = Math.max(1, Math.floor(pixelSize) || 1);
  return {
    cols: Math.max(1, Math.round(Math.max(1, naturalWidth) / px)),
    rows: Math.max(1, Math.round(Math.max(1, naturalHeight) / px)),
  };
}

/**
 * Pixelate raw RGBA data: every pixelSize x pixelSize block is filled with the
 * block's average color. Returns a new array; the input is not mutated.
 */
export function pixelateImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  pixelSize: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data);
  const px = Math.max(1, Math.floor(pixelSize) || 1);
  for (let by = 0; by < height; by += px) {
    for (let bx = 0; bx < width; bx += px) {
      const blockW = Math.min(px, width - bx);
      const blockH = Math.min(px, height - by);
      const count = blockW * blockH;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let y = by; y < by + blockH; y++) {
        for (let x = bx; x < bx + blockW; x++) {
          const i = (y * width + x) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          a += data[i + 3];
        }
      }
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      a = Math.round(a / count);
      for (let y = by; y < by + blockH; y++) {
        for (let x = bx; x < bx + blockW; x++) {
          const i = (y * width + x) * 4;
          out[i] = r;
          out[i + 1] = g;
          out[i + 2] = b;
          out[i + 3] = a;
        }
      }
    }
  }
  return out;
}

/**
 * Reduce each color channel to 2^bits evenly spaced levels (alpha untouched).
 * bits = 1 gives 8 colors, 2 gives 64, 3 gives 512. Returns a new array.
 */
export function quantizeImageData(data: Uint8ClampedArray, bitsPerChannel: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data);
  const bits = Math.min(8, Math.max(1, Math.floor(bitsPerChannel) || 1));
  const levels = Math.pow(2, bits);
  const step = 255 / (levels - 1);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = Math.round(Math.round(out[i] / step) * step);
    out[i + 1] = Math.round(Math.round(out[i + 1] / step) * step);
    out[i + 2] = Math.round(Math.round(out[i + 2] / step) * step);
  }
  return out;
}

export const PALETTE_OPTIONS = [
  { value: 0, label: 'Off — full color', colors: 0 },
  { value: 1, label: '8 colors', colors: 8 },
  { value: 2, label: '64 colors', colors: 64 },
  { value: 3, label: '512 colors', colors: 512 },
] as const;

export function buildPixelArtFileName(originalName: string): string {
  const rawName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
  const sanitizedBase = rawName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${sanitizedBase}_pixel-art.png`;
}

export default function PixelArt({ onBack, initialFile }: PixelArtProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const [pixelSize, setPixelSize] = useState<number>(16);
  const [paletteBits, setPaletteBits] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewUrlRef = useRef('');

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        try { URL.revokeObjectURL(previewUrlRef.current); } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (initialFile) {
      handleFiles([initialFile]);
    }
  }, [initialFile]);

  // Re-render the pixelated preview whenever the settings change.
  useEffect(() => {
    if (naturalWidth > 0 && file) {
      renderPixelArt();
    }
  }, [pixelSize, paletteBits, naturalWidth]);

  const handleFiles = (fileList: File[]) => {
    const selected = fileList[0];
    if (!selected) return;
    const validation = validateImageFile(selected);
    if (!validation.ok) {
      const title = validation.code === 'empty'
        ? 'Empty File Skipped'
        : validation.code === 'too-large'
          ? 'File Too Large'
          : 'Unsupported Format';
      toast.error(title, validation.message);
      return;
    }
    loadImage(selected);
  };

  const loadImage = (selected: File) => {
    if (previewUrlRef.current) {
      try { URL.revokeObjectURL(previewUrlRef.current); } catch (e) {}
    }
    setIsDone(false);
    const url = URL.createObjectURL(selected);
    setFile(selected);
    setPreviewUrl(url);
    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      const w = img.naturalWidth || 0;
      const h = img.naturalHeight || 0;
      if (w <= 0 || h <= 0) {
        toast.error('Image Decode Error', `Failed to decode image data from "${selected.name}".`);
        return;
      }
      setNaturalWidth(w);
      setNaturalHeight(h);
    };
    img.onerror = () => {
      toast.error('Image Decode Error', `Failed to decode image data from "${selected.name}".`);
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const clearImage = () => {
    if (previewUrlRef.current) {
      try { URL.revokeObjectURL(previewUrlRef.current); } catch (e) {}
    }
    setFile(null);
    setPreviewUrl('');
    setNaturalWidth(0);
    setNaturalHeight(0);
    setIsDone(false);
  };

  const renderPixelArt = (onComplete?: (ok: boolean) => void) => {
    const canvas = canvasRef.current;
    if (!canvas || naturalWidth <= 0 || naturalHeight <= 0 || !previewUrl) {
      onComplete?.(false);
      return;
    }
    const imgElement = new window.Image();
    imgElement.src = previewUrl;
    imgElement.onload = () => {
      try {
        const { cols, rows } = computePixelGridSize(naturalWidth, naturalHeight, pixelSize);
        // Downscale to one pixel per block, then upscale with smoothing off.
        const small = document.createElement('canvas');
        small.width = cols;
        small.height = rows;
        const smallCtx = small.getContext('2d');
        if (!smallCtx) throw new Error('Could not get 2D context');
        smallCtx.imageSmoothingEnabled = false;
        smallCtx.drawImage(imgElement, 0, 0, cols, rows);

        if (paletteBits > 0) {
          const imageData = smallCtx.getImageData(0, 0, cols, rows);
          const reduced = quantizeImageData(imageData.data, paletteBits);
          smallCtx.putImageData(new ImageData(reduced, cols, rows), 0, 0);
        }

        canvas.width = naturalWidth;
        canvas.height = naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(small, 0, 0, naturalWidth, naturalHeight);
        setIsDone(true);
        onComplete?.(true);
      } catch (err) {
        console.error('Pixel art render error:', err);
        toast.error('Pixelation Failed', 'The pixelated image could not be rendered.');
        onComplete?.(false);
      }
    };
    imgElement.onerror = () => {
      toast.error('Pixelation Failed', 'The source image could not be decoded.');
      onComplete?.(false);
    };
  };

  const handlePixelate = () => {
    if (!file || naturalWidth <= 0) return;
    setIsProcessing(true);
    renderPixelArt((ok) => {
      setIsProcessing(false);
      if (ok) {
        try {
          confetti({ particleCount: 50, spread: 40 });
        } catch (e) {}
        toast.success('Pixel Art Ready', 'Your pixelated image is ready to download.');
      }
    });
  };

  const triggerDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !file || !isDone) return;
    canvas.toBlob((blob) => {
      if (!blob || blob.size === 0) {
        toast.error('Download Failed', 'The pixelated image could not be exported.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildPixelArtFileName(file.name);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => {
        try { URL.revokeObjectURL(url); } catch (e) {}
      }, 1000);
    }, 'image/png');
  };

  const hasImage = naturalWidth > 0 && previewUrl !== '';
  const grid = hasImage ? computePixelGridSize(naturalWidth, naturalHeight, pixelSize) : null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="pixel-art-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <SquaresFour className="w-8 h-8 text-[#10b981]" />
            Pixel Art Maker
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Turn any photo into retro pixel art with adjustable pixel size and an optional limited palette.
          </p>
        </div>
        {file && (
          <button
            onClick={clearImage}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
          >
            Clear Image
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: settings */}
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a]">
            <Sliders className="w-5 h-5 text-[#10b981]" />
            <h2 className="font-sans text-lg text-white">Pixel Settings</h2>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label htmlFor="pixel-size" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <GridFour className="w-3.5 h-3.5 text-gray-500" /> Pixel Size
              </label>
              <span className="text-xs font-bold text-[#10b981]">{pixelSize}px</span>
            </div>
            <input
              id="pixel-size"
              type="range"
              min="2"
              max="64"
              step="1"
              value={pixelSize}
              onChange={(e) => setPixelSize(parseInt(e.target.value) || 2)}
              className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
            />
            <span className="text-[10px] text-gray-500">
              {grid
                ? `Output grid: ${grid.cols} x ${grid.rows} pixels`
                : 'Larger pixels = chunkier, more retro art.'}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Palette Reduction (optional)</label>
            <div className="grid grid-cols-2 gap-2">
              {PALETTE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPaletteBits(option.value)}
                  className={`py-2 px-3 text-xs font-semibold rounded border transition-all cursor-pointer text-center ${
                    paletteBits === option.value
                      ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                      : 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-gray-500">
              Limits the image to a small set of colors for a true retro-game look.
            </span>
          </div>

          <div className="mt-4">
            <button
              onClick={handlePixelate}
              disabled={!hasImage || isProcessing}
              className={`w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !hasImage
                  ? 'bg-[#151515] text-gray-600 border border-[#2a2a2a] cursor-not-allowed shadow-none'
                  : 'bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md'
              }`}
            >
              {isProcessing ? (
                <>
                  <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Pixelating...
                </>
              ) : (
                <>
                  <Sparkle className="w-4 h-4" /> Pixelate Image
                </>
              )}
            </button>
            {isDone && (
              <button
                onClick={triggerDownload}
                className="w-full mt-2 py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Pixel Art (PNG)
              </button>
            )}
          </div>
        </div>

        {/* Right: upload + preview */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {!hasImage ? (
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
              aria-label="Upload an image to pixelate. Drop a file or press Enter to browse."
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[220px] focus:outline-none focus:border-[#10b981]/70 ${
                isDragging
                  ? 'border-[#10b981] bg-[#10b981]/10'
                  : 'border-[#2a2a2a] hover:border-[#10b981]/40 bg-[#0d0d0d]'
              }`}
            >
              <input
                id="pixel-art-file-input"
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files) handleFiles(Array.from(e.target.files));
                }}
                accept="image/*"
                aria-label="Choose an image file to pixelate"
                className="hidden"
              />
              <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-3 group-hover:scale-105 transition-transform text-[#10b981]">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-white font-sans text-base">Drag &amp; drop your image</h3>
              <p className="text-gray-500 text-xs mt-1 mb-3">Supports JPG, PNG, WEBP, GIF, BMP</p>
              <span className="text-[11px] font-bold text-[#0a0a0a] bg-[#10b981] px-3 py-1.5 rounded uppercase tracking-wider hover:bg-[#059669] transition-all">
                Select File
              </span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Original</span>
                  <img
                    src={previewUrl}
                    alt="Original image"
                    className="max-w-full max-h-[320px] block mx-auto rounded border border-[#2a2a2a]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-xs text-gray-400 font-medium mt-3 text-center">
                    {file?.name} &bull; {naturalWidth} x {naturalHeight} px
                    {file ? ` - ${formatFileSize(file.size)}` : ''}
                  </div>
                </div>
                <div className="bg-[#0d0d0d] border border-emerald-900/30 rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1 mb-3">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Pixelated Preview
                  </span>
                  <canvas
                    ref={canvasRef}
                    className="max-w-full max-h-[320px] block mx-auto rounded border border-[#2a2a2a] bg-[#151515]"
                    style={{ imageRendering: 'pixelated' }}
                    aria-label="Pixelated image preview"
                  />
                  <div className="text-xs text-gray-400 font-medium mt-3 text-center">
                    {grid ? `${grid.cols} x ${grid.rows} pixels at ${pixelSize}px blocks` : ''}
                    {paletteBits > 0
                      ? ` - ${PALETTE_OPTIONS.find(o => o.value === paletteBits)?.colors} colors`
                      : ''}
                  </div>
                </div>
              </div>
            </>
          )}

          {file && !hasImage && (
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3">
              <WarningCircle className="w-4 h-4 shrink-0" />
              Still decoding &ldquo;{file.name}&rdquo; — if this stays, the file may be corrupt.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
