import {
  Controller,
  Get,
  INestApplication,
  Module,
  Param,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getToken } from '@willsoto/nestjs-prometheus';
import request from 'supertest';
import { App } from 'supertest/types';

import { HttpMetricsMiddleware } from './http-metrics.middleware';
import { HTTP_REQUEST_DURATION } from './metrics.constant';

const stopTimer = jest.fn();
const histogram = { startTimer: jest.fn(() => stopTimer) };

@Controller({ path: 'users', version: '1' })
class UsersController {
  @Get(':id')
  findOne(@Param('id') id: string) {
    return { id };
  }
}

@Module({
  controllers: [UsersController],
  providers: [
    { provide: getToken(HTTP_REQUEST_DURATION), useValue: histogram },
    HttpMetricsMiddleware,
  ],
})
class TestModule {}

describe('HttpMetricsMiddleware', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    // Mirrors main.ts: global mount, prefix with `/` excluded, URI versioning.
    app = moduleRef.createNestApplication();
    const httpMetrics = app.get(HttpMetricsMiddleware);
    app.use(httpMetrics.use.bind(httpMetrics));
    app.setGlobalPrefix('api', { exclude: ['/'] });
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => stopTimer.mockClear());

  it('labels matched requests with the route pattern, not the raw URL', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/42').expect(200);

    expect(stopTimer).toHaveBeenCalledWith({
      method: 'GET',
      route: '/api/v1/users/:id',
      status_code: 200,
    });
  });

  it('labels unknown paths as "unmatched" to keep cardinality bounded', async () => {
    await request(app.getHttpServer()).get('/api/v1/nope/123').expect(404);

    expect(stopTimer).toHaveBeenCalledWith({
      method: 'GET',
      route: 'unmatched',
      status_code: 404,
    });
  });
});
