// Wave 1 PDF tools: unit tests of the shared logic in src/lib/pdfTools.ts plus
// component tests for all six new tools.
//
// pdfjs-dist: the standard build does not run in Node/jsdom (it needs a real
// browser worker), so component tests mock 'pdfjs-dist' while the real
// extraction logic is tested against the Node-friendly legacy build.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLegacy from 'pdfjs-dist/legacy/build/pdf.mjs';

import PdfToTxt from '../src/components/PdfToTxt';
import TxtToPdf from '../src/components/TxtToPdf';
import PdfSplitter from '../src/components/PdfSplitter';
import PdfMerger from '../src/components/PdfMerger';
import PdfRotator from '../src/components/PdfRotator';
import EpubToPdf from '../src/components/EpubToPdf';
import { ToastProvider } from '../src/components/Toast';
import {
  buildTextPdf,
  epubToPdfBytes,
  extractPdfText,
  getPdfPageCount,
  mergePdfBytes,
  parseEpub,
  parsePageRanges,
  rotatePdfBytes,
  splitByRangeGroups,
  splitEveryN,
  splitPdfBytes,
  unzipEntries,
  validateEpubFile,
  validatePdfFile,
  type PdfJsLibLike
} from '../src/lib/pdfTools';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

// jsdom's Blob lacks arrayBuffer()/text()/stream(); polyfill them via FileReader
// so the components exercise their real browser code paths in tests.
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}
if (!Blob.prototype.text) {
  Blob.prototype.text = async function (): Promise<string> {
    return new TextDecoder().decode(await this.arrayBuffer());
  };
}

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: (n: number) =>
        Promise.resolve({
          getTextContent: () => Promise.resolve({
            items: [
              { str: `Page ${n} text`, transform: [1, 0, 0, 1, 0, 700] },
              { str: 'second line', transform: [1, 0, 0, 1, 0, 680] }
            ]
          })
        })
    })
  }))
}));

const renderTool = (component: ReactNode) => render(<ToastProvider>{component}</ToastProvider>);
const onBack = () => undefined;

/** Build a real PDF with `pages` text lines (one per page) via pdf-lib. */
async function makePdf(lines: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const line of lines) {
    const page = doc.addPage([612, 792]);
    page.drawText(line, { x: 50, y: 700, size: 24, font, color: rgb(0, 0, 0) });
  }
  return doc.save();
}

async function makePdfFile(lines: string[], name = 'test.pdf'): Promise<File> {
  const bytes = await makePdf(lines);
  return new File([bytes as BlobPart], name, { type: 'application/pdf' });
}

function uploadFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

// --- Minimal ZIP writer (stored + deflate-raw) for EPUB fixtures -------------

const CRC_TABLE = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    }
  });
  const stream = source.pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

interface ZipEntryInput {
  name: string;
  data: Uint8Array;
  method: 0 | 8;
}

