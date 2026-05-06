import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema, UserSchemaClass } from './entities/user.schema';
import { UserRepository } from '../user.repository';
import { UsersDocumentRepository } from './repositories/user.repository';
import {
  UserRoleSchemaClass,
  UserRoleSchema,
} from '@/roles/infrastructure/persistence/document/entities/user-role.schema';
import {
  RoleSchemaClass,
  RoleSchema,
} from '@/roles/infrastructure/persistence/document/entities/role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSchemaClass.name, schema: UserSchema },
      { name: UserRoleSchemaClass.name, schema: UserRoleSchema },
      { name: RoleSchemaClass.name, schema: RoleSchema },
    ]),
  ],
  providers: [
    {
      provide: UserRepository,
      useClass: UsersDocumentRepository,
    },
  ],
  exports: [UserRepository],
})
export class DocumentUserPersistenceModule {}
