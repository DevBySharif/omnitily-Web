# Cobalt on Render (free tier) — deploy guide

This is the easiest way to get Instagram and Facebook downloads working on
Omnitily. YouTube and TikTok already work without this; only Instagram and
Facebook need the Cobalt instance, because every public Cobalt instance is
now auth-gated or dead and Instagram's pages are login-walled from servers.

Cost: **$0**. No credit card. Render's free tier gives 512 MB RAM (Cobalt
needs 256 MB minimum) and 750 instance-hours a month.

What the repo already contains (all prepared, nothing for you to write):
- `render.yaml` — the Render Blueprint for the service
- `cobalt/Dockerfile` + `cobalt/entrypoint.sh` — a thin wrapper around the
  official `ghcr.io/imputnet/cobalt:latest` image that reads its config from
  Render's environment (public URL, port, API key)
- the app already prefers this instance for Instagram/Facebook and detects
  when it is still waking up from sleep

What you do yourself (account steps, about 15 minutes):

## 1. Create a Render account

Go to https://dashboard.render.com and sign up (email or GitHub — use the
GitHub account that owns the repo, it makes step 2 one click). No card is
asked for on the free tier.

## 2. Deploy the Blueprint

1. In the dashboard: **New + → Blueprint**.
2. Connect the **DevBySharif/omnitily-Web** repository (pick the repo, branch
   `main`). Render reads `render.yaml` from the repo root.
3. It shows one service: **omnitily-cobalt** (Web Service, Docker, Free).
4. Render prompts for **`COBALT_API_KEY`** — paste a random UUID as the key.
   Generate one first, for example:
   ```bash
   uuidgen
   ```
   (any UUID generator works; on Windows PowerShell: `[guid]::NewGuid()`).
   **Save this UUID somewhere safe** — you need the exact same value again
   in step 4, and it is the only thing protecting your instance from abuse.
5. Click **Apply**. The first build takes a few minutes (it pulls the Cobalt
   image and starts it). Wait until the service shows **Live**.

## 3. Get the service URL

On the service page, copy the URL at the top — it looks like:

```
https://omnitily-cobalt.onrender.com
```

## 4. Point Omnitily at it (Vercel)

1. Open your Vercel project → **Settings → Environment Variables**.
2. Add two variables (Production):
   - `COBALT_API_URL` = the URL from step 3, **with a trailing slash**
     (`https://omnitily-cobalt.onrender.com/`)
   - `COBALT_API_KEY` = the exact UUID from step 2
3. **Redeploy** the production deployment (Deployments → ⋮ → Redeploy), or
   push any commit — env vars only take effect on a new deployment.

## 5. Verify it works

From your computer:

```bash
# 1. The instance answers (instance info JSON):
curl -s https://omnitily-cobalt.onrender.com/ | head -c 300

# 2. It resolves an Instagram reel (replace the URL with a real public reel):
curl -s -X POST https://omnitily-cobalt.onrender.com/ \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -H 'Authorization: Api-Key <your-uuid>' \
  -d '{"url": "https://www.instagram.com/reel/DfF3eqGSKKc", "downloadMode": "auto", "videoQuality": "1080"}'
```

A working instance returns `"status": "tunnel"` or `"status": "redirect"`
with a `url`. Then try an Instagram link in the live Omnitily downloader —
it should resolve and download.

## Free-tier behaviour you should know

- **Sleep.** The service sleeps after 15 minutes without traffic. The
  first download after a quiet spell takes ~60 seconds to wake: the app
  answers `The download server is waking up after being idle (about a
  minute). Please try again in a moment.` — just retry once and it works.
- **Keep it awake (optional, free).** A free UptimeRobot monitor
  (https://uptimerobot.com, 50 monitors free, 5-minute interval) pinging
  `https://omnitily-cobalt.onrender.com/` keeps the instance warm, so
  visitors almost never hit the wake-up wait.
- **Bandwidth.** 5 GB/month on the free tier. Cobalt usually returns a
  `redirect` URL, so video bytes flow straight from the CDN to the visitor
  and do not count against it; `tunnel` downloads do count. For a small
  site this is plenty; if you outgrow it, Render's paid tier is $7/month.
- **Rate limits.** The Blueprint caps the instance at 20 requests/minute
  and 3-hour videos, and only the Omnitily site may call it from a browser
  (CORS). The API key means only Omnitily's server can ask it to resolve.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| App says "waking up … try again in a moment" | Normal after 15 min idle — retry once in a minute, or add the UptimeRobot ping above. |
| App says "…download server, which is not configured yet" | `COBALT_API_URL` / `COBALT_API_KEY` are missing in Vercel, or the deploy after adding them has not run yet. |
| `{"status":"error","error":{"code":"error.api.auth.invalid"}}` from curl | The `Authorization: Api-Key …` value does not match the `COBALT_API_KEY` set in Render. Rotate both to the same new UUID. |
| Render deploy fails on the Dockerfile | Paste the build log — the wrapper is tiny (entrypoint + key file) and this is the first thing to check. |
| Instance is Live but `/` returns 502 for a minute | The container is still booting (first boot downloads nothing, but Cobalt takes ~30s to be ready). Wait and retry. |

## Rotating the key

If the key ever leaks: generate a new UUID, change `COBALT_API_KEY` in the
Render dashboard (service → Environment → save → it redeploys), then change
the same value in Vercel and redeploy. No code changes.

## The alternative: your own VPS

If you ever want an always-on instance with no sleep and no bandwidth cap,
the same image runs on any VPS with Docker — see
`docs/COBALT_SELF_HOSTING.md` (docker-compose, Oracle Always Free option).
The app config is identical: same two Vercel variables, different URL.
