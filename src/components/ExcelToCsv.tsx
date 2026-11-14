import React, { useRef, useState } from 'react';
import {
  CheckCircle,
  Download,
  FileXls,
  Table,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import { formatFileSize } from '../lib/imageTools';

/**
 * Excel (.xlsx) → CSV converter — a real minimal reader, no new deps.
 *
 * A .xlsx file is a ZIP of XML parts. This tool reads the ZIP central
 * directory itself, inflates entries with the platform DecompressionStream
 * (`deflate-raw`, the compression .xlsx uses), then parses
 * xl/sharedStrings.xml and xl/worksheets/sheet*.xml with a small
 * purpose-built XML reader. No library (SheetJS etc.) is bundled.
 *
 * Honest limits, stated in the UI: only the first sheet's values are
 * converted per download (pick a sheet first); formula cells export their
 * last saved (cached) value, not a recomputed result; numeric cells export
 * as stored — Excel dates are serial numbers, so a date-formatted cell
 * exports as its number (e.g. 45658), not as a calendar date; merged cells,
 * formatting and charts are not carried into CSV (CSV has no formatting).
 * If any of that is unacceptable, the tool says so instead of faking it.
 */

export interface ZipEntry {
  name: string;
  method: number; // 0 = stored, 8 = deflate
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

export interface XlsxSheet {
  name: string;
  rows: string[][];
}

export interface XlsxParseResult {
  sheets: XlsxSheet[];
}

function view16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function view32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

/** Locate the End Of Central Directory record and list all ZIP entries. */
export function parseZipEntries(bytes: Uint8Array): ZipEntry[] {
  if (bytes.length < 22) throw new Error('Not a valid .xlsx file: too small to be a ZIP archive.');
  // EOCD signature 0x06054b50 — scan the last 64 KiB + 22 bytes.
  let eocd = -1;
  const scanStart = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= scanStart; i--) {
    if (view32(bytes, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error('Not a valid .xlsx file: no ZIP directory found (missing End Of Central Directory).');
  const entryCount = view16(bytes, eocd + 10);
  const cdOffset = view32(bytes, eocd + 16);
  const entries: ZipEntry[] = [];
  let offset = cdOffset;
  for (let n = 0; n < entryCount; n++) {
    if (offset + 46 > bytes.length || view32(bytes, offset) !== 0x02014b50) {
      throw new Error('Not a valid .xlsx file: the ZIP directory is corrupt.');
    }
    const method = view16(bytes, offset + 10);
    const compressedSize = view32(bytes, offset + 20);
    const uncompressedSize = view32(bytes, offset + 24);
    const nameLength = view16(bytes, offset + 28);
    const extraLength = view16(bytes, offset + 30);
    const commentLength = view16(bytes, offset + 32);
    const localHeaderOffset = view32(bytes, offset + 42);
    let name = '';
    for (let i = 0; i < nameLength; i++) name += String.fromCharCode(bytes[offset + 46 + i]);
    entries.push({ name, method, compressedSize, uncompressedSize, localHeaderOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** Inflate (or copy) one ZIP entry's data. Throws on unsupported methods. */
export async function readZipEntry(bytes: Uint8Array, entry: ZipEntry): Promise<Uint8Array> {
  const header = entry.localHeaderOffset;
  if (header + 30 > bytes.length || view32(bytes, header) !== 0x04034b50) {
    throw new Error(`Corrupt .xlsx file: bad local header for "${entry.name}".`);
  }
  const nameLength = view16(bytes, header + 26);
  const extraLength = view16(bytes, header + 28);
  const dataStart = header + 30 + nameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > bytes.length) throw new Error(`Corrupt .xlsx file: truncated data for "${entry.name}".`);
  const compressed = bytes.slice(dataStart, dataEnd);
  if (entry.method === 0) return compressed;
  if (entry.method === 8) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot decompress .xlsx files (no DecompressionStream support).');
    }
    // Start consuming the readable side BEFORE writing: a
    // DecompressionStream's readable queue has a 0 high-water mark, so a
    // writer.write() never resolves until a reader pulls the output. (This
    // hung the parse in Chromium until the read was moved first.)
    const ds = new DecompressionStream('deflate-raw');
    const outPromise = new Response(ds.readable).arrayBuffer();
    const writer = ds.writable.getWriter();
    await writer.write(compressed as unknown as Uint8Array);
    await writer.close();
    const out = new Uint8Array(await outPromise);
    if (out.length !== entry.uncompressedSize) {
      throw new Error(`Corrupt .xlsx file: "${entry.name}" decompressed to ${out.length} bytes, expected ${entry.uncompressedSize}.`);
    }
    return out;
  }
  throw new Error(`Unsupported .xlsx compression method ${entry.method} for "${entry.name}".`);
}

export function decodeXmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Shared-strings table: ordered list of all <si> values (rich text flattened). */
export function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let siMatch: RegExpExecArray | null;
  while ((siMatch = siRe.exec(xml)) !== null) {
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let text = '';
    let tMatch: RegExpExecArray | null;
    while ((tMatch = tRe.exec(siMatch[1])) !== null) text += tMatch[1];
    out.push(decodeXmlEntities(text));
  }
  return out;
}

/** Column letters (A, B, …, AA) → 0-based column index. */
export function columnLettersToIndex(letters: string): number {
  let index = 0;
  for (const ch of letters.toUpperCase()) {
    if (ch < 'A' || ch > 'Z') return -1;
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index - 1;
}

export function splitCellRef(ref: string): { col: number; row: number } | null {
  const match = /^([A-Za-z]+)(\d+)$/.exec(ref);
  if (!match) return null;
  const col = columnLettersToIndex(match[1]);
  const row = parseInt(match[2], 10) - 1;
  if (col < 0 || row < 0) return null;
  return { col, row };
}

/**
 * Parse one worksheet's XML into a rectangular string grid. Empty cells are
 * kept as '' so columns stay aligned. t="s" cells resolve through the
 * shared-strings table; t="inlineStr" reads <is><t>; formulas export their
 * cached <v> value; booleans become TRUE/FALSE.
 */
export function parseSheetXml(xml: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(xml)) !== null) {
    const cells: { col: number; value: string }[] = [];
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowMatch[1])) !== null) {
      const attrs = cellMatch[1] || '';
      const inner = cellMatch[2] || '';
      const refMatch = /r="([A-Za-z]+\d+)"/.exec(attrs);
      const typeMatch = /t="([^"]+)"/.exec(attrs);
      if (!refMatch) continue;
      const ref = splitCellRef(refMatch[1]);
      if (!ref) continue;
      const type = typeMatch ? typeMatch[1] : 'n';
      let value = '';
      if (type === 's') {
        const vMatch = /<v>(-?\d+)<\/v>/.exec(inner);
        if (vMatch) {
          const idx = parseInt(vMatch[1], 10);
          value = sharedStrings[idx] ?? '';
        }
      } else if (type === 'inlineStr') {
        const tMatch = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inner);
        if (tMatch) value = decodeXmlEntities(tMatch[1]);
      } else if (type === 'b') {
        const vMatch = /<v>([01])<\/v>/.exec(inner);
        value = vMatch ? (vMatch[1] === '1' ? 'TRUE' : 'FALSE') : '';
      } else if (type === 'e') {
        const vMatch = /<v>([^<]*)<\/v>/.exec(inner);
        value = vMatch ? decodeXmlEntities(vMatch[1]) : '';
      } else {
        const vMatch = /<v>([^<]*)<\/v>/.exec(inner);
        if (vMatch) value = decodeXmlEntities(vMatch[1]);
      }
      cells.push({ col: ref.col, value });
    }
    if (cells.length === 0) continue;
    const width = Math.max(...cells.map((c) => c.col)) + 1;
    const gridRow = new Array<string>(width).fill('');
    for (const c of cells) gridRow[c.col] = c.value;
    rows.push(gridRow);
  }
  // Normalize all rows to the same width.
  const width = rows.reduce((max, r) => Math.max(max, r.length), 0);
  return rows.map((r) => {
    const out = [...r];
    while (out.length < width) out.push('');
    return out;
  });
}

