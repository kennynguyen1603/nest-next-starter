import { Module } from '@nestjs/common';
import databaseConfig from '@/config/database/database.config';
import { DatabaseConfig } from '@/config/database/database-config.type';
import { CacheModule } from '@/shared/cache/cache.module';

import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { RelationalRolesPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { DocumentRolesPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';

// <database-block>
const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? DocumentRolesPersistenceModule
  : RelationalRolesPersistenceModule;
// </database-block>

@Module({
  imports: [infrastructurePersistenceModule, CacheModule],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService, infrastructurePersistenceModule],
})
export class RolesModule {}
