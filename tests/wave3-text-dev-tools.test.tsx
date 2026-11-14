import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// canvas-confetti schedules requestAnimationFrame work that throws in jsdom
// (no real canvas context); the components call it only as celebration.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
import TextDiff, { diffLines, diffStats } from '../src/components/TextDiff';
import MarkdownEditor, { buildMarkdownHtmlDocument, renderMarkdown } from '../src/components/MarkdownEditor';
import RegexTester, { highlightSegments, testRegex } from '../src/components/RegexTester';
import FindReplace, { findOccurrences, replaceAllOccurrences } from '../src/components/FindReplace';
import SentenceGenerator, { generateSentence, generateSentences } from '../src/components/SentenceGenerator';
import XmlBeautifier, { beautifyXml, minifyXml } from '../src/components/XmlBeautifier';
import JwtDebugger, { decodeJwt, SAMPLE_JWT, verifyJwtHs256 } from '../src/components/JwtDebugger';
import SqlFormatter, { formatSql, SAMPLE_SQL } from '../src/components/SqlFormatter';
import CronParser, { getNextCronRuns, parseCron } from '../src/components/CronParser';
import ColorBlender, { blendColors, hexToRgb, rgbToHex } from '../src/components/ColorBlender';
import UserAgent, { parseUserAgent, SAMPLE_USER_AGENTS } from '../src/components/UserAgent';
import MockApi, { simulateMockRequest, validateMockBody, type MockConfig } from '../src/components/MockApi';
import { ToastProvider } from '../src/components/Toast';

const renderTool = (component: ReactNode) => render(<ToastProvider>{component}</ToastProvider>);
const noop = () => {};

