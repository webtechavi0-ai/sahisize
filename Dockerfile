# syntax=docker/dockerfile:1.7
# SahiSize: static Astro build served on port 3003.

# ---- build ----
FROM node:24-bookworm-slim AS build
WORKDIR /app

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    ASTRO_TELEMETRY_DISABLED=1

COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

# Canonical origin baked into sitemap, canonical links and OG tags (src/config/site.ts).
ARG PUBLIC_SITE_URL
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL}
RUN npm run build

# ---- runtime ----
# The built site is served by `astro preview` (clean URLs, no nginx in this image).
# Headers, caching and TLS belong to the nginx on the server, which proxies to 127.0.0.1:3003.
FROM build AS runtime
ENV HOST=0.0.0.0 PORT=3003
USER node
EXPOSE 3003
CMD ["npx", "astro", "preview", "--host", "0.0.0.0", "--port", "3003"]
