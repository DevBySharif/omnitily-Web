// YAML to JSON Converter — rebuilt (Wave 5a).
//
// The previous implementation returned fabricated output instead of parsing
// YAML, so the tool was disabled. This version ships a real, dependency-free
// YAML subset parser written for this tool (no new npm dependency was added).
//
// Supported subset (anything else fails loudly with a line number — it is
// never guessed):
//   - block mappings and block sequences, nested by indentation (spaces only)
//   - sequences of mappings ("- name: x" with following keys)
//   - plain, single-quoted and double-quoted scalars
//   - numbers, booleans (true/false), null (~ / null / empty value)
//   - flow collections: [1, 2, 3] and {a: 1, b: 2}
//   - full-line and trailing comments (# ...)
// Not supported (clear error instead of a guess): tabs, anchors/aliases,
// tags, block scalars (| and >), multi-line plain scalars, document markers.

import React, { useState } from 'react';
import { CheckCircle, Copy, Shuffle, WarningCircle } from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

const MAX_DEPTH = 50;

/** A parsed non-blank source line, with its indentation and source line number. */
interface YLine {
  indent: number;
  content: string;
  line: number;
  /** Column where a sequence item's content starts (dash + spaces). */
  itemCol: number;
}

export class YamlParseError extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(`Line ${line}: ${message}`);
    this.name = 'YamlParseError';
    this.line = line;
  }
}

function isSeqLine(content: string): boolean {
  return content === '-' || content.startsWith('- ');
}

/** Strip a trailing comment: '#' starts one outside quotes and after whitespace. */
function stripComment(text: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inSingle) {
      if (ch === "'") inSingle = false;
    } else if (inDouble) {
      if (ch === '\\') i++;
      else if (ch === '"') inDouble = false;
    } else if (ch === "'") {
      inSingle = true;
    } else if (ch === '"') {
      inDouble = true;
    } else if (ch === '#' && (i === 0 || text[i - 1] === ' ' || text[i - 1] === '\t')) {
      return text.slice(0, i).trimEnd();
    }
  }
  return text;
}

/** Split source into logical lines; tabs and document markers are rejected. */
function lexLines(text: string): YLine[] {
  const out: YLine[] = [];
  const rawLines = text.replace(/\r\n?/g, '\n').split('\n');
  for (let idx = 0; idx < rawLines.length; idx++) {
    const raw = rawLines[idx];
    const lineNo = idx + 1;
    if (/^[ \t]*$/.test(raw)) continue; // blank
    const leading = raw.match(/^[ ]*/)?.[0].length ?? 0;
    if (raw.slice(0, leading + 1).includes('\t') || /^\t/.test(raw)) {
      throw new YamlParseError('Tabs are not allowed for indentation — use spaces.', lineNo);
    }
    const content = stripComment(raw.slice(leading));
    if (content === '') continue; // comment-only line
    if (content === '---' || content === '...') {
      throw new YamlParseError('Document markers (--- / ...) are not supported in this subset.', lineNo);
    }
    let itemCol = leading;
    if (isSeqLine(content)) {
      const afterDash = raw.slice(leading + 1);
      const spaces = afterDash.match(/^ */)?.[0].length ?? 0;
      itemCol = leading + 1 + spaces;
    }
    out.push({ indent: leading, content, line: lineNo, itemCol });
  }
  return out;
}

/** Find the ':' that separates a mapping key from its value (outside quotes). */
function findKeySep(content: string): number {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inSingle) {
      if (ch === "'") inSingle = false;
    } else if (inDouble) {
      if (ch === '\\') i++;
      else if (ch === '"') inDouble = false;
    } else if (ch === "'") {
      inSingle = true;
    } else if (ch === '"') {
      inDouble = true;
    } else if (ch === ':' && (i === content.length - 1 || content[i + 1] === ' ')) {
      return i;
    }
  }
  return -1;
}

