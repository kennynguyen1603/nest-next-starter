import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { getReasonPhrase } from 'http-status-codes';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { ErrorDetailDto } from '@/common/dto/error-detail.dto';
import { ErrorDto } from '@/common/dto/error.dto';

type UnprocessableBody = {
  status?: number;
  errors?: Record<string, string>;
};

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
    const isDev = process.env.NODE_ENV !== 'production';

    let statusCode: number;
    let message: string;
    let details: ErrorDetailDto[] | undefined;

    if (exception instanceof HttpException) {
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

    let error: string;
    try {
      error = getReasonPhrase(statusCode);
    } catch {
      error = 'Unknown Error';
    }

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
