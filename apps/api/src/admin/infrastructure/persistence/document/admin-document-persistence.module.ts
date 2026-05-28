import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserSchema,
  UserSchemaClass,
} from '@/users/infrastructure/persistence/document/entities/user.schema';
import { AdminRepository } from '../admin.repository';
import { AdminDocumentRepository } from './repositories/admin.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSchemaClass.name, schema: UserSchema },
    ]),
  ],
  providers: [
    {
      provide: AdminRepository,
      useClass: AdminDocumentRepository,
    },
  ],
  exports: [AdminRepository],
})
export class AdminDocumentPersistenceModule {}
