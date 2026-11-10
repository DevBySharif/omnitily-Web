# Cobalt Self-Hosting Guide

**For Omnitily's social downloader integration.**

> **Easiest path first:** you do not need a VPS. The repo ships a Render
> Blueprint (`render.yaml` + `cobalt/`) that runs Cobalt on Render's free
> tier ($0, no card) — see **`docs/COBALT_RENDER_DEPLOY.md`** for the
> step-by-step. The guide below is for running the same instance on your
> own server instead.

---

## Overview

The Cobalt API must be deployed as a separate service. Omnitily's Vercel frontend calls our narrow API gateway, which calls the self-hosted Cobalt instance. The browser never contacts Cobalt directly.

```
Browser → Omnitily API (/api/download/*) → Cobalt API (COBALT_API_URL)
```

---

## Quick Start (Docker)

### 1. Create a project directory

```bash
mkdir cobalt-instance && cd cobalt-instance
```

### 2. Create `docker-compose.yml`

```yaml
services:
  cobalt:
    image: ghcr.io/imputnet/cobalt:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:9000:9000"
    environment:
      API_URL: "https://your-cobalt-domain.example/"
      API_PORT: 9000
      CORS_WILDCARD: 0
      CORS_URL: "https://omnitily.vercel.app"
      DURATION_LIMIT: 10800
      RATELIMIT_WINDOW: 60
      RATELIST_MAX: 20
      TUNNEL_LIFESPAN: 90
    volumes:
      - ./cookies.json:/app/cookies.json:ro  # optional, for authenticated services
```

### 3. Generate an API key

```bash
node -e "console.log(crypto.randomUUID())"
```

Create `keys.json`:
```json
{
  "YOUR-GENERATED-UUID": {
    "name": "omnitily-gateway",
    "limit": 30,
    "allowedServices": ["youtube", "instagram", "tiktok", "facebook"]
  }
}
```

### 4. Update docker-compose.yml with key file

```yaml
    volumes:
      - ./cookies.json:/app/cookies.json:ro
      - ./keys.json:/keys.json:ro
    environment:
      # ... existing vars ...
      API_KEY_URL: "file:///keys.json"
      API_AUTH_REQUIRED: 1
```

### 5. Start the instance

```bash
docker compose up -d
```

### 6. Verify

```bash
curl http://localhost:9000/
# Should return instance info JSON

curl -H "Authorization: Api-Key YOUR-UUID" \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
     http://localhost:9000/
# Should return tunnel/redirect/picker response
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_URL` | **Yes** | — | Public URL of your instance |
| `API_PORT` | No | `9000` | Listen port |
| `CORS_WILDCARD` | No | `1` | `0` = restricted, `1` = open |
| `CORS_URL` | No | — | Allowed origin (when wildcard=0) |
| `API_KEY_URL` | No | — | Path to keys.json |
| `API_AUTH_REQUIRED` | No | `0` | `1` = require auth |
| `DURATION_LIMIT` | No | `10800` | Max video duration (seconds) |
| `RATELIMIT_WINDOW` | No | `60` | Rate limit window (seconds) |
| `RATELIMIT_MAX` | No | `20` | Max requests per window |
| `TUNNEL_LIFESPAN` | No | `90` | Tunnel cache duration (seconds) |
| `DISABLED_SERVICES` | No | — | Comma-separated services to disable |

---

## Health Check

```bash
curl -sf http://localhost:9000/ | jq .cobalt.version
```

Returns instance version and supported services list.

---

## RAM / CPU / Storage

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 256MB | 512MB |
| CPU | 1 vCPU | 2 vCPU |
| Storage | 1GB | 5GB (for ffmpeg, temp files) |
| Network | 10Mbps | 100Mbps+ |

Cobalt uses ffmpeg for transcoding, which is CPU-intensive for video processing. Audio-only requests are lightweight.

---

## Logging & Privacy

- Cobalt logs request IDs, routes, methods, status codes, and durations
- No user URLs or download content are persisted
- Tunnel URLs are ephemeral (expire after TUNNEL_LIFESPAN)
- Consider running behind a reverse proxy (nginx/caddy) for TLS termination

---

## Updating

```bash
docker compose pull
docker compose up -d
```

Watchtower can automate this:
```yaml
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 86400 cobalt
```

---

## Security Checklist

- [ ] CORS restricted to `https://omnitily.vercel.app`
- [ ] API key authentication enabled
- [ ] Rate limiting configured
- [ ] Listening on `127.0.0.1` (not `0.0.0.0`) unless behind reverse proxy
- [ ] TLS termination handled by reverse proxy
- [ ] `cookies.json` not exposed publicly
- [ ] `keys.json` not exposed publicly
