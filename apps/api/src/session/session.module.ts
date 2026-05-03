import {
  // common
  Module,
} from '@nestjs/common';

import { DocumentSessionPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import { RelationalSessionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { SessionService } from './session.service';
import { DatabaseConfig } from '../config/database/database-config.type';
import databaseConfig from '../config/database/database.config';

// <database-block>
const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? DocumentSessionPersistenceModule
  : RelationalSessionPersistenceModule;
// </database-block>

@Module({
  imports: [infrastructurePersistenceModule],
  providers: [SessionService],
  exports: [SessionService, infrastructurePersistenceModule],
})
export class SessionModule {}
