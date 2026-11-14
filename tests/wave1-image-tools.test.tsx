import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GradientGenerator, {
  buildGradientCss,
  buildGradientFileName,
  createCanvasGradient,
  normalizeStops,
  type GradientConfig,
} from '../src/components/GradientGenerator';
import ImageCropper, {
  aspectRect,
  buildCroppedFileName,
  centerSquareRect,
  clampCropRect,
  rectToDisplayPercent,
} from '../src/components/ImageCropper';
import PixelArt, {
  buildPixelArtFileName,
  computePixelGridSize,
  pixelateImageData,
  quantizeImageData,
} from '../src/components/PixelArt';
import SvgOptimizer, {
  buildOptimizedSvgFileName,
  byteSize,
  computeSvgSavings,
  optimizeSvg,
  validateSvg,
} from '../src/components/SvgOptimizer';
import { ToastProvider } from '../src/components/Toast';

const renderTool = (component: ReactNode) => render(<ToastProvider>{component}</ToastProvider>);

/**
 * jsdom ships no real canvas implementation, so the 2D context and toBlob
 * are stubbed with a recording fake. A Proxy tolerates any extra method the
 * confetti celebration (or the component) calls on the context.
 */
function makeFakeCtx() {
  const drawImage = vi.fn();
  const fillRect = vi.fn();
  const putImageData = vi.fn();
  const getImageData = vi.fn(() => ({
    data: new Uint8ClampedArray(4 * 4 * 4).fill(128),
    width: 4,
    height: 4,
  }));
  const createLinearGradient = vi.fn(() => ({ addColorStop: vi.fn() }));
  const createRadialGradient = vi.fn(() => ({ addColorStop: vi.fn() }));
  const target: Record<string, unknown> = {
    drawImage,
    fillRect,
    putImageData,
    getImageData,
    createLinearGradient,
    createRadialGradient,
  };
  const ctx = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop as string];
      return vi.fn();
    },
    set(t, prop, value) {
      t[prop as string] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, drawImage, fillRect, putImageData, getImageData, createLinearGradient, createRadialGradient };
}

/** Image stand-in that "decodes" as a 200x100 image on the next microtask. */
class MockImage {
  naturalWidth = 200;
  naturalHeight = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = '';
  set src(value: string) {
    this._src = value;
    queueMicrotask(() => this.onload?.());
  }
  get src() {
    return this._src;
  }
}

