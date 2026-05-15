import {
  Controller,
  Get,
  HttpStatus,
  INestApplication,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken, PinoLogger } from 'nestjs-pino';
import request from 'supertest';
import { App } from 'supertest/types';

import { ErrorDto } from '@/common/dto/error.dto';
import { GlobalExceptionFilter } from '@/filters/global-exception.filter';

@Controller('test')
class TestController {
  @Get('not-found')
  notFound() {
    throw new NotFoundException('Resource missing');
  }

  @Get('validation-error')
  validationError() {
    throw new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: { email: 'Email not found' },
    });
  }

  @Get('unknown-error')
  unknownError() {
    throw new Error('Unexpected crash');
  }

  @Get('ok')
  ok() {
    return { hello: 'world' };
  }
}

describe('GlobalExceptionFilter (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as PinoLogger;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
        {
          provide: getLoggerToken(GlobalExceptionFilter.name),
          useValue: mockLogger,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /test/ok → 200 with JSON body', async () => {
    const res = await request(app.getHttpServer()).get('/test/ok').expect(200);
    expect(res.body).toEqual({ hello: 'world' });
  });

  it('GET /test/not-found → 404 with ErrorDto shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/test/not-found')
      .expect(404);

    const body = res.body as ErrorDto;
    expect(body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Resource missing',
    });
    expect(body.details).toBeUndefined();
  });

  it('GET /test/validation-error → 422 with details[]', async () => {
    const res = await request(app.getHttpServer())
      .get('/test/validation-error')
      .expect(422);

    const body = res.body as ErrorDto;
    expect(body).toMatchObject({
      statusCode: 422,
      error: 'Unprocessable Entity',
      message: 'Validation failed',
    });
    expect(body.details).toEqual(
      expect.arrayContaining([
        {
          property: 'email',
          code: 'VALIDATION_ERROR',
          message: 'Email not found',
        },
      ]),
    );
  });

  it('GET /test/unknown-error → 500 with generic message', async () => {
    const res = await request(app.getHttpServer())
      .get('/test/unknown-error')
      .expect(500);

    expect(res.body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
    });
  });
});
