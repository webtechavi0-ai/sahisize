# syntax=docker/dockerfile:1.7
# SahiSize: static Astro build served by unprivileged nginx.
# The nginx config in docker/ mirrors public/_headers and public/_redirects, which only
# Cloudflare Pages reads.

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
# Cloudflare-only files; their rules live in the nginx config.
RUN rm -f dist/_headers dist/_redirects

# ---- runtime ----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
USER nginx
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
