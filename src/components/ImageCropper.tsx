import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Crop,
  Download,
  Scissors,
  Sliders,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { formatFileSize, validateImageFile } from '../lib/imageTools';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageCropperProps {
  onBack: () => void;
  initialFile?: File;
}

/**
 * Clamp a crop rectangle into the image bounds (source pixels).
 * Non-finite inputs fall back to the full image; width/height are at least 1px.
 */
export function clampCropRect(rect: CropRect, imgWidth: number, imgHeight: number): CropRect {
  const safeW = Math.max(1, Math.floor(imgWidth) || 1);
  const safeH = Math.max(1, Math.floor(imgHeight) || 1);
  if (!Number.isFinite(rect.x) || !Number.isFinite(rect.y) ||
      !Number.isFinite(rect.width) || !Number.isFinite(rect.height)) {
    return { x: 0, y: 0, width: safeW, height: safeH };
  }
  const x = Math.min(Math.max(0, Math.floor(rect.x)), safeW - 1);
  const y = Math.min(Math.max(0, Math.floor(rect.y)), safeH - 1);
  const width = Math.min(Math.max(1, Math.floor(rect.width)), safeW - x);
  const height = Math.min(Math.max(1, Math.floor(rect.height)), safeH - y);
  return { x, y, width, height };
}

/** Convert a source-pixel crop rect to CSS percentages for the overlay. */
export function rectToDisplayPercent(rect: CropRect, imgWidth: number, imgHeight: number) {
  const w = Math.max(1, imgWidth);
  const h = Math.max(1, imgHeight);
  return {
    left: (rect.x / w) * 100,
    top: (rect.y / h) * 100,
    width: (rect.width / w) * 100,
    height: (rect.height / h) * 100,
  };
}

/** Centered square crop of the largest possible size. */
export function centerSquareRect(imgWidth: number, imgHeight: number): CropRect {
  const side = Math.min(imgWidth, imgHeight);
  return clampCropRect(
    { x: Math.floor((imgWidth - side) / 2), y: Math.floor((imgHeight - side) / 2), width: side, height: side },
    imgWidth,
    imgHeight
  );
}

/** Largest centered crop with the requested aspect ratio (w / h). */
export function aspectRect(imgWidth: number, imgHeight: number, ratio: number): CropRect {
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  let width = imgWidth;
  let height = Math.floor(width / safeRatio);
  if (height > imgHeight) {
    height = imgHeight;
    width = Math.floor(height * safeRatio);
  }
  return clampCropRect(
    { x: Math.floor((imgWidth - width) / 2), y: Math.floor((imgHeight - height) / 2), width, height },
    imgWidth,
    imgHeight
  );
}

