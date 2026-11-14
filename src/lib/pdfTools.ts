// Shared, framework-free logic for the PDF toolset (wave 1).
// All heavy lifting lives here so components stay thin and the logic
// is directly unit-testable. Everything runs client-side; no uploads.

import { PDFDocument, degrees } from 'pdf-lib';
import { jsPDF } from 'jspdf';

export const MAX_PDF_BYTES = 50 * 1024 * 1024;
export const MAX_PDF_PAGES = 500;

export type FileValidationResult =
  | { ok: true }
  | { ok: false; code: 'empty' | 'too-large' | 'unsupported'; message: string };

export function validatePdfFile(file: { name: string; size: number; type: string }): FileValidationResult {
  if (file.size === 0) {
    return { ok: false, code: 'empty', message: `"${file.name}" is 0 bytes and cannot be processed.` };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, code: 'too-large', message: `"${file.name}" exceeds the 50MB file size limit.` };
  }
  const isMimeValid = file.type === 'application/pdf';
  const isExtValid = /\.pdf$/i.test(file.name);
  if (!isMimeValid && !isExtValid) {
    return { ok: false, code: 'unsupported', message: `"${file.name}" is not a PDF file.` };
  }
  return { ok: true };
}

export function validateEpubFile(file: { name: string; size: number; type: string }): FileValidationResult {
  if (file.size === 0) {
    return { ok: false, code: 'empty', message: `"${file.name}" is 0 bytes and cannot be processed.` };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, code: 'too-large', message: `"${file.name}" exceeds the 50MB file size limit.` };
  }
  const isMimeValid = file.type === 'application/epub+zip' || file.type === 'application/octet-stream';
  const isExtValid = /\.epub$/i.test(file.name);
  if (!isMimeValid && !isExtValid) {
    return { ok: false, code: 'unsupported', message: `"${file.name}" is not an EPUB file.` };
  }
  return { ok: true };
}

export function stripExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(0, idx) : name;
}

/** Trigger a browser download for in-memory bytes. */
export function downloadBytes(bytes: Uint8Array, filename: string, mime: string): void {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text: string, filename: string): void {
  downloadBytes(new TextEncoder().encode(text), filename, 'text/plain;charset=utf-8');
}

// ---------------------------------------------------------------------------
// Page-range parsing ("1-3,5,8-10")
// ---------------------------------------------------------------------------

export type PageRangeResult =
  | { ok: true; pages: number[] }
  | { ok: false; error: string };

/**
 * Parse a page-range spec like "1-3, 5, 8-10" (1-based) against a document
 * with `pageCount` pages. Returns the de-duplicated, ascending page list.
 */
export function parsePageRanges(spec: string, pageCount: number): PageRangeResult {
  const pages = new Set<number>();
  const parts = spec.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { ok: false, error: 'Enter at least one page or range, e.g. "1-3,5".' };
  }
  for (const part of parts) {
    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (start > end) {
        return { ok: false, error: `Invalid range "${part}": the start page is after the end page.` };
      }
      if (start < 1 || end > pageCount) {
        return { ok: false, error: `Range "${part}" is outside this document (1-${pageCount}).` };
      }
      for (let p = start; p <= end; p++) pages.add(p);
      continue;
    }
    if (/^\d+$/.test(part)) {
      const page = parseInt(part, 10);
      if (page < 1 || page > pageCount) {
        return { ok: false, error: `Page ${page} is outside this document (1-${pageCount}).` };
      }
      pages.add(page);
      continue;
    }
    return { ok: false, error: `"${part}" is not a valid page or range. Use numbers and dashes, e.g. "1-3,5".` };
  }
  return { ok: true, pages: [...pages].sort((a, b) => a - b) };
}

export interface SplitPart {
  label: string;
  pages: number[];
}

/** Chunk 1..pageCount into groups of `everyN` pages. */
export function splitEveryN(pageCount: number, everyN: number): SplitPart[] {
  const parts: SplitPart[] = [];
  for (let start = 1; start <= pageCount; start += everyN) {
    const end = Math.min(pageCount, start + everyN - 1);
    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    parts.push({ label: `pages-${start}-${end}`, pages });
  }
  return parts;
}

/** One part per comma-separated range group, e.g. "1-3,5" -> [{1,2,3},{5}]. */
export function splitByRangeGroups(spec: string, pageCount: number): PageRangeResult & { parts?: SplitPart[] } {
  const groups = spec.split(',').map((p) => p.trim()).filter(Boolean);
  if (groups.length === 0) {
    return { ok: false, error: 'Enter at least one page or range, e.g. "1-3,5".' };
  }
  const parts: SplitPart[] = [];
  const allPages: number[] = [];
  for (const group of groups) {
    const parsed = parsePageRanges(group, pageCount);
    if (!parsed.ok) return parsed;
    const label = parsed.pages.length === 1
      ? `page-${parsed.pages[0]}`
      : `pages-${parsed.pages[0]}-${parsed.pages[parsed.pages.length - 1]}`;
    parts.push({ label, pages: parsed.pages });
    allPages.push(...parsed.pages);
  }
  return { ok: true, pages: allPages, parts };
}

