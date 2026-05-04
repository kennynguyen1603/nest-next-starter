import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolePermissionSchemaClass, RolePermissionSchema } from '@/roles/infrastructure/persistence/document/entities/role-permission.schema';
import { RoleSchemaClass, RoleSchema } from '@/roles/infrastructure/persistence/document/entities/role.schema';
import { RolePermissionSeedService } from './role-permission-seed.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RolePermissionSchemaClass.name, schema: RolePermissionSchema },
      { name: RoleSchemaClass.name, schema: RoleSchema },
    ]),
  ],
  providers: [RolePermissionSeedService],
  exports: [RolePermissionSeedService],
})
export class RolePermissionSeedModule {}
