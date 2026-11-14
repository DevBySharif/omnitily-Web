import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle,
  Copy,
  Download,
  Eye,
  FileText,
  PencilSimple,
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Inline Markdown: code spans, images, links, bold, italic. Input must already be HTML-escaped. */
export function renderInlineMd(escaped: string): string {
  let out = escaped;
  // Inline code first so `*` inside code is not treated as emphasis.
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, '<img alt="$1" src="$2" />');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/_([^_]+)_/g, '<em>$1</em>');
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return out;
}

/**
 * Small GitHub-flavoured Markdown renderer (no dependencies, output is built
 * from escaped input so raw HTML in the source is never executed).
 * Supports headings, fenced code, blockquotes, hr, ordered/unordered lists,
 * tables, paragraphs and inline formatting.
 */
export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];
  let i = 0;

  const flushParagraph = (buffer: string[]) => {
    if (buffer.length === 0) return;
    html.push(`<p>${renderInlineMd(escapeHtml(buffer.join(' ')))}</p>`);
    buffer.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : '';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      html.push(`<pre><code${lang}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    // Heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${renderInlineMd(escapeHtml(heading[2].trim()))}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      html.push('<hr />');
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      html.push(`<blockquote>${renderInlineMd(escapeHtml(quoteLines.join(' ')))}</blockquote>`);
      continue;
    }

    // Table (header row followed by a | --- | separator row)
    if (
      line.trim().startsWith('|') &&
      i + 1 < lines.length &&
      /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])
    ) {
      const splitRow = (row: string) =>
        row
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((cell) => cell.trim());
      const headers = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const thead = `<thead><tr>${headers.map((h) => `<th>${renderInlineMd(escapeHtml(h))}</th>`).join('')}</tr></thead>`;
      const tbody = rows
        .map((r) => `<tr>${r.map((c) => `<td>${renderInlineMd(escapeHtml(c))}</td>`).join('')}</tr>`)
        .join('');
      html.push(`<table>${thead}<tbody>${tbody}</tbody></table>`);
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      html.push(`<ul>${items.map((it) => `<li>${renderInlineMd(escapeHtml(it))}</li>`).join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        i++;
      }
      html.push(`<ol>${items.map((it) => `<li>${renderInlineMd(escapeHtml(it))}</li>`).join('')}</ol>`);
      continue;
    }

    // Blank line separates paragraphs
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph: gather consecutive plain lines
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !lines[i].startsWith('```') &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    flushParagraph(para);
  }

  return html.join('\n');
}

export function buildMarkdownHtmlDocument(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1a1a1a; }
code { background: #f0f0f0; padding: 0.1em 0.3em; border-radius: 4px; }
pre { background: #f6f6f6; padding: 1rem; border-radius: 8px; overflow-x: auto; }
pre code { background: none; padding: 0; }
blockquote { border-left: 4px solid #10b981; margin: 1rem 0; padding: 0.25rem 1rem; color: #444; }
table { border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 0.5rem 0.75rem; }
hr { border: none; border-top: 1px solid #ddd; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}

export const SAMPLE_MARKDOWN = `# Welcome to the Markdown Editor

Write **bold**, *italic*, and \`inline code\` — then watch the preview update live.

## What you can do

- Headings, lists, and blockquotes
- [Links](https://example.com) and tables
- Fenced code blocks

> Tip: everything renders locally in your browser. Nothing is uploaded.

| Feature | Status |
| ------- | ------ |
| Headings | Yes |
| Tables | Yes |
| Preview | Live |

\`\`\`js
console.log('Hello, Markdown!');
\`\`\`
`;

export default function MarkdownEditor({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [view, setView] = useState<'split' | 'write' | 'preview'>('split');
  const [isCopied, setIsCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  const html = useMemo(() => renderMarkdown(markdown), [markdown]);
  const wordCount = useMemo(
    () => (markdown.trim() === '' ? 0 : markdown.trim().split(/\s+/).length),
    [markdown]
  );

  const copyHtml = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(html);
      ok = true;
    } catch (e) {
      ok = false;
    }
    if (ok) {
      setIsCopied(true);
      toast.success('HTML Copied', 'The rendered HTML is on your clipboard.');
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = window.setTimeout(() => setIsCopied(false), 1500);
    } else {
      toast.error('Copy Failed', 'Your browser blocked clipboard access — select the preview HTML and copy it manually.');
    }
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    try {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 1000);
      try { confetti({ particleCount: 50, spread: 40 }); } catch (e) {}
      toast.success('Downloaded', `Saved as ${filename}.`);
    } catch (e) {
      toast.error('Download Failed', 'The file could not be generated in this browser.');
    }
  };

  const showWrite = view !== 'preview';
  const showPreview = view !== 'write';

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6" id="markdown-editor-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <PencilSimple className="w-8 h-8 text-[#10b981]" />
            Interactive Markdown Editor
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Write Markdown and see it rendered live — then copy the HTML or download the document.
          </p>
        </div>
        <div className="flex gap-2">
          {(['write', 'split', 'preview'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs font-semibold px-3 py-1.5 rounded border transition-colors cursor-pointer capitalize ${
                view === v
                  ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                  : 'border-[#2a2a2a] text-gray-400 hover:border-gray-700'
              }`}
            >
              {v === 'split' ? 'Split' : v === 'write' ? 'Write' : 'Preview'}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-4 ${view === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {showWrite && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="markdown-input" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Markdown Source
              </label>
              <span className="text-[11px] text-gray-500 font-mono">
                {wordCount} words · {markdown.length} characters
              </span>
            </div>
            <textarea
              id="markdown-input"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="# Type Markdown here…"
              spellCheck={false}
              className="w-full h-[480px] text-sm font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] resize-y"
            />
          </div>
        )}
        {showPreview && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Live Preview
            </label>
            <div
              data-testid="markdown-preview"
              className="markdown-preview w-full h-[480px] overflow-y-auto border border-[#2a2a2a] rounded-lg px-5 py-4 bg-white text-gray-900 prose-sm"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={copyHtml}
          className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-colors cursor-pointer flex items-center gap-2"
        >
          {isCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {isCopied ? 'Copied!' : 'Copy HTML'}
        </button>
        <button
          onClick={() => downloadFile(markdown, 'document.md', 'text/markdown')}
          className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-colors cursor-pointer flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Download .md
        </button>
        <button
          onClick={() => downloadFile(buildMarkdownHtmlDocument('Markdown Document', html), 'document.html', 'text/html')}
          className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-300 hover:border-gray-600 transition-colors cursor-pointer flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Download .html
        </button>
        <button
          onClick={() => setMarkdown(SAMPLE_MARKDOWN)}
          className="ml-auto text-xs font-semibold text-gray-400 hover:text-[#10b981] px-3 py-1.5 transition-colors cursor-pointer"
        >
          Restore Sample
        </button>
      </div>
      <p className="text-[10px] text-gray-500 mt-3">
        Rendering happens entirely in your browser. Raw HTML typed into the source is escaped, never executed.
      </p>
    </div>
  );
}
