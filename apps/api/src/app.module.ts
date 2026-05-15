import path from 'path';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeaderResolver, I18nModule } from 'nestjs-i18n';
import { DataSource, DataSourceOptions } from 'typeorm';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { GracefulShutdownModule } from 'nestjs-graceful-shutdown';
import { WorkerModule } from './worker/queues/worker.module';

import { AllConfigType } from './config/config.type';
import databaseConfig from './config/database/database.config';
import { DatabaseConfig } from './config/database/database-config.type';
import { MongooseConfigService } from './database/mongoose-config.service';
import { TypeOrmConfigService } from './database/typeorm-config.service';
import authConfig from './config/auth/auth.config';
import appConfig from './config/app/app.config';
import mailConfig from './config/mail/mail.config';
import fileConfig from './config/files/file.config';
import { FileDriver } from './config/files/file-config.type';
import googleConfig from './config/auth-google/google.config';
import facebookConfig from './config/auth-facebook/facebook.config';
import githubConfig from './config/auth-github/github.config';
import twitterConfig from './config/auth-twitter/twitter.config';

import { UsersModule } from './users/users.module';
import { AuthGoogleModule } from './auth-google/auth-google.module';
import { AuthFacebookModule } from './auth-facebook/auth-facebook.module';
import { AuthGithubModule } from './auth-github/auth-github.module';
import { AuthTwitterModule } from './auth-twitter/auth-twitter.module';
import { FilesModule } from './files/files.module';
import { FilesLocalModule } from './files/infrastructure/uploader/local/files.module';
import { FilesS3Module } from './files/infrastructure/uploader/s3/files.module';
import { FilesS3PresignedModule } from './files/infrastructure/uploader/s3-presigned/files.module';
import { FilesCloudinaryModule } from './files/infrastructure/uploader/cloudinary/files.module';
import { AuthModule } from './auth/auth.module';
import { SessionModule } from './session/session.module';
import { MailModule } from './mail/mail.module';
import { MailerModule } from './mailer/mailer.module';
import { HealthModule } from './health/health.module';
import redisConfig from './config/redis/redis.config';
import bullConfig, { BULL_BOARD_PATH } from './config/bull/bull.config';
import useBullFactory from './config/bull/bull.factory';
import useLoggerFactory from './tools/logger/logger-factory';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

// <file-block>
const fileUploaderModule = (() => {
  const driver =
    (process.env.FILE_DRIVER as FileDriver | undefined) ?? FileDriver.LOCAL;
  switch (driver) {
    case FileDriver.S3:
      return FilesS3Module;
    case FileDriver.S3_PRESIGNED:
      return FilesS3PresignedModule;
    case FileDriver.CLOUDINARY:
      return FilesCloudinaryModule;
    default:
      return FilesLocalModule;
  }
})();
// </file-block>

// <database-block>
const infrastructureDatabaseModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? MongooseModule.forRootAsync({
      useClass: MongooseConfigService,
    })
  : TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options?: DataSourceOptions) => {
        if (!options) {
          throw new Error('Invalid options passed to DataSource');
        }
        return new DataSource(options).initialize();
      },
    });
// </database-block>

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        authConfig,
        appConfig,
        mailConfig,
        fileConfig,
        googleConfig,
        facebookConfig,
        githubConfig,
        twitterConfig,
        redisConfig,
        bullConfig,
      ],
      envFilePath: ['.env'],
    }),
    infrastructureDatabaseModule,
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        fallbackLanguage: configService.getOrThrow('app.fallbackLanguage', {
          infer: true,
        }),
        loaderOptions: { path: path.join(__dirname, '/i18n/'), watch: true },
      }),
      resolvers: [
        {
          use: HeaderResolver,
          useFactory: (
            configService: ConfigService<AllConfigType>,
          ): string[] => {
            return [
              configService.getOrThrow<string>('app.headerLanguage', {
                infer: true,
              }),
            ];
          },
          inject: [ConfigService],
        },
      ],
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: useLoggerFactory,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: useBullFactory,
    }),
    BullBoardModule.forRoot({
      route: BULL_BOARD_PATH,
      adapter: ExpressAdapter,
    }),
    GracefulShutdownModule.forRoot(),
    WorkerModule,
    UsersModule,
    FilesModule,
    fileUploaderModule,
    AuthModule,
    SessionModule,
    MailModule,
    MailerModule,
    HealthModule,
    AuthGoogleModule,
    AuthFacebookModule,
    AuthGithubModule,
    AuthTwitterModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: GlobalExceptionFilter }],
})
export class AppModule {}