export function csvEscapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** RFC 4180 CSV: quote cells containing a comma, quote or line break. */
export function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvEscapeCell).join(',')).join('\r\n') + (rows.length > 0 ? '\r\n' : '');
}

function attrValue(tag: string, name: string): string | null {
  const match = new RegExp(`${name}="([^"]*)"`).exec(tag);
  return match ? match[1] : null;
}

/** Map workbook sheet names to worksheet part paths via workbook.xml + rels. */
export function parseWorkbookSheets(
  workbookXml: string,
  relsXml: string | null
): { name: string; path: string }[] {
  const relMap = new Map<string, string>();
  if (relsXml) {
    const relRe = /<Relationship\b[^>]*>/g;
    let m: RegExpExecArray | null;
    while ((m = relRe.exec(relsXml)) !== null) {
      const id = attrValue(m[0], 'Id');
      const target = attrValue(m[0], 'Target');
      if (id && target) relMap.set(id, target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\//, '')}`);
    }
  }
  const sheets: { name: string; path: string }[] = [];
  const sheetRe = /<sheet\b[^>]*>/g;
  let m: RegExpExecArray | null;
  let fallbackIndex = 1;
  while ((m = sheetRe.exec(workbookXml)) !== null) {
    const name = attrValue(m[0], 'name');
    if (!name) continue;
    const rid = attrValue(m[0], 'r:id');
    let path: string | null = null;
    if (rid && relMap.has(rid)) {
      path = relMap.get(rid)!;
      if (!path.startsWith('xl/')) path = `xl/${path}`;
    }
    if (!path) {
      path = `xl/worksheets/sheet${fallbackIndex}.xml`;
      fallbackIndex += 1;
    }
    sheets.push({ name, path });
  }
  return sheets;
}

/** Full .xlsx → sheets parse. Throws with a precise reason on bad input. */
export async function xlsxToCsv(bytes: Uint8Array): Promise<XlsxParseResult> {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error('Not a valid .xlsx file: it does not start with a ZIP signature (PK).');
  }
  const entries = parseZipEntries(bytes);
  const byName = new Map(entries.map((e) => [e.name, e]));
  const textDecoder = new TextDecoder('utf-8');
  const readText = async (name: string): Promise<string | null> => {
    const entry = byName.get(name);
    if (!entry) return null;
    return textDecoder.decode(await readZipEntry(bytes, entry));
  };
  const sharedStringsXml = await readText('xl/sharedStrings.xml');
  const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];
  const workbookXml = await readText('xl/workbook.xml');
  const relsXml = await readText('xl/_rels/workbook.xml.rels');
  let sheetDefs = workbookXml ? parseWorkbookSheets(workbookXml, relsXml) : [];
  if (sheetDefs.length === 0) {
    // Fallback: any worksheet part, in numeric order.
    sheetDefs = entries
      .filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((e, i) => ({ name: `Sheet${i + 1}`, path: e.name }));
  }
  if (sheetDefs.length === 0) {
    throw new Error('This .xlsx file contains no worksheets.');
  }
  const sheets: XlsxSheet[] = [];
  for (const def of sheetDefs) {
    const xml = await readText(def.path);
    if (xml === null) continue;
    sheets.push({ name: def.name, rows: parseSheetXml(xml, sharedStrings) });
  }
  if (sheets.length === 0) {
    throw new Error('This .xlsx file contains no readable worksheets.');
  }
  return { sheets };
}

