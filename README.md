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
| Mail | Nodemailer + Handlebars templates |
| i18n | nestjs-i18n (header-based language resolver) |
| Linting | ESLint + Prettier + Husky pre-commit hooks |

---

## Requirements

- **Node.js** ≥ 18
- **pnpm** 9.x (`npm install -g pnpm@9`)
- MongoDB or PostgreSQL/MySQL (depending on `DATABASE_TYPE`)

---

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
# Backend
cp apps/api/.env.example apps/api/.env

# Frontend
cp apps/web/.env.example apps/web/.env.local
```

Edit the `.env` files with your values (see the **Environment Variables** section below).

### 3. Start development

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
```

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
