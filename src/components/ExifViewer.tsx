import React, { useRef, useState } from 'react';
import {
  Camera,
  CheckCircle,
  Copy,
  Image as ImageIcon,
  Info,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { formatFileSize } from '../lib/imageTools';

/**
 * EXIF viewer — a real, minimal JPEG/TIFF EXIF reader over the uploaded
 * image bytes. No values are invented: every row in the table comes from a
 * tag actually present in the file, and a file with no EXIF segment says so
 * plainly. No new dependencies.
 *
 * Covered: JPEG APP1 `Exif\0\0` segments and PNG `eXIf` chunks; TIFF byte
 * orders II (little-endian) and MM (big-endian); IFD0, the Exif sub-IFD
 * (tag 0x8769) and the GPS sub-IFD (tag 0x8825); types ASCII, SHORT, LONG,
 * RATIONAL, SRATIONAL, BYTE and UNDEFINED. Tags read: Make, Model, DateTime,
 * Artist, ExposureTime, FNumber, ExposureProgram, ISO, DateTimeOriginal,
 * FocalLength, FocalLengthIn35mm, LensModel, GPS latitude/longitude.
 * Not covered (stated in the UI when absent): XMP/IPTC metadata, maker
 * notes, and thumbnails embedded in the EXIF block.
 */

export interface ExifTagRow {
  label: string;
  value: string;
}

export interface ExifParseResult {
  found: boolean;
  format: 'jpeg' | 'png' | 'unknown';
  tags: ExifTagRow[];
  note: string;
}

const TYPE_SIZES: Record<number, number> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  7: 1, // UNDEFINED
  9: 4, // SLONG
  10: 8, // SRATIONAL
};

const EXPOSURE_PROGRAMS: Record<number, string> = {
  0: 'Not defined',
  1: 'Manual',
  2: 'Normal program',
  3: 'Aperture priority',
  4: 'Shutter priority',
  5: 'Creative program',
  6: 'Action program',
  7: 'Portrait mode',
  8: 'Landscape mode',
};

function formatRational(numerator: number, denominator: number): string {
  if (denominator === 0) return `${numerator}/0`;
  if (denominator === 1) return `${numerator}`;
  const value = numerator / denominator;
  if (Number.isInteger(value)) return `${value}`;
  return `${numerator}/${denominator} (${value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')})`;
}

/** Convert GPS DMS rationals + hemisphere ref to decimal degrees, or null. */
export function gpsToDecimal(
  parts: { numerator: number; denominator: number }[],
  ref: string
): number | null {
  if (parts.length < 3) return null;
  const [d, m, s] = parts;
  if (d.denominator === 0 || m.denominator === 0 || s.denominator === 0) return null;
  let decimal = d.numerator / d.denominator + m.numerator / m.denominator / 60 + s.numerator / s.denominator / 3600;
  if (ref === 'S' || ref === 'W') decimal = -decimal;
  if (!Number.isFinite(decimal)) return null;
  return decimal;
}

