import {
  HttpStatus,
  Module,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FilesCloudinaryController } from './files.controller';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';

import { FilesCloudinaryService } from './files.service';

import databaseConfig from '@/config/database/database.config';
import { DatabaseConfig } from '@/config/database/database-config.type';
import { AllConfigType } from '@/config/config.type';
import { DocumentFilePersistenceModule } from '@/files/infrastructure/persistence/document/document-persistence.module';
import { RelationalFilePersistenceModule } from '@/files/infrastructure/persistence/relational/relational-persistence.module';

// <database-block>
const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? DocumentFilePersistenceModule
  : RelationalFilePersistenceModule;
// </database-block>

type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

@Module({
  imports: [
    infrastructurePersistenceModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        fileFilter: (
          _request: unknown,
          file: { originalname: string },
          callback: FileFilterCallback,
        ) => {
          if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            return callback(
              new UnprocessableEntityException({
                status: HttpStatus.UNPROCESSABLE_ENTITY,
                errors: { file: 'cantUploadFileType' },
              }),
              false,
            );
          }
          callback(null, true);
        },
        storage: memoryStorage(),
        limits: {
          fileSize: configService.get('file.maxFileSize', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [FilesCloudinaryController],
  providers: [FilesCloudinaryService],
  exports: [FilesCloudinaryService],
})
export class FilesCloudinaryModule {}
