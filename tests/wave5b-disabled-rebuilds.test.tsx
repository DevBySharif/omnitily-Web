// Wave 5b — disabled-tool rebuilds: currency-converter, exif-viewer,
// excel-to-csv, silence-remover, vocal-remover.
//
// Deterministic by design: every pure helper is exercised with hand-built
// inputs (a real EXIF JPEG assembled byte-by-byte, a real .xlsx ZIP built
// with zlib, synthetic audio). Live-network paths are mocked: the sandbox
// has no external network, so the Frankfurter fetch is tested with a stub
// fetch and the Playwright run mocks the endpoint too — live-rate
// verification against the real api.frankfurter.app must happen at
// integration on the live site (see checks/wave5b-disabled.md).
import { deflateRawSync } from 'node:zlib';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// canvas-confetti draws on a real canvas; jsdom has no 2d context, so its
// animation loop throws an unhandled error. Stub it — the confetti call
// itself is not under test.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
import CurrencyConverter, {
  buildRatesUrl,
  convertAmount,
  fetchLiveRates,
  formatMoney,
} from '../src/components/CurrencyConverter';
import ExifViewer, { parseExif } from '../src/components/ExifViewer';
import ExcelToCsv, {
  buildCsvFileName,
  columnLettersToIndex,
  parseSharedStrings,
  parseSheetXml,
  parseZipEntries,
  readZipEntry,
  rowsToCsv,
  xlsxToCsv,
} from '../src/components/ExcelToCsv';
import SilenceRemover, {
  detectSilentRegions,
  formatDuration,
  removeSilentRegions,
} from '../src/components/SilenceRemover';
import VocalRemover, {
  extractCenterMono,
  extractSideChannels,
  measureCenterShare,
  rms,
} from '../src/components/VocalRemover';
import { ToastProvider } from '../src/components/Toast';

const renderTool = (component: ReactNode) => render(<ToastProvider>{component}</ToastProvider>);

// --- currency-converter ------------------------------------------------------