/** Parse a TIFF block (starting at the II/MM header) into tag rows. */
export function parseTiff(tiff: Uint8Array): ExifTagRow[] {
  const tags: ExifTagRow[] = [];
  if (tiff.length < 8) return tags;
  const littleEndian = tiff[0] === 0x49 && tiff[1] === 0x49; // 'II'
  const bigEndian = tiff[0] === 0x4d && tiff[1] === 0x4d; // 'MM'
  if (!littleEndian && !bigEndian) return tags;
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const u16 = (offset: number) => view.getUint16(offset, littleEndian);
  const u32 = (offset: number) => view.getUint32(offset, littleEndian);
  const i32 = (offset: number) => view.getInt32(offset, littleEndian);
  if (u16(2) !== 42) return tags;

  const readAscii = (offset: number, count: number): string => {
    let out = '';
    for (let i = 0; i < count && offset + i < tiff.length; i++) {
      const byte = tiff[offset + i];
      if (byte === 0) break;
      out += String.fromCharCode(byte);
    }
    return out.trim();
  };

  const readValue = (
    type: number,
    count: number,
    valueOffset: number
  ): { ascii?: string; shorts?: number[]; longs?: number[]; rationals?: { numerator: number; denominator: number }[] } => {
    const typeSize = TYPE_SIZES[type] || 1;
    const totalBytes = typeSize * count;
    const base = totalBytes <= 4 ? valueOffset : u32(valueOffset);
    if (type === 2) return { ascii: readAscii(base, count) };
    if (type === 3) {
      const shorts: number[] = [];
      for (let i = 0; i < count; i++) {
        const at = totalBytes <= 4 ? valueOffset + i * 2 : base + i * 2;
        if (at + 2 > tiff.length) break;
        shorts.push(u16(at));
      }
      return { shorts };
    }
    if (type === 4 || type === 9) {
      const longs: number[] = [];
      for (let i = 0; i < count; i++) {
        const at = totalBytes <= 4 ? valueOffset + i * 4 : base + i * 4;
        if (at + 4 > tiff.length) break;
        longs.push(type === 4 ? u32(at) : i32(at));
      }
      return { longs };
    }
    if (type === 5 || type === 10) {
      const rationals: { numerator: number; denominator: number }[] = [];
      for (let i = 0; i < count; i++) {
        const at = base + i * 8;
        if (at + 8 > tiff.length) break;
        rationals.push({
          numerator: type === 5 ? u32(at) : i32(at),
          denominator: type === 5 ? u32(at + 4) : i32(at + 4),
        });
      }
      return { rationals };
    }
    return {};
  };

  const readIfd = (ifdOffset: number, scope: 'ifd0' | 'exif' | 'gps'): { exifOffset: number | null; gpsOffset: number | null } => {
    let exifOffset: number | null = null;
    let gpsOffset: number | null = null;
    const push = (label: string, text: string) => {
      if (text !== '') tags.push({ label, value: text });
    };
    if (ifdOffset + 2 > tiff.length) return { exifOffset, gpsOffset };
    const count = u16(ifdOffset);
    let gpsLatRef = '';
    let gpsLat: { numerator: number; denominator: number }[] | undefined;
    let gpsLonRef = '';
    let gpsLon: { numerator: number; denominator: number }[] | undefined;
    for (let i = 0; i < count; i++) {
      const entry = ifdOffset + 2 + i * 12;
      if (entry + 12 > tiff.length) break;
      const tag = u16(entry);
      const type = u16(entry + 2);
      const valueCount = u32(entry + 4);
      const value = readValue(type, valueCount, entry + 8);
      if (scope === 'ifd0') {
        if (tag === 0x010f && value.ascii) push('Camera make', value.ascii);
        else if (tag === 0x0110 && value.ascii) push('Camera model', value.ascii);
        else if (tag === 0x0132 && value.ascii) push('Date/time (file)', value.ascii);
        else if (tag === 0x013b && value.ascii) push('Artist', value.ascii);
        else if (tag === 0x8769 && value.longs?.length) exifOffset = value.longs[0];
        else if (tag === 0x8825 && value.longs?.length) gpsOffset = value.longs[0];
      } else if (scope === 'exif') {
        if (tag === 0x829a && value.rationals?.length) {
          const r = value.rationals[0];
          push('Exposure time', `${formatRational(r.numerator, r.denominator)} s`);
        } else if (tag === 0x829d && value.rationals?.length) {
          const r = value.rationals[0];
          push('Aperture (f-number)', r.denominator === 0 ? '—' : `f/${(r.numerator / r.denominator).toFixed(1)}`);
        } else if (tag === 0x8822 && value.shorts?.length) {
          push('Exposure program', EXPOSURE_PROGRAMS[value.shorts[0]] || `Program ${value.shorts[0]}`);
        } else if (tag === 0x8827 && value.shorts?.length) {
          push('ISO speed', `ISO ${value.shorts[0]}`);
        } else if (tag === 0x9003 && value.ascii) push('Date/time original', value.ascii);
        else if (tag === 0x920a && value.rationals?.length) {
          const r = value.rationals[0];
          push('Focal length', r.denominator === 0 ? '—' : `${(r.numerator / r.denominator).toFixed(1).replace(/\.0$/, '')} mm`);
        } else if (tag === 0xa405 && value.shorts?.length) {
          push('Focal length (35mm equiv.)', `${value.shorts[0]} mm`);
        } else if (tag === 0xa434 && value.ascii) push('Lens model', value.ascii);
      } else {
        if (tag === 0x0001 && value.ascii) gpsLatRef = value.ascii;
        else if (tag === 0x0002 && value.rationals) gpsLat = value.rationals;
        else if (tag === 0x0003 && value.ascii) gpsLonRef = value.ascii;
        else if (tag === 0x0004 && value.rationals) gpsLon = value.rationals;
      }
    }
    if (scope === 'gps') {
      if (gpsLat && gpsLatRef) {
        const decimal = gpsToDecimal(gpsLat, gpsLatRef);
        if (decimal !== null) push('GPS latitude', `${decimal.toFixed(6)}° ${gpsLatRef}`);
      }
      if (gpsLon && gpsLonRef) {
        const decimal = gpsToDecimal(gpsLon, gpsLonRef);
        if (decimal !== null) push('GPS longitude', `${decimal.toFixed(6)}° ${gpsLonRef}`);
      }
    }
    return { exifOffset, gpsOffset };
  };

  const ifd0Offset = u32(4);
  const { exifOffset, gpsOffset } = readIfd(ifd0Offset, 'ifd0');
  if (exifOffset !== null) readIfd(exifOffset, 'exif');
  if (gpsOffset !== null) readIfd(gpsOffset, 'gps');
  return tags;
}

