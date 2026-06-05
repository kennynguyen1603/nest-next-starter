# Utils

Shared helpers, interceptors, types, and pagination utilities used across the entire application.

---

## Table of Contents

1. [Entity Helpers](#1-entity-helpers)
2. [Pagination](#2-pagination)
3. [Types](#3-types)
4. [Transformers](#4-transformers)
5. [Validation](#5-validation)
6. [Interceptors](#6-interceptors)
7. [Security](#7-security)

---

## 1. Entity Helpers

### `EntityRelationalHelper` — `relational-entity-helper.ts`

Base class for all **TypeORM entities**. Provides two features:

- `__entity` — automatically set to the class name after loading from the database (useful for runtime entity identification).
- `toJSON()` — serializes the entity via `class-transformer`'s `instanceToPlain`, respecting `@Exclude` and `@Expose` decorators.

**Usage:**

```typescript
@Entity({ name: 'role' })
export class RoleEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: String })
  id!: RoleEnum;
}
```

---

### `EntityDocumentHelper` — `document-entity-helper.ts`

Base class for all **Mongoose schema documents**. Handles correct serialization of MongoDB's `_id` field when using `class-transformer`.

- `_id` is transformed to a `string` during serialization (workaround for [class-transformer#879](https://github.com/typestack/class-transformer/issues/879)).

**Usage:**

```typescript
@Schema({ timestamps: true })
export class RoleSchema extends EntityDocumentHelper {
  @Prop()
  name?: string;
}
```

---

## 2. Pagination

### Infinity Pagination

**When to use:** APIs returning a list with a simple `hasNextPage` flag, where counting total records is unnecessary.

#### `InfinityPaginationResponseDto` — `dto/infinity-pagination-response.dto.ts`

Response DTO containing `data[]` and `hasNextPage`. Use `InfinityPaginationResponse(ClassRef)` to generate a Swagger-aware subclass:

```typescript
@ApiExtraModels(InfinityPaginationResponse(UserDto))
@Get()
async list(): Promise<InfinityPaginationResponse(UserDto)> { ... }
```

#### `infinityPagination()` — `infinity-pagination.ts`

Helper that computes `hasNextPage` from the query result.

The convention is to fetch `limit + 1` records, then pass the sliced result to this helper:

```typescript
const data = await repo.find({ take: limit + 1 });
return infinityPagination(data.slice(0, limit), { page, limit });
// hasNextPage = true when the raw result contained limit+1 items
```

---

### Offset Pagination — `pagination/offset-pagination.ts`

**When to use:** Traditional page/limit pagination with TypeORM's `SelectQueryBuilder`. Returns both the result list and metadata (`OffsetPaginationDto`).

```typescript
import { paginate } from '@/utils/pagination/offset-pagination';

const [items, meta] = await paginate(qb, pageOptionsDto);
// meta.page, meta.limit, meta.itemCount, meta.pageCount
```

**Options:**

| Option      | Description                                                                       |
| ----------- | --------------------------------------------------------------------------------- |
| `skipCount` | Skip the `getCount()` query when total count is not needed (improves performance) |
| `takeAll`   | Ignore `skip/take` and return all results                                         |

```typescript
// Without total count (faster):
const [items] = await paginate(qb, pageOptionsDto, { skipCount: true });
```

---

### Cursor Pagination — `pagination/cursor-pagination.ts`

**When to use:** Efficient pagination for large datasets, supporting infinite scroll via a base64-encoded cursor. No total count required.

#### Configuration

```typescript
const paginator = buildPaginator({
  entity: UserEntity,
  alias: 'user', // QueryBuilder alias (defaults to entity name in lowercase)
  paginationKeys: ['createdAt', 'id'], // columns used to build the cursor (defaults to ['id'])
  query: {
    limit: 20,
    order: 'DESC', // 'ASC' | 'DESC'
    afterCursor: req.query.afterCursor, // cursor for the next page
    beforeCursor: req.query.beforeCursor, // cursor for the previous page
  },
});

const { data, cursor } = await paginator.paginate(qb);
// cursor.afterCursor  → pass in the next request to fetch the next page
// cursor.beforeCursor → pass in the next request to fetch the previous page
```

#### Important notes

- `paginationKeys` must end with a **unique** column (typically `id`) to guarantee stable ordering.
- Cursors are base64-encoded — do not parse them manually; simply relay them from the response back to the next request.
- Supported column types: `string`, `number`, `date`, branded types (UUID, etc.).
- When `beforeCursor` is provided, ordering is automatically reversed and the result is flipped back to the correct direction.

---

## 3. Types

Small utility types that replace `any` or common unions:

| File                          | Type                 | Description                                          |
| ----------------------------- | -------------------- | ---------------------------------------------------- |
| `types/maybe.type.ts`         | `MaybeType<T>`       | `T \| undefined` — value that may not exist          |
| `types/nullable.type.ts`      | `NullableType<T>`    | `T \| null` — value that may be null                 |
| `types/or-never.type.ts`      | `OrNeverType<T>`     | `T` — explicit alias used when the value is always T |
| `types/deep-partial.type.ts`  | `DeepPartial<T>`     | All properties (including nested) made optional      |
| `types/pagination-options.ts` | `IPaginationOptions` | `{ page, limit }` interface for infinity pagination  |

**Examples:**

```typescript
function findUser(id: string): NullableType<User> { ... }
function getEmail(): MaybeType<string> { ... }

function updateUser(data: DeepPartial<User>): void { ... }
// data.address?.city is valid even if address is optional
```

---

## 4. Transformers

### `lowerCaseTransformer` — `transformers/lower-case.transformer.ts`

Used with `class-transformer`'s `@Transform` decorator to automatically lowercase and trim a string value when binding a DTO.

**Usage:**

```typescript
import { Transform } from 'class-transformer';
import { lowerCaseTransformer } from '@/utils/transformers/lower-case.transformer';

export class CreateUserDto {
  @Transform(lowerCaseTransformer)
  email!: string;
}
```

If the value is not a string, the transformer returns it unchanged without throwing.

---

## 5. Validation

### `validateConfig()` — `validate-config.ts`

**When to use:** Validate environment variables inside `*.config.ts` files at application startup. Throws a descriptive error when a variable is missing or has the wrong type — instead of letting the app crash at runtime.

```typescript
// src/config/database.config.ts
import validateConfig from '@/utils/validate-config';

class DatabaseVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsInt()
  @Min(1)
  DATABASE_PORT!: number;
}

export default registerAs('database', () =>
  validateConfig(process.env, DatabaseVariables),
);
```

On failure, throws with a clear per-property message:

```
Error in DATABASE_PORT:
+ isInt: DATABASE_PORT must be an integer
```

---

### `validationOptions` — `validation-options.ts`

Default configuration for the global `ValidationPipe`:

| Option                 | Value  | Description                                                    |
| ---------------------- | ------ | -------------------------------------------------------------- |
| `transform`            | `true` | Automatically transform types (string → number, etc.)          |
| `whitelist`            | `true` | Strip properties not declared in the DTO                       |
| `forbidNonWhitelisted` | `true` | Reject (`422`) any request whose body/query has unknown fields |
| `errorHttpStatusCode`  | `422`  | Validation errors return `422 Unprocessable Entity`            |

**Setup in `main.ts`:**

```typescript
import validationOptions from '@/utils/validation-options';

app.useGlobalPipes(new ValidationPipe(validationOptions));
```

Validation error response format:

```json
{
  "status": 422,
  "errors": {
    "email": "email must be an email",
    "password": "password must be at least 8 characters and contain a letter and a number"
  }
}
```

---

## 6. Interceptors

### `ResolvePromisesInterceptor` — `serializer.interceptor.ts`

**When to use:** When a response object contains nested getters or virtual fields that return a `Promise`. This interceptor recursively resolves all Promises in the response before it is sent to the client.

**Global setup:**

```typescript
// main.ts
import { ResolvePromisesInterceptor } from '@/utils/serializer.interceptor';

app.useGlobalInterceptors(new ResolvePromisesInterceptor());
```

**Per-controller or per-route:**

```typescript
@UseInterceptors(ResolvePromisesInterceptor)
@Get(':id')
async findOne(@Param('id') id: string) { ... }
```

Internally uses `deepResolvePromises()` from `deep-resolver.ts` to traverse the entire object tree and resolve each Promise found.

---

## 7. Security

### `security.ts`

Request context extraction and device fingerprinting helpers, used by the auth layer to record device metadata on every login.

#### Interfaces

```typescript
interface DeviceInfo {
  browser?: string; // e.g. "Chrome"
  browserVersion?: string; // e.g. "124.0.0"
  os?: string; // e.g. "macOS"
  platform?: string; // e.g. "desktop" | "mobile" | "tablet"
  device?: string; // model name or OS fallback
}

interface SecurityContext {
  ip: string;
  userAgent: string;
  deviceInfo: DeviceInfo;
}
```

#### Functions

| Function             | Signature                            | Description                                                                                                                                                                           |
| -------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getClientIp`        | `(req: Request) => string`           | Extracts the real client IP by checking `x-client-ip`, `x-forwarded-for`, `cf-connecting-ip`, `x-real-ip`, and other proxy headers in order; falls back to `req.socket.remoteAddress` |
| `parseUserAgent`     | `(userAgent: string) => DeviceInfo`  | Parses a `User-Agent` string via `ua-parser-js`; returns browser name/version, OS, platform, and device model                                                                         |
| `formatDeviceName`   | `(deviceInfo: DeviceInfo) => string` | Produces a human-readable label: `"Chrome 124 on macOS"`. Returns `"Unknown Device"` if no info is available                                                                          |
| `getSecurityContext` | `(req: Request) => SecurityContext`  | Convenience wrapper — calls `getClientIp` + `parseUserAgent` and returns a `SecurityContext`                                                                                          |
| `generateDeviceId`   | `(userAgent?: string) => string`     | SHA-256 hash of the User-Agent string, truncated to 32 hex chars. Stable per browser/UA — not tied to IP so it survives network changes                                               |

#### Usage

```typescript
import {
  getSecurityContext,
  generateDeviceId,
  formatDeviceName,
} from '@/utils/security';

// In a controller:
const ctx = getSecurityContext(req);
// ctx.ip        → "203.0.113.42"
// ctx.userAgent → "Mozilla/5.0 ..."
// ctx.deviceInfo.browser → "Chrome"

// Build a stable device fingerprint:
const deviceId = generateDeviceId(ctx.userAgent); // "a3f7c2..."
const deviceName = formatDeviceName(ctx.deviceInfo); // "Chrome 124 on macOS"
```

The `getSecurityContext` helper is called in every login handler (`POST /auth/email/login` and all four OAuth controllers). The resulting `SecurityContext` is forwarded to `AuthService.validateLogin` / `validateSocialLogin`, which stores the device fields on the session record.
