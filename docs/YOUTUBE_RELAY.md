# YouTube relay (free fix for the InnerTube rate limit)

## The problem

YouTube blocks the InnerTube player endpoint from datacenter IPs:

- Vercel's shared egress IPs get **HTTP 429** on every InnerTube client
  (all 4 rotated clients fail the same way — rotation can't help an
  IP-based block).
- Other cloud IPs get a `LOGIN_REQUIRED` "Sign in to confirm you're not
  a bot" wall instead of stream data.
- The browser can't do the call either — the endpoint answers 403 to the
  CORS preflight, so there is no client-side route.
- Cobalt can't serve YouTube at all (blocked since mid-2025), yt-dlp
  isn't installed on Vercel, and the public Cobalt race is dead.

The video itself is fine — the block is about *where the request comes
from*, and it is usually temporary (minutes to a few hours), but on a
shared host it comes back often.

## The fix

`YT_RELAY_URL` — a free Cloudflare Worker that forwards the exact same
InnerTube request from Cloudflare's egress instead. The app reads the
variable at request time (`api/index.ts`, `ytFetch`): when it is set, an
InnerTube call goes to `<relay>/youtubei/v1/player` instead of
`www.youtube.com/youtubei/v1/player`. Nothing else changes — the
download still flows through `/api/media-proxy` as before, and a real
proxy via `PROXY_URL` still takes precedence over the relay.

The Worker (`workers/youtube-relay/worker.js`) only forwards paths under
`/youtubei/` to `www.youtube.com`. It is not a general-purpose proxy.

## Deploy (free, ~10 minutes)

1. Create a free Cloudflare account (no card) at dash.cloudflare.com.
2. **Workers & Pages → Create application → Create Worker** — name it
   (e.g. `omnitily-yt-relay`) → **Deploy**.
3. **Edit code** → replace the whole file with `workers/youtube-relay/worker.js` → **Deploy**.
4. Copy the Worker URL: `https://<name>.<subdomain>.workers.dev`.
5. In Vercel → your project → **Settings → Environment Variables** →
   add `YT_RELAY_URL` = that URL (Production) → **Redeploy**.
6. Test a YouTube link on the live site.

## If it still 429s

Cloudflare's egress IPs may also get flagged by YouTube one day — the
relay is a free experiment, not a guarantee. If the live site still
answers "YouTube temporarily blocked this request (rate limit)" with the
relay live, the next options are:

- Wait — the block lifts on its own, usually within hours.
- A paid residential proxy via `PROXY_URL` (see `.env.example`) — the
  reliable path, costs money.

## Removal

Delete the `YT_RELAY_URL` variable in Vercel and redeploy, then delete
the Worker. The app falls back to the direct call automatically.