async function buildZip(entries: ZipEntryInput[]): Promise<Uint8Array> {
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;
  const enc = new TextEncoder();
  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const raw = entry.method === 8 ? await deflateRaw(entry.data) : entry.data;
    const crc = crc32(entry.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0, true);
    local.setUint16(8, entry.method, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, raw.length, true);
    local.setUint32(22, entry.data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    const localHeader = new Uint8Array(local.buffer);
    localChunks.push(localHeader, nameBytes, raw);
    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(10, entry.method, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, raw.length, true);
    central.setUint32(24, entry.data.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint32(42, offset, true);
    centralChunks.push(new Uint8Array(central.buffer), nameBytes);
    offset += localHeader.length + nameBytes.length + raw.length;
  }
  const cdOffset = offset;
  const cdSize = centralChunks.reduce((sum, c) => sum + c.length, 0);
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(8, entries.length, true);
  eocd.setUint16(10, entries.length, true);
  eocd.setUint32(12, cdSize, true);
  eocd.setUint32(16, cdOffset, true);
  const parts = [...localChunks, ...centralChunks, new Uint8Array(eocd.buffer)];
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

function xhtml(title: string, paragraphs: string[]): string {
  return `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title></head><body><h1>${title}</h1>${paragraphs.map((p) => `<p>${p}</p>`).join('')}</body></html>`;
}

async function makeEpubFile(): Promise<File> {
  const enc = new TextEncoder();
  const container = enc.encode(
    '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
  );
  const opf = enc.encode(
    '<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">' +
    '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Test Book</dc:title><dc:identifier id="id">test-book</dc:identifier></metadata>' +
    '<manifest><item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/><item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/></manifest>' +
    '<spine><itemref idref="ch1"/><itemref idref="ch2"/></spine></package>'
  );
  const bytes = await buildZip([
    { name: 'mimetype', data: enc.encode('application/epub+zip'), method: 0 },
    { name: 'META-INF/container.xml', data: container, method: 0 },
    { name: 'OEBPS/content.opf', data: opf, method: 0 },
    { name: 'OEBPS/ch1.xhtml', data: enc.encode(xhtml('Chapter One', ['Hello epub world.', 'Second paragraph here.'])), method: 0 },
    { name: 'OEBPS/ch2.xhtml', data: enc.encode(xhtml('Chapter Two', ['The deflated chapter text.'])), method: 8 }
  ]);
  return new File([bytes as BlobPart], 'test-book.epub', { type: 'application/epub+zip' });
}

// ---------------------------------------------------------------------------
// Unit tests: page-range parsing
// ---------------------------------------------------------------------------

describe('parsePageRanges', () => {
  it('parses single pages, ranges and mixes, sorted and de-duplicated', () => {
    expect(parsePageRanges('1-3,5', 10)).toEqual({ ok: true, pages: [1, 2, 3, 5] });
    expect(parsePageRanges('5, 2 , 2-3', 10)).toEqual({ ok: true, pages: [2, 3, 5] });
    expect(parsePageRanges('10', 10)).toEqual({ ok: true, pages: [10] });
  });

  it('rejects empty input', () => {
    const result = parsePageRanges('  ', 10);
    expect(result.ok).toBe(false);
  });

  it('rejects reversed ranges and pages outside the document', () => {
    expect(parsePageRanges('5-2', 10).ok).toBe(false);
    expect(parsePageRanges('0', 10).ok).toBe(false);
    expect(parsePageRanges('11', 10).ok).toBe(false);
    expect(parsePageRanges('9-12', 10).ok).toBe(false);
  });

  it('rejects malformed tokens', () => {
    expect(parsePageRanges('abc', 10).ok).toBe(false);
    expect(parsePageRanges('1--3', 10).ok).toBe(false);
    expect(parsePageRanges('1.5', 10).ok).toBe(false);
  });
});

describe('split helpers', () => {
  it('splitEveryN chunks all pages into equal groups', () => {
    expect(splitEveryN(5, 2)).toEqual([
      { label: 'pages-1-2', pages: [1, 2] },
      { label: 'pages-3-4', pages: [3, 4] },
      { label: 'pages-5-5', pages: [5] }
    ]);
    expect(splitEveryN(4, 4)).toEqual([{ label: 'pages-1-4', pages: [1, 2, 3, 4] }]);
  });

  it('splitByRangeGroups makes one part per comma group', () => {
    const result = splitByRangeGroups('1-3,5', 10);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parts).toEqual([
        { label: 'pages-1-3', pages: [1, 2, 3] },
        { label: 'page-5', pages: [5] }
      ]);
    }
  });

  it('splitByRangeGroups rejects a bad group', () => {
    expect(splitByRangeGroups('1-3,99', 10).ok).toBe(false);
  });
});