export function buildCsvFileName(originalName: string, sheetName: string): string {
  const base = (originalName.replace(/\.[^.]+$/, '') || 'spreadsheet').replace(/[^a-zA-Z0-9_-]/g, '_');
  const sheet = sheetName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'sheet';
  return `${base}_${sheet}.csv`;
}

const PREVIEW_ROWS = 20;

export default function ExcelToCsv({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<XlsxParseResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (selected: File | undefined) => {
    if (!selected) return;
    setError('');
    setResult(null);
    setSelectedSheet(0);
    if (selected.size === 0) {
      setError('The selected file is 0 bytes.');
      return;
    }
    if (!/\.xlsx$/i.test(selected.name)) {
      setError('Only .xlsx files are converted. Older .xls (binary) files need a different reader and are not supported.');
      return;
    }
    setIsParsing(true);
    try {
      const bytes = new Uint8Array(await selected.arrayBuffer());
      const parsed = await xlsxToCsv(bytes);
      setFile(selected);
      setResult(parsed);
      try { confetti({ particleCount: 50, spread: 40 }); } catch (e) {}
      toast.success('Spreadsheet Read', `${parsed.sheets.length} sheet${parsed.sheets.length === 1 ? '' : 's'} parsed — ${parsed.sheets[0].rows.length} rows in "${parsed.sheets[0].name}".`);
    } catch (err) {
      setFile(selected);
      setError(err instanceof Error ? err.message : 'The file could not be parsed as .xlsx.');
    } finally {
      setIsParsing(false);
    }
  };

  const downloadCsv = () => {
    if (!result || !file) return;
    const sheet = result.sheets[selectedSheet];
    if (!sheet) return;
    const csv = rowsToCsv(sheet.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildCsvFileName(file.name, sheet.name);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 1000);
    toast.success('CSV Downloaded', `"${sheet.name}" exported as ${sheet.rows.length} rows of CSV.`);
  };

  const activeSheet = result?.sheets[selectedSheet];
  const previewRows = activeSheet ? activeSheet.rows.slice(0, PREVIEW_ROWS) : [];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="excel-to-csv-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <FileXls className="w-8 h-8 text-[#10b981]" />
            Excel to CSV
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Converts a real .xlsx spreadsheet to CSV in your browser — the ZIP and XML inside the file are actually parsed. Formula cells export their last saved value; date-formatted cells export as Excel serial numbers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            className="border-2 border-dashed border-[#2a2a2a] hover:border-[#10b981]/50 rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[200px]"
          >
            <input
              id="excel-file-input"
              data-testid="excel-file-input"
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFile(e.target.files?.[0])}
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
            />
            <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-3 group-hover:scale-105 transition-transform text-[#10b981]">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-white font-sans text-base">Upload an .xlsx file</h3>
            <p className="text-gray-500 text-xs mt-1 mb-3">Parsed locally — nothing is uploaded.</p>
            <span className="text-[11px] font-bold text-[#0a0a0a] bg-[#10b981] px-3 py-1.5 rounded uppercase tracking-wider hover:bg-[#059669] transition-all">
              Select File
            </span>
          </div>

          {file && (
            <div className="text-xs text-gray-400">
              <p className="truncate font-semibold text-white">{file.name}</p>
              <p className="mt-1">{formatFileSize(file.size)}</p>
            </div>
          )}

          {result && result.sheets.length > 0 && (
            <div className="flex flex-col gap-2">
              <label htmlFor="excel-sheet" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sheet to Export</label>
              <select
                id="excel-sheet"
                data-testid="excel-sheet"
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(parseInt(e.target.value, 10) || 0)}
                className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] cursor-pointer"
              >
                {result.sheets.map((sheet, i) => (
                  <option key={sheet.name + i} value={i}>{sheet.name} ({sheet.rows.length} rows)</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={downloadCsv}
            disabled={!activeSheet || isParsing}
            data-testid="excel-download"
            className="w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isParsing ? 'Reading Spreadsheet…' : (
              <>
                <Download className="w-4 h-4" /> Download CSV
              </>
            )}
          </button>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          {error && (
            <div data-testid="excel-error" className="p-4 rounded-xl border border-rose-900/50 bg-rose-950/10 text-rose-300 text-xs flex items-start gap-2">
              <WarningCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block uppercase tracking-wider mb-1 text-[10px]">Conversion Failed</span>
                {error}
              </div>
            </div>
          )}
          {!result && !error && !isParsing && (
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-10 text-center flex flex-col items-center justify-center min-h-[220px] text-gray-500">
              <Table className="w-10 h-10 stroke-1 mb-3" />
              <p className="text-xs max-w-sm">Upload an .xlsx file to preview its rows and download them as CSV.</p>
            </div>
          )}
          {isParsing && <p className="text-gray-400 text-sm">Reading spreadsheet…</p>}
          {activeSheet && (
            <div data-testid="excel-result" className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a] mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h2 className="font-sans text-lg text-white">Sheet “{activeSheet.name}”</h2>
                <span className="text-xs text-gray-400 ml-auto">
                  {activeSheet.rows.length} rows × {activeSheet.rows[0]?.length ?? 0} columns
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className={ri === 0 ? 'border-b border-[#2a2a2a] font-bold text-white' : 'text-gray-300'}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-2 py-1.5 whitespace-nowrap max-w-[220px] overflow-hidden text-ellipsis">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {activeSheet.rows.length > PREVIEW_ROWS && (
                <p className="text-[11px] text-gray-500 mt-3">Preview shows the first {PREVIEW_ROWS} rows — the downloaded CSV contains all {activeSheet.rows.length} rows.</p>
              )}
              <p className="text-[11px] text-gray-500 mt-2">
                Limits: formula cells export their last saved value, date cells export as Excel serial numbers, and formatting / merged cells are not carried into CSV.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
