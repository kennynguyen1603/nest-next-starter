# Throttler Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write comprehensive unit and e2e tests for the throttler module (`throttler.config.ts`, `throttler.factory.ts`, `throttler.guard.ts`) covering all code paths, then fix every failing test.

**Architecture:** Three unit test files co-located with source files (`.spec.ts`), one e2e test in `apps/api/test/`. Unit tests use `Test.createTestingModule` or direct function calls; the e2e test spins up a minimal NestJS Express app with a test controller and uses `supertest`.

**Tech Stack:** Jest 30, `@nestjs/testing`, `supertest`, `@nestjs/throttler` v6.5 (in-memory storage for tests — no Redis required).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/api/src/config/throttler/throttler.config.spec.ts` | Unit-test `getConfig()` env-var logic |
| Create | `apps/api/src/config/throttler/throttler.factory.spec.ts` | Unit-test `useThrottlerFactory()` options shape |
| Create | `apps/api/src/config/throttler/throttler.guard.spec.ts` | Unit-test `getRequestResponse()` + `getTracker()` |
| Create | `apps/api/test/throttler.e2e-spec.ts` | E2E: rate limiting, skip, per-IP tracking |

---

## Task 1: Unit tests for `throttler.config.ts`

**Files:**
- Create: `apps/api/src/config/throttler/throttler.config.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// apps/api/src/config/throttler/throttler.config.spec.ts
import { seconds } from '@nestjs/throttler';
import { getConfig } from './throttler.config';

describe('getConfig', () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original };
    delete process.env.THROTTLER_ENABLED;
    delete process.env.THROTTLER_LIMIT;
    delete process.env.THROTTLER_TTL;
  });

  afterEach(() => {
    process.env = original;
  });

  describe('enabled', () => {
    it('is true when THROTTLER_ENABLED is not set', () => {
      expect(getConfig().enabled).toBe(true);
    });

    it('is false when THROTTLER_ENABLED=false', () => {
      process.env.THROTTLER_ENABLED = 'false';
      expect(getConfig().enabled).toBe(false);
    });

    it('is true when THROTTLER_ENABLED=true', () => {
      process.env.THROTTLER_ENABLED = 'true';
      expect(getConfig().enabled).toBe(true);
    });
  });

  describe('limit', () => {
    it('defaults to 3', () => {
      expect(getConfig().limit).toBe(3);
    });

    it('reads from THROTTLER_LIMIT', () => {
      process.env.THROTTLER_LIMIT = '10';
      expect(getConfig().limit).toBe(10);
    });
  });

  describe('ttl', () => {
    it('is 0 when disabled', () => {
      process.env.THROTTLER_ENABLED = 'false';
      expect(getConfig().ttl).toBe(0);
    });

    it('defaults to seconds(1) when enabled and THROTTLER_TTL not set', () => {
      expect(getConfig().ttl).toBe(seconds(1));
    });

    it('reads from THROTTLER_TTL in seconds when enabled', () => {
      process.env.THROTTLER_TTL = '30';
      expect(getConfig().ttl).toBe(seconds(30));
    });
  });
});
```

- [ ] **Step 2: Run the tests and confirm they pass**

```bash
pnpm --filter api test -- --testPathPattern=throttler.config
```

Expected output: 7 tests pass (PASS `src/config/throttler/throttler.config.spec.ts`)

- [ ] **Step 3: Fix any failures, then re-run until green**

Common failure: if `getConfig()` is not exported, add `export` to the function declaration in `throttler.config.ts`.

---

## Task 2: Unit tests for `throttler.factory.ts`

**Files:**
- Create: `apps/api/src/config/throttler/throttler.factory.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// apps/api/src/config/throttler/throttler.factory.spec.ts
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import useThrottlerFactory from './throttler.factory';

jest.mock('@nest-lab/throttler-storage-redis', () => ({
  ThrottlerStorageRedisService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => ({})),
}));