/** Deterministic pseudo-random source (linear congruential generator). */
function cyclingRand(): () => number {
  let seed = 1234567;
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

describe('TextDiff', () => {
  it('diffs lines with LCS: unchanged, removed, added', () => {
    const lines = diffLines('alpha\nbeta\ngamma', 'alpha\ndelta\ngamma');
    expect(lines).toEqual([
      { type: 'same', text: 'alpha' },
      { type: 'remove', text: 'beta' },
      { type: 'add', text: 'delta' },
      { type: 'same', text: 'gamma' },
    ]);
    expect(diffStats(lines)).toEqual({ added: 1, removed: 1, unchanged: 2 });
  });

  it('handles empty inputs and identical texts', () => {
    expect(diffLines('', '')).toEqual([]);
    expect(diffLines('same', 'same')).toEqual([{ type: 'same', text: 'same' }]);
    expect(diffLines('', 'new')).toEqual([{ type: 'add', text: 'new' }]);
  });

  it('renders the sample diff with counts and updates when text changes', () => {
    renderTool(<TextDiff onBack={noop} />);
    expect(screen.getByTestId('diff-output')).toBeInTheDocument();
    expect(screen.getByText('+ 3 added')).toBeInTheDocument();
    expect(screen.getByText('− 2 removed')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Original Text'), { target: { value: 'hello' } });
    fireEvent.change(screen.getByLabelText('Changed Text'), { target: { value: 'hello' } });
    expect(screen.getByText('+ 0 added')).toBeInTheDocument();
    expect(screen.getByText('1 unchanged')).toBeInTheDocument();
  });
});

describe('MarkdownEditor', () => {
  it('renders headings, bold, italic, code, links, lists and tables', () => {
    expect(renderMarkdown('# Hello World')).toBe('<h1>Hello World</h1>');
    expect(renderMarkdown('This is **bold** and *italic* and `code`.')).toBe(
      '<p>This is <strong>bold</strong> and <em>italic</em> and <code>code</code>.</p>'
    );
    expect(renderMarkdown('[Omnitily](https://omnitily.vercel.app)')).toContain(
      '<a href="https://omnitily.vercel.app" target="_blank" rel="noopener noreferrer">Omnitily</a>'
    );
    expect(renderMarkdown('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>');
    expect(renderMarkdown('1. first\n2. second')).toBe('<ol><li>first</li><li>second</li></ol>');
    expect(renderMarkdown('```js\nconst x = 1;\n```')).toBe(
      '<pre><code class="language-js">const x = 1;</code></pre>'
    );
    expect(renderMarkdown('> quoted')).toBe('<blockquote>quoted</blockquote>');
    const table = renderMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |');
    expect(table).toContain('<th>A</th>');
    expect(table).toContain('<td>2</td>');
  });

  it('escapes raw HTML instead of executing it', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toContain('&lt;script&gt;');
    expect(renderMarkdown('<script>alert(1)</script>')).not.toContain('<script>');
  });

  it('builds a standalone HTML document and shows a live preview', () => {
    const doc = buildMarkdownHtmlDocument('Test', '<h1>Hi</h1>');
    expect(doc).toContain('<!DOCTYPE html>');
    expect(doc).toContain('<title>Test</title>');
    expect(doc).toContain('<h1>Hi</h1>');

    renderTool(<MarkdownEditor onBack={noop} />);
    const preview = screen.getByTestId('markdown-preview');
    expect(preview.querySelector('h1')?.textContent).toBe('Welcome to the Markdown Editor');
    expect(preview.querySelector('table')).not.toBeNull();
    fireEvent.change(screen.getByLabelText('Markdown Source'), { target: { value: '# Fresh Title' } });
    expect(preview.querySelector('h1')?.textContent).toBe('Fresh Title');
  });
});

describe('RegexTester', () => {
  it('finds all email matches with indices', () => {
    const result = testRegex('\\b\\w+@\\w+\\.\\w+\\b', 'g', 'mail a@b.com and c@d.org please');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.matches.map((m) => m.match)).toEqual(['a@b.com', 'c@d.org']);
      expect(result.matches[0].index).toBe(5);
    }
  });

  it('reports capture groups and a clear error for invalid patterns', () => {
    const grouped = testRegex('(\\d+)-(\\d+)', 'g', 'call 555-1234');
    expect(grouped.ok).toBe(true);
    if (grouped.ok) {
      expect(grouped.matches[0].groups).toEqual(['555', '1234']);
    }
    const bad = testRegex('([a-z', 'g', 'text');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toMatch(/unterminated/i);
  });

  it('highlights matches without dropping surrounding text', () => {
    const segments = highlightSegments('ab12cd', [{ match: '12', index: 2, groups: [] }]);
    expect(segments).toEqual([
      { text: 'ab', matched: false },
      { text: '12', matched: true },
      { text: 'cd', matched: false },
    ]);
  });

  it('renders the sample with 3 email matches highlighted', () => {
    renderTool(<RegexTester onBack={noop} />);
    expect(screen.getByText('3 matches found')).toBeInTheDocument();
    const list = screen.getByTestId('regex-match-list');
    expect(list.children.length).toBe(3);
    expect(screen.getByTestId('regex-highlight').querySelectorAll('mark').length).toBe(3);
    fireEvent.change(screen.getByLabelText('Regular Expression'), { target: { value: '([a-z' } });
    expect(screen.getByTestId('regex-error')).toBeInTheDocument();
  });
});

