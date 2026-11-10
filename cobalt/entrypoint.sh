#!/bin/sh
# Entrypoint for the Omnitily Cobalt instance on Render.
# Derives Cobalt's runtime config from the hosting environment and then
# hands over to the upstream CMD (`node src/cobalt`).
#
# Environment (all set in render.yaml / the Render dashboard):
#   RENDER_EXTERNAL_URL  public URL of this service (set by Render)
#   PORT                 port Render routes to (set by Render, default 10000)
#   API_URL              override for the public URL (optional)
#   API_PORT             override for the listen port (optional)
#   COBALT_API_KEY       secret key for the Omnitily API gateway (required
#                        for a protected instance; prompted at Blueprint
#                        deploy time, never committed to the repo)
set -eu

# Listen port: explicit API_PORT wins, else Render's $PORT, else 10000.
API_PORT="${API_PORT:-${PORT:-10000}}"
export API_PORT

# Public URL: explicit API_URL wins, else Render's external URL.
if [ -z "${API_URL:-}" ]; then
  if [ -n "${RENDER_EXTERNAL_URL:-}" ]; then
    API_URL="$RENDER_EXTERNAL_URL"
  else
    echo "error: API_URL is not set and RENDER_EXTERNAL_URL is missing — Cobalt needs its public URL." >&2
    exit 1
  fi
fi
export API_URL

# API key: write keys.json for Cobalt's file-based key auth and require it.
# keys.json format (Cobalt): { "<key>": { name, limit, allowedServices } }.
if [ -n "${COBALT_API_KEY:-}" ]; then
  node -e 'const fs = require("fs");
const key = process.env.COBALT_API_KEY;
const keys = { [key]: { name: "omnitily-gateway", limit: 30, allowedServices: ["youtube", "instagram", "tiktok", "facebook"] } };
fs.writeFileSync("/app/keys.json", JSON.stringify(keys));'
  export API_KEY_URL="file://keys.json"
  export API_AUTH_REQUIRED="1"
  echo "cobalt: API key auth enabled (key from COBALT_API_KEY)."
else
  echo "warning: COBALT_API_KEY is not set — instance runs WITHOUT API key auth (CORS still restricts browser callers)." >&2
  unset API_AUTH_REQUIRED || true
fi

echo "cobalt: starting at ${API_URL} on port ${API_PORT}."
exec "$@"