describe('currency-converter', () => {
  const mockRates = { base: 'USD', date: '2026-11-14', rates: { EUR: 0.85, GBP: 0.79 } };
  const okFetch = () =>
    vi.fn(async () => ({ ok: true, status: 200, json: async () => mockRates }) as Response);

  it('builds the Frankfurter URL for a base + targets', () => {
    expect(buildRatesUrl('USD', ['EUR', 'GBP'])).toBe(
      'https://api.frankfurter.app/latest?from=USD&to=EUR%2CGBP'
    );
    expect(buildRatesUrl('EUR', ['EUR'])).toBe('https://api.frankfurter.app/latest?from=EUR');
  });

  it('fetches live rates and returns the parsed payload', async () => {
    const fetchImpl = okFetch();
    const live = await fetchLiveRates('USD', ['EUR'], fetchImpl as unknown as typeof fetch);
    expect(live.base).toBe('USD');
    expect(live.date).toBe('2026-11-14');
    expect(live.rates.EUR).toBe(0.85);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws honestly when the service is unreachable — never a fake rate', async () => {
    const failing = vi.fn(async () => { throw new Error('network down'); });
    await expect(fetchLiveRates('USD', ['EUR'], failing as unknown as typeof fetch)).rejects.toThrow(
      /Could not reach the exchange-rate service/
    );
  });

  it('throws honestly on a non-2xx response and on a response with no rates', async () => {
    const http500 = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response);
    await expect(fetchLiveRates('USD', ['EUR'], http500 as unknown as typeof fetch)).rejects.toThrow(/HTTP 500/);
    const empty = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ base: 'USD', date: '2026-11-14', rates: {} }) }) as Response);
    await expect(fetchLiveRates('USD', ['EUR'], empty as unknown as typeof fetch)).rejects.toThrow(/no usable rates/);
  });

  it('converts with a verified rate and rejects bad input', () => {
    expect(convertAmount(100, 0.85)).toBeCloseTo(85, 10);
    expect(convertAmount(100, 0)).toBeNull();
    expect(convertAmount(NaN, 0.85)).toBeNull();
  });

  it('formats money per currency', () => {
    expect(formatMoney(85, 'EUR')).toContain('85.00');
    expect(formatMoney(100, 'USD')).toContain('100.00');
  });

  it('renders, loads mocked live rates and converts 100 USD to EUR', async () => {
    vi.stubGlobal('fetch', okFetch());
    renderTool(<CurrencyConverter onBack={() => undefined} />);
    await waitFor(() => expect(screen.getByTestId('currency-rate')).toBeInTheDocument());
    expect(screen.getByTestId('currency-rate').textContent).toContain('1 USD = 0.85 EUR');
    expect(screen.getByTestId('currency-rate').textContent).toContain('2026-11-14');
    fireEvent.change(screen.getByTestId('currency-amount'), { target: { value: '100' } });
    fireEvent.click(screen.getByTestId('currency-convert'));
    await waitFor(() => expect(screen.getByTestId('currency-result')).toBeInTheDocument());
    expect(screen.getByTestId('currency-result').textContent).toContain('85.00');
    vi.unstubAllGlobals();
  });

  it('renders the honest error state when live rates fail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    renderTool(<CurrencyConverter onBack={() => undefined} />);
    await waitFor(() => expect(screen.getByTestId('currency-error')).toBeInTheDocument());
    expect(screen.getByTestId('currency-error').textContent).toMatch(/Could not reach/);
    expect(screen.queryByTestId('currency-result')).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

// --- exif-viewer --------------------------------------------------------------

/** Minimal JPEG with a real APP1 EXIF segment (little-endian TIFF). */
function buildExifJpeg(): Uint8Array {
  const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
  // TIFF layout: header(8) + IFD0@8 (5 entries) + ExifIFD@74 (3) + GPSIFD@116 (4) + data@170.
  const tiff = new Uint8Array(279);
  const dv = new DataView(tiff.buffer);
  const setU16 = (o: number, v: number) => dv.setUint16(o, v, true);
  const setU32 = (o: number, v: number) => dv.setUint32(o, v, true);
  tiff.set([0x49, 0x49], 0); // 'II'
  setU16(2, 42);
  setU32(4, 8); // IFD0 offset
  const entry = (ifd: number, i: number, tag: number, type: number, count: number, value: number) => {
    const o = ifd + 2 + i * 12;
    setU16(o, tag); setU16(o + 2, type); setU32(o + 4, count); setU32(o + 8, value);
  };
  // IFD0 @8
  setU16(8, 5);
  entry(8, 0, 0x010f, 2, 6, 170); // Make -> "Canon\0"
  entry(8, 1, 0x0110, 2, 7, 176); // Model -> "EOS 5D\0"
  entry(8, 2, 0x0132, 2, 20, 183); // DateTime
  entry(8, 3, 0x8769, 4, 1, 74); // Exif IFD offset
  entry(8, 4, 0x8825, 4, 1, 116); // GPS IFD offset
  setU32(8 + 2 + 5 * 12, 0);
  // Exif IFD @74
  setU16(74, 3);
  entry(74, 0, 0x9003, 2, 20, 203); // DateTimeOriginal
  entry(74, 1, 0x8827, 3, 1, 400); // ISO 400 (inline SHORT)
  entry(74, 2, 0x920a, 5, 1, 223); // FocalLength -> 50/1
  setU32(74 + 2 + 3 * 12, 0);
  // GPS IFD @116
  setU16(116, 4);
  entry(116, 0, 0x0001, 2, 2, 0x4e); // LatRef "N" inline ('N' = 0x4E)
  entry(116, 1, 0x0002, 5, 3, 231); // Lat rationals
  entry(116, 2, 0x0003, 2, 2, 0x45); // LonRef "E" inline
  entry(116, 3, 0x0004, 5, 3, 255); // Lon rationals
  setU32(116 + 2 + 4 * 12, 0);
  // Data area @170
  tiff.set(ascii('Canon\0'), 170);
  tiff.set(ascii('EOS 5D\0'), 176);
  tiff.set(ascii('2026:11:15 10:30:00\0'), 183);
  tiff.set(ascii('2026:11:15 10:30:00\0'), 203);
  setU32(223, 50); setU32(227, 1); // focal 50/1
  const rational = (o: number, n: number, d: number) => { setU32(o, n); setU32(o + 4, d); };
  rational(231, 23, 1); rational(239, 48, 1); rational(247, 3708, 100); // 23°48'37.08" N
  rational(255, 90, 1); rational(263, 24, 1); rational(271, 45, 1); // 90°24'45" E
  const jpeg = new Uint8Array(2 + 2 + 2 + 6 + tiff.length + 2);
  let o = 0;
  jpeg[o++] = 0xff; jpeg[o++] = 0xd8; // SOI
  jpeg[o++] = 0xff; jpeg[o++] = 0xe1; // APP1
  const app1Len = 6 + tiff.length + 2;
  jpeg[o++] = (app1Len >> 8) & 0xff; jpeg[o++] = app1Len & 0xff;
  jpeg.set(ascii('Exif\0\0'), o); o += 6;
  jpeg.set(tiff, o); o += tiff.length;
  jpeg[o++] = 0xff; jpeg[o++] = 0xd9; // EOI
  return jpeg;
}

describe('exif-viewer', () => {
  it('reads make, model, ISO, focal length, date and GPS from real EXIF bytes', () => {
    const result = parseExif(buildExifJpeg());
    expect(result.found).toBe(true);
    expect(result.format).toBe('jpeg');
    const byLabel = new Map(result.tags.map((t) => [t.label, t.value]));
    expect(byLabel.get('Camera make')).toBe('Canon');
    expect(byLabel.get('Camera model')).toBe('EOS 5D');
    expect(byLabel.get('ISO speed')).toBe('ISO 400');
    expect(byLabel.get('Focal length')).toBe('50 mm');
    expect(byLabel.get('Date/time original')).toBe('2026:11:15 10:30:00');
    expect(byLabel.get('GPS latitude')).toContain('23.810300');
    expect(byLabel.get('GPS longitude')).toContain('90.412500');
  });

  it('reports honestly when a JPEG has no EXIF segment', () => {
    const plain = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const result = parseExif(plain);
    expect(result.found).toBe(false);
    expect(result.tags).toHaveLength(0);
    expect(result.note).toMatch(/no EXIF/);
  });

  it('reports honestly for non-JPEG/PNG bytes and for a PNG without eXIf', () => {
    expect(parseExif(new Uint8Array([1, 2, 3, 4])).found).toBe(false);
    expect(parseExif(new Uint8Array([1, 2, 3, 4])).note).toMatch(/Only JPEG/);
    const pngNoExif = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0, 0, 0, 0,
    ]);
    expect(parseExif(pngNoExif).found).toBe(false);
  });

  it('renders and parses an uploaded JPEG with real EXIF', async () => {
    renderTool(<ExifViewer onBack={() => undefined} />);
    const input = screen.getByTestId('exif-file-input') as HTMLInputElement;
    const jpegBytes = buildExifJpeg();
    const file = new File([jpegBytes as unknown as BlobPart], 'photo.jpg', { type: 'image/jpeg' });
    // jsdom's File has no arrayBuffer(); real browsers do. Shim it for this test.
    (file as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer = async () =>
      jpegBytes.buffer as ArrayBuffer;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByTestId('exif-result')).toBeInTheDocument());
    expect(screen.getByTestId('exif-result').textContent).toContain('Canon');
    expect(screen.getByTestId('exif-result').textContent).toContain('ISO 400');
    expect(screen.getByTestId('exif-result').textContent).toContain('23.810300');
  });
});

