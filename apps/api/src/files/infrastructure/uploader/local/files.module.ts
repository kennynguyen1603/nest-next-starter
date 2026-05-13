import {
  Global,
  HttpStatus,
  Module,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FILE_UPLOAD_SERVICE } from '@/files/infrastructure/uploader/uploader.interface';
import { FilesLocalController } from './files.controller';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';

import { FilesLocalService } from './files.service';

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
type FilenameCallback = (error: Error | null, filename: string) => void;

@Global()
@Module({
  imports: [
    infrastructurePersistenceModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        return {
          fileFilter: (
            _request: unknown,
            file: { originalname: string },
            callback: FileFilterCallback,
          ) => {
            if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
              return callback(
                new UnprocessableEntityException({
                  status: HttpStatus.UNPROCESSABLE_ENTITY,
                  errors: { file: `cantUploadFileType` },
                }),
                false,
              );
            }
            callback(null, true);
          },
          storage: diskStorage({
            destination: './files',
            filename: (
              _request: unknown,
              file: { originalname: string },
              callback: FilenameCallback,
            ) => {
              callback(
                null,
                `${randomStringGenerator()}.${file.originalname.split('.').pop()?.toLowerCase()}`,
              );
            },
          }),
          limits: {
            fileSize: configService.get('file.maxFileSize', { infer: true }),
          },
        };
      },
    }),
  ],
  controllers: [FilesLocalController],
  providers: [
    FilesLocalService,
    { provide: FILE_UPLOAD_SERVICE, useExisting: FilesLocalService },
  ],
  exports: [FilesLocalService, FILE_UPLOAD_SERVICE],
})
export class FilesLocalModule {}
