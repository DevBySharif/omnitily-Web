// Favicon (.ico) export: the disabled reason was that the old export wrote
// bare PNG bytes under an .ico name. These tests prove the fixed export is a
// genuine ICO file — ICONDIR header + entry + embedded PNG — end to end
// through the real handleGenerateFavicon handler in GenericUtilityWorkspace.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GenericUtilityWorkspace from '../src/components/GenericUtilityWorkspace';
import { base64ToBytes, buildIcoFromPng, bytesToBase64 } from '../src/lib/imageTools';
import { TOOL_BY_ID } from '../src/toolsData';

// A real 1x1 transparent PNG (the canvas stand-in returns this as its raster).
const PNG_1X1_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG_1X1_DATA_URL = `data:image/png;base64,${PNG_1X1_B64}`;
const PNG_1X1_BYTES = base64ToBytes(PNG_1X1_B64);

// Image stand-in that "decodes" on the next microtask (same pattern as the
// image-cropper tests).
class MockImage {
  naturalWidth = 32;
  naturalHeight = 32;
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

describe('buildIcoFromPng', () => {
  it('wraps PNG bytes in a valid single-image ICO container', () => {
    const ico = buildIcoFromPng(PNG_1X1_BYTES, 32);
    expect(ico.length).toBe(22 + PNG_1X1_BYTES.length);
    const view = new DataView(ico.buffer);
    expect(view.getUint16(0, true)).toBe(0); // reserved
    expect(view.getUint16(2, true)).toBe(1); // type: icon
    expect(view.getUint16(4, true)).toBe(1); // one image
    expect(ico[6]).toBe(32); // width
    expect(ico[7]).toBe(32); // height
    expect(view.getUint16(10, true)).toBe(1); // color planes
    expect(view.getUint16(12, true)).toBe(32); // bits per pixel
    expect(view.getUint32(14, true)).toBe(PNG_1X1_BYTES.length); // image size
    expect(view.getUint32(18, true)).toBe(22); // image offset
    // The embedded image is the original PNG, byte for byte.
    expect(Array.from(ico.slice(22))).toEqual(Array.from(PNG_1X1_BYTES));
    expect(Array.from(ico.slice(22, 26))).toEqual([0x89, 0x50, 0x4e, 0x47]); // PNG signature
  });

  it('encodes a 256px icon width/height as 0, per the ICO spec', () => {
    const ico = buildIcoFromPng(PNG_1X1_BYTES, 256);
    expect(ico[6]).toBe(0);
    expect(ico[7]).toBe(0);
  });

  it('throws on empty input or an out-of-range size', () => {
    expect(() => buildIcoFromPng(new Uint8Array(0))).toThrow();
    expect(() => buildIcoFromPng(PNG_1X1_BYTES, 0)).toThrow();
    expect(() => buildIcoFromPng(PNG_1X1_BYTES, 257)).toThrow();
  });
});

describe('base64 byte helpers', () => {
  it('round-trips arbitrary bytes, including values above 127', () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 200, 255, 0x89, 0x50]);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });
});

describe('favicon-generator handler (real component)', () => {
  const downloads: { href: string; download: string }[] = [];

  beforeEach(() => {
    downloads.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      { drawImage() {} } as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(PNG_1X1_DATA_URL);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push({ href: this.href, download: this.download });
    });
    vi.stubGlobal('Image', MockImage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exports a genuine .ico file named favicon.ico', async () => {
    render(
      <GenericUtilityWorkspace
        tool={TOOL_BY_ID['favicon-generator']}
        onBack={() => {}}
        initialFile={new File([PNG_1X1_BYTES], 'logo.png', { type: 'image/png' })}
      />,
    );
    await waitFor(() => expect(screen.getByText('logo.png')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Convert File' }));
    await waitFor(() => expect(screen.getByText(/genuine \.ico file/)).toBeInTheDocument());

    const downloadButton = screen.getByRole('button', { name: 'Download Result' });
    expect(downloadButton).not.toBeDisabled();
    fireEvent.click(downloadButton);

    const icoDownload = downloads.find((d) => d.href.startsWith('data:image/x-icon;base64,'));
    expect(icoDownload).toBeDefined();
    expect(icoDownload!.download).toBe('favicon.ico');
    const icoBytes = base64ToBytes(icoDownload!.href.split(',')[1]);
    // A real ICO header, not PNG bytes with an .ico name.
    const view = new DataView(icoBytes.buffer);
    expect(view.getUint16(0, true)).toBe(0);
    expect(view.getUint16(2, true)).toBe(1);
    expect(view.getUint16(4, true)).toBe(1);
    expect(icoBytes[6]).toBe(32);
    expect(icoBytes[7]).toBe(32);
    expect(view.getUint32(14, true)).toBe(PNG_1X1_BYTES.length);
    expect(view.getUint32(18, true)).toBe(22);
    expect(Array.from(icoBytes.slice(22, 26))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});
