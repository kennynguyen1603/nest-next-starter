# nest-next-starter

> A production-ready **full-stack TypeScript boilerplate** — NestJS (Backend) + Next.js (Frontend) + multi-database support (MongoDB / SQL). Start a new project in minutes instead of spending days on configuration from scratch.

---

## Architecture Overview

```
nest-next-starter/                  ← Turborepo monorepo (pnpm workspaces)
├── apps/
│   ├── api/                        ← Backend  — NestJS 11, port 8080
│   └── web/                        ← Frontend — Next.js 16, port 3000
└── packages/
    ├── ui/                         ← Shared React component library
    ├── eslint-config/              ← Shared ESLint rules
    └── typescript-config/          ← Shared tsconfig
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | [Turborepo](https://turborepo.dev) + pnpm workspaces |
| Backend | NestJS 11, TypeScript, Passport, Swagger |
| Frontend | Next.js 16, React 19, TailwindCSS v4, Zustand |
| Database | **MongoDB** (Mongoose) or **SQL** (TypeORM) — switched via `DATABASE_TYPE` |
| Auth | JWT (Access + Refresh token), OAuth 2.0 (Google / Facebook / GitHub / Twitter) |
| File Storage | Local / AWS S3 / S3 Presigned / Cloudinary — switched via `FILE_DRIVER` |
| Queue | BullMQ + Redis — async job processing (email delivery) |
| Rate Limiting | `@nestjs/throttler` + Redis storage — per-IP, globally applied |
| Mail | Nodemailer + Handlebars templates, dispatched via job queue |
| i18n | nestjs-i18n (header-based) + next-intl (locale routing) |
| Containers | Docker + Docker Compose — full stack in one command |
| Monitoring | Prometheus + Grafana — metrics, dashboards, alerting (optional profile) |
| Linting | ESLint + Prettier + Husky pre-commit hooks |

---

## Requirements

- **Node.js** ≥ 18
- **pnpm** 9.x (`npm install -g pnpm@9`)
- MongoDB or PostgreSQL/MySQL (depending on `DATABASE_TYPE`)
- **Redis** ≥ 6 (required for BullMQ job queue and rate limiting)

> **Using Docker?** None of the above are required on the host — Docker Compose provides all services.

---

## Quick Start

### Option A — Docker (recommended for full-stack)

Runs the API, frontend, MongoDB, Redis, and an automatic database seed in one command.

```bash
# 1. Copy and configure the API environment file
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your values (mail, OAuth secrets, etc.)

# 2. Build and start all services
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080/api/v1 |
| Swagger Docs | http://localhost:8080/docs |

> [!NOTE]
> The `seed` service runs automatically before the API starts and populates the MongoDB `roles` collection (idempotent — safe to re-run). To reset all data, run `docker compose down -v && docker compose up --build`.

#### Passing OAuth credentials at build time

`NEXT_PUBLIC_*` variables are **baked into the Next.js bundle** at build time. Pass them as build args:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx \
NEXT_PUBLIC_GITHUB_CLIENT_ID=xxx \
docker compose up --build
```

Or set them in a `.env` file at the project root and Docker Compose will pick them up automatically.

---

### Option B — Local development

#### 1. Install dependencies

```bash
pnpm install
```

#### 2. Configure environment variables

```bash
# Backend
cp apps/api/.env.example apps/api/.env

# Frontend
cp apps/web/.env.example apps/web/.env.local
```

Edit the `.env` files with your values (see the **Environment Variables** section below).

#### 3. Start development

```bash
# Run all apps simultaneously (recommended)
pnpm dev

# Or run individually
pnpm dev --filter=api
pnpm dev --filter=web
```

| App | URL |
|-----|-----|
| Backend API | http://localhost:8080/api/v1 |
| Swagger Docs | http://localhost:8080/docs |
| Frontend | http://localhost:3000 |

---

## Database Configuration

Select the database type using the `DATABASE_TYPE` variable in `apps/api/.env`:

```env
# MongoDB
DATABASE_TYPE=mongodb
DATABASE_URL=mongodb://localhost:27017/nest_starter

