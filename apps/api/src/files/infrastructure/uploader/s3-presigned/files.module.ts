import { Module } from '@nestjs/common';
import { FilesS3PresignedController } from './files.controller';
import { ConfigModule } from '@nestjs/config';

import { FilesS3PresignedService } from './files.service';

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

@Module({
  imports: [infrastructurePersistenceModule, ConfigModule],
  controllers: [FilesS3PresignedController],
  providers: [FilesS3PresignedService],
  exports: [FilesS3PresignedService],
})
export class FilesS3PresignedModule {}
