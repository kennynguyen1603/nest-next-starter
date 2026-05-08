import { Injectable } from '@nestjs/common';

import { NullableType } from '@/utils/types/nullable.type';
import { RolesRepository } from './infrastructure/persistence/roles.repository';
import { Role } from './domain/role';
import { RoleEnum } from './roles.enum';
import { PermissionEnum } from './permissions.enum';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  findAll(): Promise<Role[]> {
    return this.rolesRepository.findAll();
  }

  findById(id: string): Promise<NullableType<Role>> {
    return this.rolesRepository.findById(id);
  }

  getPermissionsForRoles(roleNames: RoleEnum[]): Promise<PermissionEnum[]> {
    return this.rolesRepository.getPermissionsForRoles(roleNames);
  }

  getRoleNamesForUser(userId: string): Promise<RoleEnum[]> {
    return this.rolesRepository.getRoleNamesForUser(userId);
  }

  assignRolesToUser(userId: string, roleNames: RoleEnum[]): Promise<void> {
    return this.rolesRepository.assignRolesToUser(userId, roleNames);
  }
}