# PostgreSQL / MySQL (TypeORM)
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=secret
DATABASE_NAME=nest_starter
DATABASE_SYNCHRONIZE=false
```

> [!IMPORTANT]
> When using SQL, run migrations before starting: `pnpm --filter=api run migration:run`

---

## File Storage Configuration

Select the storage driver using `FILE_DRIVER` in `apps/api/.env`:

```env
FILE_DRIVER=local          # Store on the server filesystem
FILE_DRIVER=s3             # AWS S3
FILE_DRIVER=s3-presigned   # AWS S3 with presigned URLs
FILE_DRIVER=cloudinary     # Cloudinary
```

---

## OAuth Social Login (Optional)

Configure each provider by filling in the credentials in `apps/api/.env` and `apps/web/.env.local`. See the respective `.env.example` files for the full list of variables.

| Provider | Where to create credentials |
|----------|------------------------------|
| Google | [console.cloud.google.com](https://console.cloud.google.com) |
| Facebook | [developers.facebook.com](https://developers.facebook.com/apps) |
| GitHub | [github.com/settings/developers](https://github.com/settings/developers) |
| Twitter/X | [developer.twitter.com](https://developer.twitter.com/en/portal/dashboard) |

---

## Scripts

### Root (run from the project root)

```bash
pnpm dev              # Start all apps in development mode
pnpm build            # Build all apps
pnpm lint             # Lint the entire codebase
pnpm format           # Format code with Prettier
pnpm check-types      # TypeScript check across the entire monorepo
```

### Backend (`apps/api`)

```bash
pnpm --filter=api dev              # Watch mode
pnpm --filter=api build            # Production build
pnpm --filter=api start:prod       # Run production build
pnpm --filter=api test             # Unit tests
pnpm --filter=api test:e2e         # E2E tests
pnpm --filter=api seed:run:document   # Seed MongoDB
pnpm --filter=api seed:run:relational # Seed SQL
```

### Frontend (`apps/web`)

```bash
pnpm --filter=web dev     # Dev server on port 3000
pnpm --filter=web build   # Production build
pnpm --filter=web start   # Run production
pnpm --filter=web test    # Unit tests (Vitest)
```

### Docker

```bash
docker compose up --build          # Build images and start all services
docker compose up                  # Start without rebuilding
docker compose down                # Stop all services
docker compose down -v             # Stop and remove volumes (wipes database)
docker compose logs -f api         # Tail API logs
docker compose logs -f web         # Tail web logs
```

### Monitoring

```bash
# MongoDB users
docker compose --profile monitoring up --build

# PostgreSQL users
docker compose --profile monitoring --profile monitoring-postgres up --build

# Stop monitoring stack only
docker compose --profile monitoring down

# Wipe all monitoring data (Prometheus time-series + Grafana state)
docker compose --profile monitoring down && rm -rf .docker/
```

---

## Monitoring (Prometheus + Grafana)

The monitoring stack is **opt-in** — it runs separately from the main app via Docker Compose profiles and does not affect normal development.

### What's included

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| Prometheus | `prom/prometheus:v3.0.1` | `9090` | Scrapes metrics from the API and exporters |
| Grafana | `grafana/grafana-oss:11.3.1` | `3001` | Visualises dashboards |
| MongoDB Exporter | `percona/mongodb_exporter:0.44` | `9216` | DB metrics for MongoDB users |
| PostgreSQL Exporter | `prometheuscommunity/postgres-exporter` | `9187` | DB metrics for SQL users |

Three dashboards are pre-provisioned automatically:

| Dashboard | Metrics |
|-----------|---------|
| **Server** | Node.js CPU, memory, event-loop lag, heap, active handles |
| **PostgreSQL** | Transactions, locks, cache hit rate, buffer stats |
| **Prometheus** | Scrape duration, WAL, chunk compaction internals |

### Setup

**Step 1 — Configure environment variables** in `apps/api/.env`:

```env
GRAFANA_USERNAME=admin
GRAFANA_PASSWORD=your-secure-password   # change before deploying
DOCKER_PROMETHEUS_PORT=9090
DOCKER_GRAFANA_PORT=3001
DOCKER_PG_EXPORTER=9187
DOCKER_MONGO_EXPORTER=9216
```

**Step 2 — Start the monitoring stack** (Docker must be running):

```bash
# MongoDB
docker compose --profile monitoring up --build

# PostgreSQL
docker compose --profile monitoring --profile monitoring-postgres up --build
```

> [!NOTE]
> The main app stack (`api`, `web`, `mongo`, `redis`) must also be running for Prometheus to scrape metrics. Start both together or run the app stack first.

### Access

| URL | Credential |
|-----|------------|
| Grafana — http://localhost:3001 | `GRAFANA_USERNAME` / `GRAFANA_PASSWORD` |
| Prometheus — http://localhost:9090 | No auth |
| API metrics — http://localhost:8080/metrics | No auth |

### Metrics endpoint

The API exposes `/metrics` automatically via `@willsoto/nestjs-prometheus`. Prometheus scrapes it every 15 seconds. No code changes are needed.

### Data persistence

Prometheus and Grafana data are stored in local bind-mount directories:

```
.docker/
├── prometheus-data/    ← time-series metrics (retained across restarts)
└── grafana-data/       ← dashboards, users, alert state
```

These directories are created automatically on first start by the `setup_prometheus` and `setup_grafana` init containers which fix file ownership permissions.

### Reset monitoring data

```bash
docker compose --profile monitoring down
rm -rf .docker/
```

### Docker Compose profiles explained

| Profile | Services included |
|---------|-------------------|
| _(none)_ | `api`, `web`, `mongo`, `redis`, `seed` |
| `monitoring` | Prometheus, Grafana, MongoDB Exporter, setup services |
| `monitoring-postgres` | PostgreSQL Exporter |

---

## Further Reading

- [`apps/api/README.md`](./apps/api/README.md) — Backend details (NestJS)
- [`apps/web/README.md`](./apps/web/README.md) — Frontend details (Next.js)

---

## Remote Caching (Turborepo)

Share build caches between machines and CI/CD pipelines:

```bash
pnpm dlx turbo login
pnpm dlx turbo link
```

---

## License

MIT
