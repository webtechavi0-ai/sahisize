# syntax=docker/dockerfile:1.7
# SahiSize: static Next.js export (out/) served on port 3003.

# ---- build ----
FROM node:24-bookworm-slim AS build
WORKDIR /app

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json .npmrc ./
# postinstall copies the codec .wasm files, so scripts/ must exist before `npm ci`.
COPY scripts/copy-wasm.mjs scripts/copy-wasm.mjs
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

# Canonical origin baked into sitemap, canonical links and OG tags (src/config/site.ts).
ARG PUBLIC_SITE_URL
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL}
RUN npm run build

# ---- runtime ----
# Only the exported site is served (clean URLs, no nginx in this image).
# Headers, caching and TLS belong to the nginx on the server, which proxies to 127.0.0.1:3003.
FROM node:24-bookworm-slim AS runtime
WORKDIR /app
RUN npm install -g serve@14 && npm cache clean --force
COPY --from=build /app/out ./out
USER node
EXPOSE 3003
CMD ["serve", "out", "-l", "tcp://0.0.0.0:3003"]
