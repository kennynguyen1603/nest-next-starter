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
- **Permissions caching** — Role-to-permission mappings are cached in Redis for 5 minutes, eliminating repeated JOIN queries on every login and token refresh
- **Per-user email cooldown** — `POST /forgot/password` enforces a per-user Redis-backed cooldown (default 60 s) to prevent email flooding; returns `429` if called again before the cooldown expires
- **Guards & Decorators** — `@ApiAuth()`, `@ApiPublic()` to distinguish public vs protected endpoints

### 🗄️ Database — Dual Adapter

Select the database type via `DATABASE_TYPE` in `.env` — **no code changes required**:

| `DATABASE_TYPE`                 | Adapter | ORM/ODM                          |
| ------------------------------- | ------- | -------------------------------- |
| `mongodb`                       | MongoDB | Mongoose + mongoose-autopopulate |
| `postgres` / `mysql` / `sqlite` | SQL     | TypeORM                          |

Each module has two separate infrastructure layers (`document/` and `relational/`).  
Database seeders: `seed:run:document` / `seed:run:relational`.

### 📁 File Upload — Multi-driver

Select the driver via `FILE_DRIVER`:

| Driver         | Description                          |
| -------------- | ------------------------------------ |
| `local`        | Store files on the server filesystem |
| `s3`           | AWS S3 (multipart upload)            |
| `s3-presigned` | AWS S3 with presigned URLs           |
| `cloudinary`   | Cloudinary CDN                       |

### ⚡ Async Job Queue (BullMQ)

- **BullMQ** — Reliable job queue backed by Redis; all email sending is done asynchronously
- **Email queue** — Three job types: `email-verification`, `confirm-new-email`, `reset-password`
- **Notification queue** — `create-notification` job type; persists in-app notifications asynchronously (opt-in — see below)
- **Rate limiter** — Max 1 email job per 150 ms to avoid mail server throttling
- **Auto-cleanup** — Completed jobs kept for 1 000 entries; failed jobs kept for 5 000 entries
- **Bull Board** — Queue monitoring dashboard at `/api/queues` (protected by Basic Auth)

### 🔔 In-App Notifications (opt-in)

Disabled by default. Set `NOTIFICATIONS_ENABLED=true` to activate the full notification pipeline.

- **Asynchronous persistence** — Callers enqueue a `create-notification` BullMQ job; the worker persists it to the database without blocking the caller
- **Dual database** — Follows the same relational / document split as every other module; no code changes needed when switching databases
- **REST API** — Authenticated endpoints for the currently logged-in user: list (paginated, filterable by read status), mark single/all as read, delete single/all
- **Unread counter** — `NotificationsService.countUnread(userId)` is available for any feature that needs a badge count
- **Bull Board** — The notification queue appears in the dashboard alongside the email queue when the feature is enabled

#### How to enable

Set the environment variable in `apps/api/.env` (or `.env.example`):

```env
NOTIFICATIONS_ENABLED=true
```

When `false` (the default), **neither** `NotificationsModule` nor `NotificationQueueModule` is loaded into `AppModule`. No routes are registered, no queues are created, and no database tables are queried. Setting it to `true` loads both modules at startup.

#### Architecture & request flow

```
Any service / feature
       │
       │  NotificationQueueService.addCreateNotificationJob({ userId, type, title, message, data? })
       ▼
  BullMQ queue: "notification"
       │
       │  (async, Redis-backed)
       ▼
  NotificationProcessor  (@Processor, concurrency 5)
       │
       │  notificationsService.create()  →  NotificationRepository.create()
       ▼
  Database (relational or document)
       │
       │  (if WEBSOCKET_ENABLED=true)
       │  socketService.emitToUser(userId, 'notification:new', notification)
       ▼
  Socket.io → user:{userId} room → connected clients
       │
  ─────┼──────────────────────────────────────────────────────
       │  REST API (JWT-protected)
       ▼
  POST   /api/v1/notifications              ← create (admin only)
  POST   /api/v1/notifications/broadcast    ← broadcast to all users (admin only)
  GET    /api/v1/notifications              ← paginated list (filterable by isRead)
  PATCH  /api/v1/notifications/read-all    ← mark all notifications as read
  PATCH  /api/v1/notifications/:id/read    ← mark one notification as read
  DELETE /api/v1/notifications             ← delete all notifications of the current user
  DELETE /api/v1/notifications/:id         ← delete one notification
```

