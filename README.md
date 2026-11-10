# Omnitily-Web

Omnitily is a React/Vite utility catalog with 117 stable route IDs. P0-A introduces truthful maturity states: functional, beta, coming soon, and temporarily unavailable. Tool pages disclose whether processing happens in the browser, on Omnitily’s server, or through an external provider.

## Requirements

- Node.js 22 or newer
- npm (the repository uses `package-lock.json`)

## Local development

```sh
npm install
npm run dev
```

The free production deployment requires no secrets, database, Redis, Gemini key, custom domain, or paid API. Browser-local tools remain available. Audio Transcriber is intentionally disabled and its route shows a truthful unavailable state. `ALLOWED_ORIGINS` is optional in production and defaults to `https://omnitily.vercel.app`.

Server transcription can be exercised only in development or tests through the explicit `ENABLE_TRANSCRIPTION=true` flag and separate local credentials; production rejects that flag.

## Verification

```sh
npm run clean
npm run typecheck
npm run lint
npm run test
npm run build:client
npm run build:server
npm run build
npm run test:e2e
npm run check
npm run verify:deployment -- --base-url=https://your-deployment.example
```

`npm run check` runs typecheck, ESLint, Vitest, and the production build in that order. Playwright remains separate because it starts a local server and browser.

## Processing and privacy

- Browser tools show “Processed locally in your browser.”
- Server tools disclose that data is sent to Omnitily’s server.
- External tools disclose that data or URLs are sent to a third-party provider.
- Audio transcription requires confirmation before audio is sent to the server and Google Gemini.
- Production transcription accepts supported audio files up to 3 MiB; Vercel rejects function payloads above 4.5 MB before application code runs.
- QR content is sent to the external QR rendering provider.
- Social downloading works for YouTube and TikTok without extra setup. Instagram and Facebook downloads need a configured Cobalt instance (free Render deploy — see `docs/COBALT_RENDER_DEPLOY.md`); until one is configured they answer honestly that the download server is not set up yet, instead of a fabricated link.

See `docs/PRIVACY_PROCESSING_MATRIX.md`, `docs/TOOL_STATUS_POLICY.md`, and `docs/TESTING.md` for the complete policy and verification model.

Deployment and incident procedures are in `docs/DEPLOYMENT.md`, `docs/OPERATIONS.md`, and `docs/ZERO_COST_DEPLOYMENT.md`.
