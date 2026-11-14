// Cryptographic Hash Generator — rebuilt (Wave 5a).
//
// The previous implementation mislabeled non-cryptographic toy hashes
// (DJB2/SDBM) as cryptographic, so the tool was disabled. This version
// computes real digests with the WebCrypto API (crypto.subtle.digest).
//
// MD5 is NOT available through WebCrypto and is deliberately not offered:
// there is no honest way to compute it in the browser without shipping a
// hand-rolled implementation, and MD5 is broken for security use anyway.
// SHA-1 is available via WebCrypto but is shown as legacy-only.

import React, { useState } from 'react';
import { CheckCircle, Copy, Hash, WarningCircle } from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export const HASH_ALGORITHMS = ['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1'] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

/** Digest length in hex characters for each algorithm. */
export const HASH_HEX_LENGTHS: Record<HashAlgorithm, number> = {
  'SHA-256': 64,
  'SHA-384': 96,
  'SHA-512': 128,
  'SHA-1': 40,
};

export function hexEncode(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Real cryptographic digest via WebCrypto. Throws if the API is unavailable. */
export async function hashText(input: string, algorithm: HashAlgorithm): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== 'function') {
    throw new Error('WebCrypto (crypto.subtle) is not available in this browser.');
  }
  const digest = await subtle.digest(algorithm, new TextEncoder().encode(input));
  return hexEncode(digest);
}

/** Compute every offered digest for the same input in parallel. */
export async function hashTextAll(input: string): Promise<Record<HashAlgorithm, string>> {
  const entries = await Promise.all(
    HASH_ALGORITHMS.map(async (algo) => [algo, await hashText(input, algo)] as const),
  );
  return Object.fromEntries(entries) as Record<HashAlgorithm, string>;
}

export default function HashGenerator({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [input, setInput] = useState('abc');
  const [results, setResults] = useState<Record<HashAlgorithm, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedAlgo, setCopiedAlgo] = useState<HashAlgorithm | null>(null);

  const generate = async () => {
    setError('');
    if (!input) {
      const message = 'Enter some text to hash.';
      setError(message);
      toast.error('Nothing to Hash', message);
      return;
    }
    setBusy(true);
    try {
      const hashes = await hashTextAll(input);
      setResults(hashes);
      try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
      toast.success('Hashes Computed', 'Real WebCrypto digests — SHA-256, SHA-384, SHA-512 and legacy SHA-1.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not compute the hash.';
      setError(message);
      toast.error('Cannot Hash', message);
    } finally {
      setBusy(false);
    }
  };

  const copyHash = async (algo: HashAlgorithm) => {
    if (!results) return;
    try {
      await navigator.clipboard.writeText(results[algo]);
      setCopiedAlgo(algo);
      toast.success('Copied', `${algo} digest copied to clipboard.`);
    } catch (e) {
      toast.error('Copy Failed', 'Your browser blocked clipboard access — select and copy manually.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="hash-generator-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Hash className="w-8 h-8 text-[#10b981]" />
            Cryptographic Hash Generator
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real digests computed locally with the WebCrypto API (crypto.subtle.digest). Nothing is sent anywhere.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="hash-input" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Text to hash</label>
            <textarea
              id="hash-input"
              rows={5}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or paste text here…"
              className="text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] font-mono resize-y"
            />
            <span className="text-[10px] text-gray-500">Input is UTF-8 encoded before hashing, exactly as WebCrypto does it.</span>
          </div>

          <button
            onClick={generate}
            disabled={busy}
            className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-all cursor-pointer disabled:opacity-50"
          >
            {busy ? 'Hashing…' : 'Compute Hashes'}
          </button>

          {error && (
            <div className="flex items-start gap-2 text-rose-400 text-sm bg-rose-950/20 border border-rose-900/40 rounded-xl px-4 py-3">
              <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span data-testid="hash-error">{error}</span>
            </div>
          )}

          <p className="text-[10px] text-gray-500 leading-relaxed">
            MD5 is not offered: it is not available through WebCrypto, and it is cryptographically broken.
            SHA-1 is available through WebCrypto but is legacy-only — do not use it for security decisions.
          </p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Digests</span>
          {results ? (
            <div className="flex flex-col gap-4">
              {HASH_ALGORITHMS.map((algo) => (
                <div key={algo}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white font-mono">
                      {algo}
                      {algo === 'SHA-1' && <span className="text-amber-400 font-sans font-normal"> — legacy, not recommended</span>}
                    </span>
                    <button onClick={() => copyHash(algo)} aria-label={`Copy ${algo} digest`} className="text-[#10b981] hover:text-white cursor-pointer">
                      {copiedAlgo === algo ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div data-testid={`hash-${algo}`} className="bg-black border border-[#222] p-3 rounded-lg font-mono text-xs text-emerald-300 break-all">
                    {results[algo]}
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-gray-500">
                Known check: SHA-256 of &ldquo;abc&rdquo; is ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad.
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Press Compute Hashes to see the digests. Try the default &ldquo;abc&rdquo; — its SHA-256 is a well-known test vector.</p>
          )}
        </div>
      </div>
    </div>
  );
}
