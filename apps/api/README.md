# API — NestJS Backend

Backend of **nest-next-starter**, built on [NestJS 11](https://nestjs.com) with strict TypeScript.  
Runs by default at **http://localhost:8080**.

---

## Features

### 🔐 Authentication & Authorization
- **Email/Password** — Register, login, email confirmation, forgot/reset password
- **OAuth 2.0** — Google, Facebook, GitHub, Twitter/X (Passport strategies)
- **JWT** — Short-lived access token (15 min) + long-lived refresh token (7 days) stored in an HttpOnly cookie
- **Session management** — Each login creates an isolated session; logout invalidates the session; changing password revokes all other active sessions
- **RBAC** — Role-based (USER, MANAGER, ADMIN) and permission-based access control; JWT payload embeds `roles` + `permissions`
- **Guards & Decorators** — `@ApiAuth()`, `@ApiPublic()` to distinguish public vs protected endpoints

### 🗄️ Database — Dual Adapter
Select the database type via `DATABASE_TYPE` in `.env` — **no code changes required**:

| `DATABASE_TYPE` | Adapter | ORM/ODM |
|-----------------|---------|---------|
| `mongodb` | MongoDB | Mongoose + mongoose-autopopulate |
| `postgres` / `mysql` / `sqlite` | SQL | TypeORM |

Each module has two separate infrastructure layers (`document/` and `relational/`).  
Database seeders: `seed:run:document` / `seed:run:relational`.

### 📁 File Upload — Multi-driver
Select the driver via `FILE_DRIVER`:

| Driver | Description |
|--------|-------------|
| `local` | Store files on the server filesystem |
| `s3` | AWS S3 (multipart upload) |
| `s3-presigned` | AWS S3 with presigned URLs |
| `cloudinary` | Cloudinary CDN |

### ⚡ Async Job Queue (BullMQ)
- **BullMQ** — Reliable job queue backed by Redis; all email sending is done asynchronously
- **Email queue** — Three job types: `email-verification`, `confirm-new-email`, `reset-password`
- **Rate limiter** — Max 1 email job per 150 ms to avoid mail server throttling
- **Auto-cleanup** — Completed jobs kept for 1 000 entries; failed jobs kept for 5 000 entries
- **Bull Board** — Queue monitoring dashboard at `/api/queues` (protected by Basic Auth)

### 📧 Mail
- Nodemailer + Handlebars templates
- Emails dispatched via the BullMQ email queue (non-blocking): registration confirmation, new email confirmation, forgot password

### 🌍 Internationalization (i18n)
- `nestjs-i18n` with header-based resolver (`x-custom-lang`)
- Fallback language: `en`

### 📄 API Docs (Swagger)
- Auto-generated at `/docs`
- Bearer Auth, URI versioning (`/api/v1/...`), global language header

### 🛡️ Security
- `helmet` — HTTP security headers
- `cookie-parser` — HttpOnly cookie for the refresh token
- **Configurable cookie `secure` flag** — `APP_COOKIE_SECURE` env var controls whether the refresh token cookie requires HTTPS. Defaults to `true` in production; set to `false` for HTTP-only deployments (e.g. Docker without TLS termination)
- **Generic credentials error** — All login failure paths (email not found, no password set, wrong password) return the same `INVALID_CREDENTIALS` error on the `email` field, preventing user enumeration attacks
- CORS configured to the frontend domain
- `class-validator` + `class-transformer` — Request input validation
- **Basic Auth middleware** — Protects `/api/queues` (Bull Board) and `/docs` (Swagger) with username/password
- **Rate Limiting** — `@nestjs/throttler` applied globally as `APP_GUARD`; tracks requests per real IP extracted from `x-forwarded-for` / `x-real-ip` headers; Redis-backed storage (shared with BullMQ); configurable limit, TTL, and on/off toggle via env vars

### 🏥 Health Check
- `/health` endpoint (`HealthModule`)

### 📈 Metrics (Prometheus)
- `/metrics` endpoint — auto-exposed by `@willsoto/nestjs-prometheus`
- Scraped by Prometheus every 15 seconds when the monitoring stack is running
- No configuration required — active as long as `PrometheusModule` is registered in `AppModule`

### 📊 GraphQL (Optional)
- Apollo Server pre-integrated (`@nestjs/graphql`, `@nestjs/apollo`)

---

## Directory Structure

```
src/
├── app.module.ts           ← Root module (auto-selects DB & file driver)
├── main.ts                 ← Bootstrap: CORS, Helmet, Swagger, Versioning
│
├── auth/                   ← Email/password auth + JWT strategies
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   └── strategies/         ← jwt, jwt-refresh, anonymous
│
├── auth-google/            ← Google OAuth strategy & controller
├── auth-facebook/          ← Facebook OAuth strategy & controller
├── auth-github/            ← GitHub OAuth strategy & controller
├── auth-twitter/           ← Twitter/X OAuth strategy & controller
│
├── users/                  ← User CRUD + domain model
│   ├── domain/user.ts
│   ├── infrastructure/
│   │   ├── document/       ← Mongoose schema & repository
│   │   └── relational/     ← TypeORM entity & repository
│   └── users.service.ts
│
├── session/                ← Session management (multi-device logout)
├── roles/                  ← RBAC: RoleEnum, PermissionEnum, RolesService
├── files/                  ← File upload abstraction + multi-driver adapters
│   └── infrastructure/uploader/
│       ├── local/
│       ├── s3/
│       ├── s3-presigned/
│       └── cloudinary/
│
├── mail/                   ← High-level mail service
├── mailer/                 ← Nodemailer + Handlebars adapter
├── health/                 ← Health check endpoint
├── graphql/                ← GraphQL setup
├── i18n/                   ← Translation files
├── social/                 ← Shared social profile interface
├── middlewares/            ← Express middlewares (Basic Auth)
│
├── worker/                 ← BullMQ async job queues
│   └── queues/
│       ├── worker.module.ts
│       └── email/          ← Email queue (processor, service, events, types)
│
├── config/                 ← Typed config with @nestjs/config
│   ├── app/, auth/, database/
│   ├── auth-google/, auth-facebook/, auth-github/, auth-twitter/
│   ├── files/, mail/
│   ├── redis/              ← Redis connection config
│   ├── bull/               ← BullMQ global config + factory
│   ├── throttler/          ← Rate limiting config, factory & guard
│   ├── grafana/            ← Grafana credentials config (validates env vars)
│   └── config.type.ts      ← Aggregate type AllConfigType
│
├── tools/
│   └── grafana/
│       ├── dashboards/     ← Pre-built Grafana dashboard JSON (server, postgres, prometheus)
│       └── provisioning/   ← Auto-provisioning config for datasources and dashboards
│
├── database/
│   ├── mongoose-config.service.ts
│   ├── typeorm-config.service.ts
│   ├── seeds/
│   └── migrations/
│
├── decorators/             ← @ApiAuth, @ApiPublic, etc.
├── common/                 ← Shared DTOs, query types
└── utils/                  ← Serializer interceptor, validation options
```

---

## API Endpoints

### Auth (`/api/v1/auth`)

| Method | Path | Description | Guard |
|--------|------|-------------|-------|
| `POST` | `/email/login` | Login with email & password | Public |
| `POST` | `/email/register` | Register a new account | Public |
| `POST` | `/email/confirm` | Confirm registration email | Public |
| `POST` | `/email/confirm/new` | Confirm new email after change | Public |
| `POST` | `/forgot/password` | Send a password reset link | Public |
| `POST` | `/reset/password` | Reset password using token | Public |
| `GET`  | `/me` | Get current user profile | JWT |
| `PATCH`| `/me` | Update profile (name, photo, password) | JWT |
| `DELETE`| `/me` | Delete account (soft delete) | JWT |
| `POST` | `/refresh` | Refresh access token | Refresh cookie |
| `POST` | `/logout` | Logout, invalidate session | JWT |

### OAuth (`/api/v1/auth`)

| Method | Path | Provider |
|--------|------|----------|
| `POST` | `/google/login` | Google (idToken) |
| `POST` | `/facebook/login` | Facebook (accessToken) |
| `POST` | `/github/login` | GitHub (accessToken) |
| `POST` | `/twitter/login` | Twitter/X (accessToken) |

### Users (`/api/v1/users`)

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/` | List users (paginated) |
| `POST` | `/` | Create a new user |
| `GET`  | `/:id` | Get user by ID |
| `PATCH`| `/:id` | Update user |
| `DELETE`| `/:id` | Delete user |

### Files (`/api/v1/files`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/upload` | Upload a file |
| `GET`  | `/:id/url` | Get file URL by ID |
| `GET`  | `/:path` | Download file by path |

---

## Setup & Running

### Local development

```bash
# From the monorepo root
pnpm install

# Configure environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env

# Development (watch mode)
pnpm dev --filter=api

# Production
pnpm build --filter=api
pnpm --filter=api start:prod

# Tests
pnpm --filter=api test          # Unit tests
pnpm --filter=api test:e2e      # E2E tests
pnpm --filter=api test:cov      # Coverage report

# Database seeds
pnpm --filter=api seed:run:document    # MongoDB
pnpm --filter=api seed:run:relational  # SQL
```

### Docker

The API is fully containerised. See `docker-compose.yml` at the project root.

```bash
docker compose up --build   # Build and start (includes MongoDB, Redis, seed)
docker compose down -v      # Stop and wipe volumes
```

The `seed` service in Docker Compose runs `dist/database/seeds/document/run-seed.js` automatically before the API starts. It populates the `roles` collection and is idempotent.

---

## Environment Variables

See the full reference at [`apps/api/.env.example`](./.env.example).

### Required

```env
NODE_ENV=development
APP_PORT=8080
FRONTEND_DOMAIN=http://localhost:3000
DATABASE_TYPE=mongodb          # mongodb | postgres | mysql | sqlite
DATABASE_URL=mongodb://localhost:27017/nest_starter
AUTH_JWT_SECRET=change_me_jwt_secret
AUTH_REFRESH_SECRET=change_me_refresh_secret
```

### Redis (required for BullMQ and rate limiting)

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                # optional
REDIS_TLS=false                # set true if your Redis requires TLS
```

### Cookie Security

```env
# Controls the `secure` flag on the HttpOnly refresh token cookie.
# Default: true in production (requires HTTPS), false in development.
# Set to false explicitly when running behind HTTP without TLS (e.g. Docker locally).
APP_COOKIE_SECURE=false
```

### Basic Auth (protects /queues and /docs)

```env
AUTH_BASIC_USERNAME=admin
AUTH_BASIC_PASSWORD=change_me
```

### Mail

```env
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=
MAIL_PASSWORD=
MAIL_DEFAULT_EMAIL=noreply@example.com
```

### File Storage

```env
FILE_DRIVER=local              # local | s3 | s3-presigned | cloudinary
# If using S3:
ACCESS_KEY_ID=
SECRET_ACCESS_KEY=
AWS_DEFAULT_S3_BUCKET=
AWS_S3_REGION=ap-southeast-1
```

### Rate Limiting (Throttler)

```env
THROTTLER_ENABLED=true     # false = disable entirely (useful in development)
THROTTLER_LIMIT=60         # max requests per TTL window per IP
THROTTLER_TTL=60           # TTL window in seconds
```

> Default in `.env.example` is disabled (`THROTTLER_ENABLED=false`) — enable in production.  
> Storage is Redis (shared with BullMQ). The tracker key is the client's real IP, resolved in order: `x-forwarded-for` → `x-real-ip` → `req.ips[0]` → `req.ip`.

### Grafana / Monitoring (optional)

```env
GRAFANA_USERNAME=admin
GRAFANA_PASSWORD=your-secure-password
DOCKER_PROMETHEUS_PORT=9090    # host port for Prometheus UI
DOCKER_GRAFANA_PORT=3001       # host port for Grafana UI (3001 avoids conflict with web on 3000)
DOCKER_PG_EXPORTER=9187        # host port for postgres-exporter (SQL users only)
DOCKER_MONGO_EXPORTER=9216     # host port for mongodb-exporter (MongoDB users only)
```

These variables are only required when running the monitoring Docker Compose profile. See the [Monitoring section in the root README](../../README.md#monitoring-prometheus--grafana) for the full setup guide.

### OAuth (Optional)

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
```

---

## Swagger

Once running, visit: **http://localhost:8080/docs**

---

## Queue Dashboard (Bull Board)

Visit **http://localhost:8080/api/queues** — protected by Basic Auth (`AUTH_BASIC_USERNAME` / `AUTH_BASIC_PASSWORD`).

Displays active, completed, failed, delayed, and waiting jobs for every registered queue.

---

## Monitoring (Prometheus + Grafana)

### Metrics endpoint

The API exposes Prometheus-compatible metrics at:

```
GET http://localhost:8080/metrics
```

This is powered by `@willsoto/nestjs-prometheus` registered in `AppModule`. The endpoint requires no auth and is scraped automatically by Prometheus every 15 seconds when the monitoring stack is active.

### Starting the monitoring stack

```bash
# From the project root — MongoDB users
docker compose --profile monitoring up --build

# PostgreSQL users (adds postgres-exporter)
docker compose --profile monitoring --profile monitoring-postgres up --build
```

> [!IMPORTANT]
> The main app stack must be running at the same time so Prometheus can reach `api:8080/metrics`. Start them together or ensure the app is up first.

### Available dashboards

Grafana is pre-provisioned with three dashboards (no manual import needed):

| Dashboard | File | What it shows |
|-----------|------|----------------|
| **Server** | `server.dashboard.json` | Node.js process CPU, memory, heap, event-loop lag, active handles/requests |
| **PostgreSQL** | `postgres.dashboard.json` | Transactions, locks, cache hit rate, connection count, buffer stats |
| **Prometheus** | `prometheus.dashboard.json` | Prometheus internals: scrape duration, WAL, memory, compaction |

Dashboard files live in `src/tools/grafana/dashboards/` and are auto-loaded by Grafana via the provisioning config in `src/tools/grafana/provisioning/`.

### Access URLs

| Interface | URL | Auth |
|-----------|-----|------|
| Grafana | http://localhost:3001 | `GRAFANA_USERNAME` / `GRAFANA_PASSWORD` |
| Prometheus | http://localhost:9090 | None |
| API metrics | http://localhost:8080/metrics | None |

### Prometheus scrape targets

Configured in `prometheus.config.yml` at the project root:

| Job | Target | Description |
|-----|--------|-------------|
| `prometheus` | `localhost:9090` | Prometheus self-monitoring |
| `server` | `api:8080` | NestJS API metrics |
| `database` | `postgres-exporter:9187` | PostgreSQL metrics (SQL users) |
| `mongodb` | `mongodb-exporter:9216` | MongoDB metrics (MongoDB users) |

### Data persistence

| Directory | Contents |
|-----------|----------|
| `.docker/prometheus-data/` | Prometheus time-series data (retained across restarts) |
| `.docker/grafana-data/` | Grafana state: alert rules, user preferences, custom dashboard edits |

Directories are created automatically on first start. File ownership is fixed by `setup_prometheus` and `setup_grafana` init containers.

### Reset monitoring data

```bash
# From the project root
docker compose --profile monitoring down
rm -rf .docker/
```