describe('FindReplace', () => {
  const opts = { caseSensitive: false, useRegex: false, wholeWord: false };

  it('finds occurrences case-insensitively and respects whole-word mode', () => {
    expect(findOccurrences('cat Cat CAT', 'cat', opts).occurrences.length).toBe(3);
    expect(findOccurrences('cat Cat CAT', 'cat', { ...opts, caseSensitive: true }).occurrences.length).toBe(1);
    expect(findOccurrences('cats cat scatter', 'cat', { ...opts, wholeWord: true }).occurrences.length).toBe(1);
    expect(findOccurrences('cats cat scatter', 'cat', opts).occurrences.length).toBe(3);
  });

  it('replaces literally and honours regex group references', () => {
    const literal = replaceAllOccurrences('the cat and the Cat', 'cat', 'fox', opts);
    expect(literal.result).toBe('the fox and the fox');
    expect(literal.replaced).toBe(2);
    const regex = replaceAllOccurrences('John Smith', '(\\w+) (\\w+)', '$2, $1', { ...opts, useRegex: true });
    expect(regex.result).toBe('Smith, John');
    const bad = replaceAllOccurrences('text', '([', 'x', { ...opts, useRegex: true });
    expect(bad.error).toBe('Invalid regular expression.');
  });

  it('renders the sample, counts 4 matches, and Replace All rewrites the text', () => {
    renderTool(<FindReplace onBack={noop} />);
    expect(screen.getByTestId('find-replace-count')).toHaveTextContent('4 matches');
    fireEvent.click(screen.getByRole('button', { name: /Replace All/ }));
    const textarea = screen.getByLabelText('Your Text') as HTMLTextAreaElement;
    expect(textarea.value).toContain('The fox sat on the mat.');
    expect(textarea.value).not.toMatch(/cat/i);
    expect(screen.getByTestId('find-replace-count')).toHaveTextContent('0 matches');
  });
});

describe('SentenceGenerator', () => {
  it('generates deterministic sentences from an injected random source', () => {
    expect(generateSentence('question', () => 0)).toMatch(/\?$/);
    expect(generateSentence('story-prompt', () => 0)).toContain('town where it rains upward');
    const statement = generateSentence('statement', () => 0);
    expect(statement).toBe(
      'The old lighthouse keeper discovered a brass key that hummed beneath the northern lights, but the map changed every time someone blinked.'
    );
    const exclamation = generateSentence('exclamation', () => 0);
    expect(exclamation).toContain('what a day!');
  });

  it('generates the requested number of unique sentences', () => {
    const sentences = generateSentences(5, 'statement', cyclingRand());
    expect(sentences.length).toBe(5);
    expect(new Set(sentences).size).toBe(5);
    for (const s of sentences) expect(s.endsWith('.')).toBe(true);
  });

  it('renders a list and regenerates on demand', () => {
    renderTool(<SentenceGenerator onBack={noop} />);
    const list = screen.getByTestId('sentence-list');
    expect(list.children.length).toBe(5);
    fireEvent.click(screen.getByRole('button', { name: /Generate/ }));
    expect(screen.getByTestId('sentence-list').children.length).toBe(5);
  });
});

describe('XmlBeautifier', () => {
  it('pretty-prints nested XML with indentation and preserves the declaration', () => {
    expect(beautifyXml('<a><b>1</b><b>2</b></a>')).toBe('<a>\n  <b>1</b>\n  <b>2</b>\n</a>');
    expect(beautifyXml('<?xml version="1.0"?><a><b>x</b></a>')).toBe(
      '<?xml version="1.0"?>\n<a>\n  <b>x</b>\n</a>'
    );
    expect(beautifyXml('<a><b><c>deep</c></b></a>', 4)).toBe('<a>\n    <b>\n        <c>deep</c>\n    </b>\n</a>');
    expect(beautifyXml('<root><empty /></root>')).toBe('<root>\n  <empty />\n</root>');
  });

  it('minifies and rejects malformed XML', () => {
    expect(minifyXml('<a>\n  <b>1</b>\n</a>')).toBe('<a><b>1</b></a>');
    expect(() => beautifyXml('<a><b></a>')).toThrow();
    expect(() => beautifyXml('')).toThrow('Input is empty.');
    expect(() => beautifyXml('not xml at all <')).toThrow();
  });

  it('renders the sample formatted and shows an error for bad XML', () => {
    renderTool(<XmlBeautifier onBack={noop} />);
    const output = screen.getByTestId('xml-output');
    expect(output.textContent).toContain('<library>');
    expect(output.textContent).toContain('  <book id="1">');
    expect(output.textContent).toContain('    <title>The Old Lighthouse</title>');
    fireEvent.change(screen.getByLabelText('XML Input'), { target: { value: '<a><b></a>' } });
    expect(screen.getByTestId('xml-error')).toBeInTheDocument();
  });
});