// ---------------------------------------------------------------------------
// pdfjs-dist text extraction (library injected so tests can use the
// Node-friendly legacy build while the browser uses the standard build)
// ---------------------------------------------------------------------------

export interface PdfJsTextItemLike {
  str?: string;
}

export interface PdfJsPageLike {
  getTextContent(): Promise<{ items: PdfJsTextItemLike[] }>;
}

export interface PdfJsDocumentLike {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfJsPageLike>;
}

export interface PdfJsLibLike {
  getDocument(params: { data: Uint8Array }): { promise: Promise<PdfJsDocumentLike> };
}

/** Extract readable text per page, in page order. Pages with no text yield ''. */
export async function extractPdfText(data: Uint8Array, pdfjsLib: PdfJsLibLike): Promise<string[]> {
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const lineParts: string[] = [];
    let currentY: number | null = null;
    for (const item of content.items) {
      const str = item.str ?? '';
      if (!str) continue;
      // TextItem carries a transform [a,b,c,d,e,f]; f is the y position.
      const transform = (item as { transform?: number[] }).transform;
      const y = transform ? transform[5] : null;
      if (currentY !== null && y !== null && Math.abs(y - currentY) > 2) {
        lineParts.push('\n');
      }
      currentY = y ?? currentY;
      lineParts.push(str);
      if (!str.endsWith(' ')) lineParts.push(' ');
    }
    pages.push(lineParts.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim());
  }
  return pages;
}

// ---------------------------------------------------------------------------
// pdf-lib: split / merge / rotate
// ---------------------------------------------------------------------------

export async function getPdfPageCount(data: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(data, { ignoreEncryption: true });
  return doc.getPageCount();
}

/** Split `data` into one PDF per part. Returns [{label, bytes}]. */
export async function splitPdfBytes(
  data: Uint8Array,
  parts: SplitPart[],
): Promise<{ label: string; bytes: Uint8Array }[]> {
  const src = await PDFDocument.load(data, { ignoreEncryption: true });
  const out: { label: string; bytes: Uint8Array }[] = [];
  for (const part of parts) {
    const doc = await PDFDocument.create();
    const pages = await doc.copyPages(src, part.pages.map((p) => p - 1));
    pages.forEach((page) => doc.addPage(page));
    out.push({ label: part.label, bytes: await doc.save() });
  }
  return out;
}

/** Merge several PDFs (in the given order) into one PDF. */
export async function mergePdfBytes(documents: Uint8Array[]): Promise<Uint8Array> {
  if (documents.length === 0) throw new Error('Add at least one PDF to merge.');
  const merged = await PDFDocument.create();
  for (const bytes of documents) {
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return merged.save();
}

export type RotationMap = Map<number, number>; // 1-based page -> degrees (90|180|270)

/**
 * Rotate pages per `rotations`. Degrees are cumulative with any existing
 * rotation on the page. Returns the new PDF bytes.
 */
export async function rotatePdfBytes(data: Uint8Array, rotations: RotationMap): Promise<Uint8Array> {
  const doc = await PDFDocument.load(data, { ignoreEncryption: true });
  const pageCount = doc.getPageCount();
  for (const [pageNumber, angle] of rotations) {
    if (pageNumber < 1 || pageNumber > pageCount) {
      throw new Error(`Page ${pageNumber} is outside this document (1-${pageCount}).`);
    }
    if (angle % 90 !== 0) {
      throw new Error(`Angle ${angle} is not a multiple of 90 degrees.`);
    }
    const page = doc.getPage(pageNumber - 1);
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  }
  return doc.save();
}

// ---------------------------------------------------------------------------
// jspdf: render plain text (or chapters) into a paginated PDF
// ---------------------------------------------------------------------------

export interface TextChapter {
  heading?: string;
  text: string;
}

export interface TextPdfOptions {
  title?: string;
  fontSize?: number;
  pageFormat?: 'a4' | 'letter';
}

/** Render chapters of plain text into a paginated, readable PDF. */
export function buildTextPdf(chapters: TextChapter[], options: TextPdfOptions = {}): Uint8Array {
  const { title, fontSize = 12, pageFormat = 'a4' } = options;
  const doc = new jsPDF({ unit: 'pt', format: pageFormat, compress: false });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 56;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = fontSize * 1.55;
  const headingSize = Math.min(20, fontSize + 6);
  const headingLineHeight = headingSize * 1.4;
  let y = margin;
  let pageNumber = 1;

  const addFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 28, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  };

  const newPage = () => {
    addFooter();
    doc.addPage();
    pageNumber += 1;
    y = margin;
  };

  const nonEmpty = chapters.filter((c) => (c.heading && c.heading.trim()) || c.text.trim());
  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    const titleLines = doc.splitTextToSize(title, maxWidth);
    for (const line of titleLines) {
      if (y + 30 > pageHeight - margin) newPage();
      doc.text(line, margin, y + 22);
      y += 30;
    }
    y += 12;
  }

  nonEmpty.forEach((chapter, chapterIndex) => {
    if (chapterIndex > 0 || title) y += 6;
    if (chapter.heading) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(headingSize);
      const headingLines = doc.splitTextToSize(chapter.heading, maxWidth);
      for (const line of headingLines) {
        if (y + headingLineHeight > pageHeight - margin) newPage();
        doc.text(line, margin, y + headingSize);
        y += headingLineHeight;
      }
      y += 6;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    const paragraphs = chapter.text.split(/\n+/);
    paragraphs.forEach((paragraph, pIndex) => {
      if (!paragraph.trim()) return;
      if (pIndex > 0) y += lineHeight * 0.35;
      const lines = doc.splitTextToSize(paragraph.trim(), maxWidth);
      for (const line of lines) {
        if (y + lineHeight > pageHeight - margin) newPage();
        doc.text(line, margin, y + fontSize);
        y += lineHeight;
      }
    });
  });

  addFooter();
  const out = doc.output('arraybuffer') as ArrayBuffer;
  return new Uint8Array(out);
}

