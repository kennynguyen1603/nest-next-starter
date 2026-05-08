import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RoleSchemaClass,
  RoleSchema,
} from '@/roles/infrastructure/persistence/document/entities/role.schema';
import { RoleSeedService } from './role-seed.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoleSchemaClass.name, schema: RoleSchema },
    ]),
  ],
  providers: [RoleSeedService],
  exports: [RoleSeedService],
})
export class RoleSeedModule {}