describe('useThrottlerFactory', () => {
  let config: { getOrThrow: jest.Mock };

  beforeEach(() => {
    config = { getOrThrow: jest.fn() };
    jest.clearAllMocks();
  });

  function mockConfig(enabled: boolean, ttl = 1000, limit = 3) {
    config.getOrThrow.mockImplementation((key: string) => {
      switch (key) {
        case 'throttler.enabled':
          return enabled;
        case 'throttler.ttl':
          return ttl;
        case 'throttler.limit':
          return limit;
        case 'redis':
          return { host: 'localhost', port: 6379 };
        default:
          throw new Error(`Unexpected config key: ${String(key)}`);
      }
    });
  }

  describe('skipIf', () => {
    it('returns true when throttler is disabled', () => {
      mockConfig(false);
      const result = useThrottlerFactory(config as unknown as ConfigService);
      expect(result.skipIf!({} as any)).toBe(true);
    });

    it('returns false when throttler is enabled', () => {
      mockConfig(true);
      const result = useThrottlerFactory(config as unknown as ConfigService);
      expect(result.skipIf!({} as any)).toBe(false);
    });
  });

  describe('throttlers', () => {
    it('passes ttl and limit from config', () => {
      mockConfig(true, 60000, 5);
      const result = useThrottlerFactory(config as unknown as ConfigService);
      expect(result.throttlers).toEqual([{ ttl: 60000, limit: 5 }]);
    });
  });

  describe('storage', () => {
    it('creates ThrottlerStorageRedisService', () => {
      mockConfig(true);
      const result = useThrottlerFactory(config as unknown as ConfigService);
      expect(result.storage).toBeDefined();
      expect(ThrottlerStorageRedisService).toHaveBeenCalledTimes(1);
    });
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm --filter api test -- --testPathPattern=throttler.factory
```

Expected output: 4 tests pass (PASS `src/config/throttler/throttler.factory.spec.ts`)

- [ ] **Step 3: Fix any failures, then re-run until green**

Common issue: if `jest.mock('ioredis', ...)` path doesn't match, check the import path in `throttler.factory.ts`.

---

## Task 3: Unit tests for `throttler.guard.ts`

**Files:**
- Create: `apps/api/src/config/throttler/throttler.guard.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// apps/api/src/config/throttler/throttler.guard.spec.ts
import { ExecutionContext, ContextType } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './throttler.guard';

function makeRequest(overrides: Record<string, unknown> = {}) {
  return { headers: {}, ip: '127.0.0.1', ips: undefined, ...overrides };
}

function makeHttpContext(req = makeRequest(), res = {}): ExecutionContext {
  return {
    getType: () => 'http' as ContextType,
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
}

describe('AppThrottlerGuard', () => {
  let guard: AppThrottlerGuard;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot({ throttlers: [{ limit: 3, ttl: 60000 }] })],
      providers: [AppThrottlerGuard],
    }).compile();
    guard = module.get(AppThrottlerGuard);
  });

  describe('getRequestResponse', () => {
    it('returns req and res from HTTP context', () => {
      const req = makeRequest();
      const res = {};
      const result = guard.getRequestResponse(makeHttpContext(req, res));
      expect(result).toEqual({ req, res });
    });

    it('extracts req and res from GraphQL context', () => {
      const req = makeRequest();
      const res = {};

      jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getContext: () => ({ req, res }),
      } as unknown as GqlExecutionContext);

      const context = { getType: () => 'graphql' } as unknown as ExecutionContext;
      const result = guard.getRequestResponse(context);
      expect(result).toEqual({ req, res });
    });
  });

  describe('getTracker', () => {
    async function track(overrides: Record<string, unknown>) {
      return (guard as any).getTracker(makeRequest(overrides));
    }

    it('returns single IP from x-forwarded-for string', async () => {
      expect(await track({ headers: { 'x-forwarded-for': '1.2.3.4' } })).toBe('1.2.3.4');
    });

    it('returns first IP when x-forwarded-for has multiple comma-separated IPs', async () => {
      expect(
        await track({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12' } }),
      ).toBe('1.2.3.4');
    });

    it('returns first element when x-forwarded-for is an array', async () => {
      expect(
        await track({ headers: { 'x-forwarded-for': ['1.2.3.4', '5.6.7.8'] } }),
      ).toBe('1.2.3.4');
    });

    it('trims whitespace from extracted IP', async () => {
      expect(await track({ headers: { 'x-forwarded-for': '  1.2.3.4  ' } })).toBe('1.2.3.4');
    });

    it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
      expect(await track({ headers: { 'x-real-ip': '10.0.0.1' } })).toBe('10.0.0.1');
    });

    it('uses req.ips[0] when no proxy headers and ips is populated', async () => {
      expect(
        await track({ headers: {}, ips: ['192.168.1.1', '10.0.0.1'] }),
      ).toBe('192.168.1.1');
    });

    it('falls back to req.ip when no proxy headers and ips is empty array', async () => {
      expect(await track({ headers: {}, ips: [], ip: '127.0.0.1' })).toBe('127.0.0.1');
    });

    it('falls back to req.ip when no proxy headers and ips is undefined', async () => {
      expect(await track({ headers: {}, ips: undefined, ip: '172.16.0.1' })).toBe('172.16.0.1');
    });
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm --filter api test -- --testPathPattern=throttler.guard
```

Expected output: 10 tests pass (PASS `src/config/throttler/throttler.guard.spec.ts`)

- [ ] **Step 3: Fix any failures, then re-run until green**

Common issue: if `@nestjs/graphql` is not a dependency, the import will fail at module resolution. Check with `pnpm --filter api list @nestjs/graphql`. If missing, mock the module with `jest.mock('@nestjs/graphql', () => ({ GqlExecutionContext: { create: jest.fn() } }))`.

---

## Task 4: E2E tests for throttler integration

**Files:**
- Create: `apps/api/test/throttler.e2e-spec.ts`

- [ ] **Step 1: Write the e2e test file**

```typescript
// apps/api/test/throttler.e2e-spec.ts
import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppThrottlerGuard } from '../src/config/throttler/throttler.guard';

@Controller('throttle-test')
class ThrottleTestController {
  @Get('limited')
  limited() {
    return { ok: true };
  }
}

async function buildApp(
  limit: number,
  ttl: number,
  skipIf?: () => boolean,
): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ThrottlerModule.forRoot({
        throttlers: [{ limit, ttl }],
        ...(skipIf ? { skipIf } : {}),
      }),
    ],
    controllers: [ThrottleTestController],
    providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  await app.init();
  return app;
}