describe('file validation', () => {
  it('validatePdfFile accepts PDFs and rejects others', () => {
    expect(validatePdfFile({ name: 'a.pdf', size: 100, type: 'application/pdf' }).ok).toBe(true);
    expect(validatePdfFile({ name: 'a.pdf', size: 100, type: '' }).ok).toBe(true);
    expect(validatePdfFile({ name: 'a.txt', size: 100, type: 'text/plain' }).ok).toBe(false);
    expect(validatePdfFile({ name: 'a.pdf', size: 0, type: 'application/pdf' }).ok).toBe(false);
  });

  it('validateEpubFile accepts EPUBs and rejects others', () => {
    expect(validateEpubFile({ name: 'b.epub', size: 100, type: 'application/epub+zip' }).ok).toBe(true);
    expect(validateEpubFile({ name: 'b.pdf', size: 100, type: 'application/pdf' }).ok).toBe(false);
    expect(validateEpubFile({ name: 'b.epub', size: 0, type: 'application/epub+zip' }).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Unit tests: real pdfjs extraction, pdf-lib ops, jspdf rendering
// ---------------------------------------------------------------------------

describe('extractPdfText (real pdfjs-dist legacy build)', () => {
  it('extracts text from every page of a pdf-lib-generated PDF', async () => {
    const bytes = await makePdf(['Hello PDF world', 'Second page text']);
    const pages = await extractPdfText(bytes, pdfjsLegacy as unknown as PdfJsLibLike);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain('Hello PDF world');
    expect(pages[1]).toContain('Second page text');
  });

  it('returns an empty string for a page with no text', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    const bytes = await doc.save();
    const pages = await extractPdfText(bytes, pdfjsLegacy as unknown as PdfJsLibLike);
    expect(pages).toEqual(['']);
  });
});

describe('buildTextPdf (jspdf)', () => {
  it('produces a valid PDF containing the text', async () => {
    const bytes = buildTextPdf([{ text: 'Hello text PDF' }], { title: 'My Doc' });
    expect(bytes.slice(0, 5)).toEqual(new Uint8Array([37, 80, 68, 70, 45])); // %PDF-
    expect(new TextDecoder('latin1').decode(bytes)).toContain('Hello text PDF');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it('paginates long text across multiple pages and keeps chapter headings', async () => {
    const longText = Array.from({ length: 200 }, (_, i) => `Sentence number ${i + 1} with some filler words to fill the line.`).join(' ');
    const bytes = buildTextPdf([{ heading: 'Big Chapter', text: longText }]);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(new TextDecoder('latin1').decode(bytes)).toContain('Big Chapter');
  });
});

describe('pdf-lib split / merge / rotate', () => {
  it('splitPdfBytes returns one PDF per part with the right page counts', async () => {
    const bytes = await makePdf(['p1', 'p2', 'p3', 'p4', 'p5']);
    const parts = await splitPdfBytes(bytes, [
      { label: 'pages-1-2', pages: [1, 2] },
      { label: 'page-5', pages: [5] }
    ]);
    expect(parts).toHaveLength(2);
    expect((await PDFDocument.load(parts[0].bytes)).getPageCount()).toBe(2);
    expect((await PDFDocument.load(parts[1].bytes)).getPageCount()).toBe(1);
  });

  it('mergePdfBytes concatenates documents in order', async () => {
    const a = await makePdf(['a1', 'a2']);
    const b = await makePdf(['b1', 'b2', 'b3']);
    const merged = await mergePdfBytes([a, b]);
    const doc = await PDFDocument.load(merged);
    expect(doc.getPageCount()).toBe(5);
    const text = await extractPdfText(merged, pdfjsLegacy as unknown as PdfJsLibLike);
    expect(text[0]).toContain('a1');
    expect(text[4]).toContain('b3');
  });

  it('mergePdfBytes throws on an empty list', async () => {
    await expect(mergePdfBytes([])).rejects.toThrow();
  });

  it('rotatePdfBytes rotates selected pages and accumulates with existing rotation', async () => {
    const bytes = await makePdf(['p1', 'p2', 'p3']);
    const once = await rotatePdfBytes(bytes, new Map([[2, 90]]));
    const doc = await PDFDocument.load(once);
    expect(doc.getPage(0).getRotation().angle).toBe(0);
    expect(doc.getPage(1).getRotation().angle).toBe(90);
    expect(doc.getPage(2).getRotation().angle).toBe(0);
    const twice = await rotatePdfBytes(once, new Map([[2, 90]]));
    expect((await PDFDocument.load(twice)).getPage(1).getRotation().angle).toBe(180);
  });

  it('rotatePdfBytes rejects out-of-range pages', async () => {
    const bytes = await makePdf(['p1']);
    await expect(rotatePdfBytes(bytes, new Map([[2, 90]]))).rejects.toThrow();
  });

  it('getPdfPageCount reports the real page count', async () => {
    const bytes = await makePdf(['a', 'b', 'c', 'd']);
    await expect(getPdfPageCount(bytes)).resolves.toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Unit tests: EPUB unzip + parse + convert
// ---------------------------------------------------------------------------

describe('EPUB handling', () => {
  it('unzipEntries reads stored and deflated entries', async () => {
    const file = await makeEpubFile();
    const entries = await unzipEntries(new Uint8Array(await file.arrayBuffer()));
    expect(entries.get('mimetype')).toBeDefined();
    expect(new TextDecoder().decode(entries.get('mimetype')!)).toBe('application/epub+zip');
    expect(new TextDecoder().decode(entries.get('OEBPS/ch2.xhtml')!)).toContain('The deflated chapter text.');
  });

  it('parseEpub returns the title and spine chapters in order with their text', async () => {
    const file = await makeEpubFile();
    const book = await parseEpub(new Uint8Array(await file.arrayBuffer()));
    expect(book.title).toBe('Test Book');
    expect(book.chapters).toHaveLength(2);
    expect(book.chapters[0].heading).toBe('Chapter One');
    expect(book.chapters[0].text).toContain('Hello epub world.');
    expect(book.chapters[1].text).toContain('The deflated chapter text.');
  });

  it('parseEpub rejects a non-ZIP file with an honest error', async () => {
    await expect(parseEpub(new TextEncoder().encode('not a zip at all'))).rejects.toThrow(/ZIP/);
  });

  it('epubToPdfBytes produces a valid multi-chapter PDF', async () => {
    const file = await makeEpubFile();
    const bytes = await epubToPdfBytes(new Uint8Array(await file.arrayBuffer()));
    expect(bytes.slice(0, 5)).toEqual(new Uint8Array([37, 80, 68, 70, 45]));
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    const text = await extractPdfText(bytes, pdfjsLegacy as unknown as PdfJsLibLike);
    expect(text.join('\n')).toContain('Chapter One');
    expect(text.join('\n')).toContain('Hello epub world.');
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------

describe('PdfToTxt component', () => {
  it('renders the workspace with dropzone and disabled actions', () => {
    renderTool(<PdfToTxt onBack={onBack} />);
    expect(screen.getByText(/PDF to Text/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload a PDF to extract its text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy Text/i })).toBeDisabled();
  });

  it('rejects a non-PDF file with a validation toast', () => {
    renderTool(<PdfToTxt onBack={onBack} />);
    uploadFile(new File(['plain text'], 'notes.txt', { type: 'text/plain' }));
    expect(screen.getByText('Invalid File')).toBeInTheDocument();
  });

  it('extracts text from an uploaded PDF and shows copy/download actions', async () => {
    renderTool(<PdfToTxt onBack={onBack} />);
    uploadFile(await makePdfFile(['Hello PDF world', 'Second page text']));
    await waitFor(() => expect(screen.getByText(/Page 1 text/)).toBeInTheDocument());
    expect(screen.getByText(/Page 2 text/)).toBeInTheDocument();
    expect(screen.getByText((_content, el) => el?.tagName === 'SPAN' && el?.textContent === 'Extracted text (2 pages)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy Text/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Download .txt/i })).not.toBeDisabled();
  });

  it('copies the extracted text to the clipboard', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderTool(<PdfToTxt onBack={onBack} />);
    uploadFile(await makePdfFile(['Hello PDF world']));
    await waitFor(() => expect(screen.getByText(/Page 1 text/)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Copy Text/i }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Page 1 text'));
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
  });
});

describe('TxtToPdf component', () => {
  it('renders the editor with settings and a disabled generate button', () => {
    renderTool(<TxtToPdf onBack={onBack} />);
    expect(screen.getByText(/Text to PDF/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Text to convert to PDF/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate PDF/i })).toBeDisabled();
  });

  it('generates a real PDF from pasted text and offers a download', async () => {
    const user = userEvent.setup();
    renderTool(<TxtToPdf onBack={onBack} />);
    await user.type(screen.getByLabelText(/Text to convert to PDF/i), 'Hello from the text box. '.repeat(10));
    expect(screen.getByRole('button', { name: /Generate PDF/i })).not.toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Generate PDF/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Download PDF Now/i })).toBeInTheDocument());
    expect(screen.getByText(/PDF ready/i)).toBeInTheDocument();
  });

  it('loads text from an uploaded .txt file', async () => {
    renderTool(<TxtToPdf onBack={onBack} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['file content here'], 'notes.txt', { type: 'text/plain' })] } });
    await waitFor(() => expect(screen.getByLabelText(/Text to convert to PDF/i)).toHaveValue('file content here'));
  });
});

describe('PdfSplitter component', () => {
  it('renders the workspace with split-mode controls', () => {
    renderTool(<PdfSplitter onBack={onBack} />);
    expect(screen.getByText(/PDF Splitter/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload a PDF to split/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Split PDF/i })).toBeDisabled();
  });

  it('splits an uploaded PDF by page ranges into downloadable parts', async () => {
    const user = userEvent.setup();
    renderTool(<PdfSplitter onBack={onBack} />);
    uploadFile(await makePdfFile(['p1', 'p2', 'p3', 'p4', 'p5']));
    await waitFor(() => expect(screen.getByText(/this PDF has 5 pages/i)).toBeInTheDocument());
    await user.clear(screen.getByLabelText(/Page Ranges/i));
    await user.type(screen.getByLabelText(/Page Ranges/i), '1-2,4');
    await user.click(screen.getByRole('button', { name: /Split PDF/i }));
    await waitFor(() => expect(screen.getByText(/Split parts \(2\)/i)).toBeInTheDocument());
    expect(screen.getByText(/pages-1-2\.pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/page-4\.pdf/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download All Parts/i })).toBeInTheDocument();
  });

  it('shows a validation error for an out-of-range split spec', async () => {
    const user = userEvent.setup();
    renderTool(<PdfSplitter onBack={onBack} />);
    uploadFile(await makePdfFile(['p1', 'p2']));
    await waitFor(() => expect(screen.getByText(/this PDF has 2 pages/i)).toBeInTheDocument());
    await user.clear(screen.getByLabelText(/Page Ranges/i));
    await user.type(screen.getByLabelText(/Page Ranges/i), '1-9');
    await user.click(screen.getByRole('button', { name: /Split PDF/i }));
    await waitFor(() => expect(screen.getByText('Invalid Page Ranges')).toBeInTheDocument());
  });
});

describe('PdfMerger component', () => {
  it('renders the workspace with an empty queue', () => {
    renderTool(<PdfMerger onBack={onBack} />);
    expect(screen.getByText(/PDF Merger/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Merge PDFs/i })).toBeDisabled();
  });

  it('merges two uploaded PDFs in order and offers a download', async () => {
    const user = userEvent.setup();
    renderTool(<PdfMerger onBack={onBack} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [await makePdfFile(['a1', 'a2'], 'first.pdf'), await makePdfFile(['b1'], 'second.pdf')] } });
    await waitFor(() => expect(screen.getByText('first.pdf')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('second.pdf')).toBeInTheDocument());
    expect(screen.getByText(/2 files, 3 pages/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Merge PDFs/i })).not.toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Merge PDFs/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Download Merged PDF/i })).toBeInTheDocument());
  });

  it('reorders files with the up/down arrows', async () => {
    const user = userEvent.setup();
    renderTool(<PdfMerger onBack={onBack} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [await makePdfFile(['a1'], 'first.pdf'), await makePdfFile(['b1'], 'second.pdf')] } });
    await waitFor(() => expect(screen.getByText('second.pdf')).toBeInTheDocument());
    const rows = screen.getAllByText(/\.pdf$/);
    expect(rows[0]).toHaveTextContent('first.pdf');
    await user.click(screen.getByLabelText(/Move second\.pdf up/i));
    const reordered = screen.getAllByText(/\.pdf$/);
    expect(reordered[0]).toHaveTextContent('second.pdf');
  });
});

