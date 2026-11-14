import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle,
  Copy,
  Download,
  Palette,
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function isValidHex(hex: string): boolean {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim());
}

export function normalizeHex(hex: string): string {
  const clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    return `#${clean.split('').map((c) => c + c).join('')}`.toLowerCase();
  }
  return `#${clean}`.toLowerCase();
}

export function hexToRgb(hex: string): Rgb | null {
  if (!isValidHex(hex)) return null;
  const n = normalizeHex(hex).slice(1);
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

export function rgbToHex(rgb: Rgb): string {
  const part = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${part(rgb.r)}${part(rgb.g)}${part(rgb.b)}`;
}

/** Linear interpolation between two colours in RGB space. */
export function blendTwoColors(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/**
 * Blend two hex colours into `steps` evenly spaced colours, endpoints
 * included. `steps` is clamped to 2–12.
 */
export function blendColors(hexA: string, hexB: string, steps: number): string[] {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return [];
  const count = Math.min(12, Math.max(2, Math.round(steps)));
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(rgbToHex(blendTwoColors(a, b, count === 1 ? 0 : i / (count - 1))));
  }
  return out;
}

export function buildPaletteCssVariables(colors: string[]): string {
  return `:root {\n${colors.map((c, i) => `  --blend-${i + 1}: ${c};`).join('\n')}\n}`;
}

export default function ColorBlender({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [colorA, setColorA] = useState('#10b981');
  const [colorB, setColorB] = useState('#3b82f6');
  const [steps, setSteps] = useState(5);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<number | null>(null);

  const palette = useMemo(() => blendColors(colorA, colorB, steps), [colorA, colorB, steps]);
  const valid = isValidHex(colorA) && isValidHex(colorB);

  const copyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      toast.success('Colour Copied', `${hex} is on your clipboard.`);
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = window.setTimeout(() => setCopiedHex(null), 1500);
    } catch (e) {
      toast.error('Copy Failed', 'Your browser blocked clipboard access.');
    }
  };

  const copyPalette = async () => {
    try {
      await navigator.clipboard.writeText(palette.join(', '));
      toast.success('Palette Copied', `${palette.length} colours copied as a comma-separated list.`);
    } catch (e) {
      toast.error('Copy Failed', 'Your browser blocked clipboard access.');
    }
  };

  const downloadCss = () => {
    try {
      const blob = new Blob([buildPaletteCssVariables(palette)], { type: 'text/css' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'blend-palette.css';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 1000);
      try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
      toast.success('Downloaded', 'Saved as blend-palette.css.');
    } catch (e) {
      toast.error('Download Failed', 'The file could not be generated in this browser.');
    }
  };

  const swap = () => {
    setColorA(colorB);
    setColorB(colorA);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="color-blender-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Palette className="w-8 h-8 text-[#10b981]" />
            HEX Color Blender &amp; Mixer
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Blend two HEX colours in proportional steps to generate a custom palette.
          </p>
        </div>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
          <div className="flex flex-col gap-2">
            <label htmlFor="blend-color-a" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Colour A</label>
            <div className="flex items-center gap-2 border border-[#2a2a2a] rounded-lg p-2 bg-[#151515]">
              <input
                type="color"
                value={isValidHex(colorA) ? normalizeHex(colorA) : '#10b981'}
                onChange={(e) => setColorA(e.target.value)}
                aria-label="Colour A picker"
                className="w-10 h-10 rounded border-none cursor-pointer outline-none bg-transparent shrink-0"
              />
              <input
                id="blend-color-a"
                type="text"
                value={colorA}
                onChange={(e) => setColorA(e.target.value)}
                spellCheck={false}
                className="text-sm font-mono font-bold text-gray-200 focus:outline-none bg-transparent uppercase flex-1 min-w-0"
              />
            </div>
          </div>
          <button
            onClick={swap}
            title="Swap colours"
            className="text-xs font-semibold text-[#10b981] hover:text-[#059669] px-3 py-2 rounded border border-emerald-900/50 transition-colors cursor-pointer"
          >
            ⇄ Swap
          </button>
          <div className="flex flex-col gap-2">
            <label htmlFor="blend-color-b" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Colour B</label>
            <div className="flex items-center gap-2 border border-[#2a2a2a] rounded-lg p-2 bg-[#151515]">
              <input
                type="color"
                value={isValidHex(colorB) ? normalizeHex(colorB) : '#3b82f6'}
                onChange={(e) => setColorB(e.target.value)}
                aria-label="Colour B picker"
                className="w-10 h-10 rounded border-none cursor-pointer outline-none bg-transparent shrink-0"
              />
              <input
                id="blend-color-b"
                type="text"
                value={colorB}
                onChange={(e) => setColorB(e.target.value)}
                spellCheck={false}
                className="text-sm font-mono font-bold text-gray-200 focus:outline-none bg-transparent uppercase flex-1 min-w-0"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label htmlFor="blend-steps" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Blend Steps</label>
            <span className="text-xs font-bold text-[#10b981]">{steps} colours</span>
          </div>
          <input
            id="blend-steps"
            type="range"
            min="2"
            max="12"
            step="1"
            value={steps}
            onChange={(e) => setSteps(parseInt(e.target.value) || 2)}
            className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
          />
        </div>

        {!valid && (
          <p data-testid="blend-error" className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3">
            Enter valid HEX colours (e.g. #10b981 or #fff).
          </p>
        )}

        {valid && palette.length > 0 && (
          <>
            <div data-testid="blend-gradient" className="w-full h-24 rounded-lg border border-[#2a2a2a] overflow-hidden flex" aria-label="Blend preview">
              {palette.map((hex) => (
                <div key={hex} className="flex-1 h-full" style={{ backgroundColor: hex }} title={hex} />
              ))}
            </div>
            <div data-testid="blend-palette" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {palette.map((hex) => (
                <button
                  key={hex}
                  onClick={() => copyHex(hex)}
                  title="Click to copy"
                  className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#151515] hover:border-[#10b981]/50 transition-colors cursor-pointer text-left"
                >
                  <span className="block h-12 w-full" style={{ backgroundColor: hex }} />
                  <span className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-xs font-mono font-bold text-gray-200 uppercase">{hex}</span>
                    {copiedHex === hex ? (
                      <CheckCircle className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    )}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyPalette}
                className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-colors cursor-pointer flex items-center gap-2"
              >
                <Copy className="w-4 h-4" /> Copy Palette
              </button>
              <button
                onClick={downloadCss}
                className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-colors cursor-pointer flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download CSS Variables
              </button>
            </div>
          </>
        )}
      </div>
      <p className="text-[10px] text-gray-500 mt-3">
        Blending is a straight linear interpolation in RGB space — the midpoint is the average of the two colours.
      </p>
    </div>
  );
}
