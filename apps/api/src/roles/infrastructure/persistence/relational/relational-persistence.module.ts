import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolesRepository } from '../roles.repository';
import { RolesRelationalRepository } from './repositories/role.repository';
import { RoleEntity } from './entities/role.entity';
import { PermissionEntity } from './entities/permission.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { UserRoleEntity } from './entities/user-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoleEntity,
      PermissionEntity,
      RolePermissionEntity,
      UserRoleEntity,
    ]),
  ],
  providers: [
    { provide: RolesRepository, useClass: RolesRelationalRepository },
  ],
  exports: [RolesRepository],
})
export class RelationalRolesPersistenceModule {}