1. **Producer** — Any NestJS module that imports `NotificationQueueModule` (or `NotificationsModule` which exports `NotificationsService`) can inject `NotificationQueueService` and call `addCreateNotificationJob()`. The call returns immediately after enqueuing.
2. **Queue** — BullMQ stores the job payload in Redis under the `notification` queue name.
3. **Processor** (`NotificationProcessor`) — Runs in the worker process (or main process in development). Picks up jobs with up to 5 concurrent workers. On `CreateNotification` jobs it calls `NotificationsService.create()`.
4. **Repository** — `NotificationsService` delegates to the injected `NotificationRepository`. In relational mode this is `NotificationsRelationalRepository` (TypeORM); in document mode it is `NotificationsDocumentRepository` (Mongoose). No other code changes.
5. **Consumer** — Clients poll `GET /api/v1/notifications` with optional `?isRead=false` to get unread notifications. `PATCH /read-all` marks all as read; `PATCH /:id/read` marks one; `DELETE /` clears all; `DELETE /:id` removes one.

#### Producing a notification from another module

```typescript
// 1. Import the queue module wherever you need to fire notifications
@Module({
  imports: [NotificationQueueModule],
})
export class MyFeatureModule {}

// 2. Inject the queue service
constructor(private readonly notificationQueue: NotificationQueueService) {}

// 3. Enqueue (non-blocking)
await this.notificationQueue.addCreateNotificationJob({
  userId: user.id,
  type: NotificationType.SYSTEM,   // extend NotificationType enum for custom types
  title: 'Welcome!',
  message: 'Your account has been set up.',
  data: { customKey: 'value' },    // optional arbitrary JSON payload
});
```

If you don't need the queue layer (e.g. admin back-fills), you can inject `NotificationsService` directly and call `create()` — but this is synchronous and skips the queue.

#### Notification domain model

| Field       | Type                          | Description                                      |
| ----------- | ----------------------------- | ------------------------------------------------ |
| `id`        | `string` (UUID v7)            | Unique identifier (time-sortable)                |
| `userId`    | `string`                      | Recipient user ID                                |
| `type`      | `NotificationType` (`system`) | Category; extend enum to add custom types        |
| `title`     | `string`                      | Short heading (max 255 chars)                    |
| `message`   | `string`                      | Full notification body                           |
| `data`      | `Record<string, unknown>`     | Arbitrary JSON payload — attach links, IDs, etc. |
| `isRead`    | `boolean`                     | Whether the user has read this notification      |
| `readAt`    | `Date \| null`                | Timestamp of when it was marked read             |
| `createdAt` | `Date`                        | Creation timestamp                               |
| `updatedAt` | `Date`                        | Last update timestamp                            |

#### Extending notification types

Add new values to `NotificationType` in `apps/api/src/notifications/notifications.enum.ts`:

```typescript
export enum NotificationType {
  SYSTEM = 'system',
  ORDER_SHIPPED = 'order_shipped', // add as needed
  COMMENT_REPLY = 'comment_reply',
}
```

The `type` column is a `varchar(50)` so any string fits without a migration.

#### Queue events & monitoring

`NotificationQueueEvents` (a `QueueEventsHost`) logs `completed` and `failed` events using Pino structured logging. Failed jobs are visible in Bull Board at `/api/queues` alongside the email queue.

---

### 🔌 Real-Time Push (WebSocket / Socket.io, opt-in)

Disabled by default. Set `WEBSOCKET_ENABLED=true` to activate the WebSocket gateway.