describe('AppThrottlerGuard (e2e)', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    await app?.close();
  });

  it('allows requests under the rate limit', async () => {
    app = await buildApp(3, 60000);
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer()).get('/throttle-test/limited').expect(200);
    }
  });

  it('returns 429 when limit is exceeded', async () => {
    app = await buildApp(2, 60000);
    await request(app.getHttpServer()).get('/throttle-test/limited').expect(200);
    await request(app.getHttpServer()).get('/throttle-test/limited').expect(200);
    await request(app.getHttpServer()).get('/throttle-test/limited').expect(429);
  });

  it('does not rate limit when skipIf returns true', async () => {
    app = await buildApp(1, 60000, () => true);
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).get('/throttle-test/limited').expect(200);
    }
  });

  it('tracks requests per IP via x-forwarded-for — each IP has its own counter', async () => {
    app = await buildApp(1, 60000);

    // First request from IP A — allowed
    await request(app.getHttpServer())
      .get('/throttle-test/limited')
      .set('x-forwarded-for', '1.2.3.4')
      .expect(200);

    // First request from IP B — allowed (different counter)
    await request(app.getHttpServer())
      .get('/throttle-test/limited')
      .set('x-forwarded-for', '5.6.7.8')
      .expect(200);

    // Second request from IP A — rate limited
    await request(app.getHttpServer())
      .get('/throttle-test/limited')
      .set('x-forwarded-for', '1.2.3.4')
      .expect(429);

    // Second request from IP B — rate limited
    await request(app.getHttpServer())
      .get('/throttle-test/limited')
      .set('x-forwarded-for', '5.6.7.8')
      .expect(429);
  });

  it('uses the first IP in a comma-separated x-forwarded-for as the tracker key', async () => {
    app = await buildApp(1, 60000);

    // Client IP 1.2.3.4 (first in chain) — first hit allowed
    await request(app.getHttpServer())
      .get('/throttle-test/limited')
      .set('x-forwarded-for', '1.2.3.4, 10.0.0.1')
      .expect(200);

    // Same client IP, second hit — rate limited
    await request(app.getHttpServer())
      .get('/throttle-test/limited')
      .set('x-forwarded-for', '1.2.3.4, 10.0.0.1')
      .expect(429);

    // Different client IP 10.0.0.1 as first — not yet limited
    await request(app.getHttpServer())
      .get('/throttle-test/limited')
      .set('x-forwarded-for', '10.0.0.1')
      .expect(200);
  });
});
```

- [ ] **Step 2: Run the e2e tests**

```bash
pnpm --filter api test:e2e -- --testPathPattern=throttler
```

Expected output: 5 tests pass (PASS `test/throttler.e2e-spec.ts`)

- [ ] **Step 3: Fix any failures, then re-run until green**

Common issues:
- **`Cannot find module '@nestjs/graphql'`** in the guard at runtime: The guard imports `GqlExecutionContext` but NestJS won't load it unless the module is registered. If the import fails, mock it in the e2e test with `jest.mock('@nestjs/graphql', ...)` at the top of the file.
- **All requests pass (no 429)**: The in-memory throttler storage resets per-app instance. Make sure `buildApp` is called fresh for each test (`afterEach` closes `app`).
- **429 comes earlier than expected**: supertest may reuse the same source IP for all requests in a test. This is expected — the per-IP tests set explicit `x-forwarded-for` headers.

---

## Task 5: Run all throttler tests together

- [ ] **Step 1: Run all unit tests**

```bash
pnpm --filter api test -- --testPathPattern=throttler
```

Expected: 21 tests pass across 3 spec files.

- [ ] **Step 2: Run all e2e tests**

```bash
pnpm --filter api test:e2e -- --testPathPattern=throttler
```

Expected: 5 tests pass in `test/throttler.e2e-spec.ts`.

- [ ] **Step 3: If any test fails, fix source or test until fully green before proceeding**

Do not mark this task complete until both commands exit with code 0.
