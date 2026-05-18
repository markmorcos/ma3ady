# syntax=docker/dockerfile:1.6
#
# Web image for app.ma3ady.com — Expo Router web export, served by nginx.
# Build context MUST be the repo root (not `web/`) because `pnpm expo export`
# needs `app/`, `src/`, `assets/`, and the root `package.json` / `app.json`.

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

# Workspace manifests first for layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tenant-landing/package.json ./tenant-landing/package.json

# Lock-aware install; we don't need to install tenant-landing's deps here
# but the workspace root install also resolves the child manifests.
RUN pnpm install --frozen-lockfile --filter ma3ady...

# Source.
COPY app ./app
COPY src ./src
COPY assets ./assets
COPY app.json babel.config.js metro.config.js tsconfig.json ./
COPY eslint.config.js eslint-rules ./

# Web-only env baked into the static bundle. Both vars MUST be provided at
# build time (the deployment manifest forwards them from k8s secrets).
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY

RUN pnpm expo export --platform web --output-dir dist

FROM nginx:alpine AS runner
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY web/public/.well-known /usr/share/nginx/html/.well-known
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ > /dev/null || exit 1
