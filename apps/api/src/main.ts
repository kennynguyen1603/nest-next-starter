import 'dotenv/config';

import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { Request, Response, NextFunction } from 'express';

import { AppModule } from './app.module';
import { ResolvePromisesInterceptor } from '@/utils/serializer.interceptor';
import validationOptions from '@/utils/validation-options';
import { AllConfigType } from './config/config.type';
import { BULL_BOARD_PATH } from './config/bull/bull.config';
import { basicAuthMiddleware } from './middlewares/basic-auth.middleware';

export const SWAGGER_PATH = '/docs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  const configService = app.get(ConfigService<AllConfigType>);

  const frontendDomain = configService.get('app.frontendDomain', {
    infer: true,
  });
  app.enableCors({ origin: frontendDomain ?? true, credentials: true });
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
  await app.listen(port);
  new Logger('Bootstrap').log(
    `Application running on http://localhost:${port}/${configService.getOrThrow('app.apiPrefix', { infer: true })}`,
  );
}
void bootstrap();
