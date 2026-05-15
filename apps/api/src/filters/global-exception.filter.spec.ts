import {
  BadRequestException,
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';

import { ErrorDto } from '@/common/dto/error.dto';
import { GlobalExceptionFilter } from './global-exception.filter';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as PinoLogger;

function makeHost() {
  return {
    switchToHttp: () => ({
      getResponse: () => ({}),
      getRequest: () => ({}),
    }),
  } as never;
}

function getBody(reply: jest.Mock): ErrorDto {
  return (reply.mock.calls[0] as [unknown, ErrorDto, number])[1];
}

function getStatus(reply: jest.Mock): number {
  return (reply.mock.calls[0] as [unknown, ErrorDto, number])[2];
}

describe('GlobalExceptionFilter', () => {
  let reply: jest.Mock;
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    reply = jest.fn();
    const adapterHost = {
      httpAdapter: { reply },
    } as unknown as HttpAdapterHost;
    filter = new GlobalExceptionFilter(adapterHost, mockLogger);
  });

  describe('HttpException handling', () => {
    it('formats NotFoundException as 404 with correct shape', () => {
      filter.catch(new NotFoundException('User not found'), makeHost());

      const body = getBody(reply);
      const status = getStatus(reply);
      expect(status).toBe(404);
      expect(body.statusCode).toBe(404);
      expect(body.error).toBe('Not Found');
      expect(body.message).toBe('User not found');
      expect(body.details).toBeUndefined();
    });

    it('formats BadRequestException with string message', () => {
      filter.catch(new BadRequestException('Bad input'), makeHost());

      const body = getBody(reply);
      const status = getStatus(reply);
      expect(status).toBe(400);
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe('Bad Request');
      expect(body.message).toBe('Bad input');
    });

    it('formats HttpException with array message by joining with comma', () => {
      filter.catch(
        new BadRequestException({ message: ['field1 error', 'field2 error'] }),
        makeHost(),
      );

      const body = getBody(reply);
      expect(body.message).toBe('field1 error, field2 error');
    });
  });

  describe('UnprocessableEntityException with errors object', () => {
    it('maps errors object to details[] and sets message to Validation failed', () => {
      filter.catch(
        new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { email: 'Email not found', password: 'Too short' },
        }),
        makeHost(),
      );

      const body = getBody(reply);
      const status = getStatus(reply);
      expect(status).toBe(422);
      expect(body.statusCode).toBe(422);
      expect(body.error).toBe('Unprocessable Entity');
      expect(body.message).toBe('Validation failed');
      expect(body.details).toHaveLength(2);
      expect(body.details).toEqual(
        expect.arrayContaining([
          {
            property: 'email',
            code: 'VALIDATION_ERROR',
            message: 'Email not found',
          },
          {
            property: 'password',
            code: 'VALIDATION_ERROR',
            message: 'Too short',
          },
        ]),
      );
    });

    it('maps single-field errors object to details[] with one entry', () => {
      filter.catch(
        new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { token: 'Invalid token' },
        }),
        makeHost(),
      );

      const body = getBody(reply);
      expect(body.details).toEqual([
        {
          property: 'token',
          code: 'VALIDATION_ERROR',
          message: 'Invalid token',
        },
      ]);
    });
  });

  describe('Unknown (non-HTTP) exception handling', () => {
    it('returns 500 with generic message for unknown errors', () => {
      filter.catch(new Error('Unexpected crash'), makeHost());

      const body = getBody(reply);
      const status = getStatus(reply);
      expect(status).toBe(500);
      expect(body.statusCode).toBe(500);
      expect(body.error).toBe('Internal Server Error');
      expect(body.message).toBe('Internal server error');
    });

    it('returns 500 for thrown strings', () => {
      filter.catch('some string error', makeHost());

      const body = getBody(reply);
      const status = getStatus(reply);
      expect(status).toBe(500);
      expect(body.statusCode).toBe(500);
    });
  });

  describe('Stack trace behaviour', () => {
    it('includes stack trace for 5xx errors in non-production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      filter.catch(new Error('boom'), makeHost());

      const body = getBody(reply);
      expect(body.stack).toBeDefined();
      expect(typeof body.stack).toBe('string');

      process.env.NODE_ENV = originalEnv;
    });

    it('omits stack trace for 4xx HttpExceptions even in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      filter.catch(new NotFoundException('gone'), makeHost());

      const body = getBody(reply);
      expect(body.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('omits stack trace in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      filter.catch(new Error('crash'), makeHost());

      const body = getBody(reply);
      expect(body.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('omits stack for non-Error unknown exceptions in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      filter.catch({ weird: 'object' }, makeHost());

      const body = getBody(reply);
      expect(body.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