/** Find a JPEG APP1 Exif segment and parse its TIFF block; null when absent. */
export function parseJpegExif(bytes: Uint8Array): ExifTagRow[] | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) return null; // SOS / EOI: no more segments
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) return null;
    if (marker === 0xe1) {
      const header = 'Exif\0\0';
      let matches = true;
      for (let i = 0; i < header.length; i++) {
        if (bytes[offset + 4 + i] !== header.charCodeAt(i)) { matches = false; break; }
      }
      if (matches) {
        return parseTiff(bytes.slice(offset + 10, offset + 2 + length));
      }
    }
    offset += 2 + length;
  }
  return null;
}

/** Find a PNG eXIf chunk and parse its TIFF block; null when absent. */
export function parsePngExif(bytes: Uint8Array): ExifTagRow[] | null {
  const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 8 || !PNG_MAGIC.every((b, i) => bytes[i] === b)) return null;
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    if (type === 'eXIf') {
      return parseTiff(bytes.slice(offset + 8, offset + 8 + length));
    }
    if (type === 'IEND') return null;
    offset += 12 + length;
  }
  return null;
}

/** Parse EXIF from raw image bytes. Never fabricates a tag. */
export function parseExif(bytes: Uint8Array): ExifParseResult {
  const isJpeg = bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50;
  if (isJpeg) {
    const tags = parseJpegExif(bytes);
    if (tags === null) {
      return { found: false, format: 'jpeg', tags: [], note: 'This JPEG has no EXIF (APP1) segment, so it carries no camera metadata.' };
    }
    if (tags.length === 0) {
      return { found: false, format: 'jpeg', tags: [], note: 'An EXIF segment is present, but none of the common camera tags (make, model, ISO, focal length, date, GPS) were found in it.' };
    }
    return { found: true, format: 'jpeg', tags, note: 'Values below were read directly from the file bytes. XMP/IPTC data and maker notes are not shown.' };
  }
  if (isPng) {
    const tags = parsePngExif(bytes);
    if (tags === null || tags.length === 0) {
      return { found: false, format: 'png', tags: [], note: 'This PNG has no eXIf chunk, so it carries no camera metadata.' };
    }
    return { found: true, format: 'png', tags, note: 'Values below were read directly from the file bytes (PNG eXIf chunk).' };
  }
  return { found: false, format: 'unknown', tags: [], note: 'Only JPEG (APP1 EXIF) and PNG (eXIf) files are read. Other image formats are not parsed.' };
}

