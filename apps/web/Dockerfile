# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f apps/web/Dockerfile .
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV TURBO_TELEMETRY_DISABLED=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# 1. Prune the monorepo down to `web` and its workspace dependencies (@repo/ui, @repo/types, configs).
FROM base AS pruner
ARG TURBO_VERSION=2.9.4
COPY . .
RUN pnpm dlx turbo@${TURBO_VERSION} prune web --docker

# 2. Install from manifests only, so this layer is reused until a lockfile/package.json changes.
FROM base AS builder
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile

# 3. Build. NEXT_PUBLIC_* values are inlined into the client bundle at build time.
COPY --from=pruner /repo/out/full/ .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_FACEBOOK_APP_ID
ARG NEXT_PUBLIC_GITHUB_CLIENT_ID
ARG NEXT_PUBLIC_TWITTER_CLIENT_ID
RUN pnpm turbo run build --filter=web

# 4. Runtime: Next.js standalone output (traced node_modules only).
FROM ${NODE_IMAGE} AS runner
RUN apk upgrade --no-cache
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --chown=node:node --from=builder /repo/apps/web/.next/standalone ./
COPY --chown=node:node --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --chown=node:node --from=builder /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