describe('PdfRotator component', () => {
  it('renders the workspace with rotation controls', () => {
    renderTool(<PdfRotator onBack={onBack} />);
    expect(screen.getByText(/PDF Rotator/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload a PDF to rotate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rotate & Download/i })).toBeDisabled();
  });

  it('rotates selected pages of an uploaded PDF and offers a download', async () => {
    const user = userEvent.setup();
    renderTool(<PdfRotator onBack={onBack} />);
    uploadFile(await makePdfFile(['p1', 'p2', 'p3']));
    await waitFor(() => expect(screen.getByText(/this PDF has 3 pages/i)).toBeInTheDocument());
    await user.clear(screen.getByLabelText(/Pages/i));
    await user.type(screen.getByLabelText(/Pages/i), '2-3');
    await user.click(screen.getByRole('button', { name: /180°/i }));
    await user.click(screen.getByRole('button', { name: /Add Rotation Rule/i }));
    await waitFor(() => expect(screen.getByText(/Pages 2-3 → 180°/)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Rotate & Download/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Download Rotated PDF/i })).toBeInTheDocument());
  });

  it('shows a validation error for pages outside the document', async () => {
    const user = userEvent.setup();
    renderTool(<PdfRotator onBack={onBack} />);
    uploadFile(await makePdfFile(['p1']));
    await waitFor(() => expect(screen.getByText(/this PDF has 1 page/i)).toBeInTheDocument());
    await user.clear(screen.getByLabelText(/Pages/i));
    await user.type(screen.getByLabelText(/Pages/i), '5');
    await user.click(screen.getByRole('button', { name: /Add Rotation Rule/i }));
    await waitFor(() => expect(screen.getByText('Invalid Pages')).toBeInTheDocument());
  });
});

describe('EpubToPdf component', () => {
  it('renders the workspace with an EPUB dropzone', () => {
    renderTool(<EpubToPdf onBack={onBack} />);
    expect(screen.getByText(/EPUB to PDF/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload an EPUB to convert/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Convert to PDF$/i })).toBeDisabled();
  });

  it('rejects a non-EPUB file with a validation toast', () => {
    renderTool(<EpubToPdf onBack={onBack} />);
    uploadFile(new File(['plain text'], 'notes.txt', { type: 'text/plain' }));
    expect(screen.getByText('Invalid File')).toBeInTheDocument();
  });

  it('reads an EPUB, lists its chapters, and converts it to a PDF', async () => {
    const user = userEvent.setup();
    renderTool(<EpubToPdf onBack={onBack} />);
    uploadFile(await makeEpubFile());
    await waitFor(() => expect(screen.getByText('Chapter One')).toBeInTheDocument());
    expect(screen.getByText('Chapter Two')).toBeInTheDocument();
    expect(screen.getByText(/Chapters \(2\)/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Convert to PDF$/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Download PDF Now/i })).toBeInTheDocument());
  });
});
