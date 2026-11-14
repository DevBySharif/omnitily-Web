import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle,
  Copy,
  Database,
  Download,
  Trash,
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

type TokenType = 'keyword' | 'string' | 'comment' | 'punct' | 'word' | 'number' | 'space';

interface Token {
  type: TokenType;
  value: string;
}

// Major clause keywords start a new line at the current depth.
const NEWLINE_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'ON',
  'UNION', 'EXCEPT', 'INTERSECT', 'VALUES', 'SET', 'INTO', 'RETURNING', 'WINDOW',
]);

// These keep the previous token on the same line (e.g. "GROUP BY", "ORDER BY", "LEFT JOIN").
const CONTINUATION_KEYWORDS = new Set(['BY', 'JOIN']);

const CLAUSE_STARTERS = new Set([
  'SELECT', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET',
  'UNION', 'EXCEPT', 'INTERSECT', 'VALUES', 'SET', 'INTO', 'RETURNING', 'WINDOW',
]);

// Function names attach directly to the following "(" (e.g. COUNT(...)).
const FUNCTION_NAMES = new Set([
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'CAST', 'IFNULL', 'NULLIF',
  'UPPER', 'LOWER', 'TRIM', 'LENGTH', 'SUBSTRING', 'NOW', 'DATE', 'ROUND', 'ABS', 'CONCAT',
]);

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (/\s/.test(ch)) {
      let j = i;
      while (j < sql.length && /\s/.test(sql[j])) j++;
      tokens.push({ type: 'space', value: sql.slice(i, j) });
      i = j;
      continue;
    }
    // Line comment
    if (sql.startsWith('--', i)) {
      let j = i;
      while (j < sql.length && sql[j] !== '\n') j++;
      tokens.push({ type: 'comment', value: sql.slice(i, j) });
      i = j;
      continue;
    }
    // Block comment
    if (sql.startsWith('/*', i)) {
      const end = sql.indexOf('*/', i + 2);
      const j = end === -1 ? sql.length : end + 2;
      tokens.push({ type: 'comment', value: sql.slice(i, j) });
      i = j;
      continue;
    }
    // Quoted string / identifier (', ", `) — doubled quote is an escape.
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) { j += 2; continue; }
          j++;
          break;
        }
        j++;
      }
      tokens.push({ type: ch === "'" ? 'string' : 'word', value: sql.slice(i, j) });
      i = j;
      continue;
    }
    // Numbers
    if (/\d/.test(ch)) {
      let j = i;
      while (j < sql.length && /[\d.]/.test(sql[j])) j++;
      tokens.push({ type: 'number', value: sql.slice(i, j) });
      i = j;
      continue;
    }
    // Punctuation
    if ('(),;'.includes(ch)) {
      tokens.push({ type: 'punct', value: ch });
      i++;
      continue;
    }
    // Word (keyword / identifier / operator run)
    let j = i;
    while (j < sql.length && /[A-Za-z0-9_.$]/.test(sql[j])) j++;
    if (j === i) {
      // Single operator character (=, <, >, +, -, etc.)
      tokens.push({ type: 'word', value: ch });
      i++;
      continue;
    }
    tokens.push({ type: 'word', value: sql.slice(i, j) });
    i = j;
  }
  return tokens;
}

const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'NULL', 'AS', 'ON', 'JOIN',
  'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'GROUP', 'BY', 'ORDER',
  'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'UPDATE', 'DELETE', 'INTO', 'VALUES',
  'SET', 'UNION', 'ALL', 'DISTINCT', 'EXCEPT', 'INTERSECT', 'CASE', 'WHEN',
  'THEN', 'ELSE', 'END', 'IN', 'IS', 'LIKE', 'BETWEEN', 'EXISTS', 'ASC', 'DESC',
  'CREATE', 'TABLE', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE',
  'CHECK', 'DEFAULT', 'INDEX', 'DROP', 'ALTER', 'ADD', 'COLUMN', 'RETURNING',
  'WITH', 'RECURSIVE', 'WINDOW', 'OVER', 'PARTITION', 'ROWS', 'RANGE',
  'CURRENT', 'ROW', 'PRECEDING', 'FOLLOWING', 'UNBOUNDED', 'COUNT', 'SUM',
  'AVG', 'MIN', 'MAX', 'TRUE', 'FALSE', 'CAST', 'COALESCE', 'IF', 'ELSEIF',
]);

function isKeyword(word: string): boolean {
  return SQL_KEYWORDS.has(word.toUpperCase());
}

/**
 * Format a SQL statement: keywords upper-cased, major clauses on their own
 * lines, subqueries and parenthesised lists indented, commas followed by a
 * newline inside SELECT lists. Comments and string literals are preserved.
 */