// --- excel-to-csv --------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Build a minimal but genuine .xlsx ZIP (one stored entry, rest deflated). */
function buildXlsx(): Uint8Array {
  const enc = new TextEncoder();
  const parts: { name: string; data: Uint8Array; method: number }[] = [
    {
      name: '[Content_Types].xml',
      method: 0, // stored — exercises the stored-entry path
      data: enc.encode('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>'),
    },
    {
      name: '_rels/.rels',
      method: 8,
      data: enc.encode('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    },
    {
      name: 'xl/workbook.xml',
      method: 8,
      data: enc.encode('<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/><sheet name="Notes" sheetId="2" r:id="rId2"/></sheets></workbook>'),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      method: 8,
      data: enc.encode('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>'),
    },
    {
      name: 'xl/sharedStrings.xml',
      method: 8,
      data: enc.encode('<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3" uniqueCount="3"><si><t>Name</t></si><si><t>Hello, World</t></si><si><t>A &amp; B</t></si></sst>'),
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      method: 8,
      data: enc.encode('<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1"><v>42</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2"><v>3.5</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>inline</t></is></c><c r="B3" t="b"><v>1</v></c><c r="C3"><f>SUM(C1:C2)</f><v>45.5</v></c></row></sheetData></worksheet>'),
    },
    {
      name: 'xl/worksheets/sheet2.xml',
      method: 8,
      data: enc.encode('<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1"><v>Second</v></c><c r="B1"><v>7</v></c></row></sheetData></worksheet>'),
    },
  ];
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const push = (arr: Uint8Array[]) => { for (const a of arr) chunks.push(a); };
  for (const part of parts) {
    const nameBytes = enc.encode(part.name);
    const compressed = part.method === 8 ? deflateRawSync(part.data) : part.data;
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, part.method, true);
    lv.setUint32(14, crc32(part.data), true);
    lv.setUint32(18, compressed.length, true);
    lv.setUint32(22, part.data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    push([local, compressed]);
    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, part.method, true);
    cv.setUint32(16, crc32(part.data), true);
    cv.setUint32(20, compressed.length, true);
    cv.setUint32(24, part.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);
    central.push(cd);
    offset += local.length + compressed.length;
  }
  const cdStart = offset;
  let cdSize = 0;
  for (const c of central) cdSize += c.length;
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, parts.length, true);
  ev.setUint16(10, parts.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdStart, true);
  const total = offset + cdSize + 22;
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of [...chunks, ...central, eocd]) { out.set(c, at); at += c.length; }
  return out;
}

