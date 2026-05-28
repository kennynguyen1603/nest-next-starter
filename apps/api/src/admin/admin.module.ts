import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminDocumentPersistenceModule } from './infrastructure/persistence/document/admin-document-persistence.module';
import { AdminRelationalPersistenceModule } from './infrastructure/persistence/relational/admin-relational-persistence.module';
import databaseConfig from '@/config/database/database.config';
import { DatabaseConfig } from '@/config/database/database-config.type';

// <database-block>
const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? AdminDocumentPersistenceModule
  : AdminRelationalPersistenceModule;
// </database-block>

@Module({
  imports: [infrastructurePersistenceModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
