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