- **JWT authentication at connect time** — Clients must send a valid access token in the Socket.io handshake. Connections without a valid token receive an `error` event and are immediately disconnected.
- **User rooms** — Each authenticated connection automatically joins the `user:{userId}` Socket.io room. Any server-side push to `user:{userId}` reaches all of that user's open tabs and devices.
- **Notification push** — When a `CreateNotification` BullMQ job completes, the processor emits `notification:new` directly to the user's room. Clients receive the notification in real time without polling.
- **Redis pub/sub adapter** — When enabled, the gateway attaches `@socket.io/redis-adapter`. Every `emit()` is broadcast through Redis pub/sub, so events reach the correct socket even when the user is connected to a different API replica. Horizontal scaling works without sticky sessions (WebSocket transport only; see [Multi-instance note](#multi-instance--production) below).
- **Socket ID tracking** — Active socket IDs per user are tracked in Redis (`socket:{userId}:clients`, TTL 24 h). On disconnect the ID is removed; the key is deleted when the user has no remaining connections.

#### How to enable

```env
# apps/api/.env
WEBSOCKET_ENABLED=true
```

Requires Redis (same connection already used by BullMQ). No additional infrastructure is needed.

#### Architecture & connection lifecycle

```
Client                       API (NestJS)                     Redis
  │                               │                              │
  │── socket.io connect ─────────▶│                              │
  │   handshake.auth.token        │                              │
  │                               │── jwtService.verifyAsync() ──┤
  │                               │◀─ JwtPayloadType ────────────┤
  │                               │── socket.join('user:{id}')   │
  │                               │── SET socket:{id}:clients ──▶│
  │◀─ connected ─────────────────│                              │
  │                               │                              │
  │   (notification created)      │                              │
  │                               │── PUBLISH notification:new ─▶│
  │◀─ event: notification:new ───│◀─ SUBSCRIBE broadcast ───────│
  │                               │                              │
  │── disconnect ────────────────▶│                              │
  │                               │── DEL / update clients ─────▶│
```

1. **Handshake** — Client passes `auth.token` (JWT access token). The gateway verifies it with `JwtService.verifyAsync`. On failure: `error` event → `disconnect(true)`.
2. **Room join** — On success, `socket.data.user` is populated and the socket joins `user:{userId}`.
3. **Push** — `SocketService.emitToUser(userId, event, payload)` targets the `user:{userId}` room. Redis adapter broadcasts to all instances.
4. **Disconnect** — The gateway removes the socket ID from Redis. If no IDs remain, the key is deleted.

#### Event reference

All events are defined in `src/socket/types/socket-event.enum.ts`. The payload types are declared in `ServerToClientEvents` in `src/socket/types/authenticated-socket.type.ts`.

| Event              | Direction       | Payload                      | Description                                             |
| ------------------ | --------------- | ---------------------------- | ------------------------------------------------------- |
| `error`            | Server → Client | `{ message: string }`        | Sent before disconnect when auth fails                  |
| `notification:new` | Server → Client | `Notification` domain object | Emitted when a new notification is created for the user |

#### Emitting to a user from any service

`SocketModule` is `@Global()` — `SocketService` is automatically available to every module without an explicit import. Modules that might run when WebSocket is disabled should use `@Optional()` to avoid DI errors.

```typescript
import { Optional } from '@nestjs/common';
import { SocketService } from '@/socket/socket.service';
import { SocketEvent } from '@/socket/types/socket-event.enum';

constructor(
  @Optional() private readonly socketService: SocketService | null,
) {}

// Push an event to a specific user (all their connected sockets)
this.socketService?.emitToUser(userId, SocketEvent.NotificationNew, payload);

// Push to an arbitrary named room
this.socketService?.emitToRoom('room-name', 'custom:event', payload);
```

> [!IMPORTANT]
> `emitToUser` and `emitToRoom` are **synchronous** — Socket.io's `emit()` is fire-and-forget. Do not `await` them.

#### Client-side connection example

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8080', {
  auth: {
    token: accessToken, // JWT access token from POST /auth/email/login
  },
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('error', ({ message }: { message: string }) => {
  // Fired when the token is missing or invalid; the socket is disconnected immediately after
  console.error('Auth error:', message);
});

socket.on('notification:new', (notification) => {
  // notification matches the Notification domain model
  console.log('New notification:', notification.title);
  // update UI badge, show toast, etc.
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // reason === 'io server disconnect' means the server closed it (e.g. token expired mid-session)
});
```

#### Adding new events

**Step 1** — Add the event name to `SocketEvent` in `src/socket/types/socket-event.enum.ts`:

```typescript
export enum SocketEvent {
  Error = 'error',
  NotificationNew = 'notification:new',
  OrderShipped = 'order:shipped', // ← new
}
```

**Step 2** — Add the payload type to `ServerToClientEvents` in `src/socket/types/authenticated-socket.type.ts`:

```typescript
export interface ServerToClientEvents {
  [SocketEvent.Error]: (data: { message: string }) => void;
  [SocketEvent.NotificationNew]: (data: Notification) => void;
  [SocketEvent.OrderShipped]: (data: OrderShippedDto) => void; // ← new
}
```

**Step 3** — Emit from any service:

```typescript
this.socketService?.emitToUser(userId, SocketEvent.OrderShipped, {
  orderId,
  trackingUrl,
});
```

#### Multi-instance / production

When multiple API replicas are running, a `user:{userId}` socket may be connected to a different instance than the one handling a request. The Redis adapter broadcasts every `emit()` through pub/sub, so the message is always delivered to the correct replica.

**Polling transport & sticky sessions** — The `polling` transport requires all HTTP requests during the WebSocket upgrade to hit the same server. Configure your load balancer to use **sticky sessions** if `polling` transport is enabled. The `websocket` transport (pure WebSocket after the initial handshake) does not require this. To disable polling entirely:

```typescript
// src/socket/socket.gateway.ts — decorator options
transports: ['websocket'],
```

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
- **Per-user email cooldown** — separate from the IP throttler; `POST /forgot/password` checks a Redis key scoped to the user's ID before dispatching an email, returning `429 Too Many Requests` if the cooldown has not expired; prevents a targeted account from being flooded with password-reset emails

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
├── admin/                  ← Admin dashboard endpoints (stats, activity, charts)
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
├── shared/
│   └── cache/              ← CacheModule: CacheService, CacheKey enum, ioredis factory
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
├── notifications/          ← In-app notification module (opt-in, NOTIFICATIONS_ENABLED)
│   ├── domain/
│   │   └── notification.ts ← Domain entity (id, userId, type, title, message, isRead, …)
│   ├── dto/
│   │   └── query-notification.dto.ts
│   ├── infrastructure/persistence/
│   │   ├── notification.repository.ts  ← Abstract repository interface
│   │   ├── relational/     ← TypeORM entity, mapper, repository
│   │   └── document/       ← Mongoose schema, mapper, repository
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   ├── notifications.module.ts
│   └── notifications.enum.ts  ← NotificationType enum
│
├── socket/                 ← WebSocket module (opt-in, WEBSOCKET_ENABLED)
│   ├── types/
│   │   ├── socket-event.enum.ts        ← SocketEvent enum (all event names)
│   │   └── authenticated-socket.type.ts← AuthenticatedSocket type + ServerToClientEvents
│   ├── socket.adapter.ts   ← Factory: creates Redis pub/sub ioredis clients for the adapter
│   ├── socket.gateway.ts   ← @WebSocketGateway: JWT auth on connect, user room management
│   ├── socket.service.ts   ← emitToUser(userId, event, payload) / emitToRoom(room, ...)
│   └── socket.module.ts    ← @Global() module, exports SocketService + SocketGateway
│
├── worker/                 ← BullMQ async job queues
│   └── queues/
│       ├── worker.module.ts
│       ├── email/          ← Email queue (processor, service, events, types)
│       └── notification/   ← Notification queue (processor, service, events, types)
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

| Method   | Path                 | Description                            | Guard          |
| -------- | -------------------- | -------------------------------------- | -------------- |
| `POST`   | `/email/login`       | Login with email & password            | Public         |
| `POST`   | `/email/register`    | Register a new account                 | Public         |
| `POST`   | `/email/confirm`     | Confirm registration email             | Public         |
| `POST`   | `/email/confirm/new` | Confirm new email after change         | Public         |
| `POST`   | `/forgot/password`   | Send a password reset link             | Public         |
| `POST`   | `/reset/password`    | Reset password using token             | Public         |
| `GET`    | `/me`                | Get current user profile               | JWT            |
| `PATCH`  | `/me`                | Update profile (name, photo, password) | JWT            |
| `DELETE` | `/me`                | Delete account (soft delete)           | JWT            |
| `POST`   | `/refresh`           | Refresh access token                   | Refresh cookie |
| `POST`   | `/logout`            | Logout, invalidate session             | JWT            |

### OAuth (`/api/v1/auth`)

| Method | Path              | Provider                |
| ------ | ----------------- | ----------------------- |
| `POST` | `/google/login`   | Google (idToken)        |
| `POST` | `/facebook/login` | Facebook (accessToken)  |
| `POST` | `/github/login`   | GitHub (accessToken)    |
| `POST` | `/twitter/login`  | Twitter/X (accessToken) |

### Users (`/api/v1/users`)

| Method   | Path   | Description            |
| -------- | ------ | ---------------------- |
| `GET`    | `/`    | List users (paginated) |
| `POST`   | `/`    | Create a new user      |
| `GET`    | `/:id` | Get user by ID         |
| `PATCH`  | `/:id` | Update user            |
| `DELETE` | `/:id` | Delete user            |

### Admin (`/api/v1/admin`)

Requires `admin` role (`Authorization: Bearer <admin_token>`).

| Method | Path                    | Description                                                                                     |
| ------ | ----------------------- | ----------------------------------------------------------------------------------------------- |
| `GET`  | `/stats`                | Dashboard statistics (totalUsers, newUsersToday, activeUsers, inactiveUsers, userGrowthPercent) |
| `GET`  | `/recent-activity`      | Last 10 user activity entries                                                                   |
| `GET`  | `/charts/users-growth`  | Daily user registration counts for last 30 days                                                 |
| `GET`  | `/reports/user-summary` | User status summary (total, active, inactive, growth %)                                         |

### Files (`/api/v1/files`)

| Method | Path       | Description           |
| ------ | ---------- | --------------------- |
| `POST` | `/upload`  | Upload a file         |
| `GET`  | `/:id/url` | Get file URL by ID    |
| `GET`  | `/:path`   | Download file by path |

### Notifications (`/api/v1/notifications`) — opt-in (`NOTIFICATIONS_ENABLED=true`)

All endpoints require a valid JWT (`Authorization: Bearer <access_token>`).

| Method   | Path         | Auth        | Query params               | Description                                                 |
| -------- | ------------ | ----------- | -------------------------- | ----------------------------------------------------------- |
| `POST`   | `/`          | JWT + Admin | —                          | Create a notification for any user                          |
| `POST`   | `/broadcast` | JWT + Admin | —                          | Broadcast a notification to all users                       |
| `GET`    | `/`          | JWT         | `page`, `limit`, `isRead?` | Paginated list of the current user's notifications          |
| `PATCH`  | `/read-all`  | JWT         | —                          | Mark all of the current user's notifications as read        |
| `PATCH`  | `/:id/read`  | JWT         | —                          | Mark a notification as read (sets `isRead=true`, `readAt`)  |
| `DELETE` | `/`          | JWT         | —                          | Delete all notifications of the current user                |
| `DELETE` | `/:id`       | JWT         | —                          | Delete a notification (only the owner can delete their own) |

**Query parameters for `GET /`:**

| Param    | Type      | Default | Description                                                                 |
| -------- | --------- | ------- | --------------------------------------------------------------------------- |
| `page`   | `number`  | `1`     | Page number (1-based)                                                       |
| `limit`  | `number`  | `10`    | Items per page                                                              |
| `isRead` | `boolean` | —       | Filter by read status (`true` = read, `false` = unread). Omit to return all |

**Response shape for `GET /` (paginated):**

```jsonc
{
  "data": [
    {
      "id": "019602ab-…",
      "userId": "user-uuid",
      "type": "system",
      "title": "Welcome!",
      "message": "Your account has been set up.",
      "data": {},
      "isRead": false,
      "readAt": null,
      "createdAt": "2026-05-23T10:00:00.000Z",
      "updatedAt": "2026-05-23T10:00:00.000Z",
    },
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false,
  },
}
```

---

## Authentication Flow

The auth system combines **stateless JWTs** for request verification with **server-side sessions** for revocation. Two tokens are issued on every login.

### Token design

| Token             | Payload                                 | Transport                         | Lifetime               |
| ----------------- | --------------------------------------- | --------------------------------- | ---------------------- |
| **Access token**  | `{ id, roles, permissions, sessionId }` | `Authorization: Bearer` header    | Short (default 15 min) |
| **Refresh token** | `{ sessionId, hash }`                   | `HttpOnly` cookie `refresh_token` | Long (default 7 days)  |

The **session** record in the database holds `{ id, user_id, hash }`. The `hash` is a random SHA-256 value that ties the refresh token to a specific session state.

### Login flow

```
POST /api/v1/auth/email/login
  1. Verify email exists + bcrypt password match
  2. Generate hash = SHA-256(random string)
  3. INSERT session { user_id, hash } → DB
  4. Sign access JWT  (secret, short TTL)  — payload: { id, roles, permissions, sessionId }
  5. Sign refresh JWT (refreshSecret, long TTL) — payload: { sessionId, hash }
  6. Return access token in body; set refresh JWT in HttpOnly cookie
```

### Authenticated request

```
GET /api/v1/auth/me  →  Authorization: Bearer <access_token>
  JwtStrategy: verify signature + check payload.id exists
  → no database query
```

The access token is verified purely by signature. No database lookup is performed because the token is short-lived — if compromised, it expires quickly. Revocation is handled by the refresh rotation below.

### Refresh token rotation

```
POST /api/v1/auth/refresh  (cookie sent automatically)
  1. JwtRefreshStrategy reads refresh_token cookie, verifies signature
  2. Generate newHash = SHA-256(random string)
  3. UPDATE session SET hash = newHash WHERE id = sessionId AND hash = oldHash
     → if no row matched (hash mismatch): 401 Unauthorized
  4. Sign new access + refresh token pair with newHash
  5. Set new cookie, return new access token
```

Each refresh token is **single-use**: once used, the `hash` in the DB is replaced. If a stolen refresh token is used first, the legitimate user's next refresh attempt will fail (hash no longer matches), providing detection of token theft.

### Session invalidation

| Event           | Action                                                  |
| --------------- | ------------------------------------------------------- |
| Logout          | Delete session by `sessionId` from DB; clear cookie     |
| Password change | Delete all sessions for user **except** the current one |
| Password reset  | Delete **all** sessions for user                        |

### Email rate limiting (`POST /forgot/password`)

Prevents a user's inbox from being flooded by repeated password-reset requests.

```
POST /api/v1/auth/forgot/password
  1. Look up user by email
     → not found: return 200 success (anti-enumeration — same response either way)
  2. Check Redis key: {prefix}:auth:reset-password-mail:{userId}:last-sent-at
     → key exists (TTL active): throw 429 Too Many Requests
  3. Sign reset-password JWT, enqueue email job via BullMQ
  4. SET Redis key with TTL = AUTH_RESET_PASSWORD_COOLDOWN (default 60 s)
```

The cooldown is keyed by `userId`, not by IP or email address, so it cannot be bypassed by rotating IPs. The IP-level throttler (`@nestjs/throttler`) still applies on top of this.

### Permissions caching

`getPermissionsForRoles(roleNames)` is called on every login and every token refresh. Because permissions change rarely, results are cached in Redis.

```
getPermissionsForRoles(['ADMIN', 'USER'])
  1. Sort role names → 'admin,user'
  2. GET {prefix}:roles:admin,user:permissions from Redis
     → cache hit:  return cached PermissionEnum[]
     → cache miss: query DB (role ⨯ permission JOIN), SET with TTL 5 min, return result
```

- Cache key is the **sorted, comma-joined** role names — stable regardless of input order.
- Empty permission arrays are cached (avoids repeated DB queries for roles with no permissions).
- TTL: 5 minutes (hardcoded). Permissions are seeded data and do not change at runtime.

---

## Redis Application Cache

Both the email cooldown and permissions caching features use a shared `CacheModule` / `CacheService` that wraps `@nestjs/cache-manager` with a typed key-naming convention.

### Architecture

```
CacheModule  (shared/cache/)
├── cache.factory.ts   ← Creates an ioredis-backed keyv store
│                         compatible with @nestjs/cache-manager@3.x + keyv@5
├── cache.service.ts   ← Typed get / set / delete / getTtl wrappers
└── cache.type.ts      ← CacheParam: { key: keyof CacheKey; args?: string[] }
```

### Key naming

All cache keys are defined in `src/constants/cache.constant.ts` as a `CacheKey` enum:

```typescript
export enum CacheKey {
  EmailVerificationToken = 'auth:token:%s:email-verification',
  UserSocketClients = 'socket:%s:clients',
  EmailVerificationMailLastSentAt = 'auth:email-verification-mail:%s:last-sent-at',
  ResetPasswordMailLastSentAt = 'auth:reset-password-mail:%s:last-sent-at',
  RolePermissions = 'roles:%s:permissions',
}
```

At runtime `CacheService._constructCacheKey` builds the full Redis key:

```
{APP_NAME}:{CacheKey[key]} with %s replaced by args
```

Example: `{ key: 'ResetPasswordMailLastSentAt', args: ['42'] }` → `nest-next-starter:auth:reset-password-mail:42:last-sent-at`

### Usage

Import `CacheModule` in any feature module, then inject `CacheService`:

```typescript
// my.module.ts
import { CacheModule } from '@/shared/cache/cache.module';
@Module({ imports: [CacheModule] })
export class MyModule {}

// my.service.ts
constructor(private readonly cacheService: CacheService) {}

// Read (returns undefined on miss)
const value = await this.cacheService.get<MyType>({ key: 'RolePermissions', args: ['user'] });

// Write with TTL (ms)
await this.cacheService.set({ key: 'RolePermissions', args: ['user'] }, data, { ttl: 5 * 60 * 1000 });

// Delete
await this.cacheService.delete({ key: 'RolePermissions', args: ['user'] });
```

### Extending

To cache a new entity:

1. Add a new entry to `CacheKey` in `src/constants/cache.constant.ts` with a `%s` placeholder for each variable segment.
2. Import `CacheModule` in the feature module.
3. Inject `CacheService` and call `get` / `set` with the new key.

### Compatibility note

`@nestjs/cache-manager@3.x` uses `keyv@5` as the underlying store adapter. The older `cache-manager-ioredis-yet` package implements the `cache-manager@5` Store interface (`del` / `reset`) which fails `keyv@5`'s adapter validation (`delete` / `clear` required). `cache.factory.ts` therefore builds the keyv store directly from `ioredis` to ensure compatibility.

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
APP_NAME=nest-next-starter         # used as Redis key prefix and app identifier
APP_PORT=8080
API_PREFIX=api                     # URL prefix — routes become /api/v1/...
FRONTEND_DOMAIN=http://localhost:3000
BACKEND_DOMAIN=http://localhost:8080
ADMIN_DOMAIN=http://localhost:3002   # admin panel origin — added to CORS allow-list
APP_FALLBACK_LANGUAGE=en           # default language when Accept-Language header is absent
APP_HEADER_LANGUAGE=x-custom-lang  # request header used by nestjs-i18n
DATABASE_TYPE=mongodb              # mongodb | postgres | mysql | sqlite
DATABASE_URL=mongodb://localhost:27017/nest_starter
AUTH_JWT_SECRET=change_me_jwt_secret
AUTH_JWT_TOKEN_EXPIRES_IN=15m
AUTH_REFRESH_SECRET=change_me_refresh_secret
AUTH_REFRESH_TOKEN_EXPIRES_IN=7d
AUTH_FORGOT_SECRET=change_me_forgot_secret
AUTH_FORGOT_TOKEN_EXPIRES_IN=30m
AUTH_CONFIRM_EMAIL_SECRET=change_me_confirm_secret
AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN=1d
```

### Redis (required for BullMQ, rate limiting, and application caching)

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                    # optional
REDIS_TLS=false                    # set true if your Redis requires TLS
REDIS_REJECT_UNAUTHORIZED=false    # set true to enforce TLS certificate verification
# Mutual TLS (only needed when REDIS_TLS=true and the server requires client certs):
REDIS_CA=                          # path or PEM string for the CA certificate
REDIS_KEY=                         # path or PEM string for the client private key
REDIS_CERT=                        # path or PEM string for the client certificate
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
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=change_me
```

### Mail

```env
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=
MAIL_PASSWORD=
MAIL_DEFAULT_EMAIL=noreply@example.com
MAIL_DEFAULT_NAME=App          # display name shown in the From header
MAIL_IGNORE_TLS=false          # skip STARTTLS upgrade (use for local/dev SMTP)
MAIL_SECURE=false              # force TLS from the first connection (port 465)
MAIL_REQUIRE_TLS=true          # reject connections that cannot upgrade to TLS
```

### File Storage

```env
FILE_DRIVER=local              # local | s3 | s3-presigned | cloudinary
# If using S3 or s3-presigned:
ACCESS_KEY_ID=
SECRET_ACCESS_KEY=
AWS_DEFAULT_S3_BUCKET=
AWS_S3_REGION=ap-southeast-1
# If using Cloudinary:
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Job Queue

```env
QUEUE_REMOVE_ON_COMPLETE=true   # auto-remove completed jobs from Redis (saves memory)
QUEUE_REMOVE_ON_FAIL=true       # auto-remove failed jobs (set to false to keep for inspection)
QUEUE_FAILED_RETRY_ATTEMPTS=3   # number of automatic retries before marking a job as failed
```

### Database (additional options)

```env
DATABASE_MAX_CONNECTIONS=100        # TypeORM connection pool size (SQL only)
DATABASE_SSL_ENABLED=false          # enable SSL/TLS for the database connection
DATABASE_REJECT_UNAUTHORIZED=false  # reject connections with unverifiable certificates
```

### Rate Limiting (Throttler)

```env
THROTTLER_ENABLED=true     # false = disable entirely (useful in development)
THROTTLER_LIMIT=60         # max requests per TTL window per IP
THROTTLER_TTL=60           # TTL window in seconds
```

> Default in `.env.example` is disabled (`THROTTLER_ENABLED=false`) — enable in production.  
> Storage is Redis (shared with BullMQ). The tracker key is the client's real IP, resolved in order: `x-forwarded-for` → `x-real-ip` → `req.ips[0]` → `req.ip`.

### Email Cooldown

```env
AUTH_RESET_PASSWORD_COOLDOWN=60s   # min wait between reset-password emails per user (optional, default 60s)
```

Controls how long a user must wait before requesting another password-reset email. Accepts any [ms](https://github.com/vercel/ms) string (`30s`, `2m`, `1h`). Acts in addition to — not instead of — the IP-level throttler.

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

### In-App Notifications (opt-in)

```env
# Set to true to enable the notification module.
# When false (default), NotificationsModule and NotificationQueueModule are NOT loaded —
# no routes, no queue, and no database access for notifications.
NOTIFICATIONS_ENABLED=false
```

> [!NOTE]
> Requires Redis (same connection as BullMQ) and the database to be running. No additional infrastructure is needed beyond what the API already uses.

### WebSocket (opt-in)

```env
# Set to true to enable the WebSocket gateway (Socket.io).
# When false (default), SocketModule is NOT loaded — no WebSocket port, no Redis pub/sub
# connections, and SocketService is not registered in the DI container.
WEBSOCKET_ENABLED=false
```

When `WEBSOCKET_ENABLED=true`, the gateway is available on the **same port** as the HTTP API (8080). Socket.io handles protocol negotiation automatically — no separate port is required.

**CORS** — The gateway reads `FRONTEND_DOMAIN` directly from `process.env` (decorator constraints prevent DI at that stage). Ensure `FRONTEND_DOMAIN` is set correctly in production.

```env
FRONTEND_DOMAIN=http://localhost:3000   # used for both HTTP CORS and WebSocket CORS
```

> [!NOTE]
> Requires Redis. The Redis adapter uses the same `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_TLS` values already configured for BullMQ — no additional Redis settings are needed.

> [!TIP]
> `WEBSOCKET_ENABLED` and `NOTIFICATIONS_ENABLED` are independent flags. Enabling WebSocket without notifications is valid (the gateway runs but no `notification:new` events are emitted). Enabling notifications without WebSocket is also valid (notifications are persisted and available via REST, but no real-time push occurs).

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

Visit **http://localhost:8080/api/queues** — protected by Basic Auth (`BASIC_AUTH_USERNAME` / `BASIC_AUTH_PASSWORD`).

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

| Dashboard      | File                        | What it shows                                                              |
| -------------- | --------------------------- | -------------------------------------------------------------------------- |
| **Server**     | `server.dashboard.json`     | Node.js process CPU, memory, heap, event-loop lag, active handles/requests |
| **PostgreSQL** | `postgres.dashboard.json`   | Transactions, locks, cache hit rate, connection count, buffer stats        |
| **Prometheus** | `prometheus.dashboard.json` | Prometheus internals: scrape duration, WAL, memory, compaction             |

Dashboard files live in `src/tools/grafana/dashboards/` and are auto-loaded by Grafana via the provisioning config in `src/tools/grafana/provisioning/`.

### Access URLs

| Interface   | URL                           | Auth                                    |
| ----------- | ----------------------------- | --------------------------------------- |
| Grafana     | http://localhost:3001         | `GRAFANA_USERNAME` / `GRAFANA_PASSWORD` |
| Prometheus  | http://localhost:9090         | None                                    |
| API metrics | http://localhost:8080/metrics | None                                    |

### Prometheus scrape targets

Configured in `prometheus.config.yml` at the project root:

| Job          | Target                   | Description                     |
| ------------ | ------------------------ | ------------------------------- |
| `prometheus` | `localhost:9090`         | Prometheus self-monitoring      |
| `server`     | `api:8080`               | NestJS API metrics              |
| `database`   | `postgres-exporter:9187` | PostgreSQL metrics (SQL users)  |
| `mongodb`    | `mongodb-exporter:9216`  | MongoDB metrics (MongoDB users) |

### Data persistence

| Directory                  | Contents                                                             |
| -------------------------- | -------------------------------------------------------------------- |
| `.docker/prometheus-data/` | Prometheus time-series data (retained across restarts)               |
| `.docker/grafana-data/`    | Grafana state: alert rules, user preferences, custom dashboard edits |

Directories are created automatically on first start. File ownership is fixed by `setup_prometheus` and `setup_grafana` init containers.

### Reset monitoring data

```bash
# From the project root
docker compose --profile monitoring down
rm -rf .docker/
```