// ---------------------------------------------------------------------------
// EPUB: unzip (central directory) + parse OPF/spine + extract chapter text
// ---------------------------------------------------------------------------

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function decodeAscii(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}

/** Inflate one deflate-raw stream via the platform DecompressionStream. */
export async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser does not support DecompressionStream, which is required to read EPUB files.');
  }
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    }
  });
  const stream = source.pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Read all entries of a ZIP archive using its central directory, so files
 * written with data descriptors (bit 3) are handled correctly.
 */
export async function unzipEntries(data: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  // Find the End Of Central Directory record by scanning backwards.
  let eocd = -1;
  const minScan = Math.max(0, data.length - 65557);
  for (let i = data.length - 22; i >= minScan; i--) {
    if (readU32(view, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error('Not a valid ZIP/EPUB archive: no end-of-central-directory record found.');

  const totalEntries = readU16(view, eocd + 10);
  const cdOffset = readU32(view, eocd + 16);
  if (totalEntries === 0xffff || cdOffset === 0xffffffff) {
    throw new Error('ZIP64 archives are not supported.');
  }

  const entries: ZipEntry[] = [];
  let cursor = cdOffset;
  for (let n = 0; n < totalEntries; n++) {
    if (readU32(view, cursor) !== 0x02014b50) {
      throw new Error('Corrupt ZIP archive: bad central directory entry.');
    }
    const method = readU16(view, cursor + 10);
    const compressedSize = readU32(view, cursor + 20);
    const nameLen = readU16(view, cursor + 28);
    const extraLen = readU16(view, cursor + 30);
    const commentLen = readU16(view, cursor + 32);
    const localHeaderOffset = readU32(view, cursor + 42);
    const name = decodeAscii(data.slice(cursor + 46, cursor + 46 + nameLen));
    entries.push({ name, method, compressedSize, localHeaderOffset });
    cursor += 46 + nameLen + extraLen + commentLen;
  }

  const out = new Map<string, Uint8Array>();
  for (const entry of entries) {
    if (entry.name.endsWith('/')) continue;
    const lh = entry.localHeaderOffset;
    if (readU32(view, lh) !== 0x04034b50) {
      throw new Error(`Corrupt ZIP archive: bad local header for "${entry.name}".`);
    }
    const nameLen = readU16(view, lh + 26);
    const extraLen = readU16(view, lh + 28);
    const dataStart = lh + 30 + nameLen + extraLen;
    const raw = data.slice(dataStart, dataStart + entry.compressedSize);
    if (entry.method === 0) {
      out.set(entry.name, raw);
    } else if (entry.method === 8) {
      out.set(entry.name, await inflateRaw(raw));
    } else {
      throw new Error(`Unsupported compression method ${entry.method} for "${entry.name}".`);
    }
  }
  return out;
}

export interface EpubChapter {
  heading: string;
  text: string;
}

export interface EpubBook {
  title: string;
  chapters: EpubChapter[];
}

function resolveZipPath(baseDir: string, href: string): string {
  const clean = href.split('#')[0].split('?')[0];
  const decoded = decodeURIComponent(clean);
  const combined = baseDir ? `${baseDir}/${decoded}` : decoded;
  const parts: string[] = [];
  for (const segment of combined.split('/')) {
    if (segment === '.' || segment === '') continue;
    if (segment === '..') parts.pop();
    else parts.push(segment);
  }
  return parts.join('/');
}

function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Could not parse an XML file inside the EPUB.');
  }
  return doc;
}

function xhtmlToText(html: string): { heading: string; text: string } {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, 'application/xhtml+xml');
    if (doc.getElementsByTagName('parsererror').length > 0) throw new Error('xhtml parse error');
  } catch {
    doc = new DOMParser().parseFromString(html, 'text/html');
  }
  doc.querySelectorAll('script, style').forEach((el) => el.remove());
  const body = doc.body ?? doc.documentElement;
  const blocks: string[] = [];
  const headings: string[] = [];
  const walk = (node: Node): void => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = (child.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text) blocks.push(text);
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text) headings.push(text);
        blocks.push(`\n${text}\n`);
        return;
      }
      if (tag === 'br') {
        blocks.push('\n');
        return;
      }
      if (['p', 'li', 'blockquote', 'div', 'section', 'article', 'tr', 'pre'].includes(tag)) {
        const start = blocks.length;
        walk(child);
        if (blocks.length > start) blocks.push('\n');
        return;
      }
      walk(child);
    });
  };
  walk(body);
  const text = blocks.join(' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { heading: headings[0] ?? '', text };
}

