ARG NODE_IMAGE=node:22-slim

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update && apt-get install -y procps python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable

FROM base AS builder
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
RUN --mount=type=cache,id=pnpm-api,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter ./apps/api build
RUN --mount=type=cache,id=pnpm-api,target=/pnpm/store pnpm --filter ./apps/api deploy --prod /standalone

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pm2
COPY --chown=node:node --from=builder /standalone/node_modules ./node_modules
COPY --chown=node:node --from=builder /repo/apps/api/dist ./dist
COPY --chown=node:node --from=builder /standalone/package.json ./
USER node
EXPOSE 8080
CMD ["pm2-runtime", "start", "dist/main.js"]