let fakeCtx: ReturnType<typeof makeFakeCtx>;
let toBlobSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fakeCtx = makeFakeCtx();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx.ctx);
  toBlobSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation(function (this: HTMLCanvasElement, callback: BlobCallback) {
      callback(new Blob(['fake-image-bytes'], { type: 'image/png' }));
    });
  vi.stubGlobal('Image', MockImage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function uploadFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

async function uploadMockImage(name = 'photo.png') {
  uploadFile(new File(['fake-png-bytes'], name, { type: 'image/png' }));
  await waitFor(() => expect(screen.getByText(/Crop: 200 x 100 px/)).toBeInTheDocument());
}

// ---------------------------------------------------------------------------
// ImageCropper — core logic
// ---------------------------------------------------------------------------

describe('image-cropper clampCropRect', () => {
  it('keeps a valid rect unchanged', () => {
    expect(clampCropRect({ x: 10, y: 20, width: 50, height: 40 }, 200, 100)).toEqual({
      x: 10, y: 20, width: 50, height: 40,
    });
  });

  it('clamps negative origins to zero', () => {
    expect(clampCropRect({ x: -5, y: -10, width: 50, height: 40 }, 200, 100)).toEqual({
      x: 0, y: 0, width: 50, height: 40,
    });
  });

  it('clamps a rect that overflows the right and bottom edges', () => {
    expect(clampCropRect({ x: 180, y: 90, width: 100, height: 100 }, 200, 100)).toEqual({
      x: 180, y: 90, width: 20, height: 10,
    });
  });

  it('keeps at least one pixel when the origin is at the far edge', () => {
    expect(clampCropRect({ x: 199, y: 99, width: 0, height: 0 }, 200, 100)).toEqual({
      x: 199, y: 99, width: 1, height: 1,
    });
  });

  it('falls back to the full image for non-finite input', () => {
    expect(clampCropRect({ x: Number.NaN, y: 0, width: 10, height: 10 }, 200, 100)).toEqual({
      x: 0, y: 0, width: 200, height: 100,
    });
  });

  it('floors fractional values', () => {
    expect(clampCropRect({ x: 10.9, y: 5.2, width: 50.7, height: 40.1 }, 200, 100)).toEqual({
      x: 10, y: 5, width: 50, height: 40,
    });
  });
});

describe('image-cropper rect helpers', () => {
  it('converts a rect to display percentages', () => {
    const pct = rectToDisplayPercent({ x: 50, y: 25, width: 100, height: 50 }, 200, 100);
    expect(pct.left).toBe(25);
    expect(pct.top).toBe(25);
    expect(pct.width).toBe(50);
    expect(pct.height).toBe(50);
  });

  it('computes the largest centered square', () => {
    expect(centerSquareRect(200, 100)).toEqual({ x: 50, y: 0, width: 100, height: 100 });
    expect(centerSquareRect(100, 200)).toEqual({ x: 0, y: 50, width: 100, height: 100 });
  });

  it('computes the largest centered 16:9 crop', () => {
    expect(aspectRect(200, 100, 16 / 9)).toEqual({ x: 11, y: 0, width: 177, height: 100 });
  });

  it('builds a cropped file name matching the chosen format', () => {
    expect(buildCroppedFileName('my photo.jpg', 'image/png')).toBe('my_photo_cropped.png');
    expect(buildCroppedFileName('my photo.jpg', 'image/jpeg')).toBe('my_photo_cropped.jpg');
  });
});

// ---------------------------------------------------------------------------
// ImageCropper — component
// ---------------------------------------------------------------------------

describe('image-cropper component', () => {
  it('renders the workspace with a disabled crop button', () => {
    renderTool(<ImageCropper onBack={() => undefined} />);
    expect(screen.getByText(/Image Cropper/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload an image to crop/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Crop Image/i })).toBeDisabled();
  });

  it('rejects a non-image file selection with a validation toast', () => {
    renderTool(<ImageCropper onBack={() => undefined} />);
    uploadFile(new File(['plain text'], 'notes.txt', { type: 'text/plain' }));
    expect(screen.getByText('Unsupported Format')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Crop Image/i })).toBeDisabled();
  });

  it('shows the loaded image and its crop area after upload', async () => {
    renderTool(<ImageCropper onBack={() => undefined} />);
    await uploadMockImage();
    expect(screen.getByAltText('Image to crop')).toBeInTheDocument();
    expect(screen.getByLabelText('Crop x position in pixels')).toHaveValue(0);
    expect(screen.getByLabelText('Crop width in pixels')).toHaveValue(200);
    expect(screen.getByLabelText('Crop height in pixels')).toHaveValue(100);
    expect(screen.getByRole('button', { name: /Crop Image/i })).toBeEnabled();
  });

  it('updates the crop rect from the numeric inputs, clamped to the image', async () => {
    renderTool(<ImageCropper onBack={() => undefined} />);
    await uploadMockImage();
    const widthInput = screen.getByLabelText('Crop width in pixels') as HTMLInputElement;
    fireEvent.change(widthInput, { target: { value: '500' } });
    expect(widthInput).toHaveValue(200);
    const xInput = screen.getByLabelText('Crop x position in pixels') as HTMLInputElement;
    fireEvent.change(xInput, { target: { value: '50' } });
    expect(xInput).toHaveValue(50);
    expect(screen.getByText(/Crop: 150 x 100 px at \(50, 0\)/)).toBeInTheDocument();
  });

  it('applies the square preset through the numeric inputs', async () => {
    renderTool(<ImageCropper onBack={() => undefined} />);
    await uploadMockImage();
    fireEvent.click(screen.getByRole('button', { name: 'Square' }));
    expect(screen.getByLabelText('Crop x position in pixels')).toHaveValue(50);
    expect(screen.getByLabelText('Crop width in pixels')).toHaveValue(100);
    expect(screen.getByLabelText('Crop height in pixels')).toHaveValue(100);
  });

  it('crops the image and offers the cropped download', async () => {
    renderTool(<ImageCropper onBack={() => undefined} />);
    await uploadMockImage();
    fireEvent.click(screen.getByRole('button', { name: /Crop Image/i }));
    await waitFor(() => expect(screen.getByText('Image Cropped')).toBeInTheDocument());
    expect(toBlobSpy).toHaveBeenCalled();
    expect(fakeCtx.drawImage).toHaveBeenCalled();
    expect(screen.getByAltText('Cropped result preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Cropped Image/i })).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// PixelArt — core logic
// ---------------------------------------------------------------------------

describe('pixel-art computePixelGridSize', () => {
  it('derives columns and rows from the pixel size', () => {
    expect(computePixelGridSize(200, 100, 16)).toEqual({ cols: 13, rows: 6 });
    expect(computePixelGridSize(200, 100, 2)).toEqual({ cols: 100, rows: 50 });
  });

  it('never returns fewer than one column or row', () => {
    expect(computePixelGridSize(10, 10, 64)).toEqual({ cols: 1, rows: 1 });
    expect(computePixelGridSize(0, 0, 16)).toEqual({ cols: 1, rows: 1 });
  });
});

describe('pixel-art pixelateImageData', () => {
  it('fills each block with the block average color', () => {
    // 4x4 image, 2x2 blocks: top-left red, top-right green, bottom-left blue,
    // bottom-right white — with one differing pixel per block to test averaging.
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,   200, 0, 0, 255,   0, 255, 0, 255,   0, 200, 0, 255,
      255, 0, 0, 255,   255, 0, 0, 255,   0, 255, 0, 255,   0, 255, 0, 255,
      0, 0, 255, 255,   0, 0, 255, 255,   255, 255, 255, 255, 255, 255, 255, 255,
      0, 0, 255, 255,   0, 0, 200, 255,   255, 255, 255, 255, 255, 255, 255, 255,
    ]);
    const out = pixelateImageData(data, 4, 4, 2);
    // Top-left block averages to (241, 0, 0); every pixel in it matches.
    expect([out[0], out[1], out[2], out[3]]).toEqual([241, 0, 0, 255]);
    expect([out[4], out[5], out[6], out[7]]).toEqual([241, 0, 0, 255]);
    // Top-right block averages to (0, 241, 0).
    expect([out[8], out[9], out[10], out[11]]).toEqual([0, 241, 0, 255]);
    // Bottom-left block averages to (0, 0, 241).
    expect([out[32], out[33], out[34], out[35]]).toEqual([0, 0, 241, 255]);
    // Bottom-right block is solid white.
    expect([out[40], out[41], out[42], out[43]]).toEqual([255, 255, 255, 255]);
  });

  it('leaves a 1px-size image unchanged and does not mutate the input', () => {
    const data = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]);
    const out = pixelateImageData(data, 2, 1, 1);
    expect(Array.from(out)).toEqual([10, 20, 30, 255, 40, 50, 60, 255]);
    expect(out).not.toBe(data);
  });

  it('handles a partial block at the right and bottom edges', () => {
    const data = new Uint8ClampedArray([
      100, 0, 0, 255, 100, 0, 0, 255, 100, 0, 0, 255,
      100, 0, 0, 255, 100, 0, 0, 255, 100, 0, 0, 255,
      100, 0, 0, 255, 100, 0, 0, 255, 100, 0, 0, 255,
    ]);
    const out = pixelateImageData(data, 3, 3, 2);
    // Every pixel is the same color, so every block stays solid.
    expect(out[0]).toBe(100);
    expect(out[out.length - 4]).toBe(100);
  });
});

