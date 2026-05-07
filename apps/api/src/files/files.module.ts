import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { RelationalFilePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { DocumentFilePersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import { DatabaseConfig } from '@/config/database/database-config.type';
import databaseConfig from '@/config/database/database.config';

const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? DocumentFilePersistenceModule
  : RelationalFilePersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