export function formatSql(sql: string): string {
  const raw = tokenize(sql).filter((t) => t.type !== 'space');
  const lines: string[] = [];
  let current = '';
  let depth = 0;
  let extra = 0; // extra indent level for SELECT / GROUP BY / ORDER BY item lists
  let parenKind: ('subquery' | 'list')[] = [];

  const indent = () => '  '.repeat(depth + extra);
  const flush = () => {
    const trimmed = current.trimEnd();
    if (trimmed) lines.push(trimmed);
    current = '';
  };
  const startLine = () => {
    flush();
    current = '  '.repeat(depth);
  };
  const append = (text: string) => {
    if (current && !current.endsWith(' ') && !current.endsWith('(')) current += ' ';
    current += text;
  };

  for (let idx = 0; idx < raw.length; idx++) {
    const tok = raw[idx];
    const upper = tok.value.toUpperCase();

    if (tok.type === 'comment') {
      startLine();
      current += tok.value;
      flush();
      continue;
    }

    if (tok.type === 'punct' && tok.value === '(') {
      // Subquery if the previous meaningful word is a clause starter / IN / FROM / JOIN
      const prev = raw.slice(0, idx).reverse().find((t) => t.type !== 'comment');
      const prevUpper = prev ? prev.value.toUpperCase() : '';
      const isSub = prevUpper === 'SELECT' || prevUpper === 'FROM' || prevUpper === 'IN' ||
        prevUpper === 'JOIN' || prevUpper === 'EXISTS' || prevUpper === 'VALUES' ||
        prevUpper === 'WHERE' || prevUpper === 'ON';
      current = current.trimEnd();
      if (current && !current.endsWith('(') && !FUNCTION_NAMES.has(prevUpper)) current += ' ';
      current += '(';
      if (isSub) {
        parenKind.push('subquery');
        depth++;
        extra = 0;
        startLine();
      } else {
        parenKind.push('list');
      }
      continue;
    }

    if (tok.type === 'punct' && tok.value === ')') {
      const kind = parenKind.pop();
      if (kind === 'subquery') {
        depth = Math.max(0, depth - 1);
        extra = 0;
        startLine();
        current += ')';
      } else {
        current = current.trimEnd() + ')';
      }
      continue;
    }

    if (tok.type === 'punct' && tok.value === ',') {
      current = current.trimEnd() + ',';
      const kind = parenKind[parenKind.length - 1];
      // Newline after commas inside subqueries and at top level; keep inline in plain lists.
      if (kind === 'subquery' || parenKind.length === 0) {
        flush();
        current = indent();
      } else {
        current += ' ';
      }
      continue;
    }

    if (tok.type === 'punct' && tok.value === ';') {
      current = current.trimEnd() + ';';
      flush();
      continue;
    }

    if (tok.type === 'word' && isKeyword(tok.value)) {
      const kw = upper;
      if (CONTINUATION_KEYWORDS.has(kw)) {
        append(kw);
        if (current.trim() === 'GROUP BY' || current.trim() === 'ORDER BY') {
          flush();
          extra = 1;
          current = indent();
        }
        continue;
      }
      if (kw === 'AND' || kw === 'OR') {
        startLine();
        current += kw;
        continue;
      }
      if (NEWLINE_KEYWORDS.has(kw)) {
        // JOIN variants already handled: LEFT/RIGHT/... start a line, JOIN continues them.
        extra = 0;
        startLine();
        current += kw;
        if (kw === 'SELECT') {
          flush();
          extra = 1;
          current = indent();
        }
        continue;
      }
      append(kw);
      continue;
    }

    // Identifiers, literals, numbers, operators
    append(tok.value);
  }
  flush();
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

export const SAMPLE_SQL = `select u.id, u.name, count(o.id) as order_count from users u left join orders o on o.user_id = u.id where u.age > 18 and u.status = 'active' group by u.id, u.name having count(o.id) > 0 order by order_count desc limit 10;`;

export default function SqlFormatter({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [input, setInput] = useState(SAMPLE_SQL);
  const [isCopied, setIsCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  const formatted = useMemo(() => formatSql(input), [input]);

  const copyFormatted = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setIsCopied(true);
      toast.success('SQL Copied', 'The formatted query is on your clipboard.');
      try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = window.setTimeout(() => setIsCopied(false), 1500);
    } catch (e) {
      toast.error('Copy Failed', 'Your browser blocked clipboard access.');
    }
  };

  const downloadFormatted = () => {
    try {
      const blob = new Blob([formatted], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'formatted.sql';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 1000);
      toast.success('Downloaded', 'Saved as formatted.sql.');
    } catch (e) {
      toast.error('Download Failed', 'The file could not be generated in this browser.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="sql-formatter-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Database className="w-8 h-8 text-[#10b981]" />
            SQL Query Formatter
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Pretty print dense database queries with clean indentation — keywords upper-cased, clauses on
            their own lines.
          </p>
        </div>
        <button
          onClick={() => setInput(SAMPLE_SQL)}
          className="text-xs font-semibold text-[#10b981] hover:text-[#059669] hover:bg-[#10b981]/10 px-3 py-1.5 rounded border border-emerald-900/50 transition-colors cursor-pointer"
        >
          Load Sample
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="sql-input" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SQL Input</label>
          <textarea
            id="sql-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste a SQL query here…"
            spellCheck={false}
            className="w-full h-[420px] text-sm font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] resize-y"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="sql-output" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Formatted SQL</label>
          <pre
            id="sql-output"
            data-testid="sql-output"
            className="w-full h-[420px] overflow-auto text-sm font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#0d0d0d] text-emerald-300 whitespace-pre"
          >
            {formatted}
          </pre>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={copyFormatted}
          className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-colors cursor-pointer flex items-center gap-2"
        >
          {isCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {isCopied ? 'Copied!' : 'Copy SQL'}
        </button>
        <button
          onClick={downloadFormatted}
          className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-colors cursor-pointer flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Download .sql
        </button>
        <button
          onClick={() => setInput('')}
          className="ml-auto text-xs font-semibold text-gray-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Trash className="w-3.5 h-3.5" /> Clear
        </button>
      </div>
      <p className="text-[10px] text-gray-500 mt-3">
        Formatting is cosmetic only — it never changes what the query means. String literals and comments are
        preserved exactly.
      </p>
    </div>
  );
}