function parseSingleQuoted(text: string, line: number): string {
  if (!text.endsWith("'") || text.length < 2) {
    throw new YamlParseError('Unterminated single-quoted string.', line);
  }
  return text.slice(1, -1).replace(/''/g, "'");
}

const DOUBLE_ESCAPES: Record<string, string> = {
  n: '\n', t: '\t', r: '\r', '0': '\0', '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f',
};

function parseDoubleQuoted(text: string, line: number): string {
  if (!text.endsWith('"') || text.length < 2) {
    throw new YamlParseError('Unterminated double-quoted string.', line);
  }
  let out = '';
  const body = text.slice(1, -1);
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '\\') {
      const next = body[i + 1];
      if (next === undefined) throw new YamlParseError('Trailing backslash in double-quoted string.', line);
      if (next in DOUBLE_ESCAPES) {
        out += DOUBLE_ESCAPES[next];
        i++;
      } else if (next === 'x' || next === 'u' || next === 'U') {
        const digits = next === 'x' ? 2 : next === 'u' ? 4 : 8;
        const hex = body.slice(i + 2, i + 2 + digits);
        if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length !== digits) {
          throw new YamlParseError(`Bad \\${next} escape in double-quoted string.`, line);
        }
        out += String.fromCodePoint(parseInt(hex, 16));
        i += 1 + digits;
      } else {
        throw new YamlParseError(`Unsupported escape \\${next} in double-quoted string.`, line);
      }
    } else {
      out += ch;
    }
  }
  return out;
}

