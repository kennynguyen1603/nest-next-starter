# Admin — Next.js Admin Panel

Admin panel for **nest-next-starter**, built on [Next.js 16](https://nextjs.org) with React 19, TailwindCSS v4, and TypeScript.  
Runs by default at **http://localhost:3002**.

---

## Features

### 🔐 Authentication & Access Control

- **Email/Password login** — Form validation with `react-hook-form` + `zod`
- **Admin-only access** — Login checks that the authenticated user has the `admin` or `super_admin` role; denies access otherwise
- **Automatic token refresh** — Silently calls `POST /api/v1/auth/refresh` when the access token expires; clears the `refresh_token` cookie and redirects to `/login` on failure
- **Route protection** — `proxy.ts` runs on every request; redirects unauthenticated users (no `refresh_token` cookie) to `/login`
- **Logout** — Calls `POST /api/v1/auth/logout`, clears in-memory auth state, and redirects to `/login`

### 🗄️ State Management

- **Zustand** (`lib/auth-store.ts`) — Stores `accessToken`, `tokenExpires`, and `user` in memory (no `localStorage`)
- The `refresh_token` is stored server-side as an **HttpOnly cookie** set by the NestJS API on login
- A Next.js Route Handler (`/api/auth/clear-session`) deletes the `refresh_token` cookie server-side on auth failure, ensuring it is fully cleared even from HttpOnly storage

### 🌐 API Client

- `lib/api.ts` — Fetch wrapper with:
  - Automatic `Authorization: Bearer <token>` header injection from Zustand
  - `credentials: 'include'` for cookie support
  - Auto-retry after a successful token refresh on `401`
  - Clears session and redirects to `/login` when refresh fails

### 📊 Dashboard

- **Stats cards** — Total users, new users today, and trend indicators (↑/↓ vs last month)
- **Recent activity** — Last 10 user actions, relative timestamps via `date-fns`
- Data fetched client-side from `GET /api/v1/admin/stats` and `GET /api/v1/admin/recent-activity`

### 👥 Users Management

- **Paginated user table** — Lists all users with name, email, role badge, status badge, and join date
- **Search** — Filter by name/email using the `q` query parameter (`GET /api/v1/users?q=...`)
- **Pagination** — Previous/Next controls; page state in the URL via `page` query parameter
- **Delete user** — Confirmation modal with Escape key support; inline error display
- **User detail** — Full profile view at `/users/[id]` with all fields

### 📄 Pages & Routes

| Route         | Description                              |
| ------------- | ---------------------------------------- |
| `/login`      | Admin login page                         |
| `/`           | Dashboard with stats and recent activity |
| `/users`      | Paginated user list with search          |
| `/users/[id]` | User detail view                         |
| `/reports`    | Placeholder (future)                     |
| `/settings`   | Placeholder (future)                     |

---

## Directory Structure

```
apps/admin/
├── app/
│   ├── layout.tsx                      ← Root layout (loads globals.css)
│   ├── globals.css                     ← Tailwind v4 @import + @theme CSS vars
│   │
│   ├── (auth)/                         ← Auth route group (centered card layout)
│   │   ├── layout.tsx
│   │   └── login/page.tsx              ← Login page
│   │
│   ├── (dashboard)/                    ← Dashboard route group (sidebar + header)
│   │   ├── layout.tsx
│   │   ├── page.tsx                    ← Dashboard home
│   │   ├── users/
│   │   │   ├── page.tsx                ← User list
│   │   │   └── [id]/page.tsx           ← User detail
│   │   ├── reports/page.tsx
│   │   └── settings/page.tsx
│   │
│   └── api/
│       └── auth/clear-session/route.ts ← Server Route Handler: deletes refresh_token cookie
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                 ← Collapsible nav (state in localStorage)
│   │   ├── Header.tsx                  ← Top bar with user initials
│   │   └── Breadcrumb.tsx              ← Auto-generated from pathname
│   │
│   ├── dashboard/
│   │   ├── StatsCard.tsx               ← Metric card with optional trend indicator
│   │   └── RecentActivity.tsx          ← Activity list with relative timestamps
│   │
│   ├── users/
│   │   └── UserTable.tsx               ← Paginated user table with delete
│   │
│   └── shared/
│       └── ConfirmModal.tsx            ← Accessible modal (role=dialog, Escape key)
│
├── lib/
│   ├── api.ts                          ← Fetch wrapper (Bearer token, auto-refresh)
│   └── auth-store.ts                   ← Zustand store (accessToken, user)
│
├── proxy.ts                            ← Next.js 16 proxy (auth guard for all routes)
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## Setup & Running

### Prerequisites

The admin panel calls the NestJS API. Make sure the API is running and accessible at `NEXT_PUBLIC_API_URL` (default `http://localhost:8080`).

The API must also have `ADMIN_DOMAIN` set in its `.env` so CORS allows requests from the admin panel:

```env
# apps/api/.env
ADMIN_DOMAIN=http://localhost:3002
```

### Local development

```bash
# From the monorepo root
pnpm install

# Development server on port 3002
pnpm dev --filter=admin

# Type check
pnpm check-types --filter=admin

# Lint
pnpm lint --filter=admin
```

### Production build

```bash
pnpm build --filter=admin
pnpm --filter=admin start
```

### Docker

The admin panel is fully containerised with a multi-stage build (standalone output):

```bash
# Build and start all services including admin
NEXT_PUBLIC_API_URL=http://localhost:8080 docker compose up --build

# Admin-only
docker compose up admin --build
```

The `NEXT_PUBLIC_API_URL` build arg is **baked into the bundle** at build time. Pass it as an environment variable or set it in a `.env` file at the project root.

> [!NOTE]
> The admin service runs on port **3002** to avoid a conflict with the Grafana monitoring dashboard, which defaults to port 3001.

---

## Environment Variables

```env
# URL of the NestJS backend API — baked into the client bundle at build time
NEXT_PUBLIC_API_URL=http://localhost:8080
```

There is no `.env.example` for the admin panel because only `NEXT_PUBLIC_API_URL` is needed, and it is already passed as a Docker build arg via `docker-compose.yml`.

---

## Authentication Flow

```
Browser                    Admin Panel (Next.js)        API (NestJS)
  │                               │                          │
  │── POST /login ───────────────►│── POST /api/v1/auth/email/login ──►│
  │                               │◄── { token, user } + refresh_token cookie ──│
  │                               │   Check user.roles includes admin/super_admin
  │◄── redirect / ───────────────│
  │                               │                          │
  │── GET /users ─────────────────►│                         │
  │       proxy.ts checks refresh_token cookie               │
  │◄── render page ──────────────│── GET /api/v1/users ─────►│
  │                               │◄── { data, total } ──────│
```

### Token refresh

When any API call returns `401`:

1. `tryRefresh()` calls `POST /api/v1/auth/refresh` (sends `refresh_token` cookie automatically)
2. On success: updates Zustand with the new `accessToken`, retries the original request
3. On failure: calls `DELETE /api/auth/clear-session` (Next.js Route Handler clears the HttpOnly cookie), then redirects to `/login`

### Route protection

`proxy.ts` runs before every page render (via Next.js 16 proxy mechanism):

- No `refresh_token` cookie → redirect to `/login?from=<path>`
- On `/login` page with a valid cookie → redirect to `/`
- Static assets and `/api/*` routes are excluded from the matcher

---

## API Endpoints Used

| Method   | Path                            | Description          |
| -------- | ------------------------------- | -------------------- |
| `POST`   | `/api/v1/auth/email/login`      | Login                |
| `POST`   | `/api/v1/auth/refresh`          | Refresh access token |
| `POST`   | `/api/v1/auth/logout`           | Logout               |
| `GET`    | `/api/v1/admin/stats`           | Dashboard statistics |
| `GET`    | `/api/v1/admin/recent-activity` | Recent activity list |
| `GET`    | `/api/v1/users?q=...&page=...`  | Paginated user list  |
| `GET`    | `/api/v1/users/:id`             | User detail          |
| `DELETE` | `/api/v1/users/:id`             | Delete user          |

All endpoints except login/refresh require a valid `Authorization: Bearer <token>` header. Admin endpoints additionally require the `admin` role (`@Roles(RoleEnum.ADMIN)` guard on the API).

---

## Key Dependencies

| Package               | Purpose                                                   |
| --------------------- | --------------------------------------------------------- |
| `next` 16             | Framework (App Router, standalone output)                 |
| `react` 19            | UI library                                                |
| `tailwindcss` v4      | Styling (PostCSS, no `tailwind.config.ts`)                |
| `zustand`             | Auth state management                                     |
| `react-hook-form`     | Form handling                                             |
| `zod`                 | Schema validation                                         |
| `@hookform/resolvers` | Connects zod with react-hook-form                         |
| `lucide-react`        | Icon library                                              |
| `date-fns`            | Relative timestamp formatting                             |
| `@repo/types`         | Shared TypeScript types (`AdminUser`, `AdminStats`, etc.) |
