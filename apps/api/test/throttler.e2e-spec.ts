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
  opts: { skipIf?: () => boolean; trustProxy?: boolean } = {},
): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ThrottlerModule.forRoot({
        throttlers: [{ limit, ttl }],
        ...(opts.skipIf ? { skipIf: opts.skipIf } : {}),
      }),
    ],
    controllers: [ThrottleTestController],
    providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  if (opts.trustProxy) {
    // Mirror main.ts: only when TRUST_PROXY is configured does req.ip/req.ips
    // reflect the X-Forwarded-For chain.
    (
      app.getHttpAdapter().getInstance() as {
        set: (k: string, v: unknown) => void;
      }
    ).set('trust proxy', true);
  }
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
      await request(app.getHttpServer())
        .get('/throttle-test/limited')
        .expect(200);
    }
  });

  it('returns 429 when limit is exceeded', async () => {
    app = await buildApp(2, 60000);
    await request(app.getHttpServer())
      .get('/throttle-test/limited')
      .expect(200);
    await request(app.getHttpServer())
      .get('/throttle-test/limited')
      .expect(200);
    await request(app.getHttpServer())
      .get('/throttle-test/limited')
      .expect(429);
  });

  it('does not rate limit when skipIf returns true', async () => {
    app = await buildApp(1, 60000, { skipIf: () => true });
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .get('/throttle-test/limited')
        .expect(200);
    }
  });

  it('ignores X-Forwarded-For when trust proxy is off, so a client cannot rotate its key', async () => {
    app = await buildApp(1, 60000);

    // First request — allowed
    await request(app.getHttpServer())
      .get('/throttle-test/limited')
      .set('x-forwarded-for', '1.2.3.4')
      .expect(200);

    // Same socket, but a DIFFERENT spoofed header — still limited, because the
    // guard keys on req.ip (not the untrusted header) when trust proxy is off.
    await request(app.getHttpServer())
      .get('/throttle-test/limited')
      .set('x-forwarded-for', '5.6.7.8')
      .expect(429);
  });

  it('keys on the client IP from X-Forwarded-For when trust proxy is enabled', async () => {
    app = await buildApp(1, 60000, { trustProxy: true });

    // Client IP A — allowed
    await request(app.getHttpServer())
      .get('/throttle-test/limited')
      .set('x-forwarded-for', '1.2.3.4')
      .expect(200);

    // Client IP B — separate counter, allowed
    await request(app.getHttpServer())
      .get('/throttle-test/limited')
      .set('x-forwarded-for', '5.6.7.8')
      .expect(200);

    // Client IP A again — rate limited
    await request(app.getHttpServer())
      .get('/throttle-test/limited')
      .set('x-forwarded-for', '1.2.3.4')
      .expect(429);
  });
});
