import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle,
  Copy,
  Play,
  Trash,
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export interface MockHeader {
  key: string;
  value: string;
}

export interface MockConfig {
  method: string;
  path: string;
  status: number;
  delayMs: number;
  headers: MockHeader[];
  body: string;
}

export interface MockResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  elapsedMs: number;
}

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export const HTTP_STATUSES: { code: number; text: string }[] = [
  { code: 200, text: 'OK' },
  { code: 201, text: 'Created' },
  { code: 204, text: 'No Content' },
  { code: 400, text: 'Bad Request' },
  { code: 401, text: 'Unauthorized' },
  { code: 403, text: 'Forbidden' },
  { code: 404, text: 'Not Found' },
  { code: 422, text: 'Unprocessable Entity' },
  { code: 500, text: 'Internal Server Error' },
  { code: 503, text: 'Service Unavailable' },
];

export const SAMPLE_BODY = `{
  "id": 42,
  "name": "Ada Lovelace",
  "role": "author",
  "books": [
    { "title": "Notes on the Engine", "year": 1843 },
    { "title": "The Sketchbook", "year": 1851 }
  ],
  "active": true
}`;

/** Validate the mock body: must be valid JSON (an object or array), empty means no body. */
export function validateMockBody(body: string): { ok: boolean; error: string | null; parsed: unknown } {
  if (body.trim() === '') return { ok: true, error: null, parsed: null };
  try {
    const parsed = JSON.parse(body);
    if (parsed !== null && typeof parsed === 'object') return { ok: true, error: null, parsed };
    return { ok: false, error: 'The body must be a JSON object or array.', parsed: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON.', parsed: null };
  }
}

/**
 * Simulate a request against the mock — locally, in this browser, after the
 * configured delay. Returns the real elapsed time alongside the response.
 * This is a local simulator, not a network call.
 */
export async function simulateMockRequest(config: MockConfig): Promise<MockResponse> {
  const started = performance.now();
  await new Promise((resolve) => setTimeout(resolve, config.delayMs));
  const statusEntry = HTTP_STATUSES.find((s) => s.code === config.status);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  for (const h of config.headers) {
    if (h.key.trim()) headers[h.key.trim()] = h.value;
  }
  const elapsed = Math.round(performance.now() - started);
  const body = config.body.trim() === '' ? '' : JSON.stringify(JSON.parse(config.body), null, 2);
  return {
    status: config.status,
    statusText: statusEntry?.text ?? '',
    headers,
    body,
    elapsedMs: elapsed,
  };
}

export function buildFetchSnippet(config: MockConfig): string {
  const statusEntry = HTTP_STATUSES.find((s) => s.code === config.status);
  return `// Mock response for ${config.method} ${config.path}
// Status: ${config.status} ${statusEntry?.text ?? ''} — simulated locally, no real server.
const mockResponse = {
  status: ${config.status},
    headers: ${JSON.stringify(Object.fromEntries(config.headers.filter((h) => h.key.trim()).map((h) => [h.key, h.value])), null, 2)},
  body: ${config.body.trim() === '' ? 'null' : config.body.trim()},
};

fetch('${config.path}', { method: '${config.method}' })
  .then(() => mockResponse);`;
}

const statusColor = (status: number) =>
  status >= 200 && status < 300
    ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
    : status >= 400 && status < 500
      ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
      : 'text-rose-300 bg-rose-500/10 border-rose-500/30';

export default function MockApi({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [method, setMethod] = useState<string>('GET');
  const [path, setPath] = useState('/api/users/42');
  const [status, setStatus] = useState(200);
  const [delayMs, setDelayMs] = useState(250);
  const [headers, setHeaders] = useState<MockHeader[]>([{ key: 'X-Mock-Source', value: 'omnitily' }]);
  const [body, setBody] = useState(SAMPLE_BODY);
  const [response, setResponse] = useState<MockResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  const config: MockConfig = useMemo(
    () => ({ method, path, status, delayMs, headers, body }),
    [method, path, status, delayMs, headers, body]
  );
  const validation = useMemo(() => validateMockBody(body), [body]);

  const updateHeader = (index: number, patch: Partial<MockHeader>) => {
    setHeaders((prev) => prev.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  };

  const runTest = async () => {
    if (!validation.ok) {
      toast.error('Invalid JSON Body', validation.error ?? 'Fix the body before testing.');
      return;
    }
    setIsRunning(true);
    setResponse(null);
    try {
      const res = await simulateMockRequest(config);
      setResponse(res);
      try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
      toast.success('Mock Responded', `${res.status} ${res.statusText} in ${res.elapsedMs} ms (simulated locally).`);
    } catch (e) {
      toast.error('Simulation Failed', e instanceof Error ? e.message : 'The mock could not run.');
    } finally {
      setIsRunning(false);
    }
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(buildFetchSnippet(config));
      setIsCopied(true);
      toast.success('Snippet Copied', 'The fetch snippet is on your clipboard.');
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = window.setTimeout(() => setIsCopied(false), 1500);
    } catch (e) {
      toast.error('Copy Failed', 'Your browser blocked clipboard access.');
    }
  };

  const copyResponse = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response.body);
      toast.success('Response Copied', 'The mock response body is on your clipboard.');
    } catch (e) {
      toast.error('Copy Failed', 'Your browser blocked clipboard access.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="mock-api-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Play className="w-8 h-8 text-[#10b981]" />
            Mock API Response Builder
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Draft a mock JSON response and test it instantly — simulated locally, no server needed.
          </p>
        </div>
        <button
          onClick={() => { setBody(SAMPLE_BODY); setMethod('GET'); setPath('/api/users/42'); setStatus(200); setDelayMs(250); }}
          className="text-xs font-semibold text-[#10b981] hover:text-[#059669] hover:bg-[#10b981]/10 px-3 py-1.5 rounded border border-emerald-900/50 transition-colors cursor-pointer"
        >
          Load Sample
        </button>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_160px] gap-3">
          <div className="flex flex-col gap-2">
            <label htmlFor="mock-method" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Method</label>
            <select
              id="mock-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full text-sm font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] cursor-pointer"
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="mock-path" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Endpoint Path</label>
            <input
              id="mock-path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/api/users/42"
              spellCheck={false}
              className="w-full text-sm font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="mock-status" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</label>
            <select
              id="mock-status"
              value={status}
              onChange={(e) => setStatus(parseInt(e.target.value) || 200)}
              className="w-full text-sm font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] cursor-pointer"
            >
              {HTTP_STATUSES.map((s) => (
                <option key={s.code} value={s.code}>{s.code} {s.text}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label htmlFor="mock-delay" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Simulated Latency</label>
            <span className="text-xs font-bold text-[#10b981]">{delayMs} ms</span>
          </div>
          <input
            id="mock-delay"
            type="range"
            min="0"
            max="2000"
            step="50"
            value={delayMs}
            onChange={(e) => setDelayMs(parseInt(e.target.value) || 0)}
            className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Response Headers</span>
            <button
              onClick={() => setHeaders((prev) => [...prev, { key: '', value: '' }])}
              className="text-[11px] font-semibold text-[#10b981] hover:text-[#059669] transition-colors cursor-pointer"
            >
              + Add Header
            </button>
          </div>
          {headers.map((h, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                value={h.key}
                onChange={(e) => updateHeader(idx, { key: e.target.value })}
                placeholder="Header name"
                aria-label={`Header ${idx + 1} name`}
                spellCheck={false}
                className="flex-1 text-sm font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
              />
              <input
                value={h.value}
                onChange={(e) => updateHeader(idx, { value: e.target.value })}
                placeholder="Header value"
                aria-label={`Header ${idx + 1} value`}
                spellCheck={false}
                className="flex-1 text-sm font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
              />
              <button
                onClick={() => setHeaders((prev) => prev.filter((_, i) => i !== idx))}
                aria-label={`Remove header ${idx + 1}`}
                className="px-2 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="mock-body" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Response Body (JSON)</label>
            {validation.ok ? (
              <span className="text-[11px] font-semibold text-emerald-400">Valid JSON</span>
            ) : (
              <span data-testid="mock-body-error" className="text-[11px] font-semibold text-rose-400">{validation.error}</span>
            )}
          </div>
          <textarea
            id="mock-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder='{"key": "value"}'
            spellCheck={false}
            className="w-full h-56 text-sm font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] resize-y"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={runTest}
            disabled={isRunning || !validation.ok}
            className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" /> {isRunning ? 'Waiting…' : 'Send Test Request'}
          </button>
          <button
            onClick={copySnippet}
            className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-colors cursor-pointer flex items-center gap-2"
          >
            {isCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {isCopied ? 'Copied!' : 'Copy Fetch Snippet'}
          </button>
          <button
            onClick={() => { setBody(''); setResponse(null); }}
            className="ml-auto text-xs font-semibold text-gray-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Trash className="w-3.5 h-3.5" /> Clear Body
          </button>
        </div>

        {response && (
          <div data-testid="mock-response" className="border-t border-[#2a2a2a] pt-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold border rounded-full px-3 py-1 ${statusColor(response.status)}`}>
                {response.status} {response.statusText}
              </span>
              <span className="text-xs text-gray-400">
                {method} {path} — {response.elapsedMs} ms (simulated locally)
              </span>
              <button
                onClick={copyResponse}
                className="ml-auto text-[11px] font-semibold text-[#10b981] hover:text-[#059669] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" /> Copy Response
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {Object.entries(response.headers).map(([k, v]) => (
                <div key={k} className="text-xs font-mono text-gray-400">
                  {k}: {v}
                </div>
              ))}
            </div>
            <pre className="text-xs font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515] text-emerald-300 overflow-x-auto whitespace-pre">
              {response.body || '(empty body)'}
            </pre>
          </div>
        )}
      </div>
      <p className="text-[10px] text-gray-500 mt-3">
        This is a local simulator: the "request" never leaves your browser — it returns your configured
        response after the chosen delay so front-end code can be scaffolded against it.
      </p>
    </div>
  );
}
