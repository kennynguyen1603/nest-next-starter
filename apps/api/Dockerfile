# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f apps/api/Dockerfile .
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV TURBO_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# 1. Prune the monorepo down to `api` and its workspace dependencies.
FROM base AS pruner
ARG TURBO_VERSION=2.9.4
COPY . .
RUN pnpm dlx turbo@${TURBO_VERSION} prune api --docker

# 2. Install from manifests only, so this layer is reused until a lockfile/package.json changes.
FROM base AS builder
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile

# 3. Build with full sources, then produce a production-only node_modules.
COPY --from=pruner /repo/out/full/ .
RUN pnpm turbo run build --filter=api
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter=api deploy --prod /prod/api

# 4. Runtime: no pnpm, no sources, no devDependencies.
FROM ${NODE_IMAGE} AS runner
RUN apk upgrade --no-cache && apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=node:node --from=builder /prod/api/package.json ./
COPY --chown=node:node --from=builder /prod/api/node_modules ./node_modules
COPY --chown=node:node --from=builder /repo/apps/api/dist ./dist
USER node
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
