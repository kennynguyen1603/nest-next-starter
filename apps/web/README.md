# Web — Next.js Frontend

Frontend of **nest-next-starter**, built on [Next.js 16](https://nextjs.org) with React 19, TailwindCSS v4, and TypeScript.  
Runs by default at **http://localhost:3000**.

---

## Features

### 🔐 Authentication
- **Email/Password login** — Form validation with `react-hook-form` + `zod`
- **Account registration** — Sends a confirmation email after successful signup
- **OAuth Social Login** — Google, Facebook, GitHub, Twitter/X
  - Standard Authorization Code Flow (PKCE for Twitter/X)
  - Next.js Route Handler (`/api/auth/[provider]/exchange`) acts as a **server-side proxy** to securely exchange tokens without exposing client secrets to the browser
  - Callback page automatically handles the post-OAuth redirect
- **Automatic token refresh** — When the access token expires, the client silently calls `/auth/refresh`; redirects to `/login` on failure
- **Logout** — Clears client-side tokens and calls the backend logout endpoint

### 🗄️ State Management
- **Zustand** (`lib/auth-store.ts`) — Stores `accessToken`, `tokenExpires`, and `user` in memory
- Tokens are **not stored in `localStorage`**; the refresh token is stored server-side in an **HttpOnly cookie**

### 🌐 API Client
- `lib/api.ts` — Fetch wrapper with:
  - Automatic `Authorization: Bearer <token>` header injection
  - `credentials: 'include'` for cookie support
  - Auto-retry after a successful token refresh
  - Redirects to `/login` when the session has expired

### 📄 Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard — displays account info, requires authentication |
| `/login` | Sign-in page (email form + OAuth buttons) |
| `/register` | Account registration page |
| `/auth/[provider]/callback` | OAuth callback handler (Google, Facebook, GitHub, Twitter) |

> Route `/` automatically redirects to `/login` if the user is not authenticated.

---

## Directory Structure

```
apps/web/
├── app/
│   ├── layout.tsx                  ← Root layout
│   ├── page.tsx                    ← Dashboard (protected)
│   ├── globals.css
│   │
│   ├── (auth)/                     ← Auth layout group (centered card)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx          ← Sign-in page
│   │   └── register/page.tsx       ← Registration page
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
│   ├── api.ts                      ← Fetch wrapper with auth & auto-refresh
│   ├── auth-store.ts               ← Zustand store (accessToken, user)
│   └── oauth.ts                    ← Build OAuth authorization URLs
│
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
  │                        │◄── { token, tokenExpires, user } + cookie
  │◄─── { token, user } ───│                      │                   │
  │                        │                      │                   │
  │ setAuth() → redirect / │                      │                   │
```

> **Security note**: `client_secret` / `app_secret` values are never sent to the browser — all token exchanges happen inside the Next.js Route Handler (server-side).

---

## Setup & Running

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
```

---

## Environment Variables

See the full reference at [`apps/web/.env.example`](./.env.example).

```env
# Backend NestJS URL (required)
NEXT_PUBLIC_API_URL=http://localhost:8080

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

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `next` 16 | Framework |
| `react` 19 | UI library |
| `tailwindcss` v4 | Styling |
| `zustand` | Auth state management |
| `react-hook-form` | Form handling |
| `zod` | Schema validation |
| `@hookform/resolvers` | Connects zod with react-hook-form |
