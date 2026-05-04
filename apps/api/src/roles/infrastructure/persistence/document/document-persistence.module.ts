import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RolesRepository } from '../roles.repository';
import { RolesDocumentRepository } from './repositories/role.repository';
import { RoleSchemaClass, RoleSchema } from './entities/role.schema';
import {
  PermissionSchema,
  PermissionSchemaClass,
} from './entities/permission.schema';
import {
  RolePermissionSchema,
  RolePermissionSchemaClass,
} from './entities/role-permission.schema';
import {
  UserRoleSchema,
  UserRoleSchemaClass,
} from './entities/user-role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoleSchemaClass.name, schema: RoleSchema },
      { name: PermissionSchemaClass.name, schema: PermissionSchema },
      { name: RolePermissionSchemaClass.name, schema: RolePermissionSchema },
      { name: UserRoleSchemaClass.name, schema: UserRoleSchema },
    ]),
  ],
  providers: [{ provide: RolesRepository, useClass: RolesDocumentRepository }],
  exports: [RolesRepository],
})
export class DocumentRolesPersistenceModule {}