export default function ExifViewer({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [result, setResult] = useState<ExifParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (selected: File | undefined) => {
    if (!selected) return;
    if (selected.size === 0) {
      toast.error('Empty File', 'The selected file is 0 bytes.');
      return;
    }
    const isJpeg = selected.type === 'image/jpeg' || /\.jpe?g$/i.test(selected.name);
    const isPng = selected.type === 'image/png' || /\.png$/i.test(selected.name);
    if (!isJpeg && !isPng) {
      toast.error('Unsupported Format', 'EXIF is read from JPEG and PNG files only.');
      return;
    }
    setIsParsing(true);
    try {
      const buffer = await selected.arrayBuffer();
      const parsed = parseExif(new Uint8Array(buffer));
      setFile(selected);
      setResult(parsed);
      if (previewUrl) {
        try { URL.revokeObjectURL(previewUrl); } catch (e) {}
      }
      setPreviewUrl(URL.createObjectURL(selected));
      if (parsed.found) {
        try { confetti({ particleCount: 50, spread: 40 }); } catch (e) {}
        toast.success('EXIF Found', `${parsed.tags.length} metadata field${parsed.tags.length === 1 ? '' : 's'} read from the file.`);
      } else {
        toast.info('No EXIF Data', parsed.note);
      }
    } catch (err) {
      toast.error('Read Failed', 'The image bytes could not be read.');
    } finally {
      setIsParsing(false);
    }
  };

  const clearFile = () => {
    if (previewUrl) {
      try { URL.revokeObjectURL(previewUrl); } catch (e) {}
    }
    setFile(null);
    setPreviewUrl('');
    setResult(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="exif-viewer-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Camera className="w-8 h-8 text-[#10b981]" />
            EXIF Viewer
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Reads the real EXIF metadata stored inside your JPEG or PNG — camera, lens, exposure and GPS — entirely in your browser. Nothing is invented: a file without EXIF says so.
          </p>
        </div>
        {file && (
          <button
            onClick={clearFile}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
          >
            Clear Image
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            className="border-2 border-dashed border-[#2a2a2a] hover:border-[#10b981]/50 rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[220px]"
          >
            <input
              id="exif-file-input"
              data-testid="exif-file-input"
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFile(e.target.files?.[0])}
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              className="hidden"
            />
            <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-3 group-hover:scale-105 transition-transform text-[#10b981]">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-white font-sans text-base">Upload a JPEG or PNG</h3>
            <p className="text-gray-500 text-xs mt-1 mb-3">Metadata is read from the file bytes on your device — nothing is uploaded.</p>
            <span className="text-[11px] font-bold text-[#0a0a0a] bg-[#10b981] px-3 py-1.5 rounded uppercase tracking-wider hover:bg-[#059669] transition-all">
              Select File
            </span>
          </div>
          {file && (
            <div className="text-xs text-gray-400">
              <p className="truncate font-semibold text-white">{file.name}</p>
              <p className="mt-1">{formatFileSize(file.size)}</p>
              {previewUrl && (
                <img src={previewUrl} alt="Uploaded preview" className="mt-3 max-w-full max-h-[220px] block rounded border border-[#2a2a2a]" />
              )}
            </div>
          )}
          <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-4 text-xs text-gray-400 font-medium leading-relaxed">
            <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest block mb-2 font-mono">What Is Read</span>
            Camera make &amp; model, date taken, ISO, focal length, aperture, exposure time and GPS coordinates — only when the file actually stores them. Screenshots and images saved by most messaging apps usually have no EXIF at all.
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          {isParsing && (
            <p className="text-gray-400 text-sm">Reading image bytes…</p>
          )}
          {!result && !isParsing && (
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-10 text-center flex flex-col items-center justify-center min-h-[220px] text-gray-500">
              <ImageIcon className="w-10 h-10 stroke-1 mb-3" />
              <p className="text-xs max-w-sm">Upload a JPEG or PNG to see the metadata stored inside it.</p>
            </div>
          )}
          {result && (
            <div data-testid="exif-result" className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a] mb-4">
                {result.found ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Info className="w-5 h-5 text-amber-400" />
                )}
                <h2 className="font-sans text-lg text-white">
                  {result.found ? `EXIF Metadata — ${result.tags.length} field${result.tags.length === 1 ? '' : 's'} found` : 'No EXIF Metadata Found'}
                </h2>
              </div>
              {result.found ? (
                <dl className="flex flex-col divide-y divide-[#1a1a1a]">
                  {result.tags.map((tag) => (
                    <div key={tag.label} className="flex items-start justify-between gap-4 py-2.5">
                      <dt className="text-xs text-gray-400 font-semibold">{tag.label}</dt>
                      <dd data-testid={`exif-value-${tag.label}`} className="text-xs text-white font-mono text-right break-all">{tag.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="flex items-start gap-2 text-amber-300 text-xs">
                  <WarningCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p>{result.note}</p>
                </div>
              )}
              <p className="text-[11px] text-gray-500 mt-4">{result.note}</p>
              {result.found && (
                <button
                  onClick={() => {
                    const text = result.tags.map((t) => `${t.label}: ${t.value}`).join('\n');
                    if (navigator.clipboard?.writeText) {
                      navigator.clipboard.writeText(text).then(
                        () => toast.success('Copied', 'EXIF values copied to the clipboard.'),
                        () => toast.error('Copy Failed', 'Clipboard access was blocked.')
                      );
                    }
                  }}
                  className="mt-4 py-2 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" /> Copy Metadata as Text
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