export function buildCroppedFileName(originalName: string, mimeType: string): string {
  const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const rawName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
  const sanitizedBase = rawName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${sanitizedBase}_cropped.${extension}`;
}

type DragMode = 'move' | 'resize' | 'draw' | null;

interface DragState {
  mode: Exclude<DragMode, null>;
  handle?: string;
  startClientX: number;
  startClientY: number;
  startRect: CropRect;
  anchorX: number;
  anchorY: number;
}

const RESIZE_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;

export default function ImageCropper({ onBack, initialFile }: ImageCropperProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [format, setFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [quality, setQuality] = useState<number>(90);
  const [croppedUrl, setCroppedUrl] = useState<string>('');
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedSize, setCroppedSize] = useState(0);
  const [isCropping, setIsCropping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const previewUrlRef = useRef('');
  const croppedUrlRef = useRef('');

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    croppedUrlRef.current = croppedUrl;
  }, [croppedUrl]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        try { URL.revokeObjectURL(previewUrlRef.current); } catch (e) {}
      }
      if (croppedUrlRef.current) {
        try { URL.revokeObjectURL(croppedUrlRef.current); } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (initialFile) {
      handleFiles([initialFile]);
    }
  }, [initialFile]);

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
    if (croppedUrlRef.current) {
      try { URL.revokeObjectURL(croppedUrlRef.current); } catch (e) {}
    }
    setCroppedUrl('');
    setCroppedBlob(null);
    setCroppedSize(0);
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
      setCrop({ x: 0, y: 0, width: w, height: h });
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
    if (croppedUrlRef.current) {
      try { URL.revokeObjectURL(croppedUrlRef.current); } catch (e) {}
    }
    setFile(null);
    setPreviewUrl('');
    setNaturalWidth(0);
    setNaturalHeight(0);
    setCrop({ x: 0, y: 0, width: 0, height: 0 });
    setCroppedUrl('');
    setCroppedBlob(null);
    setCroppedSize(0);
  };

  const updateCropField = (field: keyof CropRect, rawValue: string) => {
    const parsed = parseInt(rawValue, 10);
    if (!Number.isFinite(parsed)) return;
    if (naturalWidth <= 0 || naturalHeight <= 0) return;
    setCrop(prev => clampCropRect({ ...prev, [field]: parsed }, naturalWidth, naturalHeight));
    setCroppedUrl('');
    setCroppedBlob(null);
    setCroppedSize(0);
  };

  const applyPreset = (preset: 'full' | 'square' | '16:9' | '4:3') => {
    if (naturalWidth <= 0 || naturalHeight <= 0) return;
    if (preset === 'full') {
      setCrop({ x: 0, y: 0, width: naturalWidth, height: naturalHeight });
    } else if (preset === 'square') {
      setCrop(centerSquareRect(naturalWidth, naturalHeight));
    } else if (preset === '16:9') {
      setCrop(aspectRect(naturalWidth, naturalHeight, 16 / 9));
    } else {
      setCrop(aspectRect(naturalWidth, naturalHeight, 4 / 3));
    }
    setCroppedUrl('');
    setCroppedBlob(null);
    setCroppedSize(0);
  };

  /** Convert a pointer position to source-image pixels. Returns null if outside the image. */
  const clientToSource = (clientX: number, clientY: number): { sx: number; sy: number } | null => {
    const el = imgRef.current;
    if (!el || naturalWidth <= 0 || naturalHeight <= 0) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;
    return {
      sx: (clientX - rect.left) * scaleX,
      sy: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (naturalWidth <= 0 || naturalHeight <= 0) return;
    const pos = clientToSource(e.clientX, e.clientY);
    if (!pos) return;
    const target = e.target as HTMLElement;
    const handle = target.getAttribute('data-handle');
    if (handle) {
      dragRef.current = {
        mode: 'resize',
        handle,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startRect: crop,
        anchorX: pos.sx,
        anchorY: pos.sy,
      };
    } else if (
      pos.sx >= crop.x && pos.sx <= crop.x + crop.width &&
      pos.sy >= crop.y && pos.sy <= crop.y + crop.height
    ) {
      dragRef.current = {
        mode: 'move',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startRect: crop,
        anchorX: pos.sx,
        anchorY: pos.sy,
      };
    } else {
      dragRef.current = {
        mode: 'draw',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startRect: crop,
        anchorX: pos.sx,
        anchorY: pos.sy,
      };
      setCrop(prev => clampCropRect({ x: Math.floor(pos.sx), y: Math.floor(pos.sy), width: 1, height: 1 }, naturalWidth, naturalHeight));
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const el = imgRef.current;
    if (!el || naturalWidth <= 0 || naturalHeight <= 0) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;
    const dx = (e.clientX - drag.startClientX) * scaleX;
    const dy = (e.clientY - drag.startClientY) * scaleY;
    const s = drag.startRect;

    if (drag.mode === 'move') {
      setCrop(clampCropRect({ x: s.x + dx, y: s.y + dy, width: s.width, height: s.height }, naturalWidth, naturalHeight));
    } else if (drag.mode === 'resize') {
      const h = drag.handle || 'se';
      let next: CropRect = { ...s };
      if (h.includes('e')) next = { ...next, width: s.width + dx };
      if (h.includes('s')) next = { ...next, height: s.height + dy };
      if (h.includes('w')) next = { ...next, x: s.x + dx, width: s.width - dx };
      if (h.includes('n')) next = { ...next, y: s.y + dy, height: s.height - dy };
      setCrop(clampCropRect(next, naturalWidth, naturalHeight));
    } else {
      const x = Math.min(drag.anchorX, drag.anchorX + dx);
      const y = Math.min(drag.anchorY, drag.anchorY + dy);
      setCrop(clampCropRect(
        { x, y, width: Math.abs(dx) || 1, height: Math.abs(dy) || 1 },
        naturalWidth,
        naturalHeight
      ));
    }
  };

  const handlePointerUp = () => {
    if (dragRef.current) {
      dragRef.current = null;
      setCroppedUrl('');
      setCroppedBlob(null);
      setCroppedSize(0);
    }
  };

  const handleCrop = () => {
    if (!file || naturalWidth <= 0 || naturalHeight <= 0 || crop.width <= 0 || crop.height <= 0) return;
    setIsCropping(true);
    const imgElement = new window.Image();
    imgElement.src = previewUrl;
    imgElement.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context');
        if (format === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, crop.width, crop.height);
        }
        ctx.drawImage(imgElement, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
        canvas.toBlob((blob) => {
          if (blob && blob.size > 0) {
            if (croppedUrlRef.current) {
              try { URL.revokeObjectURL(croppedUrlRef.current); } catch (e) {}
            }
            const url = URL.createObjectURL(blob);
            setCroppedUrl(url);
            setCroppedBlob(blob);
            setCroppedSize(blob.size);
            try {
              confetti({ particleCount: 50, spread: 40 });
            } catch (e) {}
            toast.success('Image Cropped', `Cropped to ${crop.width} x ${crop.height} px.`);
          } else {
            toast.error('Crop Failed', 'The cropped image could not be generated.');
          }
          setIsCropping(false);
        }, format, format === 'image/png' ? undefined : quality / 100);
      } catch (err) {
        console.error('Image crop error:', err);
        toast.error('Crop Failed', 'The cropped image could not be generated.');
        setIsCropping(false);
      }
    };
    imgElement.onerror = () => {
      toast.error('Crop Failed', 'The source image could not be decoded for cropping.');
      setIsCropping(false);
    };
  };

  const triggerDownload = () => {
    if (!croppedUrl || !file) return;
    const a = document.createElement('a');
    a.href = croppedUrl;
    a.download = buildCroppedFileName(file.name, format);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const overlay = naturalWidth > 0 ? rectToDisplayPercent(crop, naturalWidth, naturalHeight) : null;
  const hasImage = naturalWidth > 0 && previewUrl !== '';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="image-cropper-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Crop className="w-8 h-8 text-[#10b981]" />
            Image Cropper
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Crop your image by dragging the selection or typing exact pixels. Everything runs locally.
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
            <h2 className="font-sans text-lg text-white">Crop Settings</h2>
          </div>

          {/* Numeric crop inputs */}
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Crop Area (px)</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">X</span>
                <input
                  type="number"
                  aria-label="Crop x position in pixels"
                  min={0}
                  value={hasImage ? crop.x : ''}
                  disabled={!hasImage}
                  onChange={(e) => updateCropField('x', e.target.value)}
                  className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] disabled:bg-[#121212] disabled:text-gray-600"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Y</span>
                <input
                  type="number"
                  aria-label="Crop y position in pixels"
                  min={0}
                  value={hasImage ? crop.y : ''}
                  disabled={!hasImage}
                  onChange={(e) => updateCropField('y', e.target.value)}
                  className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] disabled:bg-[#121212] disabled:text-gray-600"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Width</span>
                <input
                  type="number"
                  aria-label="Crop width in pixels"
                  min={1}
                  value={hasImage ? crop.width : ''}
                  disabled={!hasImage}
                  onChange={(e) => updateCropField('width', e.target.value)}
                  className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] disabled:bg-[#121212] disabled:text-gray-600"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Height</span>
                <input
                  type="number"
                  aria-label="Crop height in pixels"
                  min={1}
                  value={hasImage ? crop.height : ''}
                  disabled={!hasImage}
                  onChange={(e) => updateCropField('height', e.target.value)}
                  className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] disabled:bg-[#121212] disabled:text-gray-600"
                />
              </div>
            </div>
            {hasImage && (
              <span className="text-[10px] text-gray-500">
                Original image: {naturalWidth} x {naturalHeight} px
                {file ? ` - ${formatFileSize(file.size)}` : ''}
              </span>
            )}
          </div>

          {/* Presets */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quick Presets</label>
            <div className="grid grid-cols-4 gap-2">
              {(['full', 'square', '16:9', '4:3'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  disabled={!hasImage}
                  className="py-2 px-2 text-xs font-semibold rounded border border-[#2a2a2a] hover:border-[#10b981]/40 text-gray-400 bg-transparent transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {preset === 'full' ? 'Full' : preset === 'square' ? 'Square' : preset}
                </button>
              ))}
            </div>
          </div>

          {/* Output format */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Output Format</label>
            <div className="grid grid-cols-2 gap-2">
              {(['image/png', 'image/jpeg'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`py-2 px-3 text-xs font-semibold rounded border transition-all cursor-pointer text-center ${
                    format === fmt
                      ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                      : 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                  }`}
                >
                  {fmt === 'image/png' ? 'PNG' : 'JPEG'}
                </button>
              ))}
            </div>
          </div>

          {format === 'image/jpeg' && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label htmlFor="crop-quality" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quality</label>
                <span className="text-xs font-bold text-[#10b981]">{quality}%</span>
              </div>
              <input
                id="crop-quality"
                type="range"
                min="10"
                max="100"
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
              />
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={handleCrop}
              disabled={!hasImage || isCropping}
              className={`w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !hasImage
                  ? 'bg-[#151515] text-gray-600 border border-[#2a2a2a] cursor-not-allowed shadow-none'
                  : 'bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md'
              }`}
            >
              {isCropping ? (
                <>
                  <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Cropping...
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4" /> Crop Image
                </>
              )}
            </button>
            {croppedUrl && (
              <button
                onClick={triggerDownload}
                className="w-full mt-2 py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Cropped Image
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
              aria-label="Upload an image to crop. Drop a file or press Enter to browse."
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[220px] focus:outline-none focus:border-[#10b981]/70 ${
                isDragging
                  ? 'border-[#10b981] bg-[#10b981]/10'
                  : 'border-[#2a2a2a] hover:border-[#10b981]/40 bg-[#0d0d0d]'
              }`}
            >
              <input
                id="image-cropper-file-input"
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files) handleFiles(Array.from(e.target.files));
                }}
                accept="image/*"
                aria-label="Choose an image file to crop"
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
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 shadow-sm">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">
                  Drag the selection to move it, drag a corner to resize, or drag outside it to draw a new one
                </span>
                <div
                  ref={containerRef}
                  className="relative inline-block max-w-full select-none touch-none"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  role="application"
                  aria-label="Crop selection area. Use the numeric inputs to set an exact crop."
                >
                  <img
                    ref={imgRef}
                    src={previewUrl}
                    alt="Image to crop"
                    className="max-w-full max-h-[520px] block pointer-events-none"
                    draggable={false}
                    referrerPolicy="no-referrer"
                  />
                  {overlay && (
                    <div
                      className="absolute border-2 border-[#10b981] bg-[#10b981]/10 cursor-move"
                      style={{
                        left: `${overlay.left}%`,
                        top: `${overlay.top}%`,
                        width: `${overlay.width}%`,
                        height: `${overlay.height}%`,
                      }}
                    >
                      {RESIZE_HANDLES.map((handle) => (
                        <span
                          key={handle}
                          data-handle={handle}
                          className={`absolute w-3 h-3 bg-[#10b981] border border-white rounded-sm ${
                            handle.includes('n') ? 'top-0 -translate-y-1/2' : ''
                          } ${handle.includes('s') ? 'bottom-0 translate-y-1/2' : ''} ${
                            handle.includes('w') ? 'left-0 -translate-x-1/2' : ''
                          } ${handle.includes('e') ? 'right-0 translate-x-1/2' : ''} ${
                            handle === 'n' || handle === 's' ? 'left-1/2 -translate-x-1/2 cursor-ns-resize' : ''
                          } ${handle === 'e' || handle === 'w' ? 'top-1/2 -translate-y-1/2 cursor-ew-resize' : ''} ${
                            handle === 'nw' || handle === 'se' ? 'cursor-nwse-resize' : ''
                          } ${handle === 'ne' || handle === 'sw' ? 'cursor-nesw-resize' : ''}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-gray-400 font-medium">
                  <span className="truncate">{file?.name}</span>
                  <span className="opacity-40">&bull;</span>
                  <span>
                    Crop: {crop.width} x {crop.height} px at ({crop.x}, {crop.y})
                  </span>
                </div>
              </div>

              {croppedUrl && (
                <div className="bg-[#0d0d0d] border border-emerald-900/40 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">Cropped Preview</span>
                    {croppedBlob && (
                      <span className="text-xs text-gray-400">{formatFileSize(croppedSize)}</span>
                    )}
                  </div>
                  <img
                    src={croppedUrl}
                    alt="Cropped result preview"
                    className="max-w-full max-h-[320px] block rounded border border-[#2a2a2a]"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
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
