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
import { basicAuthMiddleware } from './middlewares/basic-auth.middleware';
import { SocketGateway } from './socket/socket.gateway';
import { createSocketRedisAdapter } from './socket/socket.adapter';

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
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          imgSrc: [
            `'self'`,
            'data:',
            'apollo-server-landing-page.cdn.apollographql.com',
          ],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
          manifestSrc: [
            `'self'`,
            'apollo-server-landing-page.cdn.apollographql.com',
          ],
          frameSrc: [`'self'`, 'sandbox.embed.apollographql.com'],
        },
      },
    }),
  );

  app.setGlobalPrefix(
    configService.getOrThrow('app.apiPrefix', { infer: true }),
    {
      exclude: ['/'],
    },
  );
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

  const pathsToIntercept = [
    `/api${BULL_BOARD_PATH}`,
    SWAGGER_PATH,
    `/api/auth/reference`,
  ];
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (pathsToIntercept.some((path) => req.url.startsWith(path))) {
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

  await app.init();

  if (process.env.WEBSOCKET_ENABLED === 'true') {
    const redisConfig = configService.getOrThrow('redis', { infer: true });
    const { adapter, cleanup } = await createSocketRedisAdapter(redisConfig);
    app.get(SocketGateway).server.adapter(adapter);
    process.once('beforeExit', () => void cleanup());
  }

  await app.listen(port);
  setupGracefulShutdown({ app });
  logger.log(
    `Application running on http://localhost:${port}/${configService.getOrThrow('app.apiPrefix', { infer: true })}`,
    'Bootstrap',
  );
}
void bootstrap();
