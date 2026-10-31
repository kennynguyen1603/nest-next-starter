import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { STATUS_CODES } from 'http';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { ErrorDetailDto } from '@/common/dto/error-detail.dto';
import { ErrorDto } from '@/common/dto/error.dto';

type UnprocessableBody = {
  status?: number;
  errors?: Record<string, string>;
};

type DriverError = { name?: string; code?: string | number };

/**
 * Maps database errors that are caused by the client rather than the server,
 * so they are not reported as 500s. Covers both persistence drivers:
 * Postgres (via TypeORM QueryFailedError) and MongoDB/Mongoose.
 */
function mapDatabaseError(
  exception: unknown,
): { statusCode: number; message: string } | undefined {
  if (typeof exception !== 'object' || exception === null) return undefined;
  const { name, code } = exception as DriverError;

  // 23505 unique_violation (Postgres) / 11000 duplicate key (MongoDB)
  if (
    (name === 'QueryFailedError' && code === '23505') ||
    (name === 'MongoServerError' && code === 11000)
  ) {
    return {
      statusCode: HttpStatus.CONFLICT,
      message: 'Resource already exists',
    };
  }
  // 22P02 invalid_text_representation (e.g. malformed uuid) / Mongoose CastError
  if (
    (name === 'QueryFailedError' && code === '22P02') ||
    name === 'CastError'
  ) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid identifier or value format',
    };
  }
  return undefined;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    @InjectPinoLogger(GlobalExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const isDev = process.env.NODE_ENV === 'development';

    let statusCode: number;
    let message: string;
    let details: ErrorDetailDto[] | undefined;
    const dbError = mapDatabaseError(exception);

    if (dbError) {
      ({ statusCode, message } = dbError);
      this.logger.warn({ err: exception, statusCode }, message);
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const raw = exception.getResponse();

      if (typeof raw === 'object' && raw !== null) {
        const body = raw as UnprocessableBody;
        if (body.errors && typeof body.errors === 'object') {
          message = 'Validation failed';
          details = Object.entries(body.errors).map(([property, msg]) => ({
            property,
            code: 'VALIDATION_ERROR',
            message: msg,
          }));
        } else {
          const bodyWithMessage = raw as { message?: string | string[] };
          const rawMessage = bodyWithMessage.message;
          message = Array.isArray(rawMessage)
            ? rawMessage.join(', ')
            : (rawMessage ?? exception.message);
        }
      } else if (typeof raw === 'string') {
        message = raw;
      } else {
        message = exception.message;
      }

      if (statusCode >= 500) {
        this.logger.error({ err: exception, statusCode }, message);
      } else if (statusCode >= 400) {
        this.logger.warn({ statusCode, details }, message);
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      this.logger.error(
        { err: exception instanceof Error ? exception : String(exception) },
        'Unhandled exception',
      );
    }

    const error = STATUS_CODES[statusCode] ?? 'Unknown Error';

    const body: ErrorDto = {
      statusCode,
      error,
      message,
      ...(details ? { details } : {}),
      ...(isDev && statusCode >= 500 && exception instanceof Error
        ? { stack: exception.stack }
        : {}),
    };

    httpAdapter.reply(ctx.getResponse(), body, statusCode);
  }
}