/** Parse one scalar token (quoted, flow, or plain). */
function parseScalarToken(token: string, line: number, depth: number): unknown {
  if (depth > MAX_DEPTH) throw new YamlParseError('Nesting is too deep.', line);
  const t = token.trim();
  if (t === '') throw new YamlParseError('Expected a value here.', line);
  if (t === '|' || t === '>') {
    throw new YamlParseError('Block scalars (| and >) are not supported in this subset.', line);
  }
  if (t.startsWith('&') || t.startsWith('*')) {
    throw new YamlParseError('Anchors and aliases (&, *) are not supported in this subset.', line);
  }
  if (t.startsWith('!')) {
    throw new YamlParseError('YAML tags (!) are not supported in this subset.', line);
  }
  if (t.startsWith('[') || t.startsWith('{')) {
    const parser = new FlowParser(t, line);
    const value = parser.parseValue(depth);
    parser.expectEnd();
    return value;
  }
  if (t.startsWith("'")) return parseSingleQuoted(t, line);
  if (t.startsWith('"')) return parseDoubleQuoted(t, line);
  if (t === '~' || t === 'null' || t === 'Null' || t === 'NULL') return null;
  if (t === 'true' || t === 'True' || t === 'TRUE') return true;
  if (t === 'false' || t === 'False' || t === 'FALSE') return false;
  if (/^[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/.test(t)) {
    const n = Number(t);
    if (Number.isFinite(n)) return n;
  }
  if (t.includes(': ')) {
    throw new YamlParseError('A plain scalar cannot contain ": " — quote the value.', line);
  }
  if (t.includes(' #')) {
    throw new YamlParseError('Unexpected " #" inside a plain scalar.', line);
  }
  return t;
}

/** Minimal recursive parser for inline flow values: [a, b] and {k: v}. */
class FlowParser {
  private pos = 0;
  constructor(private text: string, private line: number) {}

  private skipWs() {
    while (this.pos < this.text.length && /\s/.test(this.text[this.pos])) this.pos++;
  }

  parseValue(depth: number): unknown {
    if (depth > MAX_DEPTH) throw new YamlParseError('Nesting is too deep.', this.line);
    this.skipWs();
    const ch = this.text[this.pos];
    if (ch === '[') return this.parseSequence(depth);
    if (ch === '{') return this.parseMapping(depth);
    if (ch === "'") {
      const start = this.pos;
      this.readQuoted("'");
      return parseSingleQuoted(this.text.slice(start, this.pos), this.line);
    }
    if (ch === '"') {
      const start = this.pos;
      this.readQuoted('"');
      return parseDoubleQuoted(this.text.slice(start, this.pos), this.line);
    }
    // Plain scalar inside a flow collection: read to , ] or }.
    const start = this.pos;
    while (this.pos < this.text.length && !',]}'.includes(this.text[this.pos])) this.pos++;
    const token = this.text.slice(start, this.pos).trim();
    if (token === '') throw new YamlParseError('Expected a value inside the flow collection.', this.line);
    if (token.includes(': ') || token.endsWith(':')) {
      // A stray ": " inside a flow scalar is not a mapping — reject, don't guess.
      throw new YamlParseError('Unexpected ":" inside a flow value — quote the value.', this.line);
    }
    return parseScalarToken(token, this.line, depth);
  }

  /** Read a quoted token starting at this.pos; leaves pos just past the closing quote. Returns inner length. */
  private readQuoted(quote: string): number {
    let i = this.pos + 1;
    while (i < this.text.length) {
      const ch = this.text[i];
      if (quote === '"' && ch === '\\') { i += 2; continue; }
      if (ch === quote) {
        if (quote === "'" && this.text[i + 1] === "'") { i += 2; continue; }
        const len = i - this.pos - 1;
        this.pos = i + 1;
        return len;
      }
      i++;
    }
    throw new YamlParseError('Unterminated quoted string inside a flow collection.', this.line);
  }

  private parseSequence(depth: number): unknown[] {
    this.pos++; // consume '['
    const out: unknown[] = [];
    this.skipWs();
    if (this.text[this.pos] === ']') { this.pos++; return out; }
    for (;;) {
      out.push(this.parseValue(depth + 1));
      this.skipWs();
      if (this.text[this.pos] === ',') { this.pos++; continue; }
      if (this.text[this.pos] === ']') { this.pos++; return out; }
      throw new YamlParseError('Expected "," or "]" in a flow sequence.', this.line);
    }
  }

  private parseMapping(depth: number): Record<string, unknown> {
    this.pos++; // consume '{'
    const out: Record<string, unknown> = {};
    this.skipWs();
    if (this.text[this.pos] === '}') { this.pos++; return out; }
    for (;;) {
      this.skipWs();
      const keyStart = this.pos;
      // Read the key up to the first ':' outside quotes.
      let keyText = '';
      if (this.text[this.pos] === "'" || this.text[this.pos] === '"') {
        const quote = this.text[this.pos];
        const start = this.pos;
        this.readQuoted(quote);
        keyText = this.text.slice(start, this.pos);
      } else {
        while (this.pos < this.text.length && this.text[this.pos] !== ':' && this.text[this.pos] !== ',' && this.text[this.pos] !== '}') this.pos++;
        keyText = this.text.slice(keyStart, this.pos).trim();
      }
      this.skipWs();
      if (this.text[this.pos] !== ':') throw new YamlParseError('Expected ":" in a flow mapping.', this.line);
      this.pos++;
      const key = String(parseScalarToken(keyText, this.line, depth));
      if (key in out) throw new YamlParseError(`Duplicate key "${key}".`, this.line);
      out[key] = this.parseValue(depth + 1);
      this.skipWs();
      if (this.text[this.pos] === ',') { this.pos++; continue; }
      if (this.text[this.pos] === '}') { this.pos++; return out; }
      throw new YamlParseError('Expected "," or "}" in a flow mapping.', this.line);
    }
  }

  expectEnd() {
    this.skipWs();
    if (this.pos !== this.text.length) {
      throw new YamlParseError(`Unexpected trailing characters: "${this.text.slice(this.pos)}".`, this.line);
    }
  }
}

function parseKey(raw: string, line: number): string {
  const key = raw.trim();
  if (key === '') throw new YamlParseError('A mapping entry is missing its key.', line);
  const value = parseScalarToken(key, line, 0);
  if (typeof value !== 'string') {
    throw new YamlParseError('Mapping keys must be strings in this subset.', line);
  }
  return value;
}

class BlockParser {
  private pos = 0;
  constructor(private lines: YLine[]) {}

  parseDocument(): unknown {
    if (this.lines.length === 0) throw new YamlParseError('The document is empty.', 1);
    const value = this.parseBlock(this.lines[0].indent, 0);
    if (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      throw new YamlParseError('Unexpected content — check the indentation.', line.line);
    }
    return value;
  }

  private parseBlock(minIndent: number, depth: number): unknown {
    if (depth > MAX_DEPTH) throw new YamlParseError('Nesting is too deep.', this.lines[this.pos]?.line ?? 1);
    const line = this.lines[this.pos];
    if (!line || line.indent < minIndent) return null;
    if (isSeqLine(line.content)) return this.parseSequence(line.indent, depth);
    if (findKeySep(line.content) >= 0) return this.parseMapping(line.indent, depth);
    const value = parseScalarToken(line.content, line.line, depth);
    this.pos++;
    return value;
  }

  /**
   * Parse a mapping block. `first` lets a sequence item ("- name: x") start
   * the mapping: its content acts as the first mapping line at `indent`.
   */
  private parseMapping(
    indent: number,
    depth: number,
    first?: { content: string; line: number },
  ): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    let pending = first;
    for (;;) {
      let content: string;
      let lineNo: number;
      if (pending) {
        content = pending.content;
        lineNo = pending.line;
        pending = undefined;
      } else {
        const line = this.lines[this.pos];
        if (!line || line.indent !== indent || isSeqLine(line.content)) break;
        if (findKeySep(line.content) < 0) break;
        content = line.content;
        lineNo = line.line;
        this.pos++;
      }
      const sep = findKeySep(content);
      if (sep < 0) break;
      const key = parseKey(content.slice(0, sep), lineNo);
      if (key in obj) throw new YamlParseError(`Duplicate key "${key}".`, lineNo);
      const rest = content.slice(sep + 1).trim();
      if (rest !== '') {
        obj[key] = parseScalarToken(rest, lineNo, depth + 1);
      } else {
        const next = this.lines[this.pos];
        if (next && next.indent > indent) {
          obj[key] = this.parseBlock(next.indent, depth + 1);
        } else if (next && next.indent === indent && isSeqLine(next.content)) {
          // YAML allows a block sequence at the same indent as its key.
          obj[key] = this.parseSequence(indent, depth + 1);
        } else {
          obj[key] = null;
        }
      }
    }
    return obj;
  }

  /**
   * Parse a sequence block. `first` lets a nested "- - a" item start the
   * sequence: its content acts as the first item line at `indent`.
   */
  private parseSequence(
    indent: number,
    depth: number,
    first?: { content: string; line: number; itemCol: number },
  ): unknown[] {
    const out: unknown[] = [];
    let pending = first;
    for (;;) {
      let content: string;
      let lineNo: number;
      let itemCol: number;
      if (pending) {
        content = pending.content;
        lineNo = pending.line;
        itemCol = pending.itemCol;
        pending = undefined;
      } else {
        const line = this.lines[this.pos];
        if (!line || line.indent !== indent || !isSeqLine(line.content)) break;
        content = line.content;
        lineNo = line.line;
        itemCol = line.itemCol;
        this.pos++;
      }
      const item = content === '-' ? '' : content.slice(2).trim();
      if (item === '') {
        const next = this.lines[this.pos];
        if (next && next.indent > indent) out.push(this.parseBlock(next.indent, depth + 1));
        else if (next && next.indent === indent && isSeqLine(next.content)) out.push(this.parseSequence(indent, depth + 1));
        else out.push(null);
      } else if (isSeqLine(item)) {
        // Nested sequence ("- - a"): the inner dash is exactly where this
        // item's content starts (itemCol); its content starts after its dash.
        const innerDashCol = itemCol;
        const innerSpaces = item.slice(1).match(/^ +/)?.[0].length ?? 1;
        out.push(this.parseSequence(innerDashCol, depth + 1, {
          content: item,
          line: lineNo,
          itemCol: innerDashCol + 1 + innerSpaces,
        }));
      } else if (findKeySep(item) >= 0) {
        out.push(this.parseMapping(itemCol, depth + 1, { content: item, line: lineNo }));
      } else {
        out.push(parseScalarToken(item, lineNo, depth + 1));
      }
    }
    return out;
  }
}

