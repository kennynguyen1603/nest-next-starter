import { Global, Module } from '@nestjs/common';
import { FilesS3PresignedController } from './files.controller';
import { ConfigModule } from '@nestjs/config';

import { FilesS3PresignedService } from './files.service';
import { FILE_UPLOAD_SERVICE } from '@/files/infrastructure/uploader/uploader.interface';

import { DocumentFilePersistenceModule } from '@/files/infrastructure/persistence/document/document-persistence.module';
import { RelationalFilePersistenceModule } from '@/files/infrastructure/persistence/relational/relational-persistence.module';
import { DatabaseConfig } from '@/config/database/database-config.type';
import databaseConfig from '@/config/database/database.config';

// <database-block>
const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? DocumentFilePersistenceModule
  : RelationalFilePersistenceModule;
// </database-block>

@Global()
@Module({
  imports: [infrastructurePersistenceModule, ConfigModule],
  controllers: [FilesS3PresignedController],
  providers: [
    FilesS3PresignedService,
    { provide: FILE_UPLOAD_SERVICE, useExisting: FilesS3PresignedService },
  ],
  exports: [FilesS3PresignedService, FILE_UPLOAD_SERVICE],
})
export class FilesS3PresignedModule {}
