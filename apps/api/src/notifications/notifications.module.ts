import { Module } from '@nestjs/common';
import databaseConfig from '@/config/database/database.config';
import { DatabaseConfig } from '@/config/database/database-config.type';
import { RelationalNotificationPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { DocumentNotificationPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { UsersModule } from '@/users/users.module';

// <database-block>
const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? DocumentNotificationPersistenceModule
  : RelationalNotificationPersistenceModule;
// </database-block>

@Module({
  imports: [infrastructurePersistenceModule, UsersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
