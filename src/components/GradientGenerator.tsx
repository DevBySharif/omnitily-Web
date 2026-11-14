import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle,
  Copy,
  Download,
  Gradient,
  Palette,
  Plus,
  Sliders,
  X
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export interface GradientStop {
  color: string;
  position: number; // 0-100
}

export type GradientType = 'linear' | 'radial';

export type RadialPosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top left' | 'top right' | 'bottom left' | 'bottom right';

export interface GradientConfig {
  type: GradientType;
  angle: number; // degrees, linear only
  radialPosition: RadialPosition;
  stops: GradientStop[];
}

export interface ExportSize {
  label: string;
  width: number;
  height: number;
}

export const EXPORT_SIZES: ExportSize[] = [
  { label: '1920 x 1080 (Full HD)', width: 1920, height: 1080 },
  { label: '1080 x 1080 (Square)', width: 1080, height: 1080 },
  { label: '1080 x 1920 (Story)', width: 1080, height: 1920 },
  { label: '800 x 600', width: 800, height: 600 },
];

export const RADIAL_POSITIONS: RadialPosition[] = [
  'center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right',
];

export const DEFAULT_STOPS: GradientStop[] = [
  { color: '#10b981', position: 0 },
  { color: '#3b82f6', position: 100 },
];

/** Clamp stops into 0-100, sort by position, and guarantee at least two stops. */
export function normalizeStops(stops: GradientStop[]): GradientStop[] {
  const cleaned = stops
    .filter((s) => typeof s.color === 'string' && s.color.trim() !== '')
    .map((s) => ({
      color: s.color,
      position: Math.min(100, Math.max(0, Math.round(Number(s.position) || 0))),
    }))
    .sort((a, b) => a.position - b.position);
  if (cleaned.length === 0) return [...DEFAULT_STOPS];
  if (cleaned.length === 1) return [cleaned[0], { color: cleaned[0].color, position: 100 }];
  return cleaned;
}

/** Build the CSS gradient string used by the live preview and the copy button. */
export function buildGradientCss(config: GradientConfig): string {
  const stops = normalizeStops(config.stops);
  const stopText = stops.map((s) => `${s.color} ${s.position}%`).join(', ');
  if (config.type === 'radial') {
    return `radial-gradient(circle at ${config.radialPosition}, ${stopText})`;
  }
  const angle = ((Math.round(config.angle) % 360) + 360) % 360;
  return `linear-gradient(${angle}deg, ${stopText})`;
}

/**
 * Create a matching CanvasGradient for a canvas of the given size.
 * Linear: the angle runs through the canvas center, corner to corner.
 * Radial: starts at the chosen position and ends at the farthest corner.
 */
export function createCanvasGradient(
  ctx: CanvasRenderingContext2D,
  config: GradientConfig,
  width: number,
  height: number
): CanvasGradient {
  const stops = normalizeStops(config.stops);
  let gradient: CanvasGradient;
  if (config.type === 'radial') {
    const pos = config.radialPosition;
    const cx = pos.includes('left') ? 0 : pos.includes('right') ? width : width / 2;
    const cy = pos.includes('top') ? 0 : pos.includes('bottom') ? height : height / 2;
    const farthest = Math.max(
      Math.hypot(cx, cy),
      Math.hypot(width - cx, cy),
      Math.hypot(cx, height - cy),
      Math.hypot(width - cx, height - cy)
    );
    gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, farthest));
  } else {
    const angleRad = ((config.angle - 90) * Math.PI) / 180;
    const dx = Math.cos(angleRad);
    const dy = Math.sin(angleRad);
    const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
    const cx = width / 2;
    const cy = height / 2;
    gradient = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  }
  for (const stop of stops) {
    gradient.addColorStop(stop.position / 100, stop.color);
  }
  return gradient;
}

export function buildGradientFileName(type: GradientType, width: number, height: number): string {
  return `gradient-${type}-${width}x${height}.png`;
}

const MAX_STOPS = 6;
const MIN_STOPS = 2;

