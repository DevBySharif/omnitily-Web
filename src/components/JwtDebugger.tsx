import React, { useMemo, useState } from 'react';
import {
  CheckCircle,
  Copy,
  ShieldCheck,
  Trash,
} from '@phosphor-icons/react';
import { useToast } from './Toast';

export interface JwtDecodeResult {
  ok: boolean;
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signature: string;
  headerJson: string;
  payloadJson: string;
  error: string | null;
  expired: boolean | null;
  expiresAt: string | null;
  issuedAt: string | null;
  algorithm: string | null;
}

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

function formatTimestamp(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString();
}

/**
 * Decode a JWT's header and payload WITHOUT verifying the signature.
 * Signature verification needs a secret/key, which is a separate step.
 */
export function decodeJwt(token: string): JwtDecodeResult {
  const empty: JwtDecodeResult = {
    ok: false,
    header: null,
    payload: null,
    signature: '',
    headerJson: '',
    payloadJson: '',
    error: null,
    expired: null,
    expiresAt: null,
    issuedAt: null,
    algorithm: null,
  };
  const trimmed = token.trim();
  if (!trimmed) return { ...empty, error: 'Paste a JWT to decode it.' };
  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    return { ...empty, error: 'A JWT has three base64url segments separated by dots (header.payload.signature).' };
  }
  try {
    const headerJson = base64UrlDecode(parts[0]);
    const payloadJson = base64UrlDecode(parts[1]);
    let header: Record<string, unknown>;
    let payload: Record<string, unknown>;
    try {
      header = JSON.parse(headerJson) as Record<string, unknown>;
      payload = JSON.parse(payloadJson) as Record<string, unknown>;
    } catch (e) {
      return { ...empty, error: 'Header or payload is not valid JSON.' };
    }
    const algorithm = typeof header.alg === 'string' ? header.alg : null;
    const exp = typeof payload.exp === 'number' ? payload.exp : null;
    const iat = typeof payload.iat === 'number' ? payload.iat : null;
    return {
      ok: true,
      header,
      payload,
      signature: parts[2],
      headerJson: JSON.stringify(header, null, 2),
      payloadJson: JSON.stringify(payload, null, 2),
      error: null,
      expired: exp === null ? null : exp * 1000 < Date.now(),
      expiresAt: exp === null ? null : formatTimestamp(exp),
      issuedAt: iat === null ? null : formatTimestamp(iat),
      algorithm,
    };
  } catch (e) {
    return { ...empty, error: 'Could not base64url-decode a segment — check the token is complete.' };
  }
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Verify an HS256-signed JWT against a shared secret using WebCrypto.
 * Returns null when the algorithm is not HS256 or WebCrypto is unavailable.
 */
export async function verifyJwtHs256(token: string, secret: string): Promise<boolean | null> {
  const decoded = decodeJwt(token);
  if (!decoded.ok || decoded.algorithm !== 'HS256') return null;
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const parts = token.trim().split('.');
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, data);
    return base64UrlEncode(new Uint8Array(sig)) === parts[2];
  } catch (e) {
    return null;
  }
}

/** The canonical example token from jwt.io (HS256, secret "your-256-bit-secret"). */
export const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.' +
  'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

const CLAIM_LABELS: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expires',
  iat: 'Issued at',
  nbf: 'Not before',
  jti: 'Token ID',
};

