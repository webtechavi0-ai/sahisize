# syntax=docker/dockerfile:1.7
#
# SahiSize: Next.js standalone Node server on port 3003.
#
# Targets:
#   runtime (default)  full build inside Docker:   docker build -t sahisize .
#   runtime-prebuilt   package a build made by CI (Jenkinsfile) without building twice:
#                      docker build --target runtime-prebuilt \
#                        --build-context standalone=.next/standalone -t sahisize .
#   The prebuilt output must come from node:24-bookworm-slim (linux/glibc), like this image.
#
# TLS, www->apex and compression in front of the app belong to the host nginx, which proxies to
# 127.0.0.1:3003. Security headers are set by the app itself (next.config.mjs).

ARG NODE_IMAGE=node:24-bookworm-slim

# ---- deps: install once, cached by lockfile ----
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false
COPY package.json package-lock.json .npmrc ./
# Lifecycle scripts are skipped here: postinstall (scripts/copy-wasm.mjs) needs the source tree
# and runs again as part of `npm run build`.
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

# ---- build ----
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Canonical origin baked into canonical links, hreflang, sitemaps and OG tags.
ARG PUBLIC_SITE_URL=""
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL}
# `npm run build` = copy-wasm + next build + postbuild (copies .next/static and public into
# .next/standalone, so the standalone folder is self-contained).
RUN --mount=type=cache,target=/app/.next/cache npm run build

# ---- runtime base ----
FROM ${NODE_IMAGE} AS runtime-base
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3003 \
    HOSTNAME=0.0.0.0
ARG GIT_COMMIT=""
LABEL org.opencontainers.image.title="sahisize" \
      org.opencontainers.image.description="Exam form photo, signature and document resizer" \
      org.opencontainers.image.revision="${GIT_COMMIT}"
EXPOSE 3003
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3003)+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
STOPSIGNAL SIGTERM

# ---- runtime from a CI build (no second `next build`) ----
FROM runtime-base AS runtime-prebuilt
COPY --from=standalone --chown=node:node . ./
USER node
CMD ["node", "server.js"]

# ---- runtime (default target) ----
FROM runtime-base AS runtime
COPY --from=build --chown=node:node /app/.next/standalone ./
USER node
CMD ["node", "server.js"]
