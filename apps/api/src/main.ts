import 'dotenv/config';

import {
  ClassSerializerInterceptor,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { useContainer } from 'class-validator';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { setupGracefulShutdown } from 'nestjs-graceful-shutdown';

import { AppModule } from './app.module';
import { ResolvePromisesInterceptor } from '@/utils/serializer.interceptor';
import validationOptions from '@/utils/validation-options';
import { AllConfigType } from './config/config.type';
import { BULL_BOARD_PATH } from './config/bull/bull.config';
import { HttpMetricsMiddleware } from './metrics/http-metrics.middleware';
import { basicAuthMiddleware } from './middlewares/basic-auth.middleware';
import { RedisIoAdapter } from './socket/socket.adapter';

export const SWAGGER_PATH = '/docs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  const configService = app.get(ConfigService<AllConfigType>);

  // Honour the reverse proxy's forwarded client IP (used by the rate limiter).
  // Configure TRUST_PROXY to the proxy hop count / CIDR in production.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    const value =
      trustProxy === 'true'
        ? true
        : Number.isNaN(Number(trustProxy))
          ? trustProxy
          : Number(trustProxy);
    (
      app.getHttpAdapter().getInstance() as {
        set: (k: string, v: unknown) => void;
      }
    ).set('trust proxy', value);
  }

  // Registered first so latency covers every middleware and handler.
  const httpMetrics = app.get(HttpMetricsMiddleware);
  app.use(httpMetrics.use.bind(httpMetrics));

  // Fail closed: when no allowed origins are configured we deny cross-origin
  // rather than reflecting any origin with credentials (a credential-leak risk).
  const corsOrigin = configService.get('app.corsOrigin', { infer: true });
  if (!corsOrigin?.length) {
    logger.warn(
      'No CORS origins configured (FRONTEND_DOMAIN/ADMIN_DOMAIN). Cross-origin requests will be blocked.',
    );
  }
  app.enableCors({
    origin: corsOrigin?.length ? corsOrigin : false,
    credentials: true,
  });
  app.use(cookieParser());

  app.enableShutdownHooks();

  app.use(
    // Helmet's default CSP (script-src 'self', img-src 'self' data:) covers
    // Swagger UI, which serves its bundle and init script from this origin.
    helmet({
      crossOriginEmbedderPolicy: false,
    }),
  );

  const apiPrefix = configService.getOrThrow('app.apiPrefix', { infer: true });
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['/'],
  });
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.useGlobalPipes(new ValidationPipe(validationOptions));
  app.useGlobalInterceptors(
    // ResolvePromisesInterceptor is used to resolve promises in responses because class-transformer can't do it
    // https://github.com/typestack/class-transformer/issues/549
    new ResolvePromisesInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  const prefixPath = `/${apiPrefix}`.toLowerCase();
  const pathsToIntercept = [
    `${prefixPath}${BULL_BOARD_PATH}`,
    SWAGGER_PATH,
    // Metrics leak internals and each scrape queries Redis for queue counts.
    `${prefixPath}/metrics`,
  ];
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Express routing is case-insensitive, so `/API/metrics` must not slip past.
    const url = req.path.toLowerCase();
    if (pathsToIntercept.some((path) => url.startsWith(path))) {
      basicAuthMiddleware(req, res, next);
    } else {
      next();
    }
  });

  const options = new DocumentBuilder()
    .setTitle('API')
    .setDescription('API docs')
    .setVersion('1.0')
    .addBearerAuth()
    .addGlobalParameters({
      in: 'header',
      required: false,
      name: process.env.APP_HEADER_LANGUAGE || 'x-custom-lang',
      schema: {
        example: 'en',
      },
    })
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document);

  const port = configService.getOrThrow('app.port', { infer: true });

  if (process.env.WEBSOCKET_ENABLED === 'true') {
    const ioAdapter = new RedisIoAdapter(app);
    await ioAdapter.connectToRedis(
      configService.getOrThrow('redis', { infer: true }),
    );
    app.useWebSocketAdapter(ioAdapter);
  }

  await app.init();

  await app.listen(port);
  setupGracefulShutdown({ app });
  logger.log(
    `Application running on http://localhost:${port}/${configService.getOrThrow('app.apiPrefix', { infer: true })}`,
    'Bootstrap',
  );
}
void bootstrap();