describe('pixel-art quantizeImageData', () => {
  it('snaps channels to 0 or 255 with 1 bit per channel', () => {
    const data = new Uint8ClampedArray([100, 200, 127, 255, 0, 255, 60, 128]);
    const out = quantizeImageData(data, 1);
    expect(Array.from(out)).toEqual([0, 255, 0, 255, 0, 255, 0, 128]);
  });

  it('snaps channels to 4 levels with 2 bits per channel', () => {
    const data = new Uint8ClampedArray([0, 42, 127, 255, 200, 255, 90, 255]);
    const out = quantizeImageData(data, 2);
    // Levels are 0, 85, 170, 255: 42 rounds to 0, 127 to 85, 200 to 170, 90 to 85.
    expect(Array.from(out)).toEqual([0, 0, 85, 255, 170, 255, 85, 255]);
  });

  it('builds a pixel art file name', () => {
    expect(buildPixelArtFileName('my photo.jpg')).toBe('my_photo_pixel-art.png');
  });
});

// ---------------------------------------------------------------------------
// PixelArt — component
// ---------------------------------------------------------------------------

describe('pixel-art component', () => {
  it('renders the workspace with a disabled pixelate button', () => {
    renderTool(<PixelArt onBack={() => undefined} />);
    expect(screen.getByText(/Pixel Art Maker/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload an image to pixelate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pixelate Image/i })).toBeDisabled();
  });

  it('rejects a non-image file selection with a validation toast', () => {
    renderTool(<PixelArt onBack={() => undefined} />);
    uploadFile(new File(['plain text'], 'notes.txt', { type: 'text/plain' }));
    expect(screen.getByText('Unsupported Format')).toBeInTheDocument();
  });

  it('shows the original and the pixel grid after upload', async () => {
    renderTool(<PixelArt onBack={() => undefined} />);
    uploadFile(new File(['fake-png-bytes'], 'photo.png', { type: 'image/png' }));
    await waitFor(() => expect(screen.getByAltText('Original image')).toBeInTheDocument());
    expect(screen.getByText(/Output grid: 13 x 6 pixels/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pixelate Image/i })).toBeEnabled();
  });

  it('pixelates on demand and offers the PNG download', async () => {
    renderTool(<PixelArt onBack={() => undefined} />);
    uploadFile(new File(['fake-png-bytes'], 'photo.png', { type: 'image/png' }));
    await waitFor(() => expect(screen.getByLabelText('Pixelated image preview')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Pixelate Image/i }));
    await waitFor(() => expect(screen.getByText('Pixel Art Ready')).toBeInTheDocument());
    expect(fakeCtx.drawImage).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Download Pixel Art \(PNG\)/i })).toBeEnabled();
  });

  it('calls toBlob when the pixel art is downloaded', async () => {
    renderTool(<PixelArt onBack={() => undefined} />);
    uploadFile(new File(['fake-png-bytes'], 'photo.png', { type: 'image/png' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Download Pixel Art \(PNG\)/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Download Pixel Art \(PNG\)/i }));
    expect(toBlobSpy).toHaveBeenCalled();
  });

  it('updates the grid readout when the pixel size slider moves', async () => {
    renderTool(<PixelArt onBack={() => undefined} />);
    uploadFile(new File(['fake-png-bytes'], 'photo.png', { type: 'image/png' }));
    await waitFor(() => expect(screen.getByText(/Output grid: 13 x 6 pixels/)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Pixel Size'), { target: { value: '50' } });
    expect(screen.getByText(/Output grid: 4 x 2 pixels/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SvgOptimizer — core logic
// ---------------------------------------------------------------------------

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- a comment to strip -->
  <metadata>editor info</metadata>
  <circle cx="10.12345" cy="20.5000" r="30.0004" fill="#ff0000" />
  <text>Keep  this   text</text>
</svg>`;

describe('svg-optimizer validateSvg', () => {
  it('accepts a well-formed SVG document', () => {
    expect(validateSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle r="5"/></svg>').valid).toBe(true);
  });

  it('rejects empty input', () => {
    const result = validateSvg('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects a document whose root is not <svg>', () => {
    const result = validateSvg('<html><body>hi</body></html>');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not <svg>');
  });

  it('rejects malformed XML', () => {
    const result = validateSvg('<svg><circle r="5"></svg>');
    expect(result.valid).toBe(false);
  });
});

describe('svg-optimizer optimizeSvg', () => {
  it('strips comments and metadata but keeps shapes and text', () => {
    const out = optimizeSvg(SAMPLE_SVG);
    expect(out).not.toContain('<!--');
    expect(out).not.toContain('metadata');
    expect(out).not.toContain('editor info');
    expect(out).toContain('<circle');
    expect(out).toContain('Keep  this   text');
  });

  it('rounds over-precise numbers to 3 decimals', () => {
    const out = optimizeSvg(SAMPLE_SVG);
    expect(out).toContain('cx="10.123"');
    expect(out).toContain('cy="20.5"');
    expect(out).toContain('r="30"');
  });

  it('collapses whitespace between tags and trims the document', () => {
    const out = optimizeSvg(SAMPLE_SVG);
    expect(out).not.toMatch(/>\s+</);
    expect(out.startsWith('<svg')).toBe(true);
    expect(out.endsWith('</svg>')).toBe(true);
  });

  it('produces output that still validates as SVG', () => {
    expect(validateSvg(optimizeSvg(SAMPLE_SVG)).valid).toBe(true);
  });

  it('strips an XML declaration and DOCTYPE', () => {
    const out = optimizeSvg('<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg xmlns="http://www.w3.org/2000/svg"><rect width="1"/></svg>');
    expect(out).not.toContain('<?xml');
    expect(out).not.toContain('DOCTYPE');
    expect(validateSvg(out).valid).toBe(true);
  });
});

describe('svg-optimizer size helpers', () => {
  it('computes saved bytes and percentage', () => {
    expect(computeSvgSavings(1000, 700)).toEqual({ savedBytes: 300, percent: 30 });
    expect(computeSvgSavings(100, 100)).toEqual({ savedBytes: 0, percent: 0 });
    expect(computeSvgSavings(0, 0)).toEqual({ savedBytes: 0, percent: 0 });
  });

  it('measures byte size with UTF-8 encoding', () => {
    expect(byteSize('abc')).toBe(3);
    expect(byteSize('é')).toBe(2);
  });

  it('builds an optimized file name, with a fallback', () => {
    expect(buildOptimizedSvgFileName('logo.svg')).toBe('logo_optimized.svg');
    expect(buildOptimizedSvgFileName(undefined)).toBe('optimized.svg');
  });
});

// ---------------------------------------------------------------------------
// SvgOptimizer — component
// ---------------------------------------------------------------------------

describe('svg-optimizer component', () => {
  it('renders the workspace with a disabled optimize button', () => {
    renderTool(<SvgOptimizer onBack={() => undefined} />);
    expect(screen.getByText(/SVG Optimizer/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Paste SVG Code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Optimize SVG/i })).toBeDisabled();
  });

  it('optimizes pasted SVG and reports the savings', () => {
    renderTool(<SvgOptimizer onBack={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Paste SVG Code'), { target: { value: SAMPLE_SVG } });
    fireEvent.click(screen.getByRole('button', { name: /Optimize SVG/i }));
    expect(screen.getByText('SVG Optimized')).toBeInTheDocument();
    expect(screen.getByText(/Optimized & validated/)).toBeInTheDocument();
    const output = screen.getByLabelText('Optimized SVG code') as HTMLTextAreaElement;
    expect(output.value).not.toContain('<!--');
    expect(output.value).not.toContain('metadata');
    expect(output.value).toContain('cx="10.123"');
    expect(screen.getByRole('button', { name: /Download Optimized SVG/i })).toBeEnabled();
    expect(screen.getByText(/smaller than the original/)).toBeInTheDocument();
  });

  it('shows an error and no output for invalid SVG', () => {
    renderTool(<SvgOptimizer onBack={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Paste SVG Code'), { target: { value: '<svg><circle r="5"></svg>' } });
    fireEvent.click(screen.getByRole('button', { name: /Optimize SVG/i }));
    expect(screen.getByText('Invalid SVG')).toBeInTheDocument();
    expect(screen.queryByLabelText('Optimized SVG code')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download Optimized SVG/i })).not.toBeInTheDocument();
  });

  it('rejects a non-SVG file upload with a validation toast', () => {
    renderTool(<SvgOptimizer onBack={() => undefined} />);
    uploadFile(new File(['plain text'], 'notes.txt', { type: 'text/plain' }));
    expect(screen.getByText('Unsupported Format')).toBeInTheDocument();
  });

  it('loads an uploaded SVG file into the editor', async () => {
    renderTool(<SvgOptimizer onBack={() => undefined} />);
    uploadFile(new File([SAMPLE_SVG], 'icon.svg', { type: 'image/svg+xml' }));
    await waitFor(() => expect(screen.getByText('SVG Loaded')).toBeInTheDocument());
    const input = screen.getByLabelText('Paste SVG Code') as HTMLTextAreaElement;
    expect(input.value).toContain('<svg');
  });
});

// ---------------------------------------------------------------------------
// GradientGenerator — core logic
// ---------------------------------------------------------------------------

describe('gradient-generator buildGradientCss', () => {
  it('builds a linear gradient with angle and stops', () => {
    const config: GradientConfig = {
      type: 'linear',
      angle: 135,
      radialPosition: 'center',
      stops: [
        { color: '#10b981', position: 0 },
        { color: '#3b82f6', position: 100 },
      ],
    };
    expect(buildGradientCss(config)).toBe('linear-gradient(135deg, #10b981 0%, #3b82f6 100%)');
  });

  it('normalizes out-of-range angles', () => {
    const config: GradientConfig = {
      type: 'linear',
      angle: 450,
      radialPosition: 'center',
      stops: [{ color: '#000000', position: 0 }, { color: '#ffffff', position: 100 }],
    };
    expect(buildGradientCss(config)).toBe('linear-gradient(90deg, #000000 0%, #ffffff 100%)');
  });

  it('builds a radial gradient with a center position', () => {
    const config: GradientConfig = {
      type: 'radial',
      angle: 135,
      radialPosition: 'top left',
      stops: [{ color: '#ff0000', position: 0 }, { color: '#0000ff', position: 100 }],
    };
    expect(buildGradientCss(config)).toBe('radial-gradient(circle at top left, #ff0000 0%, #0000ff 100%)');
  });

  it('sorts stops by position in the CSS output', () => {
    const config: GradientConfig = {
      type: 'linear',
      angle: 90,
      radialPosition: 'center',
      stops: [{ color: '#ffffff', position: 100 }, { color: '#000000', position: 0 }],
    };
    expect(buildGradientCss(config)).toBe('linear-gradient(90deg, #000000 0%, #ffffff 100%)');
  });
});

describe('gradient-generator normalizeStops', () => {
  it('clamps positions to 0-100 and sorts', () => {
    expect(normalizeStops([
      { color: '#ffffff', position: 150 },
      { color: '#000000', position: -20 },
    ])).toEqual([
      { color: '#000000', position: 0 },
      { color: '#ffffff', position: 100 },
    ]);
  });

  it('duplicates a lone stop so a gradient always has two', () => {
    expect(normalizeStops([{ color: '#123456', position: 30 }])).toEqual([
      { color: '#123456', position: 30 },
      { color: '#123456', position: 100 },
    ]);
  });

  it('falls back to the defaults for an empty list', () => {
    expect(normalizeStops([])).toEqual([
      { color: '#10b981', position: 0 },
      { color: '#3b82f6', position: 100 },
    ]);
  });
});

describe('gradient-generator createCanvasGradient', () => {
  it('creates a linear canvas gradient with one stop per color', () => {
    const config: GradientConfig = {
      type: 'linear',
      angle: 90,
      radialPosition: 'center',
      stops: [{ color: '#000000', position: 0 }, { color: '#ffffff', position: 100 }],
    };
    const gradient = createCanvasGradient(fakeCtx.ctx, config, 800, 600);
    expect(fakeCtx.createLinearGradient).toHaveBeenCalledTimes(1);
    const [x0, y0, x1, y1] = (fakeCtx.createLinearGradient as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(x0).toBeCloseTo(0);
    expect(y0).toBeCloseTo(300);
    expect(x1).toBeCloseTo(800);
    expect(y1).toBeCloseTo(300);
    expect(gradient.addColorStop).toHaveBeenCalledTimes(2);
  });

  it('creates a radial canvas gradient centered on the canvas', () => {
    const config: GradientConfig = {
      type: 'radial',
      angle: 0,
      radialPosition: 'center',
      stops: [{ color: '#000000', position: 0 }, { color: '#ffffff', position: 100 }],
    };
    const gradient = createCanvasGradient(fakeCtx.ctx, config, 800, 600);
    expect(fakeCtx.createRadialGradient).toHaveBeenCalledTimes(1);
    const [cx, cy, r0, , , r1] = (fakeCtx.createRadialGradient as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(cx).toBe(400);
    expect(cy).toBe(300);
    expect(r0).toBe(0);
    expect(r1).toBeCloseTo(500);
    expect(gradient.addColorStop).toHaveBeenCalledTimes(2);
  });

  it('builds a PNG file name from the gradient type and size', () => {
    expect(buildGradientFileName('linear', 1920, 1080)).toBe('gradient-linear-1920x1080.png');
    expect(buildGradientFileName('radial', 1080, 1080)).toBe('gradient-radial-1080x1080.png');
  });
});

// ---------------------------------------------------------------------------
// GradientGenerator — component
// ---------------------------------------------------------------------------

describe('gradient-generator component', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it('renders the default gradient and its CSS', () => {
    renderTool(<GradientGenerator onBack={() => undefined} />);
    expect(screen.getByText(/Gradient Generator/i)).toBeInTheDocument();
    expect(screen.getByTestId('gradient-css')).toHaveTextContent(
      'background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);'
    );
    const preview = screen.getByTestId('gradient-preview');
    expect(preview.style.background).toContain('linear-gradient(135deg');
  });

  it('copies the CSS to the clipboard', async () => {
    renderTool(<GradientGenerator onBack={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy CSS/i }));
    await waitFor(() => expect(screen.getByText('CSS Copied')).toBeInTheDocument());
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(
      'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)'
    );
  });

  it('switches to a radial gradient and updates the CSS', () => {
    renderTool(<GradientGenerator onBack={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'radial' }));
    expect(screen.getByTestId('gradient-css')).toHaveTextContent(
      'background: radial-gradient(circle at center, #10b981 0%, #3b82f6 100%);'
    );
  });

  it('adds a color stop and updates the CSS', () => {
    renderTool(<GradientGenerator onBack={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Add Stop/i }));
    expect(screen.getByText(/Color Stops \(3\/6\)/)).toBeInTheDocument();
    expect(screen.getByTestId('gradient-css')).toHaveTextContent('#f59e0b 50%');
  });

  it('updates the angle and the CSS when the angle slider moves', () => {
    renderTool(<GradientGenerator onBack={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Angle'), { target: { value: '90' } });
    expect(screen.getByTestId('gradient-css')).toHaveTextContent('linear-gradient(90deg,');
  });

  it('exports the gradient as a PNG', async () => {
    renderTool(<GradientGenerator onBack={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Export PNG \(1920 x 1080\)/i }));
    await waitFor(() => expect(screen.getByText('Gradient Exported')).toBeInTheDocument());
    expect(toBlobSpy).toHaveBeenCalled();
    expect(fakeCtx.createLinearGradient).toHaveBeenCalled();
  });
});
