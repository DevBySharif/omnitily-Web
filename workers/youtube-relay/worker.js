/**
 * Omnitily YouTube relay — a tiny Cloudflare Worker that forwards YouTube
 * InnerTube player requests from Cloudflare's egress instead of the
 * serverless host's datacenter IP.
 *
 * Why: YouTube blocks the InnerTube player endpoint from datacenter IPs.
 * Vercel's shared egress gets HTTP 429s and other cloud IPs get a "Sign in
 * to confirm you're not a bot" wall, so the direct call fails from almost
 * anywhere a serverless host runs. Routing the same request through this
 * Worker changes only the egress IP — the request itself is identical.
 *
 * Safety: this is NOT a general-purpose open proxy. It only forwards paths
 * under /youtubei/ to www.youtube.com. Anything else gets a 404.
 *
 * Deploy (free Cloudflare account, no card, ~10 minutes):
 *   1. dash.cloudflare.com -> Workers & Pages -> Create application ->
 *      Create Worker -> name it (e.g. omnitily-yt-relay) -> Deploy.
 *   2. Edit code -> replace the whole file with this script -> Deploy.
 *   3. Copy the Worker URL (https://<name>.<subdomain>.workers.dev).
 *   4. In Vercel -> Settings -> Environment Variables -> add
 *      YT_RELAY_URL=<that URL> (Production) -> redeploy.
 *   5. Test a YouTube link on the live site.
 *
 * Honest caveat: Cloudflare's egress IPs may ALSO get flagged by YouTube
 * one day — this is a free experiment, not a guarantee. If the live site
 * still answers 429 after the relay is live, the next step is a paid
 * residential proxy via PROXY_URL (see .env.example).
 *
 * Removal: delete the YT_RELAY_URL variable in Vercel and redeploy, then
 * delete the Worker. The app falls back to the direct call automatically.
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Only InnerTube paths, only to YouTube.
    if (!url.pathname.startsWith('/youtubei/')) {
      return new Response('Not found', { status: 404 });
    }

    const target = `https://www.youtube.com${url.pathname}${url.search}`;
    const headers = new Headers(request.headers);
    headers.set('host', 'www.youtube.com');

    const init = { method: request.method, headers, redirect: 'manual' };
    // GET/HEAD requests must not carry a body.
    if (request.method !== 'GET' && request.method !== 'HEAD') init.body = request.body;

    let upstream;
    try {
      upstream = await fetch(target, init);
    } catch {
      return new Response('Upstream fetch failed', { status: 502 });
    }

    // Forward status + body; only the headers the player response needs.
    const out = new Headers();
    const ct = upstream.headers.get('content-type');
    if (ct) out.set('content-type', ct);
    const ra = upstream.headers.get('retry-after');
    if (ra) out.set('retry-after', ra);
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