export default function JwtDebugger({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [token, setToken] = useState(SAMPLE_JWT);
  const [secret, setSecret] = useState('');
  const [verifyState, setVerifyState] = useState<'idle' | 'checking' | 'valid' | 'invalid' | 'unavailable'>('idle');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const decoded = useMemo(() => decodeJwt(token), [token]);

  const verify = async () => {
    if (!secret) {
      toast.info('Secret Needed', 'Enter the HS256 shared secret to verify the signature.');
      return;
    }
    setVerifyState('checking');
    const result = await verifyJwtHs256(token, secret);
    if (result === null) {
      setVerifyState('unavailable');
      toast.error('Cannot Verify', 'This token is not HS256, or WebCrypto is unavailable in this browser.');
    } else if (result) {
      setVerifyState('valid');
      toast.success('Signature Valid', 'The signature matches the secret.');
    } else {
      setVerifyState('invalid');
      toast.error('Signature Invalid', 'The signature does not match this secret.');
    }
  };

  const copyJson = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      toast.success('Copied', `${label} JSON copied to your clipboard.`);
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch (e) {
      toast.error('Copy Failed', 'Your browser blocked clipboard access.');
    }
  };

  const payloadEntries = decoded.payload ? Object.entries(decoded.payload) : [];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="jwt-debugger-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-[#10b981]" />
            JSON Web Token (JWT) Parser
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Decode and inspect a JWT's header and payload, check expiry, and verify an HS256 signature.
          </p>
        </div>
        <button
          onClick={() => { setToken(SAMPLE_JWT); setSecret('your-256-bit-secret'); setVerifyState('idle'); }}
          className="text-xs font-semibold text-[#10b981] hover:text-[#059669] hover:bg-[#10b981]/10 px-3 py-1.5 rounded border border-emerald-900/50 transition-colors cursor-pointer"
        >
          Load Sample
        </button>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="jwt-token" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">JWT Token</label>
          <textarea
            id="jwt-token"
            value={token}
            onChange={(e) => { setToken(e.target.value); setVerifyState('idle'); }}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.…"
            spellCheck={false}
            className="w-full h-24 text-sm font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] resize-y break-all"
          />
        </div>

        {decoded.error && (
          <div data-testid="jwt-error" className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3">
            <span className="font-bold">Cannot decode: </span>
            {decoded.error}
          </div>
        )}

        {decoded.ok && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-300 bg-[#151515] border border-[#2a2a2a] rounded-full px-3 py-1">
                Algorithm: {decoded.algorithm ?? 'unknown'}
              </span>
              {decoded.expired === true && (
                <span data-testid="jwt-expired" className="text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-full px-3 py-1">
                  Expired {decoded.expiresAt ? `(${decoded.expiresAt})` : ''}
                </span>
              )}
              {decoded.expired === false && (
                <span data-testid="jwt-valid" className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1">
                  Valid until {decoded.expiresAt}
                </span>
              )}
              {decoded.expired === null && (
                <span className="text-xs font-semibold text-gray-400 bg-[#151515] border border-[#2a2a2a] rounded-full px-3 py-1">
                  No expiry claim (exp)
                </span>
              )}
              {decoded.issuedAt && (
                <span className="text-xs font-semibold text-gray-400 bg-[#151515] border border-[#2a2a2a] rounded-full px-3 py-1">
                  Issued {decoded.issuedAt}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Header</label>
                  <button
                    onClick={() => copyJson('Header', decoded.headerJson)}
                    className="text-[11px] font-semibold text-[#10b981] hover:text-[#059669] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> {copiedField === 'Header' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre data-testid="jwt-header" className="text-xs font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515] text-rose-300 overflow-x-auto whitespace-pre">
                  {decoded.headerJson}
                </pre>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payload</label>
                  <button
                    onClick={() => copyJson('Payload', decoded.payloadJson)}
                    className="text-[11px] font-semibold text-[#10b981] hover:text-[#059669] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> {copiedField === 'Payload' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre data-testid="jwt-payload" className="text-xs font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515] text-emerald-300 overflow-x-auto whitespace-pre">
                  {decoded.payloadJson}
                </pre>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Claims</span>
              <div className="flex flex-col gap-1">
                {payloadEntries.map(([key, value]) => (
                  <div key={key} className="flex gap-3 text-xs border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515]">
                    <span className="font-mono font-bold text-emerald-300 w-24 shrink-0">{key}</span>
                    <span className="text-gray-400">{CLAIM_LABELS[key] ?? 'Custom claim'}</span>
                    <span className="font-mono text-gray-200 break-all ml-auto text-right">
                      {key === 'exp' && typeof value === 'number'
                        ? `${value} (${formatTimestamp(value)})`
                        : key === 'iat' && typeof value === 'number'
                          ? `${value} (${formatTimestamp(value)})`
                          : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="jwt-signature" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Signature (base64url, not verified by decoding)
              </label>
              <code id="jwt-signature" data-testid="jwt-signature" className="text-xs font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515] text-gray-400 break-all">
                {decoded.signature}
              </code>
            </div>

            <div className="border-t border-[#2a2a2a] pt-4 flex flex-col gap-2">
              <label htmlFor="jwt-secret" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Verify HS256 Signature — enter the shared secret
              </label>
              <div className="flex gap-2">
                <input
                  id="jwt-secret"
                  type="password"
                  value={secret}
                  onChange={(e) => { setSecret(e.target.value); setVerifyState('idle'); }}
                  placeholder="your-256-bit-secret"
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 text-sm font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
                />
                <button
                  onClick={verify}
                  disabled={verifyState === 'checking'}
                  className="py-2 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {verifyState === 'checking' ? 'Checking…' : 'Verify'}
                </button>
              </div>
              {verifyState === 'valid' && (
                <p data-testid="jwt-verify-result" className="text-sm text-emerald-300 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Signature is valid for this secret.
                </p>
              )}
              {verifyState === 'invalid' && (
                <p data-testid="jwt-verify-result" className="text-sm text-rose-300 font-semibold">
                  Signature does NOT match this secret.
                </p>
              )}
              {verifyState === 'unavailable' && (
                <p data-testid="jwt-verify-result" className="text-sm text-amber-300 font-semibold">
                  Verification unavailable — only HS256 tokens can be verified here.
                </p>
              )}
            </div>
          </>
        )}

        <button
          onClick={() => { setToken(''); setSecret(''); setVerifyState('idle'); }}
          className="self-start text-xs font-semibold text-gray-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Trash className="w-3.5 h-3.5" /> Clear
        </button>
      </div>
      <p className="text-[10px] text-gray-500 mt-3">
        Decoding is not verification: anyone can read a JWT's header and payload. Only a signature check with the
        secret proves the token was issued by its owner. Tokens are decoded locally — never sent anywhere.
      </p>
    </div>
  );
}