describe('excel-to-csv', () => {
  it('parses shared strings with entity decoding', () => {
    const xml = '<sst><si><t>A &amp; B</t></si><si><t xml:space="preserve">x</t><t>y</t></si></sst>';
    expect(parseSharedStrings(xml)).toEqual(['A & B', 'xy']);
  });

  it('maps column letters to indexes', () => {
    expect(columnLettersToIndex('A')).toBe(0);
    expect(columnLettersToIndex('Z')).toBe(25);
    expect(columnLettersToIndex('AA')).toBe(26);
    expect(columnLettersToIndex('AB')).toBe(27);
  });

  it('parses a sheet grid keeping empty-cell alignment', () => {
    const xml = '<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1"><v>3.5</v></c></row></sheetData>';
    expect(parseSheetXml(xml, ['Name'])).toEqual([['Name', '', '3.5']]);
  });

  it('escapes CSV cells per RFC 4180', () => {
    expect(rowsToCsv([['a', 'Hello, World', 'say "hi"']])).toBe('a,"Hello, World","say ""hi"""\r\n');
    expect(buildCsvFileName('My Report.xlsx', 'Data & Notes')).toBe('My_Report_Data___Notes.csv');
  });

  it('reads a real .xlsx ZIP: ZIP directory, stored + deflated entries, both sheets', async () => {
    const bytes = buildXlsx();
    const entries = parseZipEntries(bytes);
    expect(entries.map((e) => e.name)).toContain('xl/sharedStrings.xml');
    expect(entries.find((e) => e.name === '[Content_Types].xml')?.method).toBe(0);
    expect(entries.find((e) => e.name === 'xl/sharedStrings.xml')?.method).toBe(8);
    const stored = await readZipEntry(bytes, entries.find((e) => e.name === '[Content_Types].xml')!);
    expect(new TextDecoder().decode(stored)).toContain('content-types');

    const result = await xlsxToCsv(bytes);
    expect(result.sheets.map((s) => s.name)).toEqual(['Data', 'Notes']);
    expect(result.sheets[0].rows).toEqual([
      ['Name', 'Hello, World', '42'],
      ['A & B', '', '3.5'],
      ['inline', 'TRUE', '45.5'],
    ]);
    expect(result.sheets[1].rows).toEqual([['Second', '7']]);
    expect(rowsToCsv(result.sheets[0].rows)).toBe(
      'Name,"Hello, World",42\r\nA & B,,3.5\r\ninline,TRUE,45.5\r\n'
    );
  });

  it('rejects non-ZIP bytes honestly', async () => {
    await expect(xlsxToCsv(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow(/does not start with a ZIP signature/);
    expect(() => parseZipEntries(new Uint8Array([1, 2, 3]))).toThrow(/too small/);
  });

  it('renders and parses an uploaded .xlsx in the component', async () => {
    renderTool(<ExcelToCsv onBack={() => undefined} />);
    const input = screen.getByTestId('excel-file-input') as HTMLInputElement;
    const xlsxBytes = buildXlsx();
    const file = new File([xlsxBytes as unknown as BlobPart], 'report.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    // jsdom's File has no arrayBuffer(); real browsers do. Shim it for this test.
    (file as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer = async () =>
      xlsxBytes.buffer as ArrayBuffer;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByTestId('excel-result')).toBeInTheDocument());
    expect(screen.getByTestId('excel-result').textContent).toContain('Hello, World');
    expect(screen.getByTestId('excel-result').textContent).toContain('3 rows');
  });
});

// --- silence-remover ------------------------------------------------------------

function toneSilenceTone(sampleRate = 8000): Float32Array {
  const out = new Float32Array(sampleRate * 3);
  for (let i = 0; i < sampleRate; i++) out[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  for (let i = 2 * sampleRate; i < 3 * sampleRate; i++) {
    out[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  }
  return out;
}

describe('silence-remover', () => {
  it('detects the middle silent second and ignores short pauses', () => {
    const samples = toneSilenceTone();
    const regions = detectSilentRegions(samples, 8000, {
      thresholdDb: -40, windowMs: 10, minSilenceMs: 300, paddingMs: 100,
    });
    expect(regions).toHaveLength(1);
    expect(regions[0].startSeconds).toBeCloseTo(1.0, 2);
    expect(regions[0].endSeconds).toBeCloseTo(2.0, 2);
    // A 100 ms blip of quiet inside a continuous tone must not become a region.
    const continuous = new Float32Array(8000 * 3);
    for (let i = 0; i < continuous.length; i++) {
      continuous[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 8000);
    }
    continuous.fill(0, 4000, 4800);
    expect(detectSilentRegions(continuous, 8000, {
      thresholdDb: -40, windowMs: 10, minSilenceMs: 300, paddingMs: 100,
    })).toHaveLength(0);
  });

  it('finds nothing in a continuous tone', () => {
    const tone = new Float32Array(8000);
    for (let i = 0; i < tone.length; i++) tone[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 8000);
    expect(detectSilentRegions(tone, 8000)).toHaveLength(0);
  });

  it('cuts the silence keeping padding: 3.00 s in, 2.20 s out', () => {
    const samples = toneSilenceTone();
    const regions = detectSilentRegions(samples, 8000, {
      thresholdDb: -40, windowMs: 10, minSilenceMs: 300, paddingMs: 100,
    });
    const [out] = removeSilentRegions([samples], 8000, regions, 100);
    expect(out.length / 8000).toBeCloseTo(2.2, 2);
    // The kept audio is the original tone, not resynthesized.
    expect(out[0]).toBeCloseTo(samples[0], 6);
    expect(formatDuration(2.2)).toBe('2.20 s');
  });

  it('renders the workspace with its settings', () => {
    renderTool(<SilenceRemover onBack={() => undefined} />);
    expect(screen.getByText('Silence Remover')).toBeInTheDocument();
    expect(screen.getByTestId('silence-detect')).toBeInTheDocument();
  });
});

// --- vocal-remover ---------------------------------------------------------------

function stereoMix(sampleRate = 8000): { left: Float32Array; right: Float32Array } {
  const left = new Float32Array(sampleRate);
  const right = new Float32Array(sampleRate);
  for (let i = 0; i < sampleRate; i++) {
    const vocal = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sampleRate); // centered "vocal"
    const guitarL = 0.3 * Math.sin((2 * Math.PI * 880 * i) / sampleRate); // left only
    const guitarR = 0.3 * Math.sin((2 * Math.PI * 1320 * i) / sampleRate); // right only
    left[i] = vocal + guitarL;
    right[i] = vocal + guitarR;
  }
  return { left, right };
}

describe('vocal-remover', () => {
  it('cancels the centered vocal and keeps the panned instruments', () => {
    const { left, right } = stereoMix();
    const side = extractSideChannels(left, right);
    // (L−R)/2 is exactly (880 Hz − 1320 Hz)/2: RMS 0.15, no 440 Hz left.
    expect(rms(side.left)).toBeCloseTo(0.15, 2);
    expect(side.left[100]).toBeCloseTo((left[100] - right[100]) / 2, 6);
    expect(side.right[100]).toBeCloseTo(-side.left[100], 6);
    // Correlation of the side signal with a pure 440 Hz sine is ~zero.
    let dot = 0;
    for (let i = 0; i < left.length; i++) {
      dot += side.left[i] * Math.sin((2 * Math.PI * 440 * i) / 8000);
    }
    expect(Math.abs(dot) / left.length).toBeLessThan(0.001);
  });

  it('recovers the center (what is removed) and measures its share', () => {
    const { left, right } = stereoMix();
    const center = extractCenterMono(left, right);
    expect(rms(center)).toBeGreaterThan(rms(extractSideChannels(left, right).left));
    const stats = measureCenterShare(left, right);
    // Center energy = vocal 0.125 + averaged guitars 0.0225 = 0.1475; total 0.17.
    expect(stats.centerEnergyShare).toBeCloseTo(0.1475 / 0.17, 2);
    expect(stats.keptEnergyRatio).toBeLessThan(1);
  });

  it('renders with the honest "not true separation" label', () => {
    renderTool(<VocalRemover onBack={() => undefined} />);
    expect(screen.getByText('Vocal Reducer')).toBeInTheDocument();
    expect(screen.getByText(/true vocal removal needs AI source separation/i)).toBeInTheDocument();
    expect(screen.getByTestId('vocal-reduce')).toBeInTheDocument();
  });
});
