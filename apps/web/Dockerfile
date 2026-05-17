FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
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
RUN --mount=type=cache,id=pnpm-web,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter ./apps/web build

FROM node:22-alpine AS runner
RUN apk update && apk upgrade --no-cache && npm install -g npm@latest
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./.next/static
COPY --from=builder /repo/apps/web/public ./public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
