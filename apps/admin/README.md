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

- **Stats cards** — Total users, new users today, active users, inactive users (all from the database — no hardcoded values)
- **Recent activity** — Last 10 user actions, relative timestamps via `date-fns`
- Data fetched client-side from `GET /api/v1/admin/stats` and `GET /api/v1/admin/recent-activity`

### 👥 Users Management

- **Paginated user table** — Lists all users with name, email, role badge, status badge, and join date
- **Search** — Filter by name/email using the `q` query parameter (`GET /api/v1/users?q=...`)
- **Pagination** — Previous/Next controls; page state in the URL via `page` query parameter
- **Create user** — `/users/new`: form with first name, last name, email, password, role, and status
- **Edit user** — `/users/[id]/edit`: pre-filled form; update name, email, role, status, or password
- **Role assignment** — Role dropdown (user / manager / admin) in both create and edit forms
- **Bulk selection** — Checkboxes on each row + select-all header checkbox (with indeterminate state); a contextual action bar appears above the table when ≥1 user is selected
  - **Set status** — Change status of all selected users at once (active / inactive / pending / banned)
  - **Set role** — Reassign role for all selected users at once (user / manager / admin)
  - **Delete selected** — Delete all selected users after confirmation (shows count in modal)
- **Delete user** — Per-row confirmation modal with Escape key support; inline error display
- **User detail** — Full profile view at `/users/[id]` with Edit and Back buttons

### 📈 Reports

- **Summary cards** — Total, active, inactive users and growth percentage from `GET /admin/reports/user-summary`
- **User growth chart** — SVG line chart (no external library) showing daily registrations over the last 30 days
- **Daily registrations table** — Per-day breakdown for the last 30 days, most recent first

### 🔔 Notifications (opt-in)

Disabled by default. Set `NEXT_PUBLIC_NOTIFICATIONS_ENABLED=true` to show the Notifications page in the sidebar and enable the UI.

- **Send to a single user** — Enter a user ID, fill in type / title / message / optional JSON metadata, and submit. The admin panel calls `POST /api/v1/notifications` with the `ADMIN` role.
- **Broadcast to all users** — Sends the same notification to every user via `POST /api/v1/notifications/broadcast`. A two-step confirmation banner appears before the request is sent to prevent accidental mass sends.
- **Sent history** — A session-scoped list of all notifications dispatched during the current visit (cleared on page reload).
- **Feature-disabled screen** — When `NEXT_PUBLIC_NOTIFICATIONS_ENABLED` is `false`, the page shows a banner with the exact environment variables to set instead of a broken UI.

> [!NOTE]
> The API must also have `NOTIFICATIONS_ENABLED=true` set in `apps/api/.env`. Both flags must be `true` for the feature to work end-to-end.

### 📄 Pages & Routes

| Route              | Description                                |
| ------------------ | ------------------------------------------ |
| `/login`           | Admin login page                           |
| `/`                | Dashboard with stats and recent activity   |
| `/users`           | Paginated user list with search            |
| `/users/new`       | Create a new user                          |
| `/users/[id]`      | User detail view                           |
| `/users/[id]/edit` | Edit user (name, email, role, status)      |
| `/reports`         | User analytics: growth chart + daily table |
| `/settings`        | Placeholder (future)                       |

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
    │   │   │   ├── page.tsx                ← User list (+ New User button)
│   │   │   ├── new/page.tsx            ← Create user form
│   │   │   └── [id]/
│   │   │       ├── page.tsx            ← User detail (+ Edit button)
│   │   │       └── edit/page.tsx       ← Edit user form
│   │   ├── reports/page.tsx            ← User analytics (chart + table)
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

# Set to "true" to enable the Notifications page in the admin panel (opt-in).
# Must be paired with NOTIFICATIONS_ENABLED=true in apps/api/.env.
# Default: false (page shows a "feature disabled" banner instead of the form)
NEXT_PUBLIC_NOTIFICATIONS_ENABLED=false
```

Copy [`apps/admin/.env.example`](./.env.example) to `apps/admin/.env.local` for local development. In Docker, these variables are passed as build args via `docker-compose.yml` — the `.env.local` file is not used in containers.

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

| Method   | Path                                 | Description                   |
| -------- | ------------------------------------ | ----------------------------- |
| `POST`   | `/api/v1/auth/email/login`           | Login                         |
| `POST`   | `/api/v1/auth/refresh`               | Refresh access token          |
| `POST`   | `/api/v1/auth/logout`                | Logout                        |
| `GET`    | `/api/v1/admin/stats`                | Dashboard statistics          |
| `GET`    | `/api/v1/admin/recent-activity`      | Recent activity list          |
| `GET`    | `/api/v1/admin/charts/users-growth`  | Daily user registration data  |
| `GET`    | `/api/v1/admin/reports/user-summary` | User status summary           |
| `GET`    | `/api/v1/users?q=...&page=...`       | Paginated user list           |
| `POST`   | `/api/v1/users`                      | Create user                   |
| `GET`    | `/api/v1/users/:id`                  | User detail                   |
| `PATCH`  | `/api/v1/users/:id`                  | Update user (role, status, …) |
| `DELETE` | `/api/v1/users/:id`                  | Delete user                   |

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