/** Parse YAML (supported subset — see the file header) into a plain JS value. */
export function parseYaml(text: string): unknown {
  const lines = lexLines(text);
  return new BlockParser(lines).parseDocument();
}

/** Parse YAML and render it as pretty-printed JSON. Throws YamlParseError on bad input. */
export function yamlToJson(text: string): string {
  return JSON.stringify(parseYaml(text), null, 2);
}

const SAMPLE_YAML = `name: Ada Lovelace
age: 36
admin: true
website: ~
tags:
  - math
  - code
address:
  city: London
  zip: "00123"`;

export default function YamlToJson({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [input, setInput] = useState(SAMPLE_YAML);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const convert = () => {
    setError('');
    setCopied(false);
    try {
      if (!input.trim()) throw new YamlParseError('Enter some YAML to convert.', 1);
      const json = yamlToJson(input);
      setOutput(json);
      try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
      toast.success('Converted', 'YAML parsed into JSON.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not convert the YAML.';
      setOutput('');
      setError(message);
      toast.error('Cannot Convert', message);
    }
  };

  const loadSample = () => {
    setInput(SAMPLE_YAML);
    setOutput('');
    setError('');
  };

  const copyJson = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success('Copied', 'JSON copied to clipboard.');
    } catch (e) {
      toast.error('Copy Failed', 'Your browser blocked clipboard access — select and copy manually.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="yaml-to-json-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Shuffle className="w-8 h-8 text-[#10b981]" />
            YAML to JSON Converter
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            A real YAML subset parser, running locally. Unsupported YAML fails with a line number instead of a guessed result.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="yaml-input" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">YAML input</label>
              <button onClick={loadSample} className="text-[10px] font-bold text-[#10b981] hover:text-white uppercase tracking-widest cursor-pointer">Load sample</button>
            </div>
            <textarea
              id="yaml-input"
              rows={14}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              placeholder={'name: Ada\nage: 36\ntags:\n  - math'}
              className="text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] font-mono resize-y"
            />
            <span className="text-[10px] text-gray-500">
              Supports block mappings and sequences, nested indentation (spaces only), quoted strings, numbers, booleans, null, and flow [lists] / {'{maps}'}.
              Tabs, anchors, tags, block scalars (| &gt;) and multi-line scalars are rejected with an error.
            </span>
          </div>

          <button
            onClick={convert}
            className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-all cursor-pointer"
          >
            Convert to JSON
          </button>

          {error && (
            <div className="flex items-start gap-2 text-rose-400 text-sm bg-rose-950/20 border border-rose-900/40 rounded-xl px-4 py-3">
              <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span data-testid="yaml-error">{error}</span>
            </div>
          )}
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">JSON output</span>
            {output && (
              <button onClick={copyJson} aria-label="Copy JSON output" className="text-[#10b981] hover:text-white cursor-pointer">
                {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
          {output ? (
            <pre data-testid="yaml-output" className="max-h-96 overflow-auto border border-[#2a2a2a] rounded px-4 py-3 bg-[#151515] text-sm font-mono text-emerald-300 whitespace-pre-wrap break-words">{output}</pre>
          ) : (
            <p className="text-gray-500 text-sm">Press Convert to JSON to see the result. The sample converts a name, age, admin flag, tags list and a nested address object.</p>
          )}
          <p className="text-[10px] text-gray-500 mt-4">
            Parsed with a hand-written subset parser (no dependency). If your YAML uses anchors, tags, or block scalars, the converter says so instead of guessing.
          </p>
        </div>
      </div>
    </div>
  );
}
