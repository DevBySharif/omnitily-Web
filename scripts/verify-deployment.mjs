const args = process.argv.slice(2);
const value = (name) => { const inline = args.find((item) => item.startsWith(`${name}=`)); if (inline) return inline.slice(name.length + 1); const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const input = value('--base-url') || process.env.DEPLOYMENT_BASE_URL;
if (!input) { console.error('Usage: npm run verify:deployment -- --base-url=https://deployment.example'); process.exit(2); }
let base;
try { base = new URL(input); } catch { console.error('Invalid base URL.'); process.exit(2); }
if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.pathname !== '/') { console.error('Base URL must be an origin without credentials or a path.'); process.exit(2); }
const allowedOrigin = value('--allowed-origin') || base.origin;
const { INDEXABLE_TOOLS } = await import('../src/toolsData.ts');
const { LEGAL_PAGE_LIST } = await import('../src/lib/legalContent.ts');
const { CATEGORY_HUBS } = await import('../src/lib/categoryHubs.ts');
// 1 home + indexable tools + legal pages + category hubs + about page.
const expectedSitemapUrls = 1 + INDEXABLE_TOOLS.length + LEGAL_PAGE_LIST.length + CATEGORY_HUBS.length + 1;
const checks = [];
const record = (name, pass, detail = '') => checks.push({ name, pass, detail });
async function get(path, init = {}) { return fetch(new URL(path, base), { ...init, redirect: 'manual', signal: AbortSignal.timeout(8000) }); }
function safeError(body) { return body?.error?.requestId && !JSON.stringify(body).match(/stack|filesystem|api[_-]?key|<html/i); }

try {
  const home = await get('/'); const html = await home.text(); record('homepage', home.status === 200 && html.includes('id="root"'));
  const tool = await get('/tools/image-converter'); record('direct tool SPA', tool.status === 200 && (await tool.text()).includes('id="root"'));
  const assetPath = html.match(/(?:src|href)="(\/assets\/[^"]+)"/)?.[1];
  const asset = assetPath ? await get(assetPath) : null; record('hashed asset', Boolean(asset?.ok && /immutable/.test(asset.headers.get('cache-control') || '')));
  const unknownPage = await get('/not-a-page'); record('unknown page 404', unknownPage.status === 404);
  const unknownApi = await get('/api/not-a-route'); const unknownBody = await unknownApi.json(); record('unknown API', unknownApi.status === 404 && safeError(unknownBody));
  for (const path of ['/api/resolve-social', '/api/media-proxy']) { const response = await get(path); const body = await response.json(); record(`${path} disabled`, response.status === 410 && body.error?.code === 'FEATURE_DISABLED' && safeError(body)); }
  const transcription = await get('/api/transcribe'); const transcriptionBody = await transcription.json(); record('transcription disabled', transcription.status === 410 && transcriptionBody.error?.code === 'FEATURE_DISABLED' && safeError(transcriptionBody));
  const health = await get('/api/health'); record('health', health.status === 200 && (await health.json()).status === 'ok');
  const readiness = await get('/api/readiness'); record('readiness', readiness.status === 200 && (await readiness.json()).status === 'ready');
  const csp = home.headers.get('content-security-policy') || ''; record('production CSP', csp.includes("script-src 'self'") && !csp.includes('unsafe-eval') && !/script-src[^;]*unsafe-inline/.test(csp));
  record('security headers', home.headers.get('strict-transport-security') !== null && home.headers.get('x-content-type-options') === 'nosniff' && csp.includes("frame-ancestors 'none'"));
  record('HTML cache', /must-revalidate/.test(home.headers.get('cache-control') || ''));
  const cors = await get('/api/health', { headers: { Origin: allowedOrigin } }); record('allowed CORS', cors.headers.get('access-control-allow-origin') === allowedOrigin && /Origin/i.test(cors.headers.get('vary') || ''));
  const rejected = await get('/api/health', { headers: { Origin: 'https://evil.example' } }); record('rejected CORS', rejected.status === 403 && !rejected.headers.get('access-control-allow-origin'));
  const sitemap = await get('/sitemap.xml'); const sitemapText = await sitemap.text(); record('sitemap', sitemap.ok && (sitemapText.match(/<loc>/g) || []).length === expectedSitemapUrls);
  const robots = await get('/robots.txt'); record('robots', robots.ok && (await robots.text()).includes('Sitemap:'));
} catch (error) { record('verification execution', false, error instanceof Error ? error.message.slice(0, 120) : 'unknown error'); }

console.table(checks.map(({ name, pass, detail }) => ({ Check: name, Result: pass ? 'PASS' : 'FAIL', Detail: detail })));
if (checks.some((check) => !check.pass)) process.exit(1);
