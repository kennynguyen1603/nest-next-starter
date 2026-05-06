import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSeedService } from './user-seed.service';
import { UserSchemaClass, UserSchema } from '../../../../users/infrastructure/persistence/document/entities/user.schema';
import { UserRoleSchemaClass, UserRoleSchema } from '../../../../roles/infrastructure/persistence/document/entities/user-role.schema';
import { RoleSchemaClass, RoleSchema } from '../../../../roles/infrastructure/persistence/document/entities/role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSchemaClass.name, schema: UserSchema },
      { name: UserRoleSchemaClass.name, schema: UserRoleSchema },
      { name: RoleSchemaClass.name, schema: RoleSchema },
    ]),
  ],
  providers: [UserSeedService],
  exports: [UserSeedService],
})
export class UserSeedModule {}