/**
 * Parse an EPUB file (a ZIP of XHTML + OPF metadata) into its title and
 * ordered spine chapters with plain text. Throws an honest error when the
 * file is not a readable EPUB.
 */
export async function parseEpub(data: Uint8Array): Promise<EpubBook> {
  const entries = await unzipEntries(data);
  const containerXml = entries.get('META-INF/container.xml');
  if (!containerXml) {
    throw new Error('Not a valid EPUB: META-INF/container.xml is missing.');
  }
  const container = parseXml(decodeAscii(containerXml));
  const rootfile = container.getElementsByTagName('rootfile')[0];
  const opfPath = rootfile?.getAttribute('full-path');
  if (!opfPath) throw new Error('Not a valid EPUB: no OPF package file listed in container.xml.');
  const opfBytes = entries.get(opfPath);
  if (!opfBytes) throw new Error(`Not a valid EPUB: package file "${opfPath}" is missing.`);
  const opf = parseXml(decodeAscii(opfBytes));
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';

  const titleEl = opf.getElementsByTagName('dc:title')[0];
  const title = titleEl?.textContent?.trim() || stripExtension(opfPath.split('/').pop() ?? 'epub');

  const manifest = new Map<string, string>();
  for (const item of Array.from(opf.getElementsByTagName('item'))) {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) manifest.set(id, href);
  }
  const spine = opf.getElementsByTagName('spine')[0];
  const itemrefs = spine ? Array.from(spine.getElementsByTagName('itemref')) : [];
  const chapterPaths: string[] = [];
  for (const ref of itemrefs) {
    const idref = ref.getAttribute('idref');
    const href = idref ? manifest.get(idref) : undefined;
    if (href) chapterPaths.push(resolveZipPath(opfDir, href));
  }
  if (chapterPaths.length === 0) {
    // Fall back to every XHTML/HTML file in the manifest, in manifest order.
    for (const href of manifest.values()) {
      if (/\.(x?html?|htm)$/i.test(href)) chapterPaths.push(resolveZipPath(opfDir, href));
    }
  }
  if (chapterPaths.length === 0) {
    throw new Error('Not a valid EPUB: no readable chapters found in the spine.');
  }

  const chapters: EpubChapter[] = [];
  for (const path of chapterPaths) {
    const bytes = entries.get(path);
    if (!bytes) continue;
    const { heading, text } = xhtmlToText(decodeAscii(bytes));
    if (!text) continue;
    chapters.push({ heading: heading || `Chapter ${chapters.length + 1}`, text });
  }
  if (chapters.length === 0) {
    throw new Error('This EPUB has chapters, but none of them contain readable text.');
  }
  return { title, chapters };
}

/** Convert an EPUB file's chapters into a paginated PDF. */
export async function epubToPdfBytes(data: Uint8Array, options: TextPdfOptions = {}): Promise<Uint8Array> {
  const book = await parseEpub(data);
  return buildTextPdf(
    book.chapters.map((c) => ({ heading: c.heading, text: c.text })),
    { ...options, title: options.title ?? book.title },
  );
}