describe('JwtDebugger', () => {
  it('decodes the jwt.io example token', () => {
    const decoded = decodeJwt(SAMPLE_JWT);
    expect(decoded.ok).toBe(true);
    expect(decoded.algorithm).toBe('HS256');
    expect(decoded.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(decoded.payload).toEqual({ sub: '1234567890', name: 'John Doe', iat: 1516239022 });
    expect(decoded.expired).toBeNull(); // no exp claim on the sample
    expect(decoded.signature).toBe('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  });

  it('rejects malformed tokens and flags expired ones', () => {
    expect(decodeJwt('not-a-token').error).toMatch(/three base64url segments/);
    expect(decodeJwt('').error).toMatch(/Paste a JWT/);
    expect(decodeJwt('aaa.bbb.ccc').error).toMatch(/not valid JSON|base64url-decode/);
    const expiredToken = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'eyJzdWIiOiIxIiwiZXhwIjoxMDAwMDAwMDAwfQ',
      'sig',
    ].join('.');
    const decoded = decodeJwt(expiredToken);
    expect(decoded.ok).toBe(true);
    expect(decoded.expired).toBe(true);
  });

  it('verifies the HS256 signature against the known secret', async () => {
    await expect(verifyJwtHs256(SAMPLE_JWT, 'your-256-bit-secret')).resolves.toBe(true);
    await expect(verifyJwtHs256(SAMPLE_JWT, 'wrong-secret')).resolves.toBe(false);
  });

  it('renders header/payload and verifies in the UI', async () => {
    renderTool(<JwtDebugger onBack={noop} />);
    expect(screen.getByTestId('jwt-header')).toHaveTextContent('HS256');
    expect(screen.getByTestId('jwt-payload')).toHaveTextContent('John Doe');
    fireEvent.change(screen.getByLabelText(/Verify HS256 Signature/), { target: { value: 'your-256-bit-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(screen.getByTestId('jwt-verify-result')).toHaveTextContent('Signature is valid'));
  });
});

describe('SqlFormatter', () => {
  it('formats a simple query with clauses on their own lines', () => {
    expect(formatSql('select id, name from users where age > 18 order by name')).toBe(
      'SELECT\n  id,\n  name\nFROM users\nWHERE age > 18\nORDER BY\n  name'
    );
  });

  it('formats the sample query end to end', () => {
    const out = formatSql(SAMPLE_SQL);
    expect(out).toContain('SELECT\n  u.id,\n  u.name,\n  COUNT(o.id) AS order_count');
    expect(out).toContain('FROM users u');
    expect(out).toContain('LEFT JOIN orders o');
    expect(out).toContain('ON o.user_id = u.id');
    expect(out).toContain('WHERE u.age > 18');
    expect(out).toContain("AND u.status = 'active'");
    expect(out).toContain('GROUP BY\n  u.id,\n  u.name');
    expect(out).toContain('HAVING COUNT(o.id) > 0');
    expect(out).toContain('ORDER BY\n  order_count DESC');
    expect(out).toContain('LIMIT 10;');
  });

  it('preserves string literals and comments', () => {
    expect(formatSql("select * from t where name = 'O''Brien' -- keep me\nand id = 1")).toContain(
      "name = 'O''Brien'"
    );
    expect(formatSql("select * from t where name = 'O''Brien' -- keep me\nand id = 1")).toContain('-- keep me');
  });

  it('renders the formatted sample in the UI', () => {
    renderTool(<SqlFormatter onBack={noop} />);
    const output = screen.getByTestId('sql-output');
    expect(output.textContent).toContain('FROM users u');
    expect(output.textContent).toContain('LEFT JOIN orders o');
    fireEvent.change(screen.getByLabelText('SQL Input'), { target: { value: 'select 1' } });
    // textContent keeps the newline; toHaveTextContent collapses whitespace, so compare raw.
    expect(screen.getByTestId('sql-output').textContent).toBe('SELECT\n  1');
  });
});

describe('CronParser', () => {
  it('parses fields, lists, ranges, steps and names', () => {
    const weekdays = parseCron('0 9 * * MON-FRI');
    expect(weekdays.ok).toBe(true);
    if (weekdays.ok) {
      expect(weekdays.parsed.minute.values).toEqual(new Set([0]));
      expect(weekdays.parsed.hour.values).toEqual(new Set([9]));
      expect(weekdays.parsed.dayOfWeek.values).toEqual(new Set([1, 2, 3, 4, 5]));
      expect(weekdays.human).toContain('Monday');
    }
    const every15 = parseCron('*/15 * * * *');
    expect(every15.ok).toBe(true);
    if (every15.ok) expect(every15.parsed.minute.values.size).toBe(4);
    expect(parseCron('0 0 1 JAN *').ok).toBe(true);
    expect(parseCron('0 9 * *').ok).toBe(false);
    expect(parseCron('61 * * * *').ok).toBe(false);
    expect(parseCron('0 25 * * *').ok).toBe(false);
    expect(parseCron('0 9 * * FUNDAY').ok).toBe(false);
  });

  it('computes next runs correctly for known schedules', () => {
    // 2026-11-15 is a Sunday; weekdays at 9:00 -> Monday 2026-11-16 09:00.
    const runs = getNextCronRuns('0 9 * * MON-FRI', new Date(2026, 10, 15, 0, 0), 3);
    expect(runs).toHaveLength(3);
    expect(runs[0].getFullYear()).toBe(2026);
    expect(runs[0].getMonth()).toBe(10);
    expect(runs[0].getDate()).toBe(16);
    expect(runs[0].getHours()).toBe(9);
    expect(runs[0].getMinutes()).toBe(0);
    expect(runs[1].getDate()).toBe(17);
    expect(runs[2].getDate()).toBe(18);

    const quarterHour = getNextCronRuns('*/15 * * * *', new Date(2026, 0, 1, 0, 0), 5);
    expect(quarterHour.map((d) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`)).toEqual([
      '0:15', '0:30', '0:45', '1:00', '1:15',
    ]);

    // Monthly: midnight on the 1st, from Jan 15 -> Feb 1.
    const monthly = getNextCronRuns('0 0 1 * *', new Date(2026, 0, 15, 12, 0), 1);
    expect(monthly[0].getMonth()).toBe(1);
    expect(monthly[0].getDate()).toBe(1);

    // Impossible schedule (Feb 31) yields no runs.
    expect(getNextCronRuns('0 0 31 2 *', new Date(2026, 0, 1, 0, 0), 1)).toEqual([]);
  });

  it('renders next runs for the default weekday schedule', () => {
    renderTool(<CronParser onBack={noop} />);
    expect(screen.getByTestId('cron-human')).toBeInTheDocument();
    expect(screen.getByTestId('cron-runs').children.length).toBe(5);
    fireEvent.change(screen.getByLabelText(/Cron Expression/), { target: { value: 'not cron' } });
    expect(screen.getByTestId('cron-error')).toBeInTheDocument();
  });
});

describe('ColorBlender', () => {
  it('converts hex and blends black to white in 3 steps', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#10b981')).toEqual({ r: 16, g: 185, b: 129 });
    expect(hexToRgb('not-a-color')).toBeNull();
    expect(rgbToHex({ r: 16, g: 185, b: 129 })).toBe('#10b981');
    expect(blendColors('#000000', '#ffffff', 3)).toEqual(['#000000', '#808080', '#ffffff']);
    expect(blendColors('#ff0000', '#0000ff', 2)).toEqual(['#ff0000', '#0000ff']);
    expect(blendColors('#ff0000', '#0000ff', 5)[2]).toBe('#800080');
    expect(blendColors('zzzz', '#000000', 3)).toEqual([]);
  });

  it('renders the default palette with endpoints and midpoint', () => {
    renderTool(<ColorBlender onBack={noop} />);
    const palette = screen.getByTestId('blend-palette');
    expect(palette.children.length).toBe(5);
    expect(palette.textContent).toContain('#10b981');
    expect(palette.textContent).toContain('#3b82f6');
    // Midpoint of #10b981 and #3b82f6 is #269ebc (rounded channel averages).
    expect(palette.textContent).toContain('#269ebc');
  });
});

describe('UserAgent', () => {
  it('identifies Chrome on Windows, Safari on iPhone, Firefox on Linux and Edge', () => {
    const chrome = parseUserAgent(SAMPLE_USER_AGENTS[0].ua);
    expect(chrome.browser).toBe('Chrome');
    expect(chrome.browserVersion).toBe('131.0.0.0');
    expect(chrome.os).toBe('Windows');
    expect(chrome.device).toBe('Desktop');
    expect(chrome.engine).toBe('Blink');

    const safari = parseUserAgent(SAMPLE_USER_AGENTS[1].ua);
    expect(safari.browser).toBe('Safari');
    expect(safari.os).toBe('iOS');
    expect(safari.device).toBe('Mobile');
    expect(safari.engine).toBe('WebKit');

    const firefox = parseUserAgent(SAMPLE_USER_AGENTS[2].ua);
    expect(firefox.browser).toBe('Firefox');
    expect(firefox.os).toBe('Linux');

    const edge = parseUserAgent(SAMPLE_USER_AGENTS[3].ua);
    expect(edge.browser).toBe('Edge');

    expect(parseUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)').isBot).toBe(true);
  });

  it('renders parsed details for a pasted UA string', () => {
    renderTool(<UserAgent onBack={noop} />);
    fireEvent.change(screen.getByLabelText('User-Agent String'), { target: { value: SAMPLE_USER_AGENTS[1].ua } });
    const result = screen.getByTestId('ua-result');
    expect(result.textContent).toContain('Safari 18.1');
    expect(result.textContent).toContain('iOS 18.1');
    expect(result.textContent).toContain('Mobile');
  });
});

describe('MockApi', () => {
  it('validates JSON bodies', () => {
    expect(validateMockBody('{"a":1}').ok).toBe(true);
    expect(validateMockBody('[1,2]').ok).toBe(true);
    expect(validateMockBody('').ok).toBe(true);
    expect(validateMockBody('"just a string"').ok).toBe(false);
    expect(validateMockBody('{bad json').ok).toBe(false);
  });

  it('simulates a request locally with the configured delay and status', async () => {
    const config: MockConfig = {
      method: 'GET',
      path: '/api/users/42',
      status: 404,
      delayMs: 120,
      headers: [{ key: 'X-Test', value: 'yes' }],
      body: '{"error":"not found"}',
    };
    const started = performance.now();
    const res = await simulateMockRequest(config);
    const elapsed = performance.now() - started;
    expect(res.status).toBe(404);
    expect(res.statusText).toBe('Not Found');
    expect(res.headers['X-Test']).toBe('yes');
    expect(res.body).toContain('"error": "not found"');
    expect(res.elapsedMs).toBeGreaterThanOrEqual(100);
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  it('renders the mock and shows a 200 response with the sample body', async () => {
    renderTool(<MockApi onBack={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /Send Test Request/ }));
    await waitFor(
      () => expect(screen.getByTestId('mock-response')).toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(screen.getByTestId('mock-response')).toHaveTextContent('200 OK');
    expect(screen.getByTestId('mock-response')).toHaveTextContent('Ada Lovelace');
    fireEvent.change(screen.getByLabelText('Response Body (JSON)'), { target: { value: '{oops' } });
    expect(screen.getByTestId('mock-body-error')).toBeInTheDocument();
  });
});
