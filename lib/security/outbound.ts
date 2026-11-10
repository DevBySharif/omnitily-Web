import dns from 'node:dns/promises';
import net from 'node:net';
import { ApiError } from './errors.js';

export type OutboundLookup = (hostname: string) => Promise<Array<{ address: string; family: number }>>;
const IPV4_BLOCKS: Array<[number, number]> = [[0x00000000,8],[0x0a000000,8],[0x64400000,10],[0x7f000000,8],[0xa9fe0000,16],[0xac100000,12],[0xc0000000,24],[0xc0000200,24],[0xc0586300,24],[0xc0a80000,16],[0xc6120000,15],[0xc6336400,24],[0xcb007100,24],[0xe0000000,4],[0xf0000000,4]];

function ipv4Number(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255)) return null;
  return parts.reduce((n, p) => ((n << 8) | Number(p)) >>> 0, 0);
}

export function isPublicIp(address: string): boolean {
  if (address.toLowerCase().startsWith('::ffff:')) return isPublicIp(address.slice(7));
  if (net.isIPv4(address)) {
    const n = ipv4Number(address)!;
    return !IPV4_BLOCKS.some(([base, bits]) => (n >>> (32 - bits)) === (base >>> (32 - bits)));
  }
  if (!net.isIPv6(address)) return false;
  const ip = address.toLowerCase();
  return !(ip === '::' || ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || /^fe[89ab]/.test(ip) || ip.startsWith('ff') || ip.startsWith('2001:db8:'));
}

export async function validateOutboundUrl(raw: string, options: { lookup?: OutboundLookup; allowHttp?: boolean } = {}): Promise<URL> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new ApiError(400, 'BAD_REQUEST', 'The URL is invalid.'); }
  if (url.protocol !== 'https:' && !(options.allowHttp && url.protocol === 'http:')) throw new ApiError(400, 'BAD_REQUEST', 'The URL protocol is not allowed.');
  if (url.username || url.password) throw new ApiError(400, 'BAD_REQUEST', 'URLs containing credentials are not allowed.');
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) throw new ApiError(403, 'BAD_REQUEST', 'The URL host is not allowed.');
  const literal = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(literal)) {
    if (!isPublicIp(literal)) throw new ApiError(403, 'BAD_REQUEST', 'The URL host is not allowed.');
  } else {
    let results: Array<{ address: string; family: number }>;
    try { results = await (options.lookup ?? ((host) => dns.lookup(host, { all: true })))(hostname); } catch { throw new ApiError(403, 'BAD_REQUEST', 'The URL host could not be validated.'); }
    if (!results.length || results.some(({ address }) => !isPublicIp(address))) throw new ApiError(403, 'BAD_REQUEST', 'The URL host is not allowed.');
  }
  url.hostname = hostname;
  return url;
}

export async function secureFetch(raw: string, options: { fetchImpl?: typeof fetch; lookup?: OutboundLookup; maxRedirects?: number; maxBytes: number; timeoutMs: number; acceptedMime: RegExp; allowHttp?: boolean }): Promise<{ response: Response; bytes: Uint8Array; finalUrl: URL }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const visited = new Set<string>();
  let current = await validateOutboundUrl(raw, options);
  for (let redirects = 0; ; redirects++) {
    if (visited.has(current.href)) throw new ApiError(502, 'PROVIDER_ERROR', 'The upstream redirect looped.');
    visited.add(current.href);
    const response = await fetchImpl(current, { redirect: 'manual', signal: AbortSignal.timeout(options.timeoutMs), headers: { Accept: '*/*', 'Accept-Encoding': 'identity', 'User-Agent': 'Omnitily/1.0' } });
    if ([301,302,303,307,308].includes(response.status)) {
      if (redirects >= (options.maxRedirects ?? 3)) throw new ApiError(502, 'PROVIDER_ERROR', 'The upstream redirected too many times.');
      const location = response.headers.get('location');
      if (!location) throw new ApiError(502, 'PROVIDER_ERROR', 'The upstream redirect was invalid.');
      let next: URL;
      try { next = new URL(location, current); } catch { throw new ApiError(502, 'PROVIDER_ERROR', 'The upstream redirect was invalid.'); }
      if (current.protocol === 'https:' && next.protocol !== 'https:') throw new ApiError(502, 'PROVIDER_ERROR', 'The upstream protocol downgrade was rejected.');
      current = await validateOutboundUrl(next.href, options);
      continue;
    }
    if (!response.ok) throw new ApiError(502, 'PROVIDER_ERROR', 'The upstream service returned an error.');
    const mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!options.acceptedMime.test(mime)) throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'The upstream content type is not allowed.');
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > options.maxBytes) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The upstream response is too large.');
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = []; let total = 0;
    if (reader) while (true) { const part = await reader.read(); if (part.done) break; total += part.value.byteLength; if (total > options.maxBytes) { await reader.cancel(); throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The upstream response is too large.'); } chunks.push(part.value); }
    const bytes = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { response, bytes, finalUrl: current };
  }
}
