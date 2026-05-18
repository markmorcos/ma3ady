# syntax=docker/dockerfile:1.6
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod=false --frozen-lockfile=false

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_WEB_APP_HOST gets inlined by `next build` into the static
# HTML for the home pages, so the demo CTA points at the right host per
# environment (app.ma3ady.com on prod, preview-app.ma3ady.com on preview).
# Without an override, defaults to prod — the manifest's `buildArgs:`
# block supplies the preview value.
ARG NEXT_PUBLIC_WEB_APP_HOST=app.ma3ady.com
ENV NEXT_PUBLIC_WEB_APP_HOST=$NEXT_PUBLIC_WEB_APP_HOST
RUN pnpm next build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
EXPOSE 8080

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ > /dev/null || exit 1
CMD ["node", "server.js"]