export default function GradientGenerator({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [type, setType] = useState<GradientType>('linear');
  const [angle, setAngle] = useState<number>(135);
  const [radialPosition, setRadialPosition] = useState<RadialPosition>('center');
  const [stops, setStops] = useState<GradientStop[]>([...DEFAULT_STOPS]);
  const [exportSizeIndex, setExportSizeIndex] = useState<number>(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const config: GradientConfig = { type, angle, radialPosition, stops };
  const css = buildGradientCss(config);
  const exportSize = EXPORT_SIZES[exportSizeIndex];

  const updateStop = (index: number, patch: Partial<GradientStop>) => {
    setStops(prev => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addStop = () => {
    if (stops.length >= MAX_STOPS) return;
    const sorted = normalizeStops(stops);
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2] || last;
    const mid = Math.round((prev.position + last.position) / 2);
    setStops([...sorted, { color: '#f59e0b', position: Math.min(100, Math.max(0, mid === last.position ? 50 : mid)) }]);
  };

  const removeStop = (index: number) => {
    if (stops.length <= MIN_STOPS) {
      toast.info('Minimum Stops', 'A gradient needs at least two color stops.');
      return;
    }
    setStops(prev => prev.filter((_, i) => i !== index));
  };

  const randomize = () => {
    const palette = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    const shuffled = [...palette].sort(() => Math.random() - 0.5);
    const count = stops.length;
    const next: GradientStop[] = [];
    for (let i = 0; i < count; i++) {
      next.push({ color: shuffled[i % shuffled.length], position: Math.round((i / (count - 1)) * 100) });
    }
    setStops(next);
    setAngle(Math.floor(Math.random() * 360));
  };

  const copyCss = async () => {
    const fallbackCopy = () => {
      const textarea = document.createElement('textarea');
      textarea.value = css;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        return true;
      } catch (e) {
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    };
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(css);
        ok = true;
      } else {
        ok = fallbackCopy();
      }
    } catch (e) {
      ok = fallbackCopy();
    }
    if (ok) {
      setIsCopied(true);
      toast.success('CSS Copied', 'The gradient CSS is on your clipboard.');
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = window.setTimeout(() => setIsCopied(false), 1500);
    } else {
      toast.error('Copy Failed', 'Your browser blocked clipboard access — select the code and copy it manually.');
    }
  };

  const exportPng = () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = exportSize.width;
      canvas.height = exportSize.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D context');
      ctx.fillStyle = createCanvasGradient(ctx, config, exportSize.width, exportSize.height);
      ctx.fillRect(0, 0, exportSize.width, exportSize.height);
      canvas.toBlob((blob) => {
        if (!blob || blob.size === 0) {
          toast.error('Export Failed', 'The gradient PNG could not be generated.');
          setIsExporting(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = buildGradientFileName(type, exportSize.width, exportSize.height);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.setTimeout(() => {
          try { URL.revokeObjectURL(url); } catch (e) {}
        }, 1000);
        try {
          confetti({ particleCount: 50, spread: 40 });
        } catch (e) {}
        toast.success('Gradient Exported', `Saved as a ${exportSize.width} x ${exportSize.height} PNG.`);
        setIsExporting(false);
      }, 'image/png');
    } catch (err) {
      console.error('Gradient export error:', err);
      toast.error('Export Failed', 'The gradient PNG could not be generated.');
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="gradient-generator-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Gradient className="w-8 h-8 text-[#10b981]" />
            Gradient Generator
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Design linear and radial gradients, copy the CSS, or export a PNG at any size.
          </p>
        </div>
        <button
          onClick={randomize}
          className="text-xs font-semibold text-[#10b981] hover:text-[#059669] hover:bg-[#10b981]/10 px-3 py-1.5 rounded border border-emerald-900/50 transition-colors cursor-pointer"
        >
          Randomize
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: controls */}
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a]">
            <Sliders className="w-5 h-5 text-[#10b981]" />
            <h2 className="font-sans text-lg text-white">Gradient Settings</h2>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gradient Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['linear', 'radial'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-2 px-3 text-xs font-semibold rounded border transition-all cursor-pointer text-center capitalize ${
                    type === t
                      ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                      : 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Angle (linear) / Position (radial) */}
          {type === 'linear' ? (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label htmlFor="gradient-angle" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Angle</label>
                <span className="text-xs font-bold text-[#10b981]">{angle}&deg;</span>
              </div>
              <input
                id="gradient-angle"
                type="range"
                min="0"
                max="360"
                step="1"
                value={angle}
                onChange={(e) => setAngle(parseInt(e.target.value) || 0)}
                className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
              />
              <span className="text-[10px] text-gray-500">0&deg; = bottom to top, 90&deg; = left to right, 180&deg; = top to bottom.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor="radial-position" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Center Position</label>
              <select
                id="radial-position"
                value={radialPosition}
                onChange={(e) => setRadialPosition(e.target.value as RadialPosition)}
                className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] cursor-pointer"
              >
                {RADIAL_POSITIONS.map((pos) => (
                  <option key={pos} value={pos} className="capitalize">{pos}</option>
                ))}
              </select>
            </div>
          )}

          {/* Color stops */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-gray-500" /> Color Stops ({stops.length}/{MAX_STOPS})
              </label>
              <button
                onClick={addStop}
                disabled={stops.length >= MAX_STOPS}
                className="text-[11px] font-semibold text-[#10b981] hover:text-[#059669] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" /> Add Stop
              </button>
            </div>
            {stops.map((stop, index) => (
              <div key={index} className="flex items-center gap-2 border border-[#2a2a2a] rounded-lg p-2 bg-[#151515]">
                <input
                  type="color"
                  value={stop.color}
                  onChange={(e) => updateStop(index, { color: e.target.value })}
                  aria-label={`Color for stop ${index + 1}`}
                  className="w-8 h-8 rounded border-none cursor-pointer outline-none bg-transparent shrink-0"
                />
                <input
                  type="text"
                  maxLength={7}
                  value={stop.color}
                  onChange={(e) => updateStop(index, { color: e.target.value })}
                  aria-label={`Hex color for stop ${index + 1}`}
                  className="text-xs font-mono font-bold text-gray-300 focus:outline-none bg-transparent uppercase w-20 shrink-0"
                />
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={stop.position}
                    onChange={(e) => updateStop(index, { position: parseInt(e.target.value) || 0 })}
                    aria-label={`Position for stop ${index + 1}`}
                    className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-gray-400 w-9 text-right shrink-0">{stop.position}%</span>
                </div>
                <button
                  onClick={() => removeStop(index)}
                  disabled={stops.length <= MIN_STOPS}
                  aria-label={`Remove stop ${index + 1}`}
                  className="p-1.5 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Export size */}
          <div className="flex flex-col gap-2">
            <label htmlFor="export-size" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">PNG Export Size</label>
            <select
              id="export-size"
              value={exportSizeIndex}
              onChange={(e) => setExportSizeIndex(parseInt(e.target.value) || 0)}
              className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] cursor-pointer"
            >
              {EXPORT_SIZES.map((size, i) => (
                <option key={size.label} value={i}>{size.label}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={copyCss}
              className="w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md"
            >
              {isCopied ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy CSS
                </>
              )}
            </button>
            <button
              onClick={exportPng}
              disabled={isExporting}
              className="w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Export PNG ({exportSize.width} x {exportSize.height})
            </button>
          </div>
        </div>

        {/* Right: preview + CSS */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Live Preview</span>
            <div
              data-testid="gradient-preview"
              className="w-full aspect-video rounded-lg border border-[#2a2a2a] transition-all"
              style={{ background: css }}
              aria-label="Gradient preview"
            />
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-400 font-medium">
              <span className="capitalize">{type}</span>
              <span className="opacity-40">&bull;</span>
              <span>{stops.length} stops</span>
              <span className="opacity-40">&bull;</span>
              <span>{type === 'linear' ? `${angle}°` : `center: ${radialPosition}`}</span>
            </div>
          </div>

          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="gradient-css" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CSS Code</label>
              <button
                onClick={copyCss}
                className="text-[11px] font-semibold text-[#10b981] hover:text-[#059669] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" /> {isCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre id="gradient-css" data-testid="gradient-css" className="w-full text-xs font-mono border border-[#2a2a2a] rounded px-4 py-3 bg-[#151515] text-emerald-300 overflow-x-auto whitespace-pre-wrap break-all">
              {`background: ${css};`}
            </pre>
            <span className="text-[10px] text-gray-500 mt-2 block">
              Paste this into any stylesheet or inline style to use the gradient.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
