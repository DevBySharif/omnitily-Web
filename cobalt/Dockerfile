# Cobalt API on Render (free tier) — thin wrapper around the official image.
#
# The upstream image runs as the non-root `node` user with CMD
# `node src/cobalt` and WORKDIR /app. This wrapper only adds an entrypoint
# that derives the runtime config from Render's environment:
#   - API_URL  <- $RENDER_EXTERNAL_URL (the public https://*.onrender.com URL)
#   - API_PORT <- $PORT (Render injects it; default 10000)
#   - API key  <- $COBALT_API_KEY, written to /app/keys.json, which turns on
#                 API_AUTH_REQUIRED with API_KEY_URL=file://keys.json
# The key is never baked into the image: it arrives as a Render env var.
FROM ghcr.io/imputnet/cobalt:latest

USER root

# /app is root-owned in the upstream image; the node user must be able to
# write keys.json there at container start.
RUN mkdir -p /app && chown node:node /app

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh && chown node:node /app/entrypoint.sh

USER node

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "src/cobalt"]
