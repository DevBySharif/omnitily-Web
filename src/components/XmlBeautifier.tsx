import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle,
  Copy,
  Download,
  Layout,
  Trash,
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

/** Serialize a parsed DOM node with indentation. Text is trimmed; empty elements self-close. */
function serializeNode(node: Node, indent: number, level: number): string[] {
  const pad = ' '.repeat(indent * level);
  const padChild = ' '.repeat(indent * (level + 1));
  const out: string[] = [];
  const children = Array.from(node.childNodes);

  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.nodeValue ?? '').trim();
    if (text) out.push(pad + text);
    return out;
  }
  if (node.nodeType === Node.COMMENT_NODE) {
    out.push(`${pad}<!--${node.nodeValue ?? ''}-->`);
    return out;
  }
  if (node.nodeType === Node.CDATA_SECTION_NODE) {
    out.push(`${pad}<![CDATA[${node.nodeValue ?? ''}]]>`);
    return out;
  }
  if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
    out.push(`${pad}<?${node.nodeName} ${node.nodeValue ?? ''}?>`);
    return out;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const attrs = Array.from(el.attributes)
      .map((a) => ` ${a.name}="${a.value}"`)
      .join('');
    const elementChildren = children.filter(
      (c) => c.nodeType !== Node.TEXT_NODE || (c.nodeValue ?? '').trim() !== ''
    );
    if (elementChildren.length === 0) {
      out.push(`${pad}<${el.tagName}${attrs} />`);
      return out;
    }
    if (elementChildren.length === 1 && elementChildren[0].nodeType === Node.TEXT_NODE) {
      const text = (elementChildren[0].nodeValue ?? '').trim();
      out.push(`${pad}<${el.tagName}${attrs}>${text}</${el.tagName}>`);
      return out;
    }
    out.push(`${pad}<${el.tagName}${attrs}>`);
    for (const child of elementChildren) {
      out.push(...serializeNode(child, indent, level + 1));
    }
    out.push(`${pad}</${el.tagName}>`);
    return out;
  }
  // Document / fragment: recurse without a wrapper, children at this level.
  for (const child of children) {
    out.push(...serializeNode(child, indent, level));
  }
  return out;
}

/**
 * Validate XML and return it pretty-printed.
 * Throws with the parser's message on invalid input. The XML declaration,
 * when present, is preserved verbatim above the formatted document.
 */
export function beautifyXml(xml: string, indent = 2): string {
  const trimmed = xml.trim();
  if (trimmed === '') throw new Error('Input is empty.');
  const declarationMatch = trimmed.match(/^<\?xml[^?]*\?>\s*/);
  const declaration = declarationMatch ? declarationMatch[0].trim() : '';
  const body = declaration ? trimmed.slice(declarationMatch![0].length) : trimmed;

  const parser = new DOMParser();
  const doc = parser.parseFromString(body, 'application/xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    const message = (parserError.textContent ?? 'Invalid XML.').replace(/\s+/g, ' ').trim();
    throw new Error(message);
  }
  const lines = serializeNode(doc, indent, 0);
  const formatted = lines.join('\n');
  return declaration ? `${declaration}\n${formatted}` : formatted;
}

/** Collapse all insignificant whitespace into a single line. */
export function minifyXml(xml: string): string {
  return beautifyXml(xml, 0).replace(/>\s+</g, '><').replace(/\n/g, '');
}

export const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?><library><book id="1"><title>The Old Lighthouse</title><author>Mara Venn</author><year>1987</year></book><book id="2"><title>Glass Gardens</title><author>Tom Okafor</author><year>2003</year></book></library>`;

export default function XmlBeautifier({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [input, setInput] = useState(SAMPLE_XML);
  const [indent, setIndent] = useState(2);
  const [minified, setMinified] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  const result = useMemo(() => {
    try {
      const formatted = beautifyXml(input, indent);
      return { ok: true as const, output: minified ? formatted.replace(/>\s+</g, '><').replace(/\n/g, '') : formatted };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : 'Invalid XML.' };
    }
  }, [input, indent, minified]);

  const copyOutput = async () => {
    if (!result.ok) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setIsCopied(true);
      toast.success('XML Copied', 'The formatted XML is on your clipboard.');
      try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = window.setTimeout(() => setIsCopied(false), 1500);
    } catch (e) {
      toast.error('Copy Failed', 'Your browser blocked clipboard access.');
    }
  };

  const downloadOutput = () => {
    if (!result.ok) return;
    try {
      const blob = new Blob([result.output], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'formatted.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 1000);
      toast.success('Downloaded', 'Saved as formatted.xml.');
    } catch (e) {
      toast.error('Download Failed', 'The file could not be generated in this browser.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="xml-beautifier-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Layout className="w-8 h-8 text-[#10b981]" />
            XML Beautifier &amp; Pretty-Printer
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Pretty print dense, nested XML documents — or squeeze them down to a single line.
          </p>
        </div>
        <button
          onClick={() => setInput(SAMPLE_XML)}
          className="text-xs font-semibold text-[#10b981] hover:text-[#059669] hover:bg-[#10b981]/10 px-3 py-1.5 rounded border border-emerald-900/50 transition-colors cursor-pointer"
        >
          Load Sample
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="xml-input" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">XML Input</label>
          <textarea
            id="xml-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste XML here…"
            spellCheck={false}
            className="w-full h-[420px] text-sm font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] resize-y"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="xml-output" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {minified ? 'Minified Output' : 'Formatted Output'}
            </label>
            <div className="flex items-center gap-2">
              <label htmlFor="xml-indent" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Indent</label>
              <select
                id="xml-indent"
                value={indent}
                onChange={(e) => setIndent(parseInt(e.target.value) || 2)}
                className="text-xs border border-[#2a2a2a] rounded px-2 py-1 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] cursor-pointer"
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
              </select>
              <button
                onClick={() => setMinified((v) => !v)}
                className={`text-xs font-semibold px-2 py-1 rounded border transition-colors cursor-pointer ${
                  minified
                    ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                    : 'border-[#2a2a2a] text-gray-400 hover:border-gray-700'
                }`}
              >
                Minify
              </button>
            </div>
          </div>
          {result.ok ? (
            <pre
              id="xml-output"
              data-testid="xml-output"
              className="w-full h-[420px] overflow-auto text-sm font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#0d0d0d] text-emerald-300 whitespace-pre"
            >
              {result.output}
            </pre>
          ) : (
            <div
              data-testid="xml-error"
              className="w-full h-[420px] overflow-auto text-sm border border-rose-500/30 rounded-lg px-3 py-2 bg-rose-500/5 text-rose-300"
            >
              <span className="font-bold">Invalid XML: </span>
              {result.error}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={copyOutput}
          disabled={!result.ok}
          className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {isCopied ? 'Copied!' : 'Copy Output'}
        </button>
        <button
          onClick={downloadOutput}
          disabled={!result.ok}
          className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" /> Download .xml
        </button>
        <button
          onClick={() => setInput('')}
          className="ml-auto text-xs font-semibold text-gray-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Trash className="w-3.5 h-3.5" /> Clear
        </button>
      </div>
      <p className="text-[10px] text-gray-500 mt-3">
        Parsing and formatting happen entirely in your browser. Invalid XML is reported with the parser's own error message.
      </p>
    </div>
  );
}
