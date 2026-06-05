# Web — Next.js Frontend

Frontend of **nest-next-starter**, built on [Next.js 16](https://nextjs.org) with React 19, TailwindCSS v4, and TypeScript.  
Runs by default at **http://localhost:3000**.

---

## Features

### 🔐 Authentication

- **Email/Password login** — Form validation with `react-hook-form` + `zod`; field-level API errors (e.g. duplicate email on register) are shown under the relevant input
- **Account registration** — Sends a confirmation email after successful signup
- **Email confirmation** — `/confirm-email?hash=…` reads the hash from the URL, calls `POST /auth/email/confirm`, shows success/error state, and redirects to `/login` after 3 seconds
- **OAuth Social Login** — Google, Facebook, GitHub, Twitter/X
  - Standard Authorization Code Flow (PKCE for Twitter/X)
  - Next.js Route Handler (`/api/auth/[provider]/exchange`) acts as a **server-side proxy** to securely exchange tokens without exposing client secrets to the browser
  - Callback page automatically handles the post-OAuth redirect
- **Automatic token refresh** — When the access token expires, the client silently calls `/auth/refresh`; redirects to `/login` on failure
- **Logout** — Clears client-side state and calls the backend logout endpoint

> **Profile loading**: After any login (email or OAuth), the app always calls `GET /auth/me` to load the canonical user profile. This ensures all user fields are complete regardless of what the login response includes.

### 🗄️ State Management

- **Zustand** (`lib/auth-store.ts`) — Stores `accessToken`, `tokenExpires`, and `user` in memory
- The refresh token is stored server-side in an **HttpOnly cookie**
- `localStorage` is used temporarily during the OAuth flow to pass the result from the callback page to the home page (`_oauth_result` key); it is cleared immediately after being read

### 🌐 API Client

- `lib/api.ts` — Fetch wrapper with:
  - Automatic `Authorization: Bearer <token>` header injection
  - `credentials: 'include'` for cookie support
  - Auto-retry after a successful token refresh
  - Redirects to `/login` when the session has expired
  - Attaches `details` from API 422 responses to the thrown error, enabling field-level error display in forms

### ✏️ Profile Management

- **Edit profile** — Update first name, last name, and avatar photo
- **Change password** — Only available for accounts registered with email/password; hidden for OAuth users (Google, GitHub, etc.) since they authenticate through their provider
- **Delete account** — Requires confirmation before soft-deleting the account

### 🔔 Notifications Inbox

- **Notifications page** — `/[locale]/notifications`: lists all notifications with unread/read indicator
- **Mark as read** — Single (✓ button) or all at once ("Mark all read" header button)
- **Delete** — Single (✕ button) or all ("Clear all" with confirm dialog)
- **Pagination** — Previous/Next with page info
- Data fetched from `GET /api/v1/notifications`; mutations via `PATCH /read-all`, `DELETE /`, `PATCH /:id/read`, `DELETE /:id`

### 📄 Pages & Routes

| Route                       | Description                                                |
| --------------------------- | ---------------------------------------------------------- |
| `/[locale]/`                | Dashboard — displays account info, requires authentication |
| `/[locale]/login`           | Sign-in page (email form + OAuth buttons)                  |
| `/[locale]/register`        | Account registration page                                  |
| `/[locale]/forgot-password` | Request a password reset email                             |
| `/[locale]/reset-password`  | Reset password using the token from email                  |
| `/[locale]/confirm-email`   | Email confirmation handler (reads `?hash=` from URL)       |
| `/[locale]/notifications`   | Notifications inbox with bulk and single operations        |
| `/auth/[provider]/callback` | OAuth callback handler (Google, Facebook, GitHub, Twitter) |

> Route `/[locale]/` automatically redirects to `/[locale]/login` if the user is not authenticated.

---

## Directory Structure

```
apps/web/
├── app/
│   ├── layout.tsx                  ← Root layout
│   ├── globals.css
│   │
│   ├── [locale]/                   ← Locale-aware routes (e.g. /en/, /vi/)
│   │   ├── layout.tsx
│   │   ├── page.tsx                ← Dashboard (protected)
│   │   │
│   │   ├── (auth)/                 ← Auth layout group (centered card)
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx              ← Sign-in page
│   │   │   ├── register/page.tsx           ← Registration page
│   │   │   ├── forgot-password/page.tsx    ← Request password reset
│   │   │   ├── reset-password/page.tsx     ← Reset password with token
│   │   │   └── confirm-email/page.tsx      ← Email confirmation handler
│   │   │
│   │   ├── notifications/page.tsx      ← Notifications inbox
│   │   │
│   │   └── _components/
│   │       ├── edit-profile-dialog.tsx    ← Edit name, photo, password (email users only)
│   │       ├── delete-account-dialog.tsx  ← Confirm account deletion
│   │       └── language-switcher.tsx      ← Switch locale
│   │
│   ├── auth/
│   │   └── [provider]/callback/
│   │       └── page.tsx            ← OAuth callback handler (client-side)
│   │
│   └── api/
│       └── auth/[provider]/exchange/
│           └── route.ts            ← Server-side token exchange (Route Handler)
│
├── lib/
│   ├── api.ts                      ← Fetch wrapper with auth, auto-refresh, and error details
│   ├── auth-store.ts               ← Zustand store (accessToken, user)
│   ├── oauth.ts                    ← Build OAuth authorization URLs
│   └── navigation.ts               ← next-intl locale-aware router & Link
│
├── i18n/
│   ├── routing.ts                  ← Configured locales
│   └── request.ts                  ← Server-side locale resolution
│
├── messages/                       ← Translation files (en, vi, …)
├── proxy.ts                        ← next-intl locale routing (Next 16 proxy, replaces middleware.ts)
├── public/
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## OAuth Flow (Detailed)

```
Browser               Next.js Server        Backend (NestJS)      Provider
  │                        │                      │                   │
  │── Click "Login Google" ►│                      │                   │
  │◄── Build & redirect ───│                      │                   │
  │                        │                      │                Google
  │──────────────────────────────── OAuth redirect ──────────────────►│
  │◄────────────────────── Callback with ?code=... ──────────────────│
  │                        │                      │                   │
  │── POST /api/auth/google/►│                      │                   │
  │      exchange { code } │── Exchange code ─────────────────────►│
  │                        │◄──── id_token ───────────────────────│
  │                        │── POST /api/v1/auth/google/login ────►│
  │                        │◄── { token, tokenExpires } + cookie ──│
  │◄─── { token } ─────────│                      │                   │
  │                        │                      │                   │
  │ setAuth(token, null)   │                      │                   │
  │ redirect /             │                      │                   │
  │                        │                      │                   │
  │── GET /api/v1/auth/me ────────────────────────►│                   │
  │◄─── { user } ─────────────────────────────────│                   │
  │ setAuth(token, user)   │                      │                   │
```

> **Security note**: `client_secret` / `app_secret` values are never sent to the browser — all token exchanges happen inside the Next.js Route Handler (server-side).

---

## Setup & Running

### Local development

```bash
# From the monorepo root
pnpm install

# Configure environment
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.local

# Development
pnpm dev --filter=web

# Production
pnpm build --filter=web
pnpm --filter=web start

# Tests
pnpm --filter=web test
```

### Docker

The web app is fully containerised. `NEXT_PUBLIC_*` variables must be provided as **build args** (they are baked into the bundle at build time):

```bash
# From the project root
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx docker compose up --build
```

At runtime, the container reads `API_URL` (internal Docker network URL, e.g. `http://api:8080`) for server-side Route Handler calls, while client-side code uses the `NEXT_PUBLIC_API_URL` that was baked in at build time.

---

## Environment Variables

See the full reference at [`apps/web/.env.example`](./.env.example).

```env
# Backend NestJS URL — baked into the client bundle at build time
NEXT_PUBLIC_API_URL=http://localhost:8080

# Server-side only — used by Route Handlers inside the container
# Set this to the internal Docker service name in production containers
# API_URL=http://api:8080

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=          # Server-only (no NEXT_PUBLIC_ prefix)

# Facebook OAuth
NEXT_PUBLIC_FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=           # Server-only

# GitHub OAuth
NEXT_PUBLIC_GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=          # Server-only

# Twitter/X OAuth
NEXT_PUBLIC_TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=         # Server-only
```

> [!IMPORTANT]
> Variables prefixed with `NEXT_PUBLIC_` are bundled into the client (visible in the browser).  
> Variables **without** the prefix exist server-side only and are **never exposed to the browser**.  
> In Docker, `API_URL` must point to the internal service name (`http://api:8080`), not `localhost`.

---

## Key Dependencies

| Package               | Purpose                                 |
| --------------------- | --------------------------------------- |
| `next` 16             | Framework                               |
| `react` 19            | UI library                              |
| `tailwindcss` v4      | Styling                                 |
| `zustand`             | Auth state management                   |
| `react-hook-form`     | Form handling                           |
| `zod`                 | Schema validation                       |
| `@hookform/resolvers` | Connects zod with react-hook-form       |
| `next-intl`           | Internationalization and locale routing |
| `vitest`              | Unit test runner                        |
